import { cloudEnabled, waitForUser, finishLinkSignIn, sendLink, logOut, db } from './firebase.js';
import { doc, getDoc, getDocs, setDoc, addDoc, deleteDoc, collection, query, where } from 'firebase/firestore';

const $ = (s) => document.querySelector(s);
const app = $('#app');
const ic = (n, s = 24) => `<img class="ic" src="/assets/ui/${n}.png" width="${s}" height="${s}" alt="">`;
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
let cid, me;
const imgs = {};
const loadImg = (src) => (imgs[src] ||= new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = src; }));
// Draws a child's sheep (wool color + hat/neck/extra) the same way the game does.
async function drawLook(cv, k) {
  const ctx = cv.getContext('2d'); ctx.imageSmoothingEnabled = false;
  const sheep = await loadImg('/assets/sheep.png'); if (!sheep) return;
  const off = document.createElement('canvas'); off.width = off.height = 48; const o = off.getContext('2d');
  o.drawImage(sheep, 0, 0); o.globalCompositeOperation = 'multiply'; o.fillStyle = `#${Number(k.color ?? 0xf7f3e8).toString(16).padStart(6, '0')}`; o.fillRect(0, 0, 48, 48);
  o.globalCompositeOperation = 'destination-in'; o.drawImage(sheep, 0, 0);
  const gear = async (slot) => { const g = k[slot] && (await loadImg(`/assets/gear/${k[slot]}.png`)); if (g) ctx.drawImage(g, 0, 0, cv.width, cv.height); };
  await gear('extra'); ctx.drawImage(off, 0, 0, cv.width, cv.height); await gear('neck'); await gear('hat');
}
const byChurch = (name) => getDocs(query(collection(db, name), where('churchId', '==', cid)));

async function main() {
  if (!cloudEnabled) { app.textContent = 'Firebase is not configured. Add the VITE_FIREBASE_* variables.'; return; }
  const user = (await finishLinkSignIn().catch(() => null)) || (await waitForUser());
  if (!user) return login();
  me = user.email.toLowerCase();
  const a = await getDoc(doc(db, 'admins', me)).catch(() => null);
  if (!a || !a.exists()) return denied();
  cid = a.data().churchId;
  shell();
}

function login() {
  app.innerHTML = `<h1>${ic('sheep', 28)}Flock Hub Admin</h1><div class="card"><p>Enter your admin email. We will send a sign-in link.</p>
    <input id="em" type="email" placeholder="Admin email" autocapitalize="none" /><button class="b" id="go">Email me a link</button><p id="msg" class="err"></p></div>`;
  $('#go').onclick = async () => {
    const email = $('#em').value.trim().toLowerCase();
    try { await sendLink(email, '/admin.html'); $('.card').innerHTML = `<p>${ic('mail')}Check your email and tap the link.</p>`; }
    catch (e) { $('#msg').textContent = 'Could not send the link: ' + (e.code || e.message); }
  };
}

function denied() {
  app.innerHTML = `<h1>Not an admin</h1><div class="card"><p>${esc(me)} is not set up as a church admin.</p><button class="b" id="so">Sign out</button></div>`;
  $('#so').onclick = async () => { await logOut(); location.reload(); };
}

function shell() {
  app.innerHTML = `<h1>${ic('sheep', 28)}Flock Hub Admin</h1><div class="sub">Church: <b>${esc(cid)}</b> | ${esc(me)} | <a href="#" id="so">Sign out</a></div>
    <nav><button data-t="students">Students</button><button data-t="assign">Homework &amp; messages</button><button data-t="roster">Parent list</button><button data-t="mass">Mass times</button></nav><div id="tab" class="card"></div>`;
  $('#so').onclick = async (e) => { e.preventDefault(); await logOut(); location.reload(); };
  const tabs = { students: tabStudents, assign: tabAssign, roster: tabRoster, mass: tabMass };
  document.querySelectorAll('nav button').forEach((b) => (b.onclick = () => {
    document.querySelectorAll('nav button').forEach((x) => x.classList.toggle('on', x === b));
    tabs[b.dataset.t]().catch((e) => ($('#tab').textContent = 'Error: ' + (e.code || e.message)));
  }));
  document.querySelector('nav button').click();
}

async function tabStudents() {
  $('#tab').textContent = 'Loading…';
  const [ps, posts] = await Promise.all([byChurch('players'), byChurch('posts')]);
  const hw = posts.docs.map((d) => ({ id: d.id, ...d.data() })).filter((x) => x.type === 'homework');
  const kids = ps.docs.map((d) => d.data()).sort((a, b) => (a.classId || '').localeCompare(b.classId || ''));
  const rows = kids.map((k, i) => {
    const mine = hw.filter((h) => !h.classId || h.classId === k.classId);
    const done = mine.filter((h) => (k.done || []).includes(h.id)).length;
    return `<tr><td><canvas class="lk" width="96" height="96" data-i="${i}"></canvas> ${esc(k.name)}</td><td>${esc(k.classId)}</td><td>${esc(k.parentEmail)}</td><td>${(k.attendance || []).length}</td><td>${k.prayers || 0}</td><td>${k.lambs || 0}</td><td>${done}/${mine.length}</td></tr>`;
  }).join('');
  $('#tab').innerHTML = `<div class="scroll"><table><tr><th>Sheep</th><th>Class</th><th>Parent</th><th>Masses</th><th>Prayers</th><th>Lambs</th><th>Homework</th></tr>${rows || '<tr><td colspan="7">No students have joined yet.</td></tr>'}</table></div>`;
  document.querySelectorAll('canvas.lk').forEach((cv) => drawLook(cv, kids[+cv.dataset.i]));
}

