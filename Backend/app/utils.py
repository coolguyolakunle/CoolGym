from flask_login import current_user
from functools import wraps
from flask import jsonify, current_app, url_for
from app.models import Message
import cloudinary.uploader
from werkzeug.utils import secure_filename
from pathlib import Path
from uuid import uuid4
from io import BytesIO
import re


def validate_password_strength(password):
    """Return a user-facing password policy error, or None for valid passwords."""
    if len(password or '') < 8:
        return "Password must be at least 8 characters long."
    if not re.search(r'[A-Z]', password):
        return "Password must contain at least one uppercase letter."
    if not re.search(r'[a-z]', password):
        return "Password must contain at least one lowercase letter."
    if not re.search(r'[0-9]', password):
        return "Password must contain at least one number."
    if not re.search(r'[^A-Za-z0-9]', password):
        return "Password must contain at least one special character."
    return None


def role_required(*roles):
    def deco(f):
        @wraps(f)
        def wrap(*a, **kw):
            if not current_user.is_authenticated or current_user.role not in roles:
                return jsonify({"error": "forbidden"}), 403
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


def save_profile_picture(file):
    if not file:
        return None

    # Keep an independent copy. Cloudinary may consume or close FileStorage's
    # stream when an upload fails, but the local fallback still needs the bytes.
    image_data = file.read()
    if not image_data:
        raise ValueError("The selected image file is empty.")

    try:
        current_app.logger.info("Uploading profile image to Cloudinary")
        upload_result = cloudinary.uploader.upload(
            BytesIO(image_data),
            folder="coolgym/profile_pics",
            resource_type="image",
            # Close each upload connection instead of returning it to urllib3's
            # persistent pool on Windows.
            extra_headers={"Connection": "close"},
        )
        secure_url = upload_result.get("secure_url")
        if secure_url:
            current_app.logger.info("Cloudinary profile-image upload succeeded")
            return secure_url
        raise RuntimeError("Cloudinary did not return an image URL.")
    except Exception as exc:
        # Local development must not depend on an external media service. Keep a
        # usable local copy when Cloudinary rejects or cannot process a file.
        current_app.logger.warning("Cloudinary profile-image upload failed; using local fallback: %s", exc)
        suffix = Path(secure_filename(file.filename or "profile.jpg")).suffix.lower() or ".jpg"
        filename = f"{uuid4().hex}{suffix}"
        upload_dir = Path(current_app.static_folder) / "uploads"
        upload_dir.mkdir(parents=True, exist_ok=True)
        (upload_dir / filename).write_bytes(image_data)
        current_app.logger.info("Local profile-image fallback succeeded: bytes=%d", len(image_data))
        return url_for("static", filename=f"uploads/{filename}", _external=True)
