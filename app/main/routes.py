from flask import Blueprint, render_template, request, redirect, url_for, flash, jsonify
from flask_login import login_required, current_user
from ..extensions import db
from ..models import User, ContactMessage, MembershipBooking, CoachClient, WorkoutPlan, ProgressLog, Message
from app.utils import after_login_url, get_thread
from datetime import datetime, timedelta

main = Blueprint('main', __name__)

@main.route('/')
def index():
    return render_template('index.html')

@main.route('/about')
def about():
    return render_template('about.html')

@main.route('/classes')
def classes():
    return render_template('classes.html')

@main.route('/membership')
def membership():
    return render_template('membership.html')

@main.route('/services')
def services():
    return render_template('services.html')

@main.route('/contact', methods=['GET', 'POST'])
def contact():
    if request.method == 'POST':
        msg = ContactMessage(
            name=request.form['name'],
            email=request.form['email'],
            subject=request.form.get('subject', ''),
            message=request.form['message']
        )
        db.session.add(msg)
        db.session.commit()

        flash('Your message has been sent!', 'success')
        return redirect(url_for('main.contact'))

    return render_template('contact.html')


# MEMBERSHIP (user side)

@main.route('/dashboard')
@login_required
def dashboard():
    if current_user.role == 'admin': return redirect(url_for('admin.admin_dashboard'))
    if current_user.role == 'coach': return redirect(url_for('coach.coach_dashboard'))
    assignment  = CoachClient.query.filter_by(client_id=current_user.id, is_active=True).first()
    my_coach    = assignment.coach if assignment else None
    active_plan = WorkoutPlan.query.filter_by(client_id=current_user.id, is_active=True).order_by(WorkoutPlan.created_at.desc()).first()
    logs        = ProgressLog.query.filter_by(client_id=current_user.id).order_by(ProgressLog.logged_at.desc()).limit(5).all()
    return render_template('dashboard.html', my_coach=my_coach, active_plan=active_plan, logs=logs)


@main.route('/book-membership/<plan>', methods=['POST'])
@login_required
def book_membership(plan):
    if plan not in ('basic','elite','pro'): flash('Invalid plan.','error'); return redirect(url_for('membership'))
    MembershipBooking.query.filter_by(user_id=current_user.id,status='active').update({'status':'cancelled'})
    db.session.add(MembershipBooking(user_id=current_user.id,plan=plan,status='active'))
    current_user.membership = plan; db.session.commit()
    flash(f'Enrolled in {plan.capitalize()} plan!','success'); return redirect(url_for('main.dashboard'))


@main.route('/cancel-membership', methods=['POST'])
@login_required
def cancel_membership():
    MembershipBooking.query.filter_by(user_id=current_user.id,status='active').update({'status':'cancelled'})
    current_user.membership = 'none'; db.session.commit()
    flash('Membership cancelled.','info'); return redirect(url_for('main.dashboard'))


@main.route('/my-plan/log', methods=['POST'])
@login_required
def log_progress():
    plan = WorkoutPlan.query.get_or_404(request.form.get('plan_id',type=int))
    if plan.client_id != current_user.id: abort(403)
    db.session.add(ProgressLog(plan_id=plan.id,client_id=current_user.id,
        week=request.form.get('week',type=int),note=request.form.get('note',''),
        weight_kg=request.form.get('weight_kg',type=float),
        sessions=request.form.get('sessions',0,type=int),
        rating=request.form.get('rating',3,type=int)))
    db.session.commit(); flash('Progress logged!','success')
    return redirect(url_for('main.dashboard'))


# ── Messaging ─────────────────────────────────

@main.route('/messages')
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

        convos.append({
            'partner': p,
            'last': thread[-1] if thread else None,
            'unread': unread
        })

    convos.sort(
        key=lambda c: c['last'].sent_at if c['last'] else datetime.min,
        reverse=True
    )

    # ✅ ADD THIS PART
    my_coach = None
    assignment = CoachClient.query.filter_by(
        client_id=current_user.id,
        is_active=True
    ).first()

    if assignment:
        my_coach = assignment.coach

    return render_template(
        'messages/inbox.html',
        convos=convos,
        my_coach=my_coach
    )

@main.route('/messages/<int:partner_id>', methods=['GET','POST'])
@login_required
def messages_thread(partner_id):
    partner = User.query.get_or_404(partner_id)

    if current_user.role == 'member':
        assignment = CoachClient.query.filter_by(
            client_id=current_user.id,
            is_active=True
        ).first()

        allowed = {u.id for u in User.query.filter_by(role='admin').all()}

        if assignment:
            allowed.add(assignment.coach_id)

        if partner_id not in allowed:
            flash("You can only message your assigned coach or admin.", 'error')
            return redirect(url_for('main.messages_inbox'))

    if request.method == 'POST':
        body = request.form.get('body','').strip()
        if body:
            db.session.add(Message(
                sender_id=current_user.id,
                receiver_id=partner_id,
                body=body
            ))
            db.session.commit()

        return redirect(url_for('main.messages_thread', partner_id=partner_id))

    Message.query.filter_by(
        sender_id=partner_id,
        receiver_id=current_user.id,
        is_read=False
    ).update({'is_read': True})

    db.session.commit()

    thread = get_thread(current_user.id, partner_id)

    # ✅ ADD COACH CONTEXT
    my_coach = None
    assignment = CoachClient.query.filter_by(
        client_id=current_user.id,
        is_active=True
    ).first()

    if assignment:
        my_coach = assignment.coach

    return render_template(
        'messages/thread.html',
        partner=partner,
        thread=thread,
        my_coach=my_coach
    )

@main.route('/messages/api/poll/<int:partner_id>')
@login_required
def messages_poll(partner_id):
    try:
        since = datetime.fromisoformat(request.args.get('since',''))
    except:
        since = datetime.utcnow() - timedelta(seconds=15)

    msgs = Message.query.filter(
        ((Message.sender_id==partner_id)&(Message.receiver_id==current_user.id))|
        ((Message.sender_id==current_user.id)&(Message.receiver_id==partner_id)),
        Message.sent_at > since
    ).order_by(Message.sent_at.asc()).all()

    for m in msgs:
        if m.receiver_id == current_user.id:
            m.is_read = True

    db.session.commit()

    return jsonify([{
        'id': m.id,
        'body': m.body,
        'sender_id': m.sender_id,
        'sent_at': m.sent_at.strftime('%H:%M'),
        'sent_at_iso': m.sent_at.isoformat(),
        'is_mine': m.sender_id == current_user.id
    } for m in msgs])