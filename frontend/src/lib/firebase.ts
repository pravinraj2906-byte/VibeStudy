import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  User as FirebaseUser,
  Auth
} from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

export const isFirebaseConfigured = (): boolean => {
  return Boolean(
    firebaseConfig.apiKey && 
    firebaseConfig.apiKey !== 'your-firebase-api-key' &&
    firebaseConfig.projectId &&
    firebaseConfig.projectId !== 'your-project-id'
  );
};

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

if (isFirebaseConfigured()) {
  try {
    app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
    auth = getAuth(app);
  } catch (err) {
    console.warn('[Firebase] Client initialization deferred or failed:', err);
  }
}

export { auth, googleProvider };

export const signInWithGoogle = async (): Promise<{ idToken: string; user: FirebaseUser }> => {
  if (!auth) {
    throw new Error('Firebase Authentication is not configured yet. Please configure VITE_FIREBASE_* in frontend/.env.');
  }
  const result = await signInWithPopup(auth, googleProvider);
  const idToken = await result.user.getIdToken();
  return { idToken, user: result.user };
};

export const loginFirebaseEmail = async (email: string, password: string): Promise<{ idToken: string; user: FirebaseUser }> => {
  if (!auth) {
    throw new Error('Firebase Authentication is not configured yet.');
  }
  const result = await signInWithEmailAndPassword(auth, email, password);
  const idToken = await result.user.getIdToken();
  return { idToken, user: result.user };
};

export const registerFirebaseEmail = async (email: string, password: string): Promise<{ idToken: string; user: FirebaseUser }> => {
  if (!auth) {
    throw new Error('Firebase Authentication is not configured yet.');
  }
  const result = await createUserWithEmailAndPassword(auth, email, password);
  const idToken = await result.user.getIdToken();
  return { idToken, user: result.user };
};

export const resetFirebasePassword = async (email: string): Promise<void> => {
  if (!auth) {
    throw new Error('Firebase Authentication is not configured yet.');
  }
  await sendPasswordResetEmail(auth, email);
};

export const logoutFirebase = async (): Promise<void> => {
  if (auth) {
    await signOut(auth);
  }
};
