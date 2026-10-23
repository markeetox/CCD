import { timingSafeEqual } from 'node:crypto';
import { db, sign } from './_lib.js';

export default async function handler(req, res) {
  const email = String(req.query.e || '').toLowerCase();
  const t = String(req.query.t || '');
  let ok = false;
  try { ok = t.length === 64 && timingSafeEqual(Buffer.from(t), Buffer.from(sign(email))); } catch { ok = false; }
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  if (!ok) return res.status(400).send('<p>This unsubscribe link is not valid.</p>');
  const snap = await db.collection('players').where('parentEmail', '==', email).get();
  await Promise.all(snap.docs.map((d) => d.ref.update({ updates: false })));
  res.status(200).send('<p style="font-family:Arial,sans-serif">You are unsubscribed from Flock Hub progress emails. 🐑</p>');
}
