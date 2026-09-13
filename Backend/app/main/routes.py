from flask import Blueprint, request, jsonify, current_app
from flask_login import login_required, current_user
from ..extensions import db
from ..models import User, ContactMessage, MembershipBooking, CoachClient, WorkoutPlan, ProgressLog, Message
from ..utils import get_thread, save_profile_picture
from ..serializers import user_public, workout_plan, progress_log, message_obj
from ..extensions import socketio
from ..message_sockets import user_room
from datetime import datetime, timedelta
from werkzeug.exceptions import RequestEntityTooLarge

main = Blueprint('main', __name__)


@main.route('/api/contact', methods=['POST'])
def contact():
    data = request.get_json(silent=True) or request.form

    if not data.get('name') or not data.get('email') or not data.get('message'):
        return jsonify({"error": "validation", "message": "Name, email and message are required."}), 400

    msg = ContactMessage(
        name=data.get('name'),
        email=data.get('email'),
        subject=data.get('subject', ''),
        message=data.get('message')
    )
    db.session.add(msg)
    db.session.commit()

    return jsonify({"message": "Your message has been sent!"}), 201


# ── Member dashboard ─────────────────────────────

@main.route('/api/dashboard')
@login_required
def dashboard():
    if current_user.role in ('admin', 'coach'):
        return jsonify({"error": "wrong_role", "message": "Use the admin/coach dashboard instead."}), 400

    assignment = CoachClient.query.filter_by(client_id=current_user.id, is_active=True).first()
    my_coach = assignment.coach if assignment else None
    active_plan = WorkoutPlan.query.filter_by(client_id=current_user.id, is_active=True) \
        .order_by(WorkoutPlan.created_at.desc()).first()
    logs = ProgressLog.query.filter_by(client_id=current_user.id) \
        .order_by(ProgressLog.logged_at.desc()).limit(5).all()

    return jsonify({
        "my_coach": user_public(my_coach) if my_coach else None,
        "active_plan": workout_plan(active_plan) if active_plan else None,
        "logs": [progress_log(l) for l in logs],
    })


@main.route('/api/profile-picture', methods=['POST'])
@login_required
def update_profile_picture():
    file = request.files.get('image')

    if not file or file.filename == '':
        return jsonify({"error": "validation", "message": "Please choose an image to upload."}), 400

    try:
        url = save_profile_picture(file)
    except Exception as exc:
        current_app.logger.exception("Profile image upload failed")
        return jsonify({"error": "upload_failed", "message": f"Image upload failed: {str(exc)}"}), 400

    if url:
        current_user.image_file = url
        db.session.commit()

    return jsonify({"message": "Profile picture updated.", "user": user_public(current_user)})


@main.route('/api/profile', methods=['POST'])
@login_required
def update_profile():
    data = request.get_json(silent=True) or request.form
    current_user.phone_number = (data.get('phone_number') or '').strip() or None
    db.session.commit()
    return jsonify({"message": "Profile updated.", "user": user_public(current_user)})


@main.route('/api/book-membership/<plan>', methods=['POST'])
@login_required
def book_membership(plan):
    if plan not in ('basic', 'elite', 'pro'):
        return jsonify({"error": "validation", "message": "Invalid plan."}), 400

    MembershipBooking.query.filter_by(user_id=current_user.id, status='active').update({'status': 'cancelled'})
    db.session.add(MembershipBooking(user_id=current_user.id, plan=plan, status='active'))
    current_user.membership = plan
    db.session.commit()

    return jsonify({"message": f"Enrolled in {plan.capitalize()} plan!", "user": user_public(current_user)})


@main.route('/api/cancel-membership', methods=['POST'])
@login_required
def cancel_membership():
    MembershipBooking.query.filter_by(user_id=current_user.id, status='active').update({'status': 'cancelled'})
    current_user.membership = 'none'
    db.session.commit()

    return jsonify({"message": "Membership cancelled.", "user": user_public(current_user)})


