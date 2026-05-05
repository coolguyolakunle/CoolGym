from flask_login import current_user
from functools import wraps
from flask import abort, url_for, current_app
from app.models import Message
from datetime import datetime
import os
import secrets
from PIL import Image
import cloudinary.uploader

def role_required(*roles):
    def deco(f):
        @wraps(f)
        def wrap(*a, **kw):
            if not current_user.is_authenticated or current_user.role not in roles:
                abort(403)
            return f(*a, **kw)
        return wrap
    return deco

admin_required = role_required('admin')
coach_required = role_required('admin', 'coach')


def get_thread(user1_id, user2_id):
    return Message.query.filter(
        ((Message.sender_id == user1_id) & (Message.receiver_id == user2_id)) |
        ((Message.sender_id == user2_id) & (Message.receiver_id == user1_id))
    ).order_by(Message.sent_at.asc()).all()


def after_login_url():
    if current_user.role == 'admin':
        return url_for('admin.admin_dashboard')
    if current_user.role == 'coach':
        return url_for('coach.coach_dashboard')
    return url_for('main.dashboard')


import cloudinary.uploader

def save_profile_picture(file):
    if not file:
        return None

    upload_result = cloudinary.uploader.upload(
        file,
        folder="coolgym/profile_pics"
    )

    return upload_result.get("secure_url")