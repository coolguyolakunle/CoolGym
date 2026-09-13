from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager
from flask_migrate import Migrate
from flask_socketio import SocketIO

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

# Because the frontend is now a separate origin (Netlify), a normal 401
# redirect-to-login-page response makes no sense for a JSON API. Return 401 JSON instead.
@login_manager.unauthorized_handler
def unauthorized():
    from flask import jsonify
    return jsonify({"error": "unauthorized", "message": "Login required."}), 401
