import Phaser from 'phaser';
import { savePlayer, loadLocal, cloudEnabled, waitForUser, finishLinkSignIn, sendLink, getInvite, listKids, listPosts, getMassTimes, logOut } from './firebase.js';

const ADJ = ['Woolly', 'Gentle', 'Brave', 'Joyful', 'Little', 'Happy'];
const NOUN = ['Lamb', 'Dove', 'Pilgrim', 'Clover', 'Cloud', 'Star'];
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const COLORS = [0xf7f3e8, 0xd9c6a5, 0xa0a0a0, 0xf6b8d0, 0xb8d8f6];
const ITEMS = { halo: '😇 Halo', rosary: '📿 Rosary Charm', medal: '🏅 Lost Lamb Medal', homework: '📚 Homework Hero' };
const SPOTS = [
  { k: 'board', x: 480, y: 110, c: 0xb5835a, label: 'Notice Board' },
  { k: 'church', x: 240, y: 240, c: 0xd8c8a8, label: 'Church' },
  { k: 'pasture', x: 720, y: 240, c: 0x5aa84a, label: 'Pasture' },
  { k: 'chapel', x: 240, y: 720, c: 0xa9c0ea, label: 'Chapel' },
  { k: 'gallery', x: 720, y: 720, c: 0xf2c14e, label: 'Gallery' },
];
const joy = { x: 0, y: 0 };
let player;

const save = () => savePlayer(player);
const hud = () => { $('hud').textContent = `🐑 ${player.name}  ${cloudEnabled ? '☁️ cloud save' : '💾 local save'}`; };
function toast(t) { const el = $('toast'); el.textContent = t; el.style.opacity = 1; setTimeout(() => (el.style.opacity = 0), 2200); }
function award(id) { if (!player.items.includes(id)) { player.items.push(id); toast(`New collectible: ${ITEMS[id]}`); } save(); }
function panel(html, onClose) {
  const p = $('panel');
  p.innerHTML = html + '<div><button id="close">Back to map</button></div>';
  p.style.display = 'block';
  $('close').onclick = () => { p.style.display = 'none'; onClose(); };
  return p;
}

const friendly = (e) => ({
  'auth/invalid-email': 'That email does not look right.',
  'auth/operation-not-allowed': 'Email link sign-in is not turned on in Firebase.',
  'auth/unauthorized-continue-uri': 'This website address is not in Firebase authorized domains.',
  'auth/network-request-failed': 'No internet connection. Try again.',
  'auth/too-many-requests': 'Too many tries. Wait a minute and try again.',
}[e.code] || 'Something went wrong. Try again.');

// Parent sign-in. Never resolves: after tapping the emailed link the page reloads signed in.
function emailScreen() {
  const p = $('panel');
  p.innerHTML = `<h2>🐑 Flock Hub</h2><p>Parents: enter the email your church has on file. We will send a sign-in link (no password).</p>
    <input id="em" type="email" placeholder="Parent email" autocapitalize="none" />
    <label><input id="ok" type="checkbox" style="display:inline;width:auto" /> I am the parent or guardian. My child may play, and I agree to receive progress emails.</label><br>
    <button id="send">Email me a link</button><p id="err" style="color:#a02020"></p>`;
  p.style.display = 'block';
  return new Promise(() => {
    const err = (m) => (p.querySelector('#err').textContent = m);
    p.querySelector('#send').onclick = async () => {
      const email = p.querySelector('#em').value.trim().toLowerCase();
      if (!/^\S+@\S+\.\S+$/.test(email)) return err('Enter a valid email.');
      if (!p.querySelector('#ok').checked) return err('Please check the box to continue.');
      try {
        await sendLink(email);
        p.innerHTML = '<h2>📬 Check your email</h2><p>Tap the link we sent to <b id="who"></b> to open Flock Hub. You can close this tab.</p>';
        p.querySelector('#who').textContent = email;
      } catch (e) { err(friendly(e)); }
    };
  });
}

function blocked() {
  const p = $('panel');
  p.innerHTML = `<h2>Almost there</h2><p>This email is not on your church's list yet (or we could not reach the server). Ask your CCD coordinator to add it, then try again.</p><button id="so">Sign out</button>`;
  p.style.display = 'block';
  p.querySelector('#so').onclick = async () => { await logOut(); location.reload(); };
}

