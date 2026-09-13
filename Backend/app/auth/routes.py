from flask import Blueprint, request, jsonify, current_app
from flask_login import login_user, logout_user, login_required, current_user
from google.auth.transport import requests as google_requests
from google.auth.exceptions import GoogleAuthError
from google.oauth2 import id_token
from sqlalchemy.exc import SQLAlchemyError
from ..extensions import db
from ..models import User
from ..serializers import user_public
from ..utils import validate_password_strength

auth = Blueprint('auth', __name__)


@auth.route('/api/auth/register', methods=['POST'])
def register():
    if current_user.is_authenticated:
        return jsonify({"error": "already_logged_in"}), 400

    data = request.get_json(silent=True) or request.form

    first_name = (data.get('first_name') or '').strip()
    last_name = (data.get('last_name') or '').strip()
    email = (data.get('email') or '').strip().lower()
    password = data.get('password') or ''
    confirm = data.get('confirm_password') or ''

    if not first_name or not last_name or not email or not password:
        return jsonify({"error": "validation", "message": "All fields are required."}), 400

    if password != confirm:
        return jsonify({"error": "validation", "message": "Passwords do not match."}), 400

    password_error = validate_password_strength(password)
    if password_error:
        return jsonify({"error": "validation", "message": password_error}), 400

    if User.query.filter_by(email=email).first():
        return jsonify({"error": "validation", "message": "Email already exists."}), 400

    user = User(first_name=first_name, last_name=last_name, email=email)
    user.set_password(password)

    db.session.add(user)
    db.session.commit()

    login_user(user)

    return jsonify({"message": f"Welcome, {first_name}!", "user": user_public(user)}), 201


@auth.route('/api/auth/login', methods=['POST'])
def login():
    if current_user.is_authenticated:
        return jsonify({"user": user_public(current_user)})

    data = request.get_json(silent=True) or request.form

    email = (data.get('email') or '').strip().lower()
    password = data.get('password') or ''
    remember = bool(data.get('remember'))

    user = User.query.filter_by(email=email).first()

    if user and user.check_password(password):
        login_user(user, remember=remember)
        return jsonify({"user": user_public(user)})

    return jsonify({"error": "invalid_credentials", "message": "Invalid email or password."}), 401


@auth.route('/api/auth/google', methods=['POST'])
def google_login():
    if current_user.is_authenticated:
        return jsonify({"user": user_public(current_user)})

    data = request.get_json(silent=True) or request.form
    credential = (data.get('credential') or '').strip()
    if not credential:
        return jsonify({"error": "validation", "message": "Google credential is required."}), 400

    client_id = current_app.config.get('GOOGLE_CLIENT_ID')
    if not client_id:
        current_app.logger.error("GOOGLE_CLIENT_ID is not configured")
        return jsonify({"error": "configuration", "message": "Google sign-in is not configured."}), 503

    try:
        # google-auth verifies the signature, audience, issuer and expiration
        # against Google's rotating public keys before returning the claims.
        claims = id_token.verify_oauth2_token(credential, google_requests.Request(), client_id)
    except (ValueError, GoogleAuthError) as exc:
        current_app.logger.info("Rejected Google ID token: %s", exc)
        message = "Google token has expired." if 'expired' in str(exc).lower() else "Google token is invalid or was issued for a different application."
        return jsonify({"error": "invalid_google_token", "message": message}), 401

    if claims.get('iss') not in ('accounts.google.com', 'https://accounts.google.com'):
        return jsonify({"error": "invalid_google_token", "message": "Google token has an invalid issuer."}), 401

    google_id = claims.get('sub')
    email = (claims.get('email') or '').strip().lower()
    if not google_id or not email or claims.get('email_verified') is not True:
        return jsonify({"error": "invalid_google_token", "message": "Google token is missing a verified account email."}), 401

    user = User.query.filter_by(google_id=google_id).first()
    if user:
        login_user(user)
        return jsonify({"message": f"Welcome back, {user.first_name}!", "user": user_public(user)})

    if User.query.filter_by(email=email).first():
        return jsonify({
            "error": "google_link_required",
            "message": "This email already has a CoolGym account. Sign in with your existing method to link Google.",
        }), 409

    first_name = (claims.get('given_name') or '').strip() or 'Google'
    last_name = (claims.get('family_name') or '').strip() or 'User'
    profile_picture = (claims.get('picture') or '').strip() or 'default.jpg'
    user = User(
        first_name=first_name,
        last_name=last_name,
        email=email,
        google_id=google_id,
        google_email=email,
        auth_provider='google',
        role='member',
        image_file=profile_picture,
    )
    # The existing schema requires a password hash. Store only an unpredictable
    # one-way hash; Google-only accounts never receive or retain this password.
    user.set_unusable_password()
    try:
        db.session.add(user)
        db.session.commit()
    except SQLAlchemyError:
        db.session.rollback()
        return jsonify({"error": "database_error", "message": "Unable to create the Google account. Please try again."}), 500

    login_user(user)
    return jsonify({"message": f"Welcome, {user.first_name}!", "user": user_public(user)}), 201


@auth.route('/api/auth/logout', methods=['POST'])
@login_required
def logout():
    logout_user()
    return jsonify({"message": "Logged out."})


@auth.route('/api/auth/me')
def me():
    if not current_user.is_authenticated:
        return jsonify({"user": None}), 200
    return jsonify({"user": user_public(current_user)})
