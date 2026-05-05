from flask import Blueprint, render_template, request, redirect, url_for, flash
from flask_login import login_user, logout_user, login_required, current_user
from ..extensions import db
from ..models import User

auth = Blueprint('auth', __name__)

@auth.route('/register', methods=['GET', 'POST'])
def register():
    if current_user.is_authenticated:
        return redirect(url_for('main.dashboard'))

    if request.method == 'POST':
        first_name = request.form['first_name']
        last_name = request.form['last_name']
        email = request.form['email']
        password = request.form['password']
        confirm = request.form['confirm_password']

        if password != confirm:
            flash('Passwords do not match.', 'error')
            return redirect(url_for('auth.register'))

        if User.query.filter_by(email=email).first():
            flash('Email already exists.', 'error')
            return redirect(url_for('auth.register'))

        user = User(
            first_name=first_name,
            last_name=last_name,
            email=email
        )

        user.set_password(password)

        db.session.add(user)
        db.session.commit()

        login_user(user)

        flash(f'Welcome, {first_name}!', 'success')
        return redirect(url_for('main.dashboard'))

    return render_template('register.html')


@auth.route('/login', methods=['GET', 'POST'])
def login():
    if current_user.is_authenticated:
        return redirect(url_for('main.dashboard'))

    if request.method == 'POST':
        email = request.form['email']
        password = request.form['password']
        remember = 'remember' in request.form

        user = User.query.filter_by(email=email).first()

        if user and user.check_password(password):
            login_user(user, remember=remember)

            next_page = request.args.get('next')
            return redirect(next_page or url_for('main.dashboard'))

        flash('Invalid email or password.', 'error')

    return render_template('login.html')


@auth.route('/logout')
@login_required
def logout():
    logout_user()
    flash('Logged out.', 'info')
    return redirect(url_for('main.index'))