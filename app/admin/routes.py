from flask import Blueprint, render_template, request, redirect, url_for, flash, abort, jsonify
from flask_login import login_required, current_user
from functools import wraps
from datetime import datetime, timedelta
from app.utils import save_profile_picture
from ..extensions import db
from ..models import User, ContactMessage, MembershipBooking, CoachClient

admin = Blueprint('admin', __name__)


# ADMIN DECORATOR
def admin_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if not current_user.is_authenticated or not current_user.is_admin:
            abort(403)
        return f(*args, **kwargs)
    return decorated


# DASHBOARD
@admin.route('/admin')
@login_required
@admin_required
def admin_dashboard():
    pp = {'basic':29.49,'elite':149.99,'pro':249.99}
    active = User.query.filter(User.membership!='none',User.role=='member').all()
    week_ago = datetime.utcnow() - timedelta(days=7)
    return render_template('admin/dashboard.html',
        total_users   = User.query.filter_by(role='member').count(),
        total_coaches = User.query.filter_by(role='coach').count(),
        active_members= len(active),
        total_messages= ContactMessage.query.count(),
        total_bookings= MembershipBooking.query.count(),
        total_assignments = CoachClient.query.filter_by(is_active=True).count(),
        revenue       = sum(pp.get(u.membership,0) for u in active),
        new_this_week = User.query.filter(User.joined_at>=week_ago,User.role=='member').count(),
        membership_counts = {k:User.query.filter_by(membership=k,role='member').count() for k in ('none','basic','elite','pro')},
        recent_users  = User.query.filter_by(role='member').order_by(User.joined_at.desc()).limit(5).all(),
        recent_messages = ContactMessage.query.order_by(ContactMessage.sent_at.desc()).limit(5).all(),
        recent_bookings = MembershipBooking.query.order_by(MembershipBooking.booked_at.desc()).limit(5).all(),
    )

@admin.route('/admin/coaches')
@login_required
@admin_required
def admin_coaches():
    coaches = User.query.filter_by(role='coach').order_by(User.joined_at.desc()).all()
    return render_template('admin/coaches.html', coaches=coaches)

@admin.route('/admin/coaches/add', methods=['GET','POST'])
@login_required
@admin_required
def admin_add_coach():
    if request.method == 'POST':
        if User.query.filter_by(email=request.form['email']).first():
            flash('Email exists.','error'); return redirect(url_for('admin.admin_add_coach'))
        u = User(first_name=request.form['first_name'],last_name=request.form['last_name'],
            email=request.form['email'],role='coach',
            specialty=request.form.get('specialty',''),bio=request.form.get('bio',''))
        u.set_password(request.form['password']); db.session.add(u); db.session.commit()
        flash(f'Coach {u.full_name} created.','success'); return redirect(url_for('admin.admin_coaches'))
    return render_template('admin/add_coach.html')

@admin.route('/admin/coaches/<int:coach_id>', methods=['GET','POST'])
@login_required
@admin_required
def admin_coach_detail(coach_id):
    coach = User.query.filter_by(id=coach_id, role='coach').first_or_404()

    if request.method == 'POST':
        action = request.form.get('action')

        if action == 'update':
            coach.first_name = request.form['first_name']
            coach.last_name  = request.form['last_name']
            coach.email      = request.form['email']
            coach.specialty  = request.form.get('specialty', '')
            coach.bio        = request.form.get('bio', '')
            coach.is_active  = 'is_active' in request.form

            # ✅ HANDLE IMAGE UPLOAD
            if 'image' in request.files:
                file = request.files['image']
                if file and file.filename != '':
                    filename = save_profile_picture(file)
                    coach.image_file = filename

            # Password update
            if request.form.get('new_password'):
                coach.set_password(request.form['new_password'])

            db.session.commit()
            flash('Coach updated.', 'success')
            return redirect(url_for('admin.admin_coach_detail', coach_id=coach.id))

        elif action == 'delete':
            CoachClient.query.filter_by(coach_id=coach.id).delete()
            db.session.delete(coach)
            db.session.commit()
            flash('Coach deleted.', 'success')
            return redirect(url_for('admin.admin_coaches'))

    assignments = CoachClient.query.filter_by(coach_id=coach_id).all()
    return render_template('admin/coach_detail.html', coach=coach, assignments=assignments)

@admin.route('/admin/assign', methods=['GET','POST'])
@login_required
@admin_required
def admin_assign():
    if request.method == 'POST':
        cid = request.form.get('coach_id',type=int); mid = request.form.get('client_id',type=int)
        if CoachClient.query.filter_by(coach_id=cid,client_id=mid,is_active=True).first():
            flash('Already assigned.','error')
        else:
            db.session.add(CoachClient(coach_id=cid,client_id=mid,notes=request.form.get('notes','')))
            db.session.commit(); flash('Client assigned!','success')
        return redirect(url_for('admin.admin_assign'))
    return render_template('admin/assign.html',
        coaches     = User.query.filter_by(role='coach',is_active=True).all(),
        members     = User.query.filter_by(role='member').order_by(User.first_name).all(),
        assignments = CoachClient.query.filter_by(is_active=True).order_by(CoachClient.assigned_at.desc()).all())

@admin.route('/admin/assign/<int:aid>/remove', methods=['POST'])
@login_required
@admin_required
def admin_remove_assignment(aid):
    cc = CoachClient.query.get_or_404(aid); cc.is_active = False
    db.session.commit(); flash('Assignment removed.','info')
    return redirect(url_for('admin.admin_assign'))

