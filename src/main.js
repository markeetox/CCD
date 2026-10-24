import Phaser from 'phaser';
import { savePlayer, loadLocal, cloudEnabled, waitForUser, finishLinkSignIn, sendLink, getInvite, listKids, listPosts, getMassTimes, logOut } from './firebase.js';

const ADJ = ['Woolly', 'Gentle', 'Brave', 'Joyful', 'Little', 'Happy'];
const NOUN = ['Lamb', 'Dove', 'Pilgrim', 'Clover', 'Cloud', 'Star'];
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const $ = (id) => document.getElementById(id);
const ic = (n, s = 24) => `<img class="ic" src="/assets/ui/${n}.png" width="${s}" height="${s}" alt="">`;
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const COLORS = [0xf7f3e8, 0xd9a066, 0x9a9a9a, 0xff8fb8, 0x6ec1ff, 0x7ee8a0, 0xb892ff, 0xffd23f];
// Sheep gear: image at public/assets/gear/<id>.png (32x32 overlay drawn on top of sheep.png). slot = hat | neck | extra.
// Optional unlock: { item: 'halo' } (a collectible), { masses: 5 }, { prayers: 10 } or { lambs: 10 }, plus a hint shown to kids.
const SLOTS = ['hat', 'neck', 'extra'];
const GEAR = [
  { id: 'straw-hat', slot: 'hat', label: 'Straw Hat' },
  { id: 'flower-crown', slot: 'hat', label: 'Flower Crown' },
  { id: 'halo', slot: 'hat', label: 'Halo', unlock: { item: 'halo', hint: 'Go to Mass' } },
  { id: 'mitre', slot: 'hat', label: 'Mitre', unlock: { masses: 5, hint: 'Go to 5 Masses' } },
  { id: 'scarf', slot: 'neck', label: 'Scarf' },
  { id: 'bell', slot: 'neck', label: 'Bell' },
  { id: 'rosary', slot: 'neck', label: 'Rosary', unlock: { item: 'rosary', hint: 'Say a prayer' } },
  { id: 'medal', slot: 'neck', label: 'Medal', unlock: { item: 'medal', hint: 'Find the lost sheep' } },
  { id: 'staff', slot: 'extra', label: 'Shepherd Staff', unlock: { item: 'homework', hint: 'Finish homework' } },
  { id: 'wings', slot: 'extra', label: 'Angel Wings', unlock: { prayers: 10, hint: 'Say 10 prayers' } },
];
const unlocked = (g) => { const u = g.unlock; return !u || Boolean((u.item && player.items.includes(u.item)) || (u.masses && player.attendance.length >= u.masses) || (u.prayers && player.prayers >= u.prayers) || (u.lambs && player.lambs >= u.lambs)); };

// Rosary Run: one decade (Our Father, 10 Hail Marys, Glory Be). Edit the text here.
const HAIL = ['Hail Mary, full of grace,', 'the Lord is with thee.', 'Blessed art thou amongst women,', 'and blessed is the fruit of thy womb, Jesus.', 'Holy Mary, Mother of God,', 'pray for us sinners,', 'now and at the hour of our death.', 'Amen.'];
const BEAD_NAMES = ['Our Father', ...Array.from({ length: 10 }, (_, i) => `Hail Mary ${i + 1} of 10`), 'Glory Be'];
const BEAD_LINES = ['Our Father, who art in heaven, hallowed be thy name.', ...Array.from({ length: 10 }, (_, i) => HAIL[i % HAIL.length]), 'Glory be to the Father, and to the Son, and to the Holy Spirit.'];

// Collectibles: label shown to kids + icon at public/assets/items/<img>.png
const ITEMS = { halo: { label: 'Halo', img: 'halo' }, rosary: { label: 'Rosary Charm', img: 'rosary' }, medal: { label: 'Lost Lamb Medal', img: 'medal' }, homework: { label: 'Homework Hero', img: 'homework' }, beads: { label: 'Golden Beads', img: 'beads' } };
const SPOTS = [
  { k: 'wardrobe', x: 480, y: 840, label: 'Wardrobe' },
  { k: 'garden', x: 860, y: 480, label: 'Rosary Run' },
  { k: 'board', x: 480, y: 110, c: 0xb5835a, label: 'Notice Board' },
  { k: 'church', x: 240, y: 240, c: 0xd8c8a8, label: 'Church' },
  { k: 'pasture', x: 720, y: 240, c: 0x5aa84a, label: 'Pasture' },
  { k: 'chapel', x: 240, y: 720, c: 0xa9c0ea, label: 'Chapel' },
  { k: 'gallery', x: 720, y: 720, c: 0xf2c14e, label: 'Gallery' },
];
const joy = { x: 0, y: 0 };
let player;

