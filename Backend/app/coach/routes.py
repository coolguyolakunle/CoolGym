from flask import Blueprint, request, jsonify
from flask_login import login_required, current_user

from ..extensions import db
from ..models import CoachClient, WorkoutPlan, ProgressLog, Message
from ..utils import coach_required, get_thread
from ..serializers import coach_client, workout_plan, progress_log, message_obj

coach = Blueprint('coach', __name__)


@coach.route('/api/coach/dashboard')
@login_required
@coach_required
def coach_dashboard():
    clients = CoachClient.query.filter_by(coach_id=current_user.id, is_active=True).all()

    total = len(clients)
    active = sum(1 for cc in clients if cc.client.membership != 'none')

    unread = Message.query.filter_by(receiver_id=current_user.id, is_read=False).count()

    recent_logs = (
        ProgressLog.query.join(WorkoutPlan)
        .filter(WorkoutPlan.coach_id == current_user.id)
        .order_by(ProgressLog.logged_at.desc())
        .limit(8)
        .all()
    )

    return jsonify({
        "clients": [coach_client(c) for c in clients],
        "total": total,
        "active": active,
        "unread_count": unread,
        "recent_logs": [progress_log(l) for l in recent_logs],
    })


@coach.route('/api/coach/clients')
@login_required
@coach_required
def coach_clients():
    clients = CoachClient.query.filter_by(coach_id=current_user.id, is_active=True).all()
    return jsonify({"clients": [coach_client(c) for c in clients]})


@coach.route('/api/coach/clients/<int:client_id>')
@login_required
@coach_required
def coach_client_detail(client_id):
    cc = CoachClient.query.filter_by(coach_id=current_user.id, client_id=client_id, is_active=True).first_or_404()

    plans = WorkoutPlan.query.filter_by(coach_id=current_user.id, client_id=client_id) \
        .order_by(WorkoutPlan.created_at.desc()).all()
    logs = ProgressLog.query.filter_by(client_id=client_id).order_by(ProgressLog.logged_at.desc()).all()
    thread = get_thread(current_user.id, client_id)

    return jsonify({
        "assignment": coach_client(cc),
        "plans": [workout_plan(p) for p in plans],
        "logs": [progress_log(l) for l in logs],
        "thread": [message_obj(m, current_user.id) for m in thread],
    })


@coach.route('/api/coach/plans/create', methods=['POST'])
@login_required
@coach_required
def coach_create_plan():
    data = request.get_json(silent=True) or request.form
    try:
        cid = int(data.get('client_id'))
    except (TypeError, ValueError):
        return jsonify({"error": "validation", "message": "client_id required."}), 400

    CoachClient.query.filter_by(coach_id=current_user.id, client_id=cid, is_active=True).first_or_404()

    try:
        weeks = int(data.get('weeks', 4))
    except (TypeError, ValueError):
        weeks = 4

    plan = WorkoutPlan(
        coach_id=current_user.id, client_id=cid,
        title=data.get('title'), description=data.get('description', ''),
        weeks=weeks
    )
    db.session.add(plan)
    db.session.commit()

    return jsonify({"message": "Plan created!", "plan": workout_plan(plan)}), 201


@coach.route('/api/coach/plans/<int:plan_id>/toggle', methods=['POST'])
@login_required
@coach_required
def coach_toggle_plan(plan_id):
    plan = WorkoutPlan.query.filter_by(id=plan_id, coach_id=current_user.id).first_or_404()
    plan.is_active = not plan.is_active
    db.session.commit()
    return jsonify({"message": "Plan updated.", "plan": workout_plan(plan)})


@coach.route('/api/coach/plans/<int:plan_id>/delete', methods=['POST'])
@login_required
@coach_required
def coach_delete_plan(plan_id):
    plan = WorkoutPlan.query.filter_by(id=plan_id, coach_id=current_user.id).first_or_404()
    db.session.delete(plan)
    db.session.commit()
    return jsonify({"message": "Plan deleted."})