@admin.route('/admin/users')
@login_required
@admin_required
def admin_users():
    s=request.args.get('search','').strip(); mf=request.args.get('membership',''); pg=request.args.get('page',1,type=int)
    q=User.query.filter_by(role='member')
    if s: q=q.filter((User.first_name.ilike(f'%{s}%'))|(User.last_name.ilike(f'%{s}%'))|(User.email.ilike(f'%{s}%')))
    if mf: q=q.filter_by(membership=mf)
    users=q.order_by(User.joined_at.desc()).paginate(page=pg,per_page=15,error_out=False)
    return render_template('admin/users.html',users=users,search=s,membership_filter=mf)

@admin.route('/admin/users/<int:uid>', methods=['GET','POST'])
@login_required
@admin_required
def admin_user_detail(uid):
    user=User.query.get_or_404(uid)
    if request.method=='POST':
        action=request.form.get('action')
        if action=='update':
            user.first_name=request.form['first_name']; user.last_name=request.form['last_name']
            user.email=request.form['email']; user.membership=request.form['membership']
            if request.form.get('new_password'): user.set_password(request.form['new_password'])
            db.session.commit(); flash(f'{user.full_name} updated.','success')
        elif action=='delete':
            if user.id==current_user.id: flash("Can't delete yourself.",'error')
            else:
                for model in [MembershipBooking,CoachClient]:
                    if hasattr(model,'user_id'): model.query.filter_by(user_id=user.id).delete()
                    else:
                        model.query.filter((model.coach_id==user.id)|(model.client_id==user.id)).delete()
                db.session.delete(user); db.session.commit(); flash('Deleted.','success')
                return redirect(url_for('admin.admin_users'))
        return redirect(url_for('admin.admin_user_detail',uid=user.id))
    bookings=MembershipBooking.query.filter_by(user_id=uid).order_by(MembershipBooking.booked_at.desc()).all()
    assignment=CoachClient.query.filter_by(client_id=uid,is_active=True).first()
    return render_template('admin/user_detail.html',user=user,bookings=bookings,assignment=assignment)

@admin.route('/admin/users/add', methods=['GET','POST'])
@login_required
@admin_required
def admin_add_user():
    if request.method=='POST':
        if User.query.filter_by(email=request.form['email']).first():
            flash('Email exists.','error'); return redirect(url_for('admin.admin_add_user'))
        u=User(first_name=request.form['first_name'],last_name=request.form['last_name'],
            email=request.form['email'],membership=request.form.get('membership','none'),role='member')
        u.set_password(request.form['password']); db.session.add(u); db.session.commit()
        flash(f'{u.full_name} created.','success'); return redirect(url_for('admin.admin_users'))
    return render_template('admin/add_user.html')

@admin.route('/admin/memberships')
@login_required
@admin_required
def admin_memberships():
    pg=request.args.get('page',1,type=int); sf=request.args.get('status',''); pf=request.args.get('plan','')
    q=MembershipBooking.query
    if sf: q=q.filter_by(status=sf)
    if pf: q=q.filter_by(plan=pf)
    bookings=q.order_by(MembershipBooking.booked_at.desc()).paginate(page=pg,per_page=20,error_out=False)
    return render_template('admin/memberships.html',bookings=bookings,status_filter=sf,plan_filter=pf)

@admin.route('/admin/memberships/<int:bid>/update', methods=['POST'])
@login_required
@admin_required
def admin_update_booking(bid):
    b=MembershipBooking.query.get_or_404(bid); ns=request.form.get('status')
    if ns in ('pending','active','cancelled'):
        b.status=ns
        if ns=='active': b.user.membership=b.plan
        elif ns=='cancelled':
            if not MembershipBooking.query.filter_by(user_id=b.user_id,status='active').first():
                b.user.membership='none'
        db.session.commit(); flash('Updated.','success')
    return redirect(url_for('admin.admin_memberships'))

@admin.route('/admin/messages')
@login_required
@admin_required
def admin_messages():
    pg=request.args.get('page',1,type=int)
    msgs=ContactMessage.query.order_by(ContactMessage.sent_at.desc()).paginate(page=pg,per_page=20,error_out=False)
    return render_template('admin/messages.html',messages=msgs)

@admin.route('/admin/messages/<int:mid>/delete', methods=['POST'])
@login_required
@admin_required
def admin_delete_message(mid):
    db.session.delete(ContactMessage.query.get_or_404(mid)); db.session.commit()
    flash('Deleted.','success'); return redirect(url_for('admin.admin_messages'))

@admin.route('/api/stats')
@login_required
@admin_required
def admin_api_stats():
    signups=[]
    for i in range(13,-1,-1):
        day=datetime.utcnow().date()-timedelta(days=i)
        signups.append({'date':day.strftime('%b %d'),'count':User.query.filter(db.func.date(User.joined_at)==day,User.role=='member').count()})
    return jsonify({'signups':signups,'distribution':{'Pro':User.query.filter_by(membership='pro',role='member').count(),'Elite':User.query.filter_by(membership='elite',role='member').count(),'Basic':User.query.filter_by(membership='basic',role='member').count(),'None':User.query.filter_by(membership='none',role='member').count()}})

@admin.errorhandler(403)
def forbidden(e): return render_template('admin/403.html'), 403