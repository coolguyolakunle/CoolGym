from flask import Blueprint, render_template, request, redirect, url_for, flash
from flask_login import login_required, current_user

from ..extensions import db
from ..models import CoachClient, WorkoutPlan, ProgressLog, Message
from ..utils import coach_required, get_thread

coach = Blueprint('coach', __name__)

@coach.route('/coach')
@login_required
@coach_required
def coach_dashboard():
    clients = CoachClient.query.filter_by(coach_id=current_user.id, is_active=True).all()

    total = len(clients)
    active = sum(1 for cc in clients if cc.client.membership != 'none')

    unread = Message.query.filter_by(
        receiver_id=current_user.id,
        is_read=False
    ).count()

    recent_logs = (
        ProgressLog.query.join(WorkoutPlan)
        .filter(WorkoutPlan.coach_id == current_user.id)
        .order_by(ProgressLog.logged_at.desc())
        .limit(8)
        .all()
    )

    return render_template(
        'coach/dashboard.html',
        clients=clients,
        total=total,
        active=active,
        unread_count=unread,
        recent_logs=recent_logs
    )

@coach.route('/coach/clients')
@login_required
@coach_required
def coach_clients():
    clients = CoachClient.query.filter_by(
        coach_id=current_user.id,
        is_active=True
    ).all()

    return render_template('coach/clients.html', clients=clients)


@coach.route('/coach/clients/<int:client_id>')
@login_required
@coach_required
def coach_client_detail(client_id):
    cc = CoachClient.query.filter_by(
        coach_id=current_user.id,
        client_id=client_id,
        is_active=True
    ).first_or_404()

    plans = WorkoutPlan.query.filter_by(
        coach_id=current_user.id,
        client_id=client_id
    ).order_by(WorkoutPlan.created_at.desc()).all()

    logs = ProgressLog.query.filter_by(
        client_id=client_id
    ).order_by(ProgressLog.logged_at.desc()).all()

    thread = get_thread(current_user.id, client_id)

    return render_template(
        'coach/client_detail.html',
        cc=cc,
        plans=plans,
        logs=logs,
        thread=thread
    )

@coach.route('/coach/plans/create', methods=['POST'])
@login_required
@coach_required
def coach_create_plan():
    cid = request.form.get('client_id', type=int)

    CoachClient.query.filter_by(
        coach_id=current_user.id,
        client_id=cid,
        is_active=True
    ).first_or_404()

    db.session.add(WorkoutPlan(
        coach_id=current_user.id,
        client_id=cid,
        title=request.form['title'],
        description=request.form.get('description', ''),
        weeks=request.form.get('weeks', 4, type=int)
    ))

    db.session.commit()
    flash('Plan created!', 'success')

    return redirect(url_for('coach.coach_client_detail', client_id=cid))


@coach.route('/coach/plans/<int:plan_id>/toggle', methods=['POST'])
@login_required
@coach_required
def coach_toggle_plan(plan_id):
    plan = WorkoutPlan.query.filter_by(
        id=plan_id,
        coach_id=current_user.id
    ).first_or_404()

    plan.is_active = not plan.is_active
    db.session.commit()

    flash('Plan updated.', 'success')

    return redirect(url_for('coach.coach_client_detail', client_id=plan.client_id))


@coach.route('/coach/plans/<int:plan_id>/delete', methods=['POST'])
@login_required
@coach_required
def coach_delete_plan(plan_id):
    plan = WorkoutPlan.query.filter_by(
        id=plan_id,
        coach_id=current_user.id
    ).first_or_404()

    cid = plan.client_id

    db.session.delete(plan)
    db.session.commit()

    flash('Plan deleted.', 'success')

    return redirect(url_for('coach.coach_client_detail', client_id=cid))

@coach.app_context_processor
def inject_unread_count():
    if current_user.is_authenticated and current_user.role == 'coach':
        count = Message.query.filter_by(
            receiver_id=current_user.id,
            is_read=False
        ).count()
        return dict(unread_count=count)
    return dict(unread_count=0)