import { db, sign, esc } from './_lib.js';

// Called weekly by Vercel Cron (see vercel.json). Add ?dry=1 to preview without sending.
export default async function handler(req, res) {
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) return res.status(401).send('Unauthorized');

  const [kidsSnap, postsSnap] = await Promise.all([db.collection('players').get(), db.collection('posts').get()]);
  const homework = postsSnap.docs.map((d) => ({ id: d.id, ...d.data() })).filter((p) => p.type === 'homework');
  const weekAgo = new Date(Date.now() - 7 * 864e5).toLocaleDateString('en-CA');

  const byParent = {};
  kidsSnap.docs.forEach((d) => {
    const k = d.data();
    if (k.parentEmail && k.updates !== false) (byParent[k.parentEmail.toLowerCase()] ||= []).push(k);
  });

  const base = process.env.APP_URL || `https://${req.headers.host}`;
  const kidBlock = (k) => {
    const mine = homework.filter((p) => p.churchId === k.churchId && (!p.classId || p.classId === k.classId));
    const isDone = (p) => (k.done || []).includes(p.id);
    const open = mine.filter((p) => !isDone(p));
    const att = k.attendance || [];
    return `<h3><img src="${base}/assets/ui/sheep.png" width="24" height="24" alt="" style="vertical-align:middle;margin-right:6px">${esc(k.name)}</h3><ul>
      <li>Masses this week: <b>${att.filter((d) => d >= weekAgo).length}</b> (total ${att.length})</li>
      <li>Prayers said: <b>${k.prayers || 0}</b></li>
      <li>Lost sheep found: <b>${k.lambs || 0}</b></li>
      <li>Homework done: <b>${mine.length - open.length} of ${mine.length}</b></li></ul>
      ${open.length ? `<p>Still to do:</p><ul>${open.map((p) => `<li>${esc(p.title)}${p.due ? ` (due ${esc(p.due)})` : ''}</li>`).join('')}</ul>` : ''}`;
  };

  const emails = Object.entries(byParent).map(([to, kids]) => ({
    from: process.env.MAIL_FROM,
    to: [to],
    subject: "Your child's week in Flock Hub",
    html: `<div style="font-family:Arial,sans-serif;max-width:520px"><h2>Weekly progress</h2>${kids.map(kidBlock).join('')}
      <p style="color:#777;font-size:12px">You get this because you agreed to progress emails when signing up.
      <a href="${base}/api/unsubscribe?e=${encodeURIComponent(to)}&t=${sign(to)}">Unsubscribe</a></p></div>`,
  }));

  if (req.query.dry) return res.status(200).json({ parents: emails.length, to: emails.map((e) => e.to[0]), firstHtml: emails[0]?.html || null });

  let sent = 0; const errors = [];
  for (let i = 0; i < emails.length; i += 100) {
    const chunk = emails.slice(i, i + 100);
    const r = await fetch('https://api.resend.com/emails/batch', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(chunk),
    });
    if (r.ok) sent += chunk.length; else errors.push(await r.text());
  }
  res.status(errors.length ? 502 : 200).json({ parents: emails.length, sent, errors });
}
