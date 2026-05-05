import os
from app import create_app
from app.extensions import db
from app.models import User

app = create_app()

ADMIN_EMAIL = os.getenv("ADMIN_EMAIL")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD")

with app.app_context():

    if not User.query.filter_by(email=ADMIN_EMAIL).first():
        admin = User(
            first_name='Admin',
            last_name='Coolgym',
            email=ADMIN_EMAIL,
            role='admin'
        )
        admin.set_password(ADMIN_PASSWORD)

        db.session.add(admin)
        db.session.commit()

if __name__ == '__main__':
    app.run(debug=True)