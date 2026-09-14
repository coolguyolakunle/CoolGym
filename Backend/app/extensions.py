from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager
from flask_migrate import Migrate
from flask_socketio import SocketIO
from flask import current_app, request
from itsdangerous import BadSignature, SignatureExpired, URLSafeTimedSerializer

db = SQLAlchemy()
login_manager = LoginManager()
migrate = Migrate()
socketio = SocketIO(
    cors_allowed_origins=[],
    async_mode='threading',
    transports=['polling'],
)

from app.models import User  # IMPORTANT

@login_manager.user_loader
def load_user(user_id):
    from app.models import User
    return User.query.get(int(user_id))


def create_auth_token(user_id):
    """Create a signed API token for browsers that block third-party cookies."""
    serializer = URLSafeTimedSerializer(current_app.config['SECRET_KEY'], salt='coolgym-api-auth')
    return serializer.dumps({'user_id': user_id})


@login_manager.request_loader
def load_user_from_bearer_token(_request):
    authorization = request.headers.get('Authorization', '')
    if not authorization.startswith('Bearer '):
        return None

    token = authorization.removeprefix('Bearer ').strip()
    if not token:
        return None

    serializer = URLSafeTimedSerializer(current_app.config['SECRET_KEY'], salt='coolgym-api-auth')
    try:
        payload = serializer.loads(token, max_age=current_app.config.get('AUTH_TOKEN_MAX_AGE', 60 * 60 * 24 * 30))
        user_id = int(payload['user_id'])
    except (BadSignature, SignatureExpired, KeyError, TypeError, ValueError):
        return None

    from app.models import User
    return db.session.get(User, user_id)

# Because the frontend is now a separate origin (Netlify), a normal 401
# redirect-to-login-page response makes no sense for a JSON API. Return 401 JSON instead.
@login_manager.unauthorized_handler
def unauthorized():
    from flask import jsonify
    return jsonify({"error": "unauthorized", "message": "Login required."}), 401