const save = () => savePlayer(player);
const hud = () => { $('hud').innerHTML = `${ic('sheep')}${esc(player.name)} &nbsp; ${ic(cloudEnabled ? 'cloud' : 'disk', 20)}${cloudEnabled ? 'cloud save' : 'local save'}`; };
function toast(t) { const el = $('toast'); el.textContent = t; el.style.opacity = 1; setTimeout(() => (el.style.opacity = 0), 2200); }
function award(id) { if (!player.items.includes(id)) { player.items.push(id); toast(`New collectible: ${ITEMS[id].label}`); } save(); }
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
  p.innerHTML = `<h2>${ic('sheep', 28)}Flock Hub</h2><p>Parents: enter the email your church has on file. We will send a sign-in link (no password).</p>
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
        p.innerHTML = `<h2>${ic('mail', 28)}Check your email</h2><p>Tap the link we sent to <b id="who"></b> to open Flock Hub. You can close this tab.</p>`;
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
    const rows = kids.map((k, i) => `<button data-i="${i}">${ic('sheep')}${esc(k.name)}</button>`).join('<br>');
    p.innerHTML = `<h2>Who is playing?</h2>${rows}<hr>${kids.length < 6 ? `<button id="add">${ic('plus')}New sheep</button>` : ''}<button id="so">Sign out</button>`;
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

// Layers the chosen gear on top of the sheep sprite (extra sits behind the body, hat/neck in front).
const DEPTH = { extra: 9, neck: 11, hat: 12 };
const SHEEP_SCALE = 2; // sheep and gear are drawn at 2x so everything is easy to see
function attachLook(s) {
  s.sheep.setDepth(10).setScale(SHEEP_SCALE); s.sheep.body.setSize(28, 28); s.gear = {};
  SLOTS.forEach((slot) => { s.gear[slot] = s.add.image(s.sheep.x, s.sheep.y, 'sheep').setDepth(DEPTH[slot]).setScale(SHEEP_SCALE).setVisible(false); });
  applyLook(s);
}
function applyLook(s) {
  s.sheep.setTint(player.color);
  SLOTS.forEach((slot) => { const g = s.gear[slot]; if (player[slot]) g.setTexture(`gear-${player[slot]}`).setVisible(true); else g.setVisible(false); });
}
function syncLook(s) { Object.values(s.gear).forEach((g) => g.setPosition(s.sheep.x, s.sheep.y).setFlipX(s.sheep.flipX)); }

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

const imgCache = {};
const loadImg = (src) => (imgCache[src] ||= new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.src = src; }));
async function drawPreview(cv) {
  const ctx = cv.getContext('2d'); ctx.imageSmoothingEnabled = false; ctx.clearRect(0, 0, cv.width, cv.height);
  const sheep = await loadImg('/assets/sheep.png');
  const off = document.createElement('canvas'); off.width = off.height = 48; const o = off.getContext('2d');
  o.drawImage(sheep, 0, 0); o.globalCompositeOperation = 'multiply'; o.fillStyle = `#${player.color.toString(16).padStart(6, '0')}`; o.fillRect(0, 0, 48, 48);
  o.globalCompositeOperation = 'destination-in'; o.drawImage(sheep, 0, 0);
  const gear = async (slot) => { if (player[slot]) ctx.drawImage(await loadImg(`/assets/gear/${player[slot]}.png`), 0, 0, cv.width, cv.height); };
  await gear('extra'); ctx.drawImage(off, 0, 0, cv.width, cv.height); await gear('neck'); await gear('hat');
}

