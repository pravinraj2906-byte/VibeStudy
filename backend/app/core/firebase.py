import os
import json
import logging
from typing import Optional, Dict, Any

logger = logging.getLogger("proofforge.auth.firebase")

_firebase_initialized = False

def initialize_firebase():
    """
    Initializes the Firebase Admin SDK using credentials if available.
    Supports:
    1. FIREBASE_SERVICE_ACCOUNT_PATH (path to service account JSON)
    2. FIREBASE_SERVICE_ACCOUNT_JSON (raw JSON string of credentials)
    3. GOOGLE_APPLICATION_CREDENTIALS
    4. Project ID only (for GCP / cloud environments)
    """
    global _firebase_initialized
    if _firebase_initialized:
        return True

    try:
        import firebase_admin
        from firebase_admin import credentials

        if firebase_admin._apps:
            _firebase_initialized = True
            return True

        cred_path = os.getenv("FIREBASE_SERVICE_ACCOUNT_PATH")
        cred_json = os.getenv("FIREBASE_SERVICE_ACCOUNT_JSON")
        project_id = os.getenv("FIREBASE_PROJECT_ID")

        if cred_path and os.path.exists(cred_path):
            cred = credentials.Certificate(cred_path)
            firebase_admin.initialize_app(cred)
            _firebase_initialized = True
            logger.info("Firebase Admin SDK initialized successfully via service account file.")
            return True

        if cred_json:
            try:
                cert_dict = json.loads(cred_json)
                cred = credentials.Certificate(cert_dict)
                firebase_admin.initialize_app(cred)
                _firebase_initialized = True
                logger.info("Firebase Admin SDK initialized successfully via raw JSON string.")
                return True
            except Exception as ex:
                logger.error(f"Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON: {ex}")

        # Check default credentials or project ID
        if project_id:
            firebase_admin.initialize_app(options={"projectId": project_id})
            _firebase_initialized = True
            logger.info(f"Firebase Admin SDK initialized with project ID: {project_id}")
            return True

        logger.info("Firebase Admin SDK not initialized: No service account credentials or project ID provided yet. Standing by for user configuration checkpoint.")
        return False
    except Exception as e:
        logger.warning(f"Firebase Admin SDK initialization deferred: {e}")
        return False


def is_firebase_ready() -> bool:
    global _firebase_initialized
    if not _firebase_initialized:
        return initialize_firebase()
    return _firebase_initialized


def verify_firebase_id_token(id_token: str) -> Optional[Dict[str, Any]]:
    """
    Verifies a Firebase ID token server-side and returns the decoded claims.
    Returns None if verification fails or Firebase is not configured.
    """
    if not is_firebase_ready():
        logger.warning("Attempted to verify Firebase ID token, but Firebase Admin SDK is not configured yet.")
        return None

    try:
        from firebase_admin import auth
        decoded_token = auth.verify_id_token(id_token)
        return decoded_token
    except Exception as e:
        logger.error(f"Firebase ID token verification failed: {e}")
        return None
