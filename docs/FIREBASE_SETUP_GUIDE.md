# ProofForge AI — Firebase Authentication Setup Guide
**Dual-Authentication Architecture: Neon PostgreSQL JWT + Firebase Google OAuth**

This guide provides step-by-step instructions for completing the Firebase configuration checkpoint in ProofForge AI.

---

## 1. Architectural Overview

ProofForge AI employs a **Dual-Authentication Perimeter**:
1. **Primary Persistence & Integrity:** Neon Serverless PostgreSQL (`ep-curly-moon-b5hlkmd6-pooler.c-7.us-east-2.aws.neon.tech`) stores all users, projects, security findings, repair drafts, and transfer attempts.
2. **Standard Authentication:** Local email & password hashed with bcrypt and verified via HS256 JWT tokens.
3. **Federated SSO:** Firebase Authentication providing Google OAuth with automated server-side ID token verification via the Firebase Admin SDK.
4. **Idempotent Account Linking:** When a developer logs in with Google whose email matches an existing Neon user, their `firebase_uid` and `auth_provider` are linked to the existing record. No project data, repair history, or tenant privileges are orphaned.

---

## 2. Firebase Console Configuration Steps

### Step 1: Create or Open a Firebase Project
1. Navigate to the [Firebase Console](https://console.firebase.google.com/).
2. Click **Add project** (or select your existing project).
3. Name your project (e.g., `proofforge-ai`). Google Analytics is optional.

### Step 2: Enable Authentication Sign-in Methods
1. In the left navigation bar, go to **Build** → **Authentication**.
2. Click **Get Started**.
3. Under the **Sign-in method** tab:
   - **Google:** Click **Google** → Enable → Enter a project support email → Click **Save**.
   - **Email/Password:** Click **Email/Password** → Enable the first toggle (Email/Password) → Click **Save**.
4. In the **Settings** tab under **Authorized domains**, ensure the following domains are listed:
   - `localhost`
   - `127.0.0.1`

### Step 3: Register Web App (Frontend Configuration)
1. Go to **Project Overview** (gear icon ⚙️) → **Project settings**.
2. Under **Your apps**, click the Web icon (`</>`).
3. App nickname: `ProofForge AI Web`.
4. Click **Register app**.
5. Copy the `firebaseConfig` object values into your local `frontend/.env` file:

```env
# frontend/.env
VITE_API_URL=http://127.0.0.1:8000
VITE_FIREBASE_API_KEY=AIzaSyYourApiKeyHere...
VITE_FIREBASE_AUTH_DOMAIN=proofforge-ai.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=proofforge-ai
VITE_FIREBASE_STORAGE_BUCKET=proofforge-ai.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789012
VITE_FIREBASE_APP_ID=1:123456789012:web:abcdef123456
```

### Step 4: Generate Service Account Key (Backend Configuration)
1. In **Project settings**, switch to the **Service accounts** tab.
2. Ensure **Firebase Admin SDK** is selected with **Python**.
3. Click **Generate new private key**, then click **Generate key**.
4. A JSON file will download. Place this file in `backend/` as `firebase-credentials.json` (Note: this file is git-ignored):
   ```
   C:\Projects\ProofForge-AI\backend\firebase-credentials.json
   ```
5. In your `backend/.env` file, configure either the credentials path or project ID:

```env
# backend/.env
# Option A: Path to service account JSON (recommended for local dev)
FIREBASE_CREDENTIALS_PATH=firebase-credentials.json
FIREBASE_PROJECT_ID=proofforge-ai

# Option B: Raw JSON string (useful for CI/CD or cloud deployments)
# FIREBASE_CREDENTIALS_JSON='{"type": "service_account", ...}'
```

---

## 3. Deferred Configuration & Fallback Behavior

If Firebase credentials are not yet supplied:
- **Fail-Safe Operation:** The backend starts without errors. `is_firebase_configured()` returns `False`.
- **Frontend Fallback:** The "Continue with Google" button detects unconfigured Firebase credentials and displays an informational notice guiding the engineer to email/password authentication or this setup guide.
- **Backend Fallback:** The `POST /api/v1/auth/firebase-login` endpoint returns HTTP 503 Service Unavailable with a clear message: `"Firebase Admin SDK is not configured"`.
- **Standard Email & Password:** Fully operational against Neon PostgreSQL.

---

## 4. Verification Testing

### Automated Test Suite
To verify the Firebase backend integration and dual-auth dependency:
```powershell
cd C:\Projects\ProofForge-AI\backend
.venv\Scripts\pytest tests/test_firebase_auth.py -v
```
Expected output:
```
tests/test_firebase_auth.py::test_firebase_login_new_user PASSED
tests/test_firebase_auth.py::test_firebase_login_account_linking PASSED
tests/test_firebase_auth.py::test_firebase_login_invalid_token PASSED
tests/test_firebase_auth.py::test_get_current_user_with_firebase_token PASSED
```

### End-to-End Browser Verification
1. Start the backend: `cd backend; .venv\Scripts\uvicorn app.main:app --port 8000`
2. Start the frontend: `cd frontend; npm run dev`
3. Visit `http://127.0.0.1:5173/auth`
4. Click **Continue with Google**
5. Select your Google account in the popup
6. Verify redirect to `/dashboard` and check the user badge in the lower-left sidebar showing `Google`.
