"""
Firebase Admin Service
======================

Initialises the Firebase Admin SDK and exposes helpers for
verifying ID tokens and sending push notifications via FCM.
"""

import logging
from typing import Optional, List

import firebase_admin
from firebase_admin import auth as firebase_auth, credentials, messaging

from app.core.config import settings

logger = logging.getLogger(__name__)

_firebase_app: Optional[firebase_admin.App] = None


def init_firebase() -> None:
    """
    Initialise the Firebase Admin SDK.

    Call once at application startup.  The SDK is configured from either:
      1. A service-account JSON whose path is in ``FIREBASE_CREDENTIALS_PATH``, or
      2. Application Default Credentials (ADC) — useful in Cloud Run / GCE.

    If neither is available the SDK still initialises (limited to
    ``verify_id_token`` which only needs the project ID).
    """
    global _firebase_app

    if _firebase_app is not None:
        return  # already initialised

    try:
        cred_path = settings.firebase_credentials_path
        if cred_path:
            cred = credentials.Certificate(cred_path)
            _firebase_app = firebase_admin.initialize_app(cred)
            logger.info("Firebase Admin SDK initialised with service-account credentials")
        else:
            # No explicit credentials → try ADC, or just project-id mode
            options = {}
            if settings.firebase_project_id:
                options["projectId"] = settings.firebase_project_id
            _firebase_app = firebase_admin.initialize_app(options=options if options else None)
            logger.info("Firebase Admin SDK initialised with default / project-id credentials")
    except Exception as exc:
        logger.error("Failed to initialise Firebase Admin SDK: %s", exc)
        raise


def verify_firebase_token(id_token: str) -> dict:
    """
    Verify a Firebase ID token and return its decoded claims.

    Returns a dict containing at least:
        - ``uid``   – Firebase user UID
        - ``email`` – user email (if present)
        - ``name``  – display name (if present)
        - ``picture`` – profile photo URL (if present)

    Raises ``firebase_admin.auth.InvalidIdTokenError`` or
    ``firebase_admin.auth.ExpiredIdTokenError`` on failure.
    """
    if _firebase_app is None:
        init_firebase()

    decoded = firebase_auth.verify_id_token(id_token)
    return decoded


def send_push_notification(
    tokens: List[str],
    title: str,
    body: str,
    data: Optional[dict] = None,
) -> dict:
    """
    Send a push notification to multiple FCM device tokens.

    Returns a dict with ``success_count`` and ``failure_count``.
    Invalid / expired tokens are returned in ``invalid_tokens`` so
    the caller can remove them from the database.
    """
    if _firebase_app is None:
        init_firebase()

    if not tokens:
        return {"success_count": 0, "failure_count": 0, "invalid_tokens": []}

    notification = messaging.Notification(title=title, body=body)

    message = messaging.MulticastMessage(
        notification=notification,
        data=data or {},
        tokens=tokens,
    )

    try:
        response = messaging.send_each_for_multicast(message)
        logger.info(
            "FCM sent: %d success, %d failure",
            response.success_count,
            response.failure_count,
        )

        # Collect invalid tokens for cleanup
        invalid_tokens: List[str] = []
        if response.responses:
            for idx, send_response in enumerate(response.responses):
                if send_response.exception:
                    error_code = getattr(send_response.exception, "code", "")
                    if error_code in (
                        "NOT_FOUND",
                        "UNREGISTERED",
                        "INVALID_ARGUMENT",
                    ):
                        invalid_tokens.append(tokens[idx])

        return {
            "success_count": response.success_count,
            "failure_count": response.failure_count,
            "invalid_tokens": invalid_tokens,
        }
    except Exception as exc:
        logger.error("FCM multicast error: %s", exc)
        return {"success_count": 0, "failure_count": len(tokens), "invalid_tokens": []}


def send_push_to_single(
    token: str,
    title: str,
    body: str,
    data: Optional[dict] = None,
) -> bool:
    """Send a push notification to a single device. Returns True on success."""
    if _firebase_app is None:
        init_firebase()

    message = messaging.Message(
        notification=messaging.Notification(title=title, body=body),
        data=data or {},
        token=token,
    )
    try:
        messaging.send(message)
        return True
    except Exception as exc:
        logger.error("FCM single-send error: %s", exc)
        return False
