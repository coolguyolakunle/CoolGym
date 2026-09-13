import os
import smtplib
from email.message import EmailMessage


def send_contact_reply(contact, reply_body):
    """Send an admin response directly to a contact form sender via SMTP."""
    host = os.getenv("SMTP_HOST")
    username = os.getenv("SMTP_USERNAME")
    password = os.getenv("SMTP_PASSWORD")
    sender = os.getenv("SMTP_FROM") or username
    port = int(os.getenv("SMTP_PORT", "465"))
    security = os.getenv("SMTP_SECURITY", "ssl").lower()

    if not all((host, username, password, sender)):
        raise RuntimeError("Email is not configured. Set SMTP_HOST, SMTP_USERNAME, SMTP_PASSWORD, and SMTP_FROM.")
    if security not in {"ssl", "starttls", "none"}:
        raise RuntimeError("SMTP_SECURITY must be ssl, starttls, or none.")

    message = EmailMessage()
    message["Subject"] = "Re: {}".format(contact.subject or "Your CoolGym message")
    message["From"] = sender
    message["To"] = contact.email
    message["Reply-To"] = sender
    message.set_content("Hello {},\n\n{}\n\nBest,\nCoolGym".format(contact.name or "there", reply_body))

    if security == "ssl":
        with smtplib.SMTP_SSL(host, port, timeout=20) as client:
            client.login(username, password)
            client.send_message(message)
    else:
        with smtplib.SMTP(host, port, timeout=20) as client:
            client.ehlo()
            if security == "starttls":
                client.starttls()
                client.ehlo()
            client.login(username, password)
            client.send_message(message)