async function tabAssign() {
  $('#tab').innerHTML = `<form id="f"><select id="type"><option value="homework">Homework</option><option value="message">Message</option></select>
    <input id="cls" placeholder="Class (leave blank for everyone)" /><input id="title" placeholder="Title" required />
    <textarea id="body" rows="4" placeholder="Details"></textarea><label>Due date (homework)<input id="due" type="date" /></label>
    <button>Post to kids</button> <span id="msg"></span></form><div id="posts"></div>`;
  const list = async () => {
    const s = await byChurch('posts');
    const items = s.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => b.createdAt - a.createdAt);
    $('#posts').innerHTML = items.map((x) => `<div class="card">${ic(x.type === 'homework' ? 'homework' : 'mail')} <b>${esc(x.title)}</b> <small>${esc(x.classId || 'everyone')}${x.due ? ' | due ' + esc(x.due) : ''}</small><br>${esc(x.body)}<br><button class="b" data-id="${x.id}">Delete</button></div>`).join('') || '<p>Nothing posted yet.</p>';
    $('#posts').querySelectorAll('[data-id]').forEach((b) => (b.onclick = async () => { await deleteDoc(doc(db, 'posts', b.dataset.id)); list(); }));
  };
  $('#f').onsubmit = async (e) => {
    e.preventDefault();
    await addDoc(collection(db, 'posts'), { churchId: cid, classId: $('#cls').value.trim(), type: $('#type').value, title: $('#title').value.trim(), body: $('#body').value.trim(), due: $('#due').value, createdAt: Date.now(), by: me });
    $('#f').reset(); $('#msg').textContent = 'Posted'; list();
  };
  list();
}

async function tabRoster() {
  $('#tab').innerHTML = `<p>Paste one parent per line: <code>email, class</code> (class is optional, e.g. <code>maria@example.com, grade-4-mon</code>).</p>
    <textarea id="csv" rows="6"></textarea><button class="b" id="add">Add to list</button> <span id="msg"></span><div id="rows"></div>`;
  const list = async () => {
    const s = await byChurch('invites');
    $('#rows').innerHTML = `<p><b>${s.size}</b> parents on the list</p><div class="scroll"><table>${s.docs.map((d) => `<tr><td>${esc(d.id)}</td><td>${esc(d.data().classId)}</td><td><button class="b" data-id="${esc(d.id)}">Remove</button></td></tr>`).join('')}</table></div>`;
    $('#rows').querySelectorAll('[data-id]').forEach((b) => (b.onclick = async () => { await deleteDoc(doc(db, 'invites', b.dataset.id)); list(); }));
  };
  $('#add').onclick = async () => {
    const rows = $('#csv').value.split('\n').map((l) => l.split(',').map((x) => x.trim())).filter((r) => /^\S+@\S+\.\S+$/.test(r[0]));
    await Promise.all(rows.map(([email, classId]) => setDoc(doc(db, 'invites', email.toLowerCase()), { churchId: cid, classId: classId || '' })));
    $('#csv').value = ''; $('#msg').textContent = `Added ${rows.length}`; list();
  };
  list();
}

async function tabMass() {
  const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const snap = await getDoc(doc(db, 'churches', cid));
  let rows = (snap.exists() && snap.data().massTimes) || [];
  const collect = () => (rows = [...document.querySelectorAll('.mrow')].map((el) => ({ day: +el.querySelector('.d').value, time: el.querySelector('.t').value, note: el.querySelector('.n').value.trim() })));
  const draw = () => {
    $('#tab').innerHTML = `<p>These are the Mass times families see at the Church in the app.</p>${rows.map((r) => `<div class="mrow"><select class="d">${DAYS.map((d, n) => `<option value="${n}" ${n === r.day ? 'selected' : ''}>${d}</option>`).join('')}</select><input class="t" type="time" value="${esc(r.time)}"><input class="n" placeholder="Note (optional)" value="${esc(r.note)}"><button class="b rm">Remove</button></div>`).join('')}
      <button class="b" id="add">+ Add Mass</button><button class="b" id="save">Save</button> <span id="msg"></span>`;
    document.querySelectorAll('.rm').forEach((b, i) => (b.onclick = () => { collect(); rows.splice(i, 1); draw(); }));
    $('#add').onclick = () => { collect(); rows.push({ day: 0, time: '09:00', note: '' }); draw(); };
    $('#save').onclick = async () => {
      collect();
      rows = rows.filter((r) => r.time).sort((x, y) => x.day - y.day || x.time.localeCompare(y.time));
      try { await setDoc(doc(db, 'churches', cid), { massTimes: rows }, { merge: true }); draw(); $('#msg').textContent = 'Saved'; }
      catch (e) { $('#msg').textContent = 'Could not save: ' + (e.code || e.message); }
    };
  };
  draw();
}

main();
