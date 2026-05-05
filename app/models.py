from .extensions import db
from flask_login import UserMixin
from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash


class User(UserMixin, db.Model):
    id            = db.Column(db.Integer, primary_key=True)
    first_name    = db.Column(db.String(50),  nullable=False)
    last_name     = db.Column(db.String(50),  nullable=False)
    email         = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(200), nullable=False)
    role          = db.Column(db.String(20),  default='member')  # member|coach|admin
    membership    = db.Column(db.String(20),  default='none')
    joined_at     = db.Column(db.DateTime,    default=datetime.utcnow)
    specialty     = db.Column(db.String(100))
    bio           = db.Column(db.Text)
    is_active     = db.Column(db.Boolean, default=True)
    image_file = db.Column(db.String(200), default='default.jpg')

    def set_password(self, p):   self.password_hash = generate_password_hash(p)
    def check_password(self, p): return check_password_hash(self.password_hash, p)

    @property
    def full_name(self): return f"{self.first_name} {self.last_name}"
    @property
    def is_admin(self):  return self.role == 'admin'
    @property
    def is_coach(self):  return self.role == 'coach'


class ContactMessage(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100))
    email = db.Column(db.String(120))
    subject = db.Column(db.String(200))
    message = db.Column(db.Text)
    sent_at = db.Column(db.DateTime, default=datetime.utcnow)


class MembershipBooking(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'))
    plan = db.Column(db.String(20))
    booked_at = db.Column(db.DateTime, default=datetime.utcnow)
    status = db.Column(db.String(20), default='pending')
    user = db.relationship('User', backref='bookings')


class CoachClient(db.Model):
    id          = db.Column(db.Integer, primary_key=True)
    coach_id    = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    client_id   = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    assigned_at = db.Column(db.DateTime, default=datetime.utcnow)
    is_active   = db.Column(db.Boolean, default=True)
    notes       = db.Column(db.Text)
    coach       = db.relationship('User', foreign_keys=[coach_id],  backref='coached_clients')
    client      = db.relationship('User', foreign_keys=[client_id], backref='coach_assignments')


class WorkoutPlan(db.Model):
    id          = db.Column(db.Integer, primary_key=True)
    coach_id    = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    client_id   = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    title       = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    weeks       = db.Column(db.Integer, default=4)
    created_at  = db.Column(db.DateTime, default=datetime.utcnow)
    is_active   = db.Column(db.Boolean, default=True)
    coach       = db.relationship('User', foreign_keys=[coach_id],  backref='created_plans')
    client      = db.relationship('User', foreign_keys=[client_id], backref='workout_plans')
    logs        = db.relationship('ProgressLog', backref='plan', lazy='dynamic', cascade='all, delete-orphan')


class ProgressLog(db.Model):
    id        = db.Column(db.Integer, primary_key=True)
    plan_id   = db.Column(db.Integer, db.ForeignKey('workout_plan.id'), nullable=False)
    client_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    week      = db.Column(db.Integer, nullable=False)
    note      = db.Column(db.Text)
    weight_kg = db.Column(db.Float)
    sessions  = db.Column(db.Integer, default=0)
    rating    = db.Column(db.Integer, default=3)
    logged_at = db.Column(db.DateTime, default=datetime.utcnow)
    client    = db.relationship('User', backref='progress_logs')


class Message(db.Model):
    id          = db.Column(db.Integer, primary_key=True)
    sender_id   = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    receiver_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    body        = db.Column(db.Text, nullable=False)
    sent_at     = db.Column(db.DateTime, default=datetime.utcnow)
    is_read     = db.Column(db.Boolean, default=False)
    sender      = db.relationship('User', foreign_keys=[sender_id],  backref='sent_messages')
    receiver    = db.relationship('User', foreign_keys=[receiver_id], backref='received_messages')    