@main.route('/api/my-plan/log', methods=['POST'])
@login_required
def log_progress():
    data = request.get_json(silent=True) or request.form
    try:
        plan_id = int(data.get('plan_id'))
    except (TypeError, ValueError):
        return jsonify({"error": "validation", "message": "plan_id is required."}), 400

    plan = WorkoutPlan.query.get_or_404(plan_id)
    if plan.client_id != current_user.id:
        return jsonify({"error": "forbidden"}), 403

    def to_int(v, default=None):
        try:
            return int(v)
        except (TypeError, ValueError):
            return default

    def to_float(v):
        try:
            return float(v)
        except (TypeError, ValueError):
            return None

    log = ProgressLog(
        plan_id=plan.id,
        client_id=current_user.id,
        week=to_int(data.get('week')),
        note=data.get('note', ''),
        weight_kg=to_float(data.get('weight_kg')),
        sessions=to_int(data.get('sessions'), 0),
        rating=to_int(data.get('rating'), 3),
    )
    db.session.add(log)
    db.session.commit()

    return jsonify({"message": "Progress logged!", "log": progress_log(log)}), 201


# ── Messaging ─────────────────────────────────

@main.route('/api/messages')
@login_required
def messages_inbox():
    sent_ids = {r[0] for r in db.session.query(Message.receiver_id)
                .filter_by(sender_id=current_user.id).all()}
    recv_ids = {r[0] for r in db.session.query(Message.sender_id)
                .filter_by(receiver_id=current_user.id).all()}

    partners = User.query.filter(User.id.in_(sent_ids | recv_ids)).all()

    convos = []
    for p in partners:
        thread = get_thread(current_user.id, p.id)
        unread = sum(1 for m in thread if m.receiver_id == current_user.id and not m.is_read)
        last = thread[-1] if thread else None
        convos.append({
            'partner': user_public(p),
            'last': message_obj(last, current_user.id) if last else None,
            'unread': unread,
            'sort_key': last.sent_at.isoformat() if last else '',
        })

    convos.sort(key=lambda c: c['sort_key'], reverse=True)
    for c in convos:
        c.pop('sort_key', None)

    my_coach = None
    assignment = CoachClient.query.filter_by(client_id=current_user.id, is_active=True).first()
    if assignment:
        my_coach = user_public(assignment.coach)

    return jsonify({"convos": convos, "my_coach": my_coach})


@main.route('/api/messages/<int:partner_id>', methods=['GET', 'POST'])
@login_required
def messages_thread(partner_id):
    partner = User.query.get_or_404(partner_id)

    if current_user.role == 'member':
        assignment = CoachClient.query.filter_by(client_id=current_user.id, is_active=True).first()
        allowed = {u.id for u in User.query.filter_by(role='admin').all()}
        if assignment:
            allowed.add(assignment.coach_id)
        if partner_id not in allowed:
            return jsonify({"error": "forbidden", "message": "You can only message your assigned coach or admin."}), 403

    if request.method == 'POST':
        data = request.get_json(silent=True) or request.form
        body = (data.get('body') or '').strip()
        if body:
            m = Message(sender_id=current_user.id, receiver_id=partner_id, body=body)
            db.session.add(m)
            db.session.commit()
            message = message_obj(m, current_user.id)
            socketio.emit(
                "message:unread",
                {
                    "message": message,
                    "sender": user_public(current_user),
                },
                room=user_room(partner_id),
            )
            return jsonify({"message_obj": message}), 201
        return jsonify({"error": "validation", "message": "Message body required."}), 400

    Message.query.filter_by(sender_id=partner_id, receiver_id=current_user.id, is_read=False) \
        .update({'is_read': True})
    db.session.commit()

    thread = get_thread(current_user.id, partner_id)

    my_coach = None
    assignment = CoachClient.query.filter_by(client_id=current_user.id, is_active=True).first()
    if assignment:
        my_coach = user_public(assignment.coach)

    return jsonify({
        "partner": user_public(partner),
        "thread": [message_obj(m, current_user.id) for m in thread],
        "my_coach": my_coach,
    })


@main.route('/api/messages/poll/<int:partner_id>')
@login_required
def messages_poll(partner_id):
    try:
        since = datetime.fromisoformat(request.args.get('since', ''))
    except (ValueError, TypeError):
        since = datetime.utcnow() - timedelta(seconds=15)

    msgs = Message.query.filter(
        ((Message.sender_id == partner_id) & (Message.receiver_id == current_user.id)) |
        ((Message.sender_id == current_user.id) & (Message.receiver_id == partner_id)),
        Message.sent_at > since
    ).order_by(Message.sent_at.asc()).all()

    for m in msgs:
        if m.receiver_id == current_user.id:
            m.is_read = True

    db.session.commit()

    return jsonify([message_obj(m, current_user.id) for m in msgs])


@main.errorhandler(RequestEntityTooLarge)
def file_too_large(e):
    return jsonify({"error": "file_too_large", "message": "That file is too large. Please upload an image smaller than 10 MB."}), 413
