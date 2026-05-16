import json
import os
import uuid
from dataclasses import dataclass
from datetime import datetime

from flask import Blueprint, abort, current_app, redirect, render_template, request, url_for
from flask_login import current_user, login_required

from ..models import CoachClient, User

calls = Blueprint('calls', __name__)
call_sessions = {}


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
        return []

    try:
        servers = json.loads(raw)
    except json.JSONDecodeError:
        current_app.logger.warning('WEBRTC_ICE_SERVERS must be valid JSON.')
        return []

    return servers if isinstance(servers, list) else []


def can_direct_call(user, partner):
    if user.is_admin or partner.is_admin:
        return True

    if user.role == 'coach' and partner.role == 'member':
        return CoachClient.query.filter_by(
            coach_id=user.id,
            client_id=partner.id,
            is_active=True
        ).first() is not None

    if user.role == 'member' and partner.role == 'coach':
        return CoachClient.query.filter_by(
            coach_id=partner.id,
            client_id=user.id,
            is_active=True
        ).first() is not None

    return False


def visible_group_sessions():
    sessions = sorted(
        call_sessions.values(),
        key=lambda session: session.created_at,
        reverse=True
    )

    if current_user.is_admin:
        return sessions

    if current_user.role == 'coach':
        return [session for session in sessions if session.host_id == current_user.id]

    if current_user.role == 'member':
        coach_ids = {
            assignment.coach_id
            for assignment in current_user.coach_assignments
            if assignment.is_active
        }
        return [session for session in sessions if session.host_id in coach_ids]

    return []


@calls.route('/sessions')
@login_required
def sessions():
    return render_template(
        'calls/sessions.html',
        sessions=visible_group_sessions()
    )


@calls.route('/sessions/new')
@login_required
def new_group_session():
    if current_user.role not in ('coach', 'admin'):
        abort(403)

    return render_template('calls/group_new.html')


@calls.route('/calls/<int:partner_id>')
@login_required
def direct_call(partner_id):
    partner = User.query.get_or_404(partner_id)
    if partner.id == current_user.id or not can_direct_call(current_user, partner):
        abort(403)

    return render_template(
        'calls/room.html',
        room_id=direct_room_id(current_user.id, partner.id),
        room_title=f'Call with {partner.full_name}',
        room_mode='direct',
        partner=partner,
        ice_servers=ice_servers()
    )


@calls.route('/sessions/start', methods=['GET', 'POST'])
@login_required
def start_group_session():
    if request.method == 'POST':
        call_type = request.form.get('call_type', 'group')

        if call_type == 'direct':
            partner_id = request.form.get('partner_id', type=int)
            if not partner_id:
                abort(400)

            partner = User.query.get_or_404(partner_id)
            if partner.id == current_user.id or not can_direct_call(current_user, partner):
                abort(403)

            return redirect(url_for('calls.direct_call', partner_id=partner.id))

        if call_type != 'group':
            abort(400)

    if current_user.role not in ('coach', 'admin'):
        abort(403)

    room_id = f'group-{uuid.uuid4().hex[:12]}'
    title = request.form.get('title', '').strip() if request.method == 'POST' else ''
    call_sessions[room_id] = CallSession(
        room_id=room_id,
        title=title or 'Group Training Session',
        call_type='group',
        host_id=current_user.id
    )

    return redirect(url_for('calls.group_session', room_id=room_id))


@calls.route('/sessions/<room_id>')
@login_required
def group_session(room_id):
    if not room_id.startswith('group-') or len(room_id) > 80:
        abort(404)

    session = call_sessions.get(room_id)

    return render_template(
        'calls/room.html',
        room_id=room_id,
        room_title=session.title if session else 'Group Training Session',
        room_mode='group',
        partner=None,
        ice_servers=ice_servers()
    )
