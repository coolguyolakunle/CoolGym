import os
import unittest
from unittest.mock import patch

os.environ.setdefault('SECRET_KEY', 'test-secret')
os.environ.setdefault('FLASK_ENV', 'development')
os.environ['SQLITE_DATABASE_URI'] = 'sqlite://'

from app import create_app
from app.extensions import db
from app.models import User


GOOGLE_CLAIMS = {
    'sub': 'google-stable-subject-123',
    'email': 'google.user@example.com',
    'email_verified': True,
    'iss': 'https://accounts.google.com',
    'given_name': 'Google',
    'family_name': 'User',
    'picture': 'https://example.com/google-avatar.jpg',
}


class GoogleAuthTests(unittest.TestCase):
    def setUp(self):
        self.app = create_app()
        self.app.config.update(TESTING=True, GOOGLE_CLIENT_ID='test-client-id.apps.googleusercontent.com')
        with self.app.app_context():
            db.create_all()
        self.client = self.app.test_client()

    def tearDown(self):
        with self.app.app_context():
            db.session.remove()
            db.drop_all()

    def google_post(self, claims=GOOGLE_CLAIMS, body=None):
        with patch('app.auth.routes.id_token.verify_oauth2_token', return_value=claims):
            return self.client.post('/api/auth/google', json=body or {'credential': 'verified-token'})

    def test_new_google_user_is_member_and_receives_session(self):
        response = self.google_post(body={'credential': 'verified-token', 'role': 'admin'})
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.get_json()['user']['role'], 'member')
        with self.app.app_context():
            user = User.query.filter_by(google_id=GOOGLE_CLAIMS['sub']).one()
            self.assertEqual(user.auth_provider, 'google')
            self.assertTrue(user.check_password('not-the-generated-password') is False)
        self.assertEqual(self.client.get('/api/auth/me').get_json()['user']['email'], GOOGLE_CLAIMS['email'])

    def test_existing_google_user_logs_in_without_duplicate(self):
        self.assertEqual(self.google_post().status_code, 201)
        self.assertEqual(self.client.post('/api/auth/logout').status_code, 200)
        self.assertIsNone(self.client.get('/api/auth/me').get_json()['user'])
        self.assertEqual(self.google_post().status_code, 200)
        with self.app.app_context():
            self.assertEqual(User.query.filter_by(google_id=GOOGLE_CLAIMS['sub']).count(), 1)

    def test_existing_password_email_requires_linking(self):
        with self.app.app_context():
            user = User(first_name='Password', last_name='User', email=GOOGLE_CLAIMS['email'])
            user.set_password('Password1@')
            db.session.add(user)
            db.session.commit()
        response = self.google_post()
        self.assertEqual(response.status_code, 409)
        self.assertEqual(response.get_json()['error'], 'google_link_required')

    def test_invalid_and_expired_tokens_are_rejected(self):
        with patch('app.auth.routes.id_token.verify_oauth2_token', side_effect=ValueError('Token expired')):
            expired = self.client.post('/api/auth/google', json={'credential': 'expired-token'})
        self.assertEqual(expired.status_code, 401)
        self.assertIn('expired', expired.get_json()['message'].lower())
        with patch('app.auth.routes.id_token.verify_oauth2_token', side_effect=ValueError('Bad signature')):
            invalid = self.client.post('/api/auth/google', json={'credential': 'tampered-token'})
        self.assertEqual(invalid.status_code, 401)

    def test_missing_credential_is_rejected(self):
        self.assertEqual(self.client.post('/api/auth/google', json={}).status_code, 400)


if __name__ == '__main__':
    unittest.main()
