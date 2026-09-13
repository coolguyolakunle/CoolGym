from flask_login import current_user
from flask_socketio import join_room

from .extensions import socketio


def user_room(user_id):
    return f"user:{user_id}"


@socketio.on("connect")
def join_personal_notification_room():
    """Attach each authenticated browser session to its private event room."""
    if not current_user.is_authenticated:
        return False

    join_room(user_room(current_user.id))
