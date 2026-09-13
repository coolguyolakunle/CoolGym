from flask import Flask, jsonify, request
from werkzeug.exceptions import BadRequest
from flask_migrate import Migrate
from flask_cors import CORS
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

    database_url = os.getenv('SQLITE_DATABASE_URI', 'sqlite:///coolgym.db')

    app.config['SQLALCHEMY_DATABASE_URI'] = database_url
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config['MAX_CONTENT_LENGTH'] = 10 * 1024 * 1024
    app.config['GOOGLE_CLIENT_ID'] = os.getenv('GOOGLE_CLIENT_ID')

    # ─── CROSS-ORIGIN SESSION COOKIES ───
    # The frontend (Netlify) and backend (Render) live on different domains,
    # so the session cookie must be sent cross-site. That requires SameSite=None
    # + Secure, which browsers only honor over HTTPS. Locally (FLASK_ENV=development)
    # we fall back to Lax/non-secure so login still works over plain http://localhost.
    is_production = os.getenv('FLASK_ENV', 'production') != 'development'
    app.config['SESSION_COOKIE_SAMESITE'] = 'None' if is_production else 'Lax'
    app.config['SESSION_COOKIE_SECURE'] = is_production
    app.config['SESSION_COOKIE_HTTPONLY'] = True

    # ─── CLOUDINARY CONFIG (ONLY ONCE) ───
    cloudinary.config(
        cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
        api_key=os.getenv("CLOUDINARY_API_KEY"),
        api_secret=os.getenv("CLOUDINARY_API_SECRET"),
        secure=True,
        # Cloudinary's TCP keep-alive pool calls the Windows socket ioctl that
        # this environment blocks. Use the SDK's supported standard pool.
        disable_tcp_keep_alive=True,
    )

    # ─── CORS ───
    # FRONTEND_ORIGINS is a comma-separated list, e.g.
    # "https://your-app.netlify.app,http://localhost:5173"
    frontend_origins = [o.strip() for o in os.getenv('FRONTEND_ORIGINS', 'http://localhost:5173').split(',') if o.strip()]
    CORS(app, supports_credentials=True, origins=frontend_origins)

    @app.errorhandler(BadRequest)
    def bad_request(e):
        app.logger.warning(
            'Bad request: path=%s content_type=%r content_length=%r description=%s',
            request.path, request.content_type, request.content_length, e.description,
        )
        return jsonify({'error': 'bad_request', 'message': e.description}), 400

    # ─── EXTENSIONS ───
    db.init_app(app)
    login_manager.init_app(app)
    migrate.init_app(app, db)
    socketio.init_app(app, cors_allowed_origins=frontend_origins)

    # Registers the authenticated personal rooms used for real-time messages.
    from . import message_sockets  # noqa: F401

    login_manager.login_view = None  # JSON API: no HTML login page to redirect to

    # ─── BLUEPRINTS ───
    from .main.routes import main
    from .auth.routes import auth
    from .admin.routes import admin
    from .coach.routes import coach
    from .calls.routes import calls

    app.register_blueprint(main)
    app.register_blueprint(auth)
    app.register_blueprint(admin)
    app.register_blueprint(coach)
    app.register_blueprint(calls)

    from .calls import sockets  # noqa: F401

    @app.route('/api/health')
    def health():
        return jsonify({"status": "ok"})

    @app.errorhandler(403)
    def forbidden(e):
        return jsonify({"error": "forbidden"}), 403

    @app.errorhandler(404)
    def not_found(e):
        return jsonify({"error": "not_found"}), 404

    @app.cli.command('seed-admin')
    def seed_admin():
        admin_email = os.getenv("ADMIN_EMAIL")
        admin_password = os.getenv("ADMIN_PASSWORD")

        if not admin_email or not admin_password:
            raise ValueError("Missing admin credentials in environment variables")

        from .models import User

        admin_user = User.query.filter_by(email=admin_email).first()

        if not admin_user:
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
            admin_user.set_password(admin_password)
            admin_user.role = 'admin'
            db.session.commit()
            print("Admin user updated")

    return app