function kidPicker(kids, parentUid, invite) {
  return new Promise((resolve) => {
    const p = $('panel');
    const rows = kids.map((k, i) => `<button data-i="${i}">🐑 ${k.name}</button>`).join('<br>');
    p.innerHTML = `<h2>Who is playing?</h2>${rows}<hr>${kids.length < 6 ? '<button id="add">➕ New sheep</button>' : ''}<button id="so">Sign out</button>`;
    p.style.display = 'block';
    const go = (k) => { p.style.display = 'none'; resolve(k); };
    p.querySelectorAll('[data-i]').forEach((b) => (b.onclick = () => go(kids[+b.dataset.i])));
    const add = p.querySelector('#add');
    if (add) add.onclick = () => go({ id: crypto.randomUUID(), parentUid, churchId: invite.churchId, classId: invite.classId || '', parentEmail: invite.email, name: `${pick(ADJ)} ${pick(NOUN)} ${Math.floor(Math.random() * 90 + 10)}`, updates: true });
    p.querySelector('#so').onclick = async () => { await logOut(); location.reload(); };
  });
}

function setupJoystick() {
  const base = $('joy'), knob = $('knob'); let id = null;
  const move = (e) => {
    const r = base.getBoundingClientRect(), m = r.width / 2;
    let dx = e.clientX - (r.left + m), dy = e.clientY - (r.top + m);
    const d = Math.hypot(dx, dy) || 1, k = Math.min(d, m);
    dx = (dx / d) * k; dy = (dy / d) * k;
    knob.style.transform = `translate(${dx}px,${dy}px)`; joy.x = dx / m; joy.y = dy / m;
  };
  const end = () => { id = null; joy.x = joy.y = 0; knob.style.transform = ''; };
  base.addEventListener('pointerdown', (e) => { id = e.pointerId; base.setPointerCapture(id); move(e); });
  base.addEventListener('pointermove', (e) => { if (e.pointerId === id) move(e); });
  base.addEventListener('pointerup', end); base.addEventListener('pointercancel', end);
}

function makeTextures(s) {
  ['sheep', 'lamb'].forEach((k) => s.textures.exists(k) && s.textures.remove(k));
  let g = s.make.graphics({ add: false });
  g.fillStyle(player.color).fillCircle(16, 18, 13).fillStyle(0x3b3b3b).fillCircle(16, 9, 6)
    .fillStyle(0xffffff).fillCircle(14, 8, 1.5).fillCircle(18, 8, 1.5);
  g.generateTexture('sheep', 32, 32); g.destroy();
  g = s.make.graphics({ add: false });
  g.fillStyle(0xffffff).fillCircle(10, 11, 8).fillStyle(0x3b3b3b).fillCircle(10, 6, 4);
  g.generateTexture('lamb', 20, 20); g.destroy();
}

