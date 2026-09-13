import os
import unittest

os.environ.setdefault('SECRET_KEY', 'test-secret')
os.environ.setdefault('FLASK_ENV', 'development')
os.environ['SQLITE_DATABASE_URI'] = 'sqlite://'

from app import create_app
from app.extensions import db
from app.models import User
from app.utils import validate_password_strength


class PasswordPolicyTests(unittest.TestCase):
    def setUp(self):
        self.app = create_app()
        self.app.config.update(TESTING=True, WTF_CSRF_ENABLED=False)
        with self.app.app_context():
            db.create_all()
            self.admin = User(first_name='Admin', last_name='User', email='admin@example.com', role='admin')
            self.admin.set_password('Password1@')
            db.session.add(self.admin)
            db.session.commit()
            self.admin_id = self.admin.id
        self.client = self.app.test_client()

    def tearDown(self):
        with self.app.app_context():
            db.session.remove()
            db.drop_all()

    def login_as_admin(self):
        with self.client.session_transaction() as session:
            session['_user_id'] = str(self.admin_id)
            session['_fresh'] = True

    def test_policy_messages(self):
        self.assertEqual(validate_password_strength('password'), 'Password must contain at least one uppercase letter.')
        self.assertEqual(validate_password_strength('Password'), 'Password must contain at least one number.')
        self.assertEqual(validate_password_strength('Password1'), 'Password must contain at least one special character.')
        self.assertIsNone(validate_password_strength('Password1@'))

    def test_member_registration_rejects_weak_and_accepts_strong(self):
        weak = self.client.post('/api/auth/register', json={
            'first_name': 'Member', 'last_name': 'Weak', 'email': 'weak@example.com',
            'password': 'password', 'confirm_password': 'password',
        })
        self.assertEqual(weak.status_code, 400)
        self.assertIn('uppercase', weak.get_json()['message'])

        strong = self.client.post('/api/auth/register', json={
            'first_name': 'Member', 'last_name': 'Strong', 'email': 'strong@example.com',
            'password': 'Password1@', 'confirm_password': 'Password1@',
        })
        self.assertEqual(strong.status_code, 201)
        self.assertEqual(self.client.post('/api/auth/logout').status_code, 200)
        login = self.client.post('/api/auth/login', json={
            'email': 'strong@example.com', 'password': 'Password1@',
        })
        self.assertEqual(login.status_code, 200)

    def test_admin_member_exception_and_coach_policy(self):
        self.login_as_admin()
        weak_member = self.client.post('/api/admin/users/add', json={
            'first_name': 'Simple', 'last_name': 'Member', 'email': 'simple@example.com',
            'password': 'simple', 'skip_password_validation': False,
        })
        self.assertEqual(weak_member.status_code, 201)

        weak_coach = self.client.post('/api/admin/coaches/add', json={
            'first_name': 'Weak', 'last_name': 'Coach', 'email': 'coach@example.com', 'password': 'simple',
        })
        self.assertEqual(weak_coach.status_code, 400)
        strong_coach = self.client.post('/api/admin/coaches/add', json={
            'first_name': 'Strong', 'last_name': 'Coach', 'email': 'coach-strong@example.com', 'password': 'Password1@',
        })
        self.assertEqual(strong_coach.status_code, 201)

    def test_non_admin_cannot_use_member_exception(self):
        response = self.client.post('/api/admin/users/add', json={
            'first_name': 'Bypass', 'last_name': 'Attempt', 'email': 'bypass@example.com',
            'password': 'simple', 'skip_password_validation': True,
        })
        self.assertEqual(response.status_code, 401)

    def test_password_change_rejects_weak_and_accepts_strong(self):
        with self.app.app_context():
            member = User(first_name='Member', last_name='Change', email='change@example.com')
            member.set_password('Password1@')
            db.session.add(member)
            db.session.commit()
            member_id = member.id
        self.login_as_admin()

        weak = self.client.post(f'/api/admin/users/{member_id}', json={
            'action': 'update', 'new_password': 'password',
        })
        self.assertEqual(weak.status_code, 400)
        strong = self.client.post(f'/api/admin/users/{member_id}', json={
            'action': 'update', 'new_password': 'NewPassword1@',
        })
        self.assertEqual(strong.status_code, 200)
        with self.app.app_context():
            self.assertTrue(db.session.get(User, member_id).check_password('NewPassword1@'))


if __name__ == '__main__':
    unittest.main()