const PANELS = {
  church(s, done) {
    const today = new Date().toLocaleDateString('en-CA');
    const p = panel(`<h2>${ic('church', 28)}Church</h2><p><b>Mass times</b><br><span id="mt">Loading…</span></p><p>Masses attended: <b id="n">${player.attendance.length}</b></p><button id="go">I went to Mass today</button>`, done);
    showMassTimes(p.querySelector('#mt'));
    p.querySelector('#go').onclick = () => {
      if (player.attendance.includes(today)) return toast('Already counted today!');
      player.attendance.push(today); p.querySelector('#n').textContent = player.attendance.length; award('halo');
    };
  },
  wardrobe(s, done) {
    const p = panel(`<h2>${ic('wardrobe', 28)}Wardrobe</h2><canvas id="pv" width="240" height="240"></canvas><div id="opts"></div>`, done);
    const cv = p.querySelector('#pv'), box = p.querySelector('#opts');
    const apply = () => { save(); applyLook(s); draw(); };
    const group = (slot, title) => `<p><b>${title}</b></p><button class="opt${player[slot] ? '' : ' on'}" data-slot="${slot}" data-id="">None</button>` + GEAR.filter((g) => g.slot === slot).map((g) => {
      const ok = unlocked(g);
      return `<button class="opt${player[slot] === g.id ? ' on' : ''}" data-slot="${slot}" data-id="${g.id}" ${ok ? '' : 'disabled'}><img src="/assets/gear/${g.id}.png" width="64" height="64">${esc(ok ? g.label : g.unlock.hint)}</button>`;
    }).join('');
    function draw() {
      const sw = COLORS.map((c) => `<button class="sw${c === player.color ? ' on' : ''}" data-c="${c}" style="background:#${c.toString(16).padStart(6, '0')}"></button>`).join('');
      box.innerHTML = `<p><b>Wool color</b></p>${sw}${group('hat', 'Hat')}${group('neck', 'Neck')}${group('extra', 'Extra')}`;
      box.querySelectorAll('.sw').forEach((b) => (b.onclick = () => { player.color = +b.dataset.c; apply(); }));
      box.querySelectorAll('.opt').forEach((b) => (b.onclick = () => { player[b.dataset.slot] = b.dataset.id; apply(); }));
      drawPreview(cv);
    }
    draw();
  },
  async board(s, done) {
    const p = panel(`<h2>${ic('board', 28)}Notice Board</h2><div id="list">Loading…</div>`, done);
    const box = p.querySelector('#list');
    let posts = [];
    try { posts = cloudEnabled && player.churchId ? await listPosts(player.churchId) : []; } catch (e) { console.warn(e); }
    posts = posts.filter((x) => !x.classId || x.classId === player.classId);
    if (!posts.length) { box.textContent = 'Nothing new. Great job!'; return; }
    box.innerHTML = posts.map((x) => `<p>${ic(x.type === 'homework' ? 'homework' : 'mail')} <b>${esc(x.title)}</b>${x.due ? ` <small>due ${esc(x.due)}</small>` : ''}<br>${esc(x.body)}${x.type === 'homework' ? (player.done.includes(x.id) ? `<br>${ic('done')}Done` : `<br><button data-id="${esc(x.id)}">I did it</button>`) : ''}</p>`).join('');
    box.querySelectorAll('[data-id]').forEach((b) => (b.onclick = () => { player.done.push(b.dataset.id); b.insertAdjacentHTML('afterend', `${ic('done')}Done`); b.remove(); award('homework'); }));
  },
  chapel(s, done) {
    const p = panel(`<h2>${ic('chapel', 28)}Chapel</h2><p><i>Hail Mary, full of grace, the Lord is with thee. Blessed art thou amongst women, and blessed is the fruit of thy womb, Jesus. Holy Mary, Mother of God, pray for us sinners, now and at the hour of our death. Amen.</i></p><p>Prayers said: <b id="n">${player.prayers}</b></p><button id="go">I prayed it</button>`, done);
    p.querySelector('#go').onclick = () => { player.prayers++; p.querySelector('#n').textContent = player.prayers; award('rosary'); };
  },
  gallery(s, done) {
    const items = player.items.length ? player.items.map((i) => ITEMS[i] ? `<img src="/assets/items/${ITEMS[i].img}.png" width="32" height="32" style="vertical-align:middle"> ${ITEMS[i].label}` : '').join('<br>') : 'Nothing yet. Visit the church, chapel, and pasture!';
    const p = panel(`<h2>${ic('gallery', 28)}Gallery</h2><p><b>Collectibles</b><br>${items}</p>${cloudEnabled ? `<hr><button id="out">Switch child</button>` : ''}`, done);
    p.querySelector('#out')?.addEventListener('click', () => location.reload());
  },
};