function controls(s) { s.cur = s.input.keyboard.createCursorKeys(); s.wasd = s.input.keyboard.addKeys('W,A,S,D'); }
function steer(s) {
  let x = joy.x, y = joy.y; const c = s.cur, w = s.wasd;
  if (!x && !y) { x = (c.right.isDown || w.D.isDown) - (c.left.isDown || w.A.isDown); y = (c.down.isDown || w.S.isDown) - (c.up.isDown || w.W.isDown); }
  const m = Math.max(1, Math.hypot(x, y));
  s.sheep.setVelocity((x / m) * 170, (y / m) * 170);
  if (x) s.sheep.setFlipX(x < 0);
}

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const fmt = (t) => { const [h, m] = String(t).split(':').map(Number); return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`; };
async function showMassTimes(el) {
  let list = [];
  try { list = cloudEnabled && player.churchId ? await getMassTimes(player.churchId) : []; } catch (e) { console.warn(e); }
  el.innerHTML = list.length ? list.map((x) => `${esc(DAYS[x.day])} ${esc(fmt(x.time))}${x.note ? ` <small>(${esc(x.note)})</small>` : ''}`).join('<br>') : '<small>Your church has not posted Mass times yet.</small>';
}

const PANELS = {
  church(s, done) {
    const today = new Date().toLocaleDateString('en-CA');
    const p = panel(`<h2>⛪ Church</h2><p><b>Mass times</b><br><span id="mt">Loading…</span></p><p>Masses attended: <b id="n">${player.attendance.length}</b></p><button id="go">I went to Mass today</button>`, done);
    showMassTimes(p.querySelector('#mt'));
    p.querySelector('#go').onclick = () => {
      if (player.attendance.includes(today)) return toast('Already counted today!');
      player.attendance.push(today); p.querySelector('#n').textContent = player.attendance.length; award('halo');
    };
  },
  async board(s, done) {
    const p = panel('<h2>📌 Notice Board</h2><div id="list">Loading…</div>', done);
    const box = p.querySelector('#list');
    let posts = [];
    try { posts = cloudEnabled && player.churchId ? await listPosts(player.churchId) : []; } catch (e) { console.warn(e); }
    posts = posts.filter((x) => !x.classId || x.classId === player.classId);
    if (!posts.length) { box.textContent = 'Nothing new. Great job!'; return; }
    box.innerHTML = posts.map((x) => `<p>${x.type === 'homework' ? '📖' : '✉️'} <b>${esc(x.title)}</b>${x.due ? ` <small>due ${esc(x.due)}</small>` : ''}<br>${esc(x.body)}${x.type === 'homework' ? (player.done.includes(x.id) ? '<br>✅ Done' : `<br><button data-id="${esc(x.id)}">I did it</button>`) : ''}</p>`).join('');
    box.querySelectorAll('[data-id]').forEach((b) => (b.onclick = () => { player.done.push(b.dataset.id); b.replaceWith('✅ Done'); award('homework'); }));
  },
  chapel(s, done) {
    const p = panel(`<h2>🕊️ Chapel</h2><p><i>Hail Mary, full of grace, the Lord is with thee. Blessed art thou amongst women, and blessed is the fruit of thy womb, Jesus. Holy Mary, Mother of God, pray for us sinners, now and at the hour of our death. Amen.</i></p><p>Prayers said: <b id="n">${player.prayers}</b></p><button id="go">I prayed it</button>`, done);
    p.querySelector('#go').onclick = () => { player.prayers++; p.querySelector('#n').textContent = player.prayers; award('rosary'); };
  },
  gallery(s, done) {
    const sw = COLORS.map((c) => `<button class="sw" data-c="${c}" style="background:#${c.toString(16).padStart(6, '0')}"></button>`).join('');
    const items = player.items.length ? player.items.map((i) => ITEMS[i]).join('<br>') : 'Nothing yet. Visit the church, chapel, and pasture!';
    const p = panel(`<h2>🖼️ Gallery</h2><p><b>Collectibles</b><br>${items}</p><p><b>Wool color</b><br>${sw}</p>${cloudEnabled ? `<hr><button id="out">Switch child</button>` : ''}`, done);
    p.querySelector('#out')?.addEventListener('click', () => location.reload());
    p.querySelectorAll('.sw').forEach((b) => (b.onclick = () => { player.color = +b.dataset.c; save(); makeTextures(s); s.sheep.setTexture('sheep'); }));
  },
};

class Boot extends Phaser.Scene {
  constructor() { super('Boot'); }
  create() { makeTextures(this); this.scene.start('Hub'); }
}

class Hub extends Phaser.Scene {
  constructor() { super('Hub'); }
  create() {
    const W = 960; this.busy = false;
    this.physics.world.setBounds(0, 0, W, W);
    this.add.rectangle(W / 2, W / 2, W, W, 0x7ec850);
    this.add.rectangle(W / 2, W / 2, 80, W, 0xe8d9a8); this.add.rectangle(W / 2, W / 2, W, 80, 0xe8d9a8);
    const g = this.add.graphics();
    SPOTS.forEach((s) => {
      this.add.rectangle(s.x, s.y, 110, 80, s.c).setStrokeStyle(3, 0x555555);
      g.fillStyle(0x8b5a2b).fillTriangle(s.x - 65, s.y - 40, s.x + 65, s.y - 40, s.x, s.y - 85);
      this.add.text(s.x, s.y + 58, s.label, { fontSize: '20px', color: '#fff', stroke: '#000', strokeThickness: 4 }).setOrigin(0.5);
    });
    this.sheep = this.physics.add.sprite(W / 2, W / 2, 'sheep').setCollideWorldBounds(true);
    this.cameras.main.setBounds(0, 0, W, W).startFollow(this.sheep, true, 0.1, 0.1);
    controls(this);
  }
  update() {
    if (this.busy) return this.sheep.setVelocity(0, 0);
    steer(this);
    for (const s of SPOTS) if (Phaser.Math.Distance.Between(this.sheep.x, this.sheep.y, s.x, s.y) < 60) return this.enter(s.k);
  }
  enter(k) {
    this.busy = true; this.sheep.setVelocity(0, 0);
    if (k === 'pasture') return this.scene.start('Pasture');
    PANELS[k](this, () => { this.sheep.x += (480 - this.sheep.x) * 0.5; this.sheep.y += (480 - this.sheep.y) * 0.5; this.busy = false; });
  }
}

class Pasture extends Phaser.Scene {
  constructor() { super('Pasture'); }
  create() {
    const W = 960; this.got = 0; this.followers = [];
    this.physics.world.setBounds(0, 0, W, W);
    this.add.rectangle(W / 2, W / 2, W, W, 0x9bd96b);
    this.sheep = this.physics.add.sprite(W / 2, W / 2, 'sheep').setCollideWorldBounds(true);
    this.cameras.main.setBounds(0, 0, W, W).startFollow(this.sheep, true, 0.1, 0.1);
    this.strays = this.physics.add.group();
    for (let i = 0; i < 5; i++) this.strays.create(Phaser.Math.Between(60, 900), Phaser.Math.Between(60, 900), 'lamb').setCollideWorldBounds(true).setBounce(1);
    this.time.addEvent({ delay: 1500, loop: true, callback: () => this.strays.getChildren().forEach((l) => l.setVelocity(Phaser.Math.Between(-50, 50), Phaser.Math.Between(-50, 50))) });
    this.label = this.add.text(240, 16, 'Lost sheep found: 0 / 5', { fontSize: '18px', color: '#fff', stroke: '#000', strokeThickness: 4 }).setOrigin(0.5, 0).setScrollFactor(0);
    this.add.text(16, 680, '← Map', { fontSize: '22px', color: '#fff', stroke: '#000', strokeThickness: 4 }).setScrollFactor(0).setInteractive().on('pointerdown', () => this.scene.start('Hub'));
    this.physics.add.overlap(this.sheep, this.strays, (_, l) => {
      this.strays.remove(l); l.body.enable = false; this.followers.push(l); this.got++;
      this.label.setText(`Lost sheep found: ${this.got} / 5`);
      if (this.got === 5) this.win();
    });
    controls(this);
  }
  win() {
    player.lambs += 5; award('medal');
    this.add.text(240, 340, 'Rejoice! Every lost sheep\nis found.', { fontSize: '26px', align: 'center', color: '#fff', stroke: '#000', strokeThickness: 5 }).setOrigin(0.5).setScrollFactor(0);
    this.time.delayedCall(2400, () => this.scene.start('Hub'));
  }
  update() {
    steer(this);
    this.followers.forEach((l, i) => { const t = i ? this.followers[i - 1] : this.sheep; l.x += (t.x - 22 - l.x) * 0.08; l.y += (t.y + 6 - l.y) * 0.08; });
  }
}

async function start() {
  let saved = null;
  if (cloudEnabled) {
    const user = (await finishLinkSignIn().catch(() => null)) || (await waitForUser());
    if (!user) return emailScreen();
    const invite = await getInvite().catch(() => null);
    if (!invite) return blocked();
    saved = await kidPicker(await listKids().catch(() => []), user.uid, invite);
  } else saved = loadLocal();
  player = { name: `${pick(ADJ)} ${pick(NOUN)} ${Math.floor(Math.random() * 90 + 10)}`, color: COLORS[0], attendance: [], prayers: 0, lambs: 0, items: [], done: [], ...saved };
  save(); hud(); setupJoystick();
  new Phaser.Game({
    type: Phaser.AUTO, parent: 'game', width: 480, height: 720, backgroundColor: '#2f5d3a',
    physics: { default: 'arcade' }, input: { activePointers: 3 },
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    scene: [Boot, Hub, Pasture],
  });
  if ('serviceWorker' in navigator && import.meta.env.PROD) navigator.serviceWorker.register('/sw.js');
}
start();
