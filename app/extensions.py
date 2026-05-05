from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager
from flask_migrate import Migrate

db = SQLAlchemy()
login_manager = LoginManager()
migrate = Migrate()

from app.models import User  # IMPORTANT

@login_manager.user_loader
def load_user(user_id):
    from app.models import User
    return User.query.get(int(user_id))