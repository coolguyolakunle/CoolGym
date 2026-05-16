from flask import Flask
from flask_migrate import Migrate
from .extensions import db, login_manager, socketio
import os
from dotenv import load_dotenv
import cloudinary

migrate = Migrate()

def create_app():
    load_dotenv()

    app = Flask(__name__)

    # ─── CORE CONFIG ───
    app.config['SECRET_KEY'] = os.getenv('SECRET_KEY')
    if not app.config['SECRET_KEY']:
        raise ValueError("SECRET_KEY is missing in .env")

    database_url = os.getenv('DATABASE_URL', 'sqlite:///coolgym.db')
    if database_url.startswith('postgres://'):
        database_url = database_url.replace('postgres://', 'postgresql://', 1)

    app.config['SQLALCHEMY_DATABASE_URI'] = database_url
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config['MAX_CONTENT_LENGTH'] = 8 * 1024 * 1024

    # ─── CLOUDINARY CONFIG (ONLY ONCE) ───
    cloudinary.config(
        cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
        api_key=os.getenv("CLOUDINARY_API_KEY"),
        api_secret=os.getenv("CLOUDINARY_API_SECRET"),
        secure=True
    )

    # ─── EXTENSIONS ───
    db.init_app(app)
    login_manager.init_app(app)
    migrate.init_app(app, db)
    socketio.init_app(app)

    login_manager.login_view = 'auth.login'
    login_manager.login_message_category = 'info'

    # ─── BLUEPRINTS ───
    from .main.routes import main
    from .auth.routes import auth
    from .admin.routes import admin
    from .coach.routes import coach
    from .calls.routes import calls

    app.register_blueprint(main)
    app.register_blueprint(auth)
    app.register_blueprint(admin, url_prefix='/admin')
    app.register_blueprint(coach, url_prefix='/coach')
    app.register_blueprint(calls)

    from .calls import sockets  # noqa: F401

    @app.cli.command('seed-admin')
    def seed_admin():
        admin_email = os.getenv("ADMIN_EMAIL")
        admin_password = os.getenv("ADMIN_PASSWORD")

        if not admin_email or not admin_password:
            raise ValueError("Missing admin credentials in environment variables")

        from .models import User

        if not User.query.filter_by(email=admin_email).first():
            admin_user = User(
                first_name='Admin',
                last_name='Coolgym',
                email=admin_email,
                role='admin'
            )
            admin_user.set_password(admin_password)

            db.session.add(admin_user)
            db.session.commit()
            print("Admin user created")
        else:
            print("Admin user already exists")

    return app
