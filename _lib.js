import admin from 'firebase-admin';
import { createHmac } from 'node:crypto';

if (!admin.apps.length) {
  admin.initializeApp({ credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)) });
}
export const db = admin.firestore();
export const sign = (email) => createHmac('sha256', process.env.CRON_SECRET).update(email.toLowerCase()).digest('hex');
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
