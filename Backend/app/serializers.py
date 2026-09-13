def user_public(u, include_email=True):
    if u is None:
        return None
    return {
        "id": u.id,
        "first_name": u.first_name,
        "last_name": u.last_name,
        "full_name": u.full_name,
        "email": u.email if include_email else None,
        "role": u.role,
        "membership": u.membership,
        "joined_at": u.joined_at.isoformat() if u.joined_at else None,
        "specialty": u.specialty,
        "bio": u.bio,
        "phone_number": u.phone_number,
        "is_active": u.is_active,
        "image_file": u.image_file,
    }


def contact_message(m):
    return {
        "id": m.id,
        "name": m.name,
        "email": m.email,
        "subject": m.subject,
        "message": m.message,
        "sent_at": m.sent_at.isoformat() if m.sent_at else None,
    }


def booking(b):
    return {
        "id": b.id,
        "user_id": b.user_id,
        "user": user_public(b.user) if b.user else None,
        "plan": b.plan,
        "status": b.status,
        "booked_at": b.booked_at.isoformat() if b.booked_at else None,
    }


def coach_client(cc):
    return {
        "id": cc.id,
        "coach_id": cc.coach_id,
        "client_id": cc.client_id,
        "coach": user_public(cc.coach) if cc.coach else None,
        "client": user_public(cc.client) if cc.client else None,
        "assigned_at": cc.assigned_at.isoformat() if cc.assigned_at else None,
        "is_active": cc.is_active,
        "notes": cc.notes,
    }


def workout_plan(p):
    return {
        "id": p.id,
        "coach_id": p.coach_id,
        "client_id": p.client_id,
        "title": p.title,
        "description": p.description,
        "weeks": p.weeks,
        "created_at": p.created_at.isoformat() if p.created_at else None,
        "is_active": p.is_active,
    }


def progress_log(l):
    return {
        "id": l.id,
        "plan_id": l.plan_id,
        "client_id": l.client_id,
        "week": l.week,
        "note": l.note,
        "weight_kg": l.weight_kg,
        "sessions": l.sessions,
        "rating": l.rating,
        "logged_at": l.logged_at.isoformat() if l.logged_at else None,
    }


def message_obj(m, current_user_id=None):
    return {
        "id": m.id,
        "sender_id": m.sender_id,
        "receiver_id": m.receiver_id,
        "body": m.body,
        "sent_at": m.sent_at.isoformat() if m.sent_at else None,
        "is_read": m.is_read,
        "is_mine": (m.sender_id == current_user_id) if current_user_id else None,
    }