class Boot extends Phaser.Scene {
  constructor() { super('Boot'); }
  preload() {
    // All art lives in public/assets/ as PNG files (file name = texture key).
    ['sheep', 'lamb', 'grass', 'path', 'church', 'pasture', 'chapel', 'gallery', 'board', 'wardrobe', 'garden', 'bead', 'bead-big', 'stone'].forEach((k) => this.load.image(k, `/assets/${k}.png`));
    this.load.image('back', '/assets/ui/back.png');
    GEAR.forEach((g) => this.load.image(`gear-${g.id}`, `/assets/gear/${g.id}.png`));
  }
  create() { this.scene.start('Hub'); }
}

class Hub extends Phaser.Scene {
  constructor() { super('Hub'); }
  create() {
    const W = 960; this.busy = false;
    this.physics.world.setBounds(0, 0, W, W);
    this.add.tileSprite(W / 2, W / 2, W, W, 'grass');
    this.add.tileSprite(W / 2, W / 2, 80, W, 'path'); this.add.tileSprite(W / 2, W / 2, W, 80, 'path');
    SPOTS.forEach((s) => {
      this.add.image(s.x, s.y, s.k);
      this.add.text(s.x, s.y + 72, s.label, { fontSize: '20px', color: '#fff', stroke: '#000', strokeThickness: 4 }).setOrigin(0.5);
    });
    this.sheep = this.physics.add.sprite(W / 2, W / 2, 'sheep').setTint(player.color).setCollideWorldBounds(true);
    this.cameras.main.setBounds(0, 0, W, W).startFollow(this.sheep, true, 0.1, 0.1);
    controls(this); attachLook(this);
  }
  update() {
    if (this.busy) return this.sheep.setVelocity(0, 0);
    steer(this); syncLook(this);
    for (const s of SPOTS) if (Phaser.Math.Distance.Between(this.sheep.x, this.sheep.y, s.x, s.y) < 60) return this.enter(s.k);
  }
  enter(k) {
    this.busy = true; this.sheep.setVelocity(0, 0);
    if (k === 'pasture') return this.scene.start('Pasture');
    if (k === 'garden') return this.scene.start('Rosary');
    PANELS[k](this, () => { this.sheep.x += (480 - this.sheep.x) * 0.5; this.sheep.y += (480 - this.sheep.y) * 0.5; this.busy = false; });
  }
}

class Pasture extends Phaser.Scene {
  constructor() { super('Pasture'); }
  create() {
    const W = 960; this.got = 0; this.followers = [];
    this.physics.world.setBounds(0, 0, W, W);
    this.add.tileSprite(W / 2, W / 2, W, W, 'grass').setTint(0xe6ffd0);
    this.sheep = this.physics.add.sprite(W / 2, W / 2, 'sheep').setTint(player.color).setCollideWorldBounds(true);
    this.cameras.main.setBounds(0, 0, W, W).startFollow(this.sheep, true, 0.1, 0.1);
    this.strays = this.physics.add.group();
    for (let i = 0; i < 5; i++) this.strays.create(Phaser.Math.Between(60, 900), Phaser.Math.Between(60, 900), 'lamb').setScale(2).setCollideWorldBounds(true).setBounce(1);
    this.time.addEvent({ delay: 1500, loop: true, callback: () => this.strays.getChildren().forEach((l) => l.setVelocity(Phaser.Math.Between(-50, 50), Phaser.Math.Between(-50, 50))) });
    this.label = this.add.text(240, 16, 'Lost sheep found: 0 / 5', { fontSize: '18px', color: '#fff', stroke: '#000', strokeThickness: 4 }).setOrigin(0.5, 0).setScrollFactor(0);
    this.add.image(444, 56, 'back').setScrollFactor(0).setDisplaySize(44, 44).setInteractive().on('pointerdown', () => this.scene.start('Hub'));
    this.add.text(372, 42, 'Map', { fontSize: '22px', color: '#fff', stroke: '#000', strokeThickness: 4 }).setScrollFactor(0);
    this.physics.add.overlap(this.sheep, this.strays, (_, l) => {
      this.strays.remove(l); l.body.enable = false; this.followers.push(l); this.got++;
      this.label.setText(`Lost sheep found: ${this.got} / 5`);
      if (this.got === 5) this.win();
    });
    controls(this); attachLook(this);
  }
  win() {
    player.lambs += 5; award('medal');
    this.add.text(240, 340, 'Rejoice! Every lost sheep\nis found.', { fontSize: '26px', align: 'center', color: '#fff', stroke: '#000', strokeThickness: 5 }).setOrigin(0.5).setScrollFactor(0);
    this.time.delayedCall(2400, () => this.scene.start('Hub'));
  }
  update() {
    steer(this); syncLook(this);
    this.followers.forEach((l, i) => { const t = i ? this.followers[i - 1] : this.sheep; l.x += (t.x - 44 - l.x) * 0.08; l.y += (t.y + 12 - l.y) * 0.08; });
  }
}

