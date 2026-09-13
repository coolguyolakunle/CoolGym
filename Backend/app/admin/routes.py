from flask import Blueprint, request, jsonify, current_app
import smtplib
from flask_login import login_required, current_user
from datetime import datetime, timedelta
from calendar import month_abbr
from ..utils import save_profile_picture, admin_required, validate_password_strength
from ..extensions import db
from ..models import User, ContactMessage, MembershipBooking, CoachClient, WorkoutPlan, ProgressLog
from ..serializers import user_public, contact_message, booking, coach_client, workout_plan, progress_log
from ..email_service import send_contact_reply
from werkzeug.exceptions import RequestEntityTooLarge

admin = Blueprint('admin', __name__)


@admin.route('/api/admin/dashboard')
@login_required
@admin_required
def admin_dashboard():
    pp = {'basic': 29.49, 'elite': 149.99, 'pro': 249.99}
    active = User.query.filter(User.membership != 'none', User.role == 'member').all()
    week_ago = datetime.utcnow() - timedelta(days=7)

    def shift_month(date, offset):
        month_index = date.month - 1 + offset
        return date.replace(year=date.year + month_index // 12, month=month_index % 12 + 1, day=1)

    this_month = datetime.utcnow().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    months = [shift_month(this_month, offset) for offset in range(-5, 1)]
    month_keys = [(month.year, month.month) for month in months]
    chart_data = {
        'labels': [month_abbr[month.month] for month in months],
        'revenue': [0.0] * len(months),
        'clients': [0] * len(months),
        'subscriptions': [0] * len(months),
        'progress': [0] * len(months),
    }
    index_by_month = {key: index for index, key in enumerate(month_keys)}

    for user in User.query.filter(User.role == 'member', User.joined_at >= months[0]).all():
        index = index_by_month.get((user.joined_at.year, user.joined_at.month))
        if index is not None:
            chart_data['clients'][index] += 1

    for booking_record in MembershipBooking.query.filter(MembershipBooking.booked_at >= months[0]).all():
        index = index_by_month.get((booking_record.booked_at.year, booking_record.booked_at.month))
        if index is not None:
            chart_data['subscriptions'][index] += 1
            chart_data['revenue'][index] += pp.get(booking_record.plan, 0)

    for log in ProgressLog.query.filter(ProgressLog.logged_at >= months[0]).all():
        index = index_by_month.get((log.logged_at.year, log.logged_at.month))
        if index is not None:
            chart_data['progress'][index] += 1

    return jsonify({
        "total_users": User.query.filter_by(role='member').count(),
        "total_coaches": User.query.filter_by(role='coach').count(),
        "active_members": len(active),
        "total_messages": ContactMessage.query.count(),
        "total_bookings": MembershipBooking.query.count(),
        "total_assignments": CoachClient.query.filter_by(is_active=True).count(),
        "revenue": sum(pp.get(u.membership, 0) for u in active),
        "new_this_week": User.query.filter(User.joined_at >= week_ago, User.role == 'member').count(),
        "membership_counts": {k: User.query.filter_by(membership=k, role='member').count() for k in ('none', 'basic', 'elite', 'pro')},
        "charts": chart_data,
        "recent_users": [user_public(u) for u in User.query.filter_by(role='member').order_by(User.joined_at.desc()).limit(5).all()],
        "recent_messages": [contact_message(m) for m in ContactMessage.query.order_by(ContactMessage.sent_at.desc()).limit(5).all()],
        "recent_bookings": [booking(b) for b in MembershipBooking.query.order_by(MembershipBooking.booked_at.desc()).limit(5).all()],
    })


@admin.route('/api/admin/coaches')
@login_required
@admin_required
def admin_coaches():
    coaches = User.query.filter_by(role='coach').order_by(User.joined_at.desc()).all()
    return jsonify({"coaches": [user_public(c) for c in coaches]})


@admin.route('/api/admin/coaches/add', methods=['POST'])
@login_required
@admin_required
def admin_add_coach():
    data = request.get_json(silent=True) or request.form
    password = data.get('password') or ''
    password_error = validate_password_strength(password)
    if password_error:
        return jsonify({"error": "validation", "message": password_error}), 400
    if User.query.filter_by(email=data.get('email')).first():
        return jsonify({"error": "validation", "message": "Email exists."}), 400

    u = User(
        first_name=data.get('first_name'), last_name=data.get('last_name'),
        email=data.get('email'), role='coach',
        specialty=data.get('specialty', ''), bio=data.get('bio', ''),
        phone_number=(data.get('phone_number') or '').strip() or None
    )
    u.set_password(password)
    if 'image' in request.files and request.files['image'].filename:
        try:
            u.image_file = save_profile_picture(request.files['image'])
        except Exception:
            return jsonify({"error": "upload_failed", "message": "Coach image upload failed."}), 400
    db.session.add(u)
    db.session.commit()

    return jsonify({"message": f"Coach {u.full_name} created.", "coach": user_public(u)}), 201


@admin.route('/api/admin/coaches/<int:coach_id>', methods=['GET', 'POST'])
@login_required
@admin_required
def admin_coach_detail(coach_id):
    coach = User.query.filter_by(id=coach_id, role='coach').first_or_404()

    if request.method == 'POST':
        data = request.form if request.files else (request.get_json(silent=True) or request.form)
        action = data.get('action')

        if action == 'update':
            coach.first_name = data.get('first_name', coach.first_name)
            coach.last_name = data.get('last_name', coach.last_name)
            coach.email = data.get('email', coach.email)
            coach.specialty = data.get('specialty', '')
            coach.bio = data.get('bio', '')
            coach.phone_number = (data.get('phone_number') or '').strip() or None
            coach.is_active = str(data.get('is_active', '')).lower() in ('true', 'on', '1', 'yes')

            if 'image' in request.files:
                file = request.files['image']
                if file and file.filename != '':
                    try:
                        coach.image_file = save_profile_picture(file)
                    except Exception as exc:
                        current_app.logger.exception("Coach image upload failed")
                        return jsonify({"error": "upload_failed", "message": f"Image upload failed: {str(exc)}"}), 400

            if data.get('new_password'):
                password_error = validate_password_strength(data.get('new_password'))
                if password_error:
                    return jsonify({"error": "validation", "message": password_error}), 400
                coach.set_password(data.get('new_password'))

            db.session.commit()
            return jsonify({"message": "Coach updated.", "coach": user_public(coach)})

        elif action == 'delete':
            CoachClient.query.filter_by(coach_id=coach.id).delete()
            db.session.delete(coach)
            db.session.commit()
            return jsonify({"message": "Coach deleted."})

    assignments = CoachClient.query.filter_by(coach_id=coach_id).all()
    return jsonify({"coach": user_public(coach), "assignments": [coach_client(a) for a in assignments]})


@admin.route('/api/admin/assign', methods=['GET', 'POST'])
@login_required
@admin_required
def admin_assign():
    if request.method == 'POST':
        data = request.get_json(silent=True) or request.form
        try:
            cid = int(data.get('coach_id'))
            mid = int(data.get('client_id'))
        except (TypeError, ValueError):
            return jsonify({"error": "validation", "message": "coach_id and client_id are required."}), 400

        if CoachClient.query.filter_by(coach_id=cid, client_id=mid, is_active=True).first():
            return jsonify({"error": "validation", "message": "Already assigned."}), 400

        cc = CoachClient(coach_id=cid, client_id=mid, notes=data.get('notes', ''))
        db.session.add(cc)
        db.session.commit()
        return jsonify({"message": "Client assigned!", "assignment": coach_client(cc)}), 201

    return jsonify({
        "coaches": [user_public(c) for c in User.query.filter_by(role='coach', is_active=True).all()],
        "members": [user_public(m) for m in User.query.filter_by(role='member').order_by(User.first_name).all()],
        "assignments": [coach_client(a) for a in CoachClient.query.filter_by(is_active=True).order_by(CoachClient.assigned_at.desc()).all()],
    })


@admin.route('/api/admin/assign/<int:aid>/remove', methods=['POST'])
@login_required
@admin_required
def admin_remove_assignment(aid):
    cc = CoachClient.query.get_or_404(aid)
    cc.is_active = False
    db.session.commit()
    return jsonify({"message": "Assignment removed."})


@admin.route('/api/admin/users')
@login_required
@admin_required
def admin_users():
    s = request.args.get('search', '').strip()
    mf = request.args.get('membership', '')
    pg = request.args.get('page', 1, type=int)

    q = User.query.filter_by(role='member')
    if s:
        q = q.filter((User.first_name.ilike(f'%{s}%')) | (User.last_name.ilike(f'%{s}%')) | (User.email.ilike(f'%{s}%')))
    if mf:
        q = q.filter_by(membership=mf)

    p = q.order_by(User.joined_at.desc()).paginate(page=pg, per_page=15, error_out=False)

    return jsonify({
        "users": [user_public(u) for u in p.items],
        "page": p.page, "pages": p.pages, "total": p.total,
        "search": s, "membership_filter": mf,
    })


@admin.route('/api/admin/users/<int:uid>', methods=['GET', 'POST'])
@login_required
@admin_required
def admin_user_detail(uid):
    user = User.query.get_or_404(uid)

    if request.method == 'POST':
        data = request.get_json(silent=True) or request.form
        action = data.get('action')

        if action == 'update':
            user.first_name = data.get('first_name', user.first_name)
            user.last_name = data.get('last_name', user.last_name)
            user.email = data.get('email', user.email)
            user.membership = data.get('membership', user.membership)
            user.phone_number = (data.get('phone_number') or '').strip() or None
            if data.get('new_password'):
                password_error = validate_password_strength(data.get('new_password'))
                if password_error:
                    return jsonify({"error": "validation", "message": password_error}), 400
                user.set_password(data.get('new_password'))
            db.session.commit()
            return jsonify({"message": f"{user.full_name} updated.", "user": user_public(user)})

        elif action == 'delete':
            if user.id == current_user.id:
                return jsonify({"error": "validation", "message": "Can't delete yourself."}), 400
            MembershipBooking.query.filter_by(user_id=user.id).delete()
            CoachClient.query.filter((CoachClient.coach_id == user.id) | (CoachClient.client_id == user.id)).delete()
            db.session.delete(user)
            db.session.commit()
            return jsonify({"message": "Deleted."})

    bookings = MembershipBooking.query.filter_by(user_id=uid).order_by(MembershipBooking.booked_at.desc()).all()
    assignment = CoachClient.query.filter_by(client_id=uid, is_active=True).first()
    plans = WorkoutPlan.query.filter_by(client_id=uid).order_by(WorkoutPlan.created_at.desc()).all()
    logs = ProgressLog.query.filter_by(client_id=uid).order_by(ProgressLog.logged_at.desc()).all()

    return jsonify({
        "user": user_public(user),
        "bookings": [booking(b) for b in bookings],
        "assignment": coach_client(assignment) if assignment else None,
        "plans": [workout_plan(p) for p in plans],
        "logs": [progress_log(l) for l in logs],
    })


@admin.route('/api/admin/users/<int:uid>/revoke-membership', methods=['POST'])
@login_required
@admin_required
def admin_revoke_membership(uid):
    user = User.query.filter_by(id=uid, role='member').first_or_404()
    MembershipBooking.query.filter_by(user_id=user.id, status='active').update({'status': 'cancelled'})
    user.membership = 'none'
    db.session.commit()
    return jsonify({"message": "Membership revoked.", "user": user_public(user)})


@admin.route('/api/admin/users/add', methods=['POST'])
@login_required
@admin_required
def admin_add_user():
    data = request.get_json(silent=True) or request.form
    password = data.get('password') or ''
    if not password:
        return jsonify({"error": "validation", "message": "Password is required."}), 400
    if User.query.filter_by(email=data.get('email')).first():
        return jsonify({"error": "validation", "message": "Email exists."}), 400

    u = User(
        first_name=data.get('first_name'), last_name=data.get('last_name'),
        email=data.get('email'), membership=data.get('membership', 'none'), role='member'
    )
    # This endpoint only creates members and is protected by admin_required.
    # Do not accept a client-provided bypass flag; derive it from the session.
    if not (current_user.is_authenticated and current_user.role == 'admin'):
        password_error = validate_password_strength(password)
        if password_error:
            return jsonify({"error": "validation", "message": password_error}), 400
    u.set_password(password)
    db.session.add(u)
    db.session.commit()

    return jsonify({"message": f"{u.full_name} created.", "user": user_public(u)}), 201


@admin.route('/api/admin/memberships')
@login_required
@admin_required
def admin_memberships():
    pg = request.args.get('page', 1, type=int)
    sf = request.args.get('status', '')
    pf = request.args.get('plan', '')

    q = MembershipBooking.query
    if sf:
        q = q.filter_by(status=sf)
    if pf:
        q = q.filter_by(plan=pf)

    p = q.order_by(MembershipBooking.booked_at.desc()).paginate(page=pg, per_page=20, error_out=False)

    return jsonify({
        "bookings": [booking(b) for b in p.items],
        "page": p.page, "pages": p.pages, "total": p.total,
        "status_filter": sf, "plan_filter": pf,
    })


@admin.route('/api/admin/memberships/<int:bid>/update', methods=['POST'])
@login_required
@admin_required
def admin_update_booking(bid):
    b = MembershipBooking.query.get_or_404(bid)
    data = request.get_json(silent=True) or request.form
    ns = data.get('status')

    if ns in ('pending', 'active', 'cancelled'):
        b.status = ns
        if ns == 'active':
            b.user.membership = b.plan
        elif ns == 'cancelled':
            if not MembershipBooking.query.filter_by(user_id=b.user_id, status='active').first():
                b.user.membership = 'none'
        db.session.commit()
        return jsonify({"message": "Updated.", "booking": booking(b)})

    return jsonify({"error": "validation", "message": "Invalid status."}), 400


@admin.route('/api/admin/messages')
@login_required
@admin_required
def admin_messages():
    pg = request.args.get('page', 1, type=int)
    p = ContactMessage.query.order_by(ContactMessage.sent_at.desc()).paginate(page=pg, per_page=20, error_out=False)
    return jsonify({
        "messages": [contact_message(m) for m in p.items],
        "page": p.page, "pages": p.pages, "total": p.total,
    })


@admin.route('/api/admin/messages/<int:mid>/reply', methods=['POST'])
@login_required
@admin_required
def admin_reply_to_message(mid):
    contact = ContactMessage.query.get_or_404(mid)
    data = request.get_json(silent=True) or request.form
    reply_body = (data.get('body') or '').strip()
    if not reply_body:
        return jsonify({"error": "validation", "message": "Reply message required."}), 400

    try:
        send_contact_reply(contact, reply_body)
    except (OSError, ValueError, smtplib.SMTPException, RuntimeError) as exc:
        current_app.logger.exception("Unable to send contact reply")
        return jsonify({"error": "email_failed", "message": str(exc)}), 502

    return jsonify({"message": "Reply sent to {}.".format(contact.email)})


@admin.route('/api/admin/messages/<int:mid>/delete', methods=['POST'])
@login_required
@admin_required
def admin_delete_message(mid):
    m = ContactMessage.query.get_or_404(mid)
    db.session.delete(m)
    db.session.commit()
    return jsonify({"message": "Deleted."})


@admin.route('/api/admin/stats')
@login_required
@admin_required
def admin_api_stats():
    signups = []
    for i in range(13, -1, -1):
        day = datetime.utcnow().date() - timedelta(days=i)
        signups.append({
            'date': day.strftime('%b %d'),
            'count': User.query.filter(db.func.date(User.joined_at) == day, User.role == 'member').count()
        })

    return jsonify({
        'signups': signups,
        'distribution': {
            'Pro': User.query.filter_by(membership='pro', role='member').count(),
            'Elite': User.query.filter_by(membership='elite', role='member').count(),
            'Basic': User.query.filter_by(membership='basic', role='member').count(),
            'None': User.query.filter_by(membership='none', role='member').count(),
        }
    })


@admin.errorhandler(RequestEntityTooLarge)
def file_too_large(e):
    return jsonify({"error": "file_too_large", "message": "That file is too large. Please upload an image smaller than 10 MB."}), 413
