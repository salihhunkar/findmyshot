from __future__ import annotations

import logging
import smtplib
from email.message import EmailMessage
from email.utils import formataddr
from urllib.parse import urlencode

from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


def build_photographer_invite_link(event_slug: str, photographer_email: str) -> str:
    base_url = settings.public_base_url.rstrip("/")
    query = urlencode({"event": event_slug, "email": photographer_email})
    return f"{base_url}/photographer/login?{query}"


def build_photographer_invite_body(
    *,
    photographer_name: str,
    photographer_email: str,
    password: str,
    event_title: str,
    event_slug: str,
) -> str:
    invite_link = build_photographer_invite_link(event_slug, photographer_email)
    return (
        f"Merhaba {photographer_name},\n\n"
        f"FindMyShot üzerinde sana bir fotografci daveti olusturuldu.\n\n"
        f"Etkinlik: {event_title}\n"
        f"E-posta: {photographer_email}\n"
        f"Sifre: {password}\n"
        f"Giris linki: {invite_link}\n\n"
        "Bu link ile sadece sana atanmis fotografci paneline giris yapabilirsin.\n"
    )


def send_photographer_invite_email(
    *,
    photographer_name: str,
    photographer_email: str,
    password: str,
    event_title: str,
    event_slug: str,
) -> bool:
    if not settings.smtp_host.strip():
        logger.info(
            "Photographer invite (SMTP disabled): %s | %s",
            photographer_email,
            build_photographer_invite_body(
                photographer_name=photographer_name,
                photographer_email=photographer_email,
                password=password,
                event_title=event_title,
                event_slug=event_slug,
            ),
        )
        return True

    message = EmailMessage()
    message["Subject"] = "FindMyShot Fotografci Giris Bilgileri"
    message["From"] = formataddr((settings.smtp_from_name, settings.smtp_from_email))
    message["To"] = photographer_email
    message.set_content(
        build_photographer_invite_body(
            photographer_name=photographer_name,
            photographer_email=photographer_email,
            password=password,
            event_title=event_title,
            event_slug=event_slug,
        )
    )

    with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=20) as smtp:
        if settings.smtp_use_tls:
            smtp.starttls()
        if settings.smtp_username.strip():
            smtp.login(settings.smtp_username, settings.smtp_password)
        smtp.send_message(message)
    return True