class Rosary extends Phaser.Scene {
  constructor() { super('Rosary'); }
  create() {
    const W = 480, H = 2800; this.n = 0; this.beads = [];
    this.physics.world.setBounds(0, 0, W, H);
    this.add.tileSprite(W / 2, H / 2, W, H, 'grass').setTint(0xe6ffd0);
    this.add.tileSprite(W / 2, H / 2, 300, H, 'path');
    const xs = [150, 240, 330], at = (i) => ({ x: xs[i % 3], y: 2450 - i * 190 });
    this.stones = this.physics.add.staticGroup();
    BEAD_LINES.forEach((_, i) => {
      const p = at(i), big = i === 0 || i === BEAD_LINES.length - 1, sc = big ? 2.5 : 2;
      const b = this.physics.add.image(p.x, p.y, big ? 'bead-big' : 'bead').setScale(sc).setAlpha(0.35); b.base = sc; this.beads.push(b);
      if (i < BEAD_LINES.length - 1) { const q = at(i + 1); this.stones.create((p.x + q.x) / 2, (p.y + q.y) / 2, 'stone').setScale(2).refreshBody(); }
    });
    this.sheep = this.physics.add.sprite(240, 2650, 'sheep').setCollideWorldBounds(true);
    this.cameras.main.setBounds(0, 0, W, H).startFollow(this.sheep, true, 0.1, 0.1);
    this.physics.add.collider(this.sheep, this.stones);
    this.beads.forEach((b, i) => this.physics.add.overlap(this.sheep, b, () => this.hit(i)));
    this.add.rectangle(W / 2, 62, W, 124, 0x000000, 0.6).setScrollFactor(0).setDepth(20);
    this.title = this.add.text(16, 10, 'Rosary Run', { fontSize: '22px', color: '#ffe27a', stroke: '#000', strokeThickness: 3 }).setScrollFactor(0).setDepth(21);
    this.msg = this.add.text(16, 42, 'Walk up the path to the glowing bead. Go around the stones!', { fontSize: '19px', color: '#fff', wordWrap: { width: 340 } }).setScrollFactor(0).setDepth(21);
    this.add.image(444, 56, 'back').setScrollFactor(0).setDepth(22).setDisplaySize(44, 44).setInteractive().on('pointerdown', () => this.scene.start('Hub'));
    this.add.text(372, 42, 'Map', { fontSize: '22px', color: '#fff', stroke: '#000', strokeThickness: 4 }).setScrollFactor(0).setDepth(22);
    controls(this); attachLook(this);
    this.activate(0);
  }
  activate(i) { const b = this.beads[i]; b.setAlpha(1); this.pulse = this.tweens.add({ targets: b, scale: b.base * 1.25, yoyo: true, repeat: -1, duration: 400 }); }
  hit(i) {
    if (i !== this.n) return;
    const b = this.beads[i]; this.pulse?.stop(); b.setScale(b.base).setTint(0xffe27a).setAlpha(1);
    this.title.setText(BEAD_NAMES[i]); this.msg.setText(BEAD_LINES[i]);
    if (++this.n === BEAD_LINES.length) return this.win();
    this.activate(this.n);
  }
  win() {
    this.msg.setText('Amen! You prayed a whole decade of the Rosary.');
    player.prayers++; award('beads');
    this.time.delayedCall(3800, () => this.scene.start('Hub'));
  }
  update() { steer(this); syncLook(this); }
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
  player = { name: `${pick(ADJ)} ${pick(NOUN)} ${Math.floor(Math.random() * 90 + 10)}`, color: COLORS[0], attendance: [], prayers: 0, lambs: 0, items: [], done: [], hat: '', neck: '', extra: '', ...saved };
  save(); hud(); setupJoystick();
  new Phaser.Game({
    type: Phaser.AUTO, pixelArt: true, parent: 'game', width: 480, height: 720, backgroundColor: '#2f5d3a',
    physics: { default: 'arcade' }, input: { activePointers: 3 },
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    scene: [Boot, Hub, Pasture, Rosary],
  });
  if ('serviceWorker' in navigator && import.meta.env.PROD) navigator.serviceWorker.register('/sw.js');
}
start();
