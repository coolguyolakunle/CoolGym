import json
import os
import uuid
from dataclasses import dataclass
from datetime import datetime

from flask import Blueprint, current_app, jsonify, request
from flask_login import current_user, login_required

from ..models import CoachClient, User
from ..serializers import user_public

calls = Blueprint('calls', __name__)
call_sessions = {}
DEFAULT_ICE_SERVERS = [
    {'urls': 'stun:stun.l.google.com:19302'},
    {'urls': 'stun:stun1.l.google.com:19302'},
    {
        'urls': 'turn:openrelay.metered.ca:80',
        'username': 'openrelayproject',
        'credential': 'openrelayproject',
    },
    {
        'urls': 'turn:openrelay.metered.ca:443',
        'username': 'openrelayproject',
        'credential': 'openrelayproject',
    },
]


@dataclass
class CallSession:
    room_id: str
    title: str
    call_type: str
    host_id: int
    status: str = 'active'
    created_at: datetime = None
    ended_at: datetime = None

    def __post_init__(self):
        if self.created_at is None:
            self.created_at = datetime.utcnow()

    @property
    def host(self):
        return User.query.get(self.host_id)


def direct_room_id(user_a_id, user_b_id):
    low, high = sorted((int(user_a_id), int(user_b_id)))
    return f'direct-{low}-{high}'


def ice_servers():
    raw = os.getenv('WEBRTC_ICE_SERVERS', '').strip()
    if not raw:
        return DEFAULT_ICE_SERVERS

    try:
        servers = json.loads(raw)
    except json.JSONDecodeError:
        current_app.logger.warning('WEBRTC_ICE_SERVERS must be valid JSON.')
        return DEFAULT_ICE_SERVERS

    if not isinstance(servers, list) or not servers:
        current_app.logger.warning('WEBRTC_ICE_SERVERS must be a non-empty JSON list.')
        return DEFAULT_ICE_SERVERS

    return servers


def can_direct_call(user, partner):
    if user.is_admin or partner.is_admin:
        return True

    if user.role == 'coach' and partner.role == 'member':
        return CoachClient.query.filter_by(coach_id=user.id, client_id=partner.id, is_active=True).first() is not None

    if user.role == 'member' and partner.role == 'coach':
        return CoachClient.query.filter_by(coach_id=partner.id, client_id=user.id, is_active=True).first() is not None

    return False


def visible_group_sessions():
    sessions = sorted(call_sessions.values(), key=lambda session: session.created_at, reverse=True)

    if current_user.is_admin:
        return sessions

    if current_user.role == 'coach':
        return [session for session in sessions if session.host_id == current_user.id]

    if current_user.role == 'member':
        coach_ids = {a.coach_id for a in current_user.coach_assignments if a.is_active}
        return [session for session in sessions if session.host_id in coach_ids]

    return []


def session_public(s):
    return {
        "room_id": s.room_id,
        "title": s.title,
        "call_type": s.call_type,
        "host": user_public(s.host) if s.host else None,
        "status": s.status,
        "created_at": s.created_at.isoformat() if s.created_at else None,
    }


@calls.route('/api/sessions')
@login_required
def sessions():
    return jsonify({"sessions": [session_public(s) for s in visible_group_sessions()]})


@calls.route('/api/sessions/start', methods=['POST'])
@login_required
def start_group_session():
    data = request.get_json(silent=True) or request.form
    call_type = data.get('call_type', 'group')

    if call_type == 'direct':
        try:
            partner_id = int(data.get('partner_id'))
        except (TypeError, ValueError):
            return jsonify({"error": "validation", "message": "partner_id required."}), 400

        partner = User.query.get_or_404(partner_id)
        if partner.id == current_user.id or not can_direct_call(current_user, partner):
            return jsonify({"error": "forbidden"}), 403

        return jsonify({"room_id": direct_room_id(current_user.id, partner.id), "room_mode": "direct"})

    if call_type != 'group':
        return jsonify({"error": "validation", "message": "Invalid call_type."}), 400

    if current_user.role not in ('coach', 'admin'):
        return jsonify({"error": "forbidden"}), 403

    room_id = f'group-{uuid.uuid4().hex[:12]}'
    title = (data.get('title') or '').strip()
    call_sessions[room_id] = CallSession(
        room_id=room_id, title=title or 'Group Training Session',
        call_type='group', host_id=current_user.id
    )

    return jsonify({"room_id": room_id, "room_mode": "group"}), 201


@calls.route('/api/calls/room/<room_id>')
@login_required
def room_info(room_id):
    """Metadata needed by the React call-room page: title, mode, partner, ICE servers."""
    if room_id.startswith('group-'):
        if len(room_id) > 80:
            return jsonify({"error": "not_found"}), 404
        session = call_sessions.get(room_id)
        return jsonify({
            "room_id": room_id,
            "room_title": session.title if session else 'Group Training Session',
            "room_mode": "group",
            "partner": None,
            "ice_servers": ice_servers(),
        })

    if room_id.startswith('direct-'):
        try:
            _, a, b = room_id.split('-', 2)
            ids = {int(a), int(b)}
        except (TypeError, ValueError):
            return jsonify({"error": "not_found"}), 404

        if current_user.id not in ids:
            return jsonify({"error": "forbidden"}), 403

        partner_id = next(uid for uid in ids if uid != current_user.id)
        partner = User.query.get_or_404(partner_id)
        if not can_direct_call(current_user, partner):
            return jsonify({"error": "forbidden"}), 403

        return jsonify({
            "room_id": room_id,
            "room_title": f'Call with {partner.full_name}',
            "room_mode": "direct",
            "partner": user_public(partner),
            "ice_servers": ice_servers(),
        })

    return jsonify({"error": "not_found"}), 404


@calls.route('/api/calls/can-call/<int:partner_id>')
@login_required
def can_call(partner_id):
    partner = User.query.get_or_404(partner_id)
    allowed = partner.id != current_user.id and can_direct_call(current_user, partner)
    return jsonify({"allowed": allowed, "room_id": direct_room_id(current_user.id, partner.id) if allowed else None})
