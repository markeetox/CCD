import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, sendSignInLinkToEmail, isSignInWithEmailLink, signInWithEmailLink, signOut } from 'firebase/auth';
import { getFirestore, doc, getDoc, getDocs, setDoc, collection, query, where } from 'firebase/firestore';

const cfg = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};
export const cloudEnabled = Boolean(cfg.apiKey && cfg.projectId);
export let auth, db;
if (cloudEnabled) { const app = initializeApp(cfg); auth = getAuth(app); db = getFirestore(app); }

// Parents sign in with a one-time email link. Each parent can have several kids (documents in "players").
export const waitForUser = () => new Promise((res) => { const off = onAuthStateChanged(auth, (u) => { off(); res(u); }); });
export const logOut = () => signOut(auth);

export async function sendLink(email, path = '/') {
  await sendSignInLinkToEmail(auth, email, { url: location.origin + path, handleCodeInApp: true });
  localStorage.setItem('flockEmail', email);
}

export async function finishLinkSignIn() {
  if (!isSignInWithEmailLink(auth, location.href)) return null;
  const email = localStorage.getItem('flockEmail') || prompt('Please confirm your email');
  const cred = await signInWithEmailLink(auth, email, location.href);
  history.replaceState({}, '', location.pathname);
  return cred.user;
}

// The church's invite list: invites/{parent email} -> { churchId, classId }
export async function getInvite() {
  const snap = await getDoc(doc(db, 'invites', auth.currentUser.email.toLowerCase()));
  return snap.exists() ? { ...snap.data(), email: auth.currentUser.email.toLowerCase() } : null;
}

export async function listPosts(churchId) {
  const snap = await getDocs(query(collection(db, 'posts'), where('churchId', '==', churchId)));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => b.createdAt - a.createdAt);
}

export async function getMassTimes(churchId) {
  const snap = await getDoc(doc(db, 'churches', churchId));
  return snap.exists() ? snap.data().massTimes || [] : [];
}

export async function listKids() {
  const snap = await getDocs(query(collection(db, 'players'), where('parentUid', '==', auth.currentUser.uid)));
  return snap.docs.map((d) => d.data());
}

export const loadLocal = () => JSON.parse(localStorage.getItem('flockHubSave:local') || 'null');

export async function savePlayer(p) {
  localStorage.setItem(`flockHubSave:${p.id || 'local'}`, JSON.stringify(p));
  if (!cloudEnabled || !auth.currentUser || !p.parentUid) return;
  try { await setDoc(doc(db, 'players', p.id), p); }
  catch (e) { console.warn('Cloud save failed', e); }
}
