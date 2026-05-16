from flask import request
from flask_login import current_user
from flask_socketio import emit, join_room, leave_room

from ..extensions import socketio
from ..models import CoachClient, User
from .routes import can_direct_call

call_rooms = {}
sid_rooms = {}


def _user_payload():
    return {
        'sid': request.sid,
        'user_id': current_user.id,
        'name': current_user.full_name,
        'role': current_user.role,
    }


def _room_allowed(room_id):
    if not current_user.is_authenticated:
        return False

    if room_id.startswith('group-'):
        return len(room_id) <= 80

    if not room_id.startswith('direct-'):
        return False

    try:
        _, user_a, user_b = room_id.split('-', 2)
        ids = {int(user_a), int(user_b)}
    except (TypeError, ValueError):
        return False

    if current_user.id not in ids:
        return False

    partner_id = next(uid for uid in ids if uid != current_user.id)
    partner = User.query.get(partner_id)
    return partner is not None and can_direct_call(current_user, partner)


def _leave_current_room():
    room_id = sid_rooms.pop(request.sid, None)
    if not room_id:
        return

    participants = call_rooms.get(room_id, {})
    participant = participants.pop(request.sid, None)
    leave_room(room_id)

    if participant:
        emit('call:user-left', {'sid': request.sid}, room=room_id, include_self=False)

    if not participants:
        call_rooms.pop(room_id, None)


def _same_call_target(target_sid):
    room_id = sid_rooms.get(request.sid)
    return bool(room_id and target_sid and sid_rooms.get(target_sid) == room_id)


@socketio.on('call:join')
def on_join(data):
    room_id = (data or {}).get('roomId', '')
    if not _room_allowed(room_id):
        emit('call:error', {'message': 'You are not allowed to join this call.'})
        return

    _leave_current_room()

    participants = call_rooms.setdefault(room_id, {})
    existing = list(participants.values())
    participants[request.sid] = _user_payload()
    sid_rooms[request.sid] = room_id
    join_room(room_id)

    emit('call:participants', {'participants': existing})
    emit('call:user-joined', {'participant': participants[request.sid]}, room=room_id, include_self=False)


@socketio.on('call:offer')
def on_offer(data):
    if not _same_call_target((data or {}).get('to')):
        return

    emit('call:offer', {
        'from': request.sid,
        'description': (data or {}).get('description')
    }, room=(data or {}).get('to'))


@socketio.on('call:answer')
def on_answer(data):
    if not _same_call_target((data or {}).get('to')):
        return

    emit('call:answer', {
        'from': request.sid,
        'description': (data or {}).get('description')
    }, room=(data or {}).get('to'))


@socketio.on('call:ice-candidate')
def on_ice_candidate(data):
    if not _same_call_target((data or {}).get('to')):
        return

    emit('call:ice-candidate', {
        'from': request.sid,
        'candidate': (data or {}).get('candidate')
    }, room=(data or {}).get('to'))


@socketio.on('call:leave')
def on_leave():
    _leave_current_room()


@socketio.on('disconnect')
def on_disconnect():
    _leave_current_room()
