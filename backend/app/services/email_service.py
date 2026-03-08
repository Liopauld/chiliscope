"""
Email Service
=============

Sends email notifications using SMTP (Gmail app password or any SMTP provider).
Falls back gracefully if SMTP is not configured.
"""

import logging
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional

from app.core.config import settings

logger = logging.getLogger(__name__)


def _get_smtp_config() -> dict | None:
    """Return SMTP config if configured, else None."""
    host = getattr(settings, "smtp_host", "") or ""
    port = getattr(settings, "smtp_port", 587)
    user = getattr(settings, "smtp_user", "") or ""
    password = getattr(settings, "smtp_password", "") or ""
    from_email = getattr(settings, "smtp_from_email", "") or user

    if not host or not user or not password:
        return None
    return {
        "host": host,
        "port": int(port),
        "user": user,
        "password": password,
        "from_email": from_email,
    }


def send_email(to_email: str, subject: str, html_body: str) -> bool:
    """
    Send an email. Returns True on success, False on failure.
    Fails silently if SMTP is not configured.
    """
    cfg = _get_smtp_config()
    if not cfg:
        logger.warning("SMTP not configured — skipping email to %s", to_email)
        return False

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"ChiliScope <{cfg['from_email']}>"
        msg["To"] = to_email
        msg.attach(MIMEText(html_body, "html"))

        with smtplib.SMTP(cfg["host"], cfg["port"], timeout=10) as server:
            server.ehlo()
            server.starttls()
            server.ehlo()
            server.login(cfg["user"], cfg["password"])
            server.sendmail(cfg["from_email"], to_email, msg.as_string())

        logger.info("Email sent to %s: %s", to_email, subject)
        return True
    except Exception as exc:
        logger.error("Failed to send email to %s: %s", to_email, exc)
        return False


def send_ban_notification_email(
    to_email: str,
    full_name: str,
    reason: str,
    reason_category: str,
    is_temporary: bool = False,
    duration_days: Optional[int] = None,
) -> bool:
    """Send an email notifying the user their account has been deactivated."""
    ban_type = "temporarily suspended" if is_temporary else "deactivated"
    duration_text = ""
    if is_temporary and duration_days:
        duration_text = f"""
        <tr>
          <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Duration</td>
          <td style="padding: 8px 0; font-size: 14px; font-weight: 600;">{duration_days} day{'s' if duration_days > 1 else ''}</td>
        </tr>
        """

    html = f"""
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 0; background: #f9fafb;">
      <div style="max-width: 560px; margin: 40px auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
        <div style="background: linear-gradient(135deg, #991b1b, #dc2626); padding: 32px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">🌶️ ChiliScope</h1>
          <p style="color: rgba(255,255,255,0.8); margin: 8px 0 0; font-size: 14px;">Account Notification</p>
        </div>
        <div style="padding: 32px;">
          <h2 style="color: #1f2937; margin: 0 0 16px; font-size: 20px;">Account {ban_type.title()}</h2>
          <p style="color: #4b5563; line-height: 1.6; margin: 0 0 24px;">
            Dear {full_name},<br><br>
            We're writing to inform you that your ChiliScope account has been <strong>{ban_type}</strong>.
          </p>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
            <tr>
              <td style="padding: 8px 0; color: #6b7280; font-size: 14px; border-top: 1px solid #f3f4f6;">Category</td>
              <td style="padding: 8px 0; font-size: 14px; font-weight: 600; border-top: 1px solid #f3f4f6;">{reason_category}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280; font-size: 14px; border-top: 1px solid #f3f4f6;">Reason</td>
              <td style="padding: 8px 0; font-size: 14px; border-top: 1px solid #f3f4f6;">{reason}</td>
            </tr>
            {duration_text}
          </table>
          <p style="color: #6b7280; font-size: 13px; line-height: 1.5;">
            If you believe this action was taken in error, please contact our support team for assistance.
          </p>
        </div>
        <div style="padding: 16px 32px; background: #f9fafb; text-align: center; border-top: 1px solid #f3f4f6;">
          <p style="color: #9ca3af; font-size: 11px; margin: 0;">
            © 2026 ChiliScope — Technological University of the Philippines Taguig | Group 9
          </p>
        </div>
      </div>
    </body>
    </html>
    """

    subject = f"ChiliScope — Account {ban_type.title()}"
    return send_email(to_email, subject, html)
