// =========================================================
// Para Amy — un universo en forma de corazón
// Animación de partículas con Three.js + sonido ambiental
// generado con Web Audio API (sin pistas externas).
// =========================================================

// ---------- Sonido ambiental (pad sintetizado) ----------
class AmbientPad {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.playing = false;
  }
  init() {
    if (this.ctx) return;
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.ctx = ctx;

    this.master = ctx.createGain();
    this.master.gain.value = 0;
    this.master.connect(ctx.destination);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 1200;
    filter.Q.value = 0.7;
    filter.connect(this.master);

    const delay = ctx.createDelay();
    delay.delayTime.value = 0.6;
    const feedback = ctx.createGain();
    feedback.gain.value = 0.25;
    delay.connect(feedback);
    feedback.connect(delay);
    delay.connect(filter);

    // Acorde cálido y abierto (Cmaj9-ish) para un fondo sereno.
    const notes = [130.81, 164.81, 196.0, 246.94];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const oscGain = ctx.createGain();
      oscGain.gain.value = 0.16;
      osc.connect(oscGain);
      oscGain.connect(filter);
      oscGain.connect(delay);
      osc.start();

      const lfo = ctx.createOscillator();
      lfo.type = 'sine';
      lfo.frequency.value = 0.05 + i * 0.015;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 0.07;
      lfo.connect(lfoGain);
      lfoGain.connect(oscGain.gain);
      lfo.start();
    });

    const filterLfo = ctx.createOscillator();
    filterLfo.type = 'sine';
    filterLfo.frequency.value = 0.03;
    const filterLfoGain = ctx.createGain();
    filterLfoGain.gain.value = 400;
    filterLfo.connect(filterLfoGain);
    filterLfoGain.connect(filter.frequency);
    filterLfo.start();
  }
  play() {
    this.init();
    if (this.ctx.state === 'suspended') this.ctx.resume();
    const now = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(now);
    this.master.gain.linearRampToValueAtTime(0.5, now + 2.5);
    this.playing = true;
  }
  toggleMute() {
    if (!this.ctx) return this.playing;
    const now = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(now);
    if (this.playing) {
      this.master.gain.linearRampToValueAtTime(0, now + 0.6);
    } else {
      this.master.gain.linearRampToValueAtTime(0.5, now + 0.6);
    }
    this.playing = !this.playing;
    return this.playing;
  }
}
const ambient = new AmbientPad();

// ---------- Pantalla de inicio ----------
const startScreen = document.getElementById('start-screen');
let experienceStarted = false;
function unlockAndStart() {
  if (experienceStarted) return;
  experienceStarted = true;
  ambient.play();
  startScreen.classList.add('hidden');
}
startScreen.addEventListener('touchend', (e) => { e.preventDefault(); unlockAndStart(); }, { passive: false });
startScreen.addEventListener('click', unlockAndStart);

const soundToggle = document.getElementById('sound-toggle');
soundToggle.addEventListener('click', () => {
  const playing = ambient.toggleMute();
  soundToggle.textContent = playing ? '🔊' : '🔈';
});

const isMobile = /Android|iPhone|iPad|iPod|Mobi/i.test(navigator.userAgent) || window.innerWidth <= 820;

// ---------- Carta de amor ----------
const letterBtn = document.getElementById('love-letter-btn');
const letterOverlay = document.getElementById('love-letter-overlay');
const letterClose = document.getElementById('love-letter-close');
function openLetter() { letterOverlay.classList.add('visible'); }
function closeLetter() { letterOverlay.classList.remove('visible'); }
letterBtn.addEventListener('click', openLetter);
letterClose.addEventListener('click', closeLetter);
letterOverlay.addEventListener('click', (e) => { if (e.target === letterOverlay) closeLetter(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeLetter(); });

// ---------- Escena Three.js ----------
const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: !isMobile });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isMobile ? 1.5 : 2));
renderer.setSize(innerWidth, innerHeight);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 5000);

let targetDist = 400, currentDist = 400;
let rotX = 0.2; // ángulo polar (elevación)
let rotY = 0;   // acimut

// Textura circular suave, reutilizada para todas las partículas.
function makeDotTexture() {
  const size = 64;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0.0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.55, 'rgba(255,255,255,1)');
  grad.addColorStop(0.85, 'rgba(255,255,255,0.55)');
  grad.addColorStop(1.0, 'rgba(255,255,255,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(c);
}
const dotTexture = makeDotTexture();

// Estrellas de fondo
(function makeStars(count = isMobile ? 1400 : 2200, spread = 3000) {
  const g = new THREE.BufferGeometry();
  const pos = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const r = spread * (0.3 + Math.random() * 0.7);
    const th = Math.random() * Math.PI * 2;
    const ph = Math.acos(2 * Math.random() - 1);
    pos[i * 3 + 0] = r * Math.sin(ph) * Math.cos(th);
    pos[i * 3 + 1] = r * Math.cos(ph);
    pos[i * 3 + 2] = r * Math.sin(ph) * Math.sin(th);
  }
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  scene.add(new THREE.Points(g, new THREE.PointsMaterial({
    size: 2.2,
    sizeAttenuation: false,
    map: dotTexture,
    transparent: true,
    alphaTest: 0.01,
    depthWrite: false,
    opacity: 0.9,
    color: 0xffe6f2,
  })));
})();

// ---------- Corazón de partículas ----------
function heartCurve(t) {
  const x = 16 * Math.pow(Math.sin(t), 3);
  const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
  return { x, y };
}

const HEART_SCALE = 3.2;
const HEART_THICKNESS = 3.4;
const HEART_DEPTH = 8.5;
const HEART_Y_OFFSET = 6;
const HEART_COUNT = isMobile ? 4400 : 5800;

const heartPoints = [];
for (let i = 0; i < HEART_COUNT; i++) {
  const t = Math.random() * Math.PI * 2;
  const p0 = heartCurve(t);
  const p1 = heartCurve(t + 0.001);
  const tx = p1.x - p0.x, ty = p1.y - p0.y;
  const tLen = Math.hypot(tx, ty) || 1;
  const nx = -ty / tLen, ny = tx / tLen;
  const offset = (Math.random() - 0.5) * HEART_THICKNESS;
  const rawX = p0.x + nx * offset;
  const rawY = p0.y + ny * offset + HEART_Y_OFFSET;
  heartPoints.push(new THREE.Vector3(
    rawX * HEART_SCALE,
    rawY * HEART_SCALE,
    (Math.random() - 0.5) * HEART_DEPTH
  ));
}
const heartGeom = new THREE.BufferGeometry().setFromPoints(heartPoints);
const heartMat = new THREE.PointsMaterial({
  color: 0xff3399,
  size: 1.2,
  map: dotTexture,
  transparent: true,
  alphaTest: 0.01,
  depthWrite: false,
  opacity: 0.95,
  blending: THREE.AdditiveBlending,
});
const heart = new THREE.Points(heartGeom, heartMat);
scene.add(heart);

// ---------- Brazos de espiral bajo el corazón ----------
const arms = 4;
const SPIRAL_COUNT = isMobile ? 3400 : 5200;
const spiralPoints = [];
for (let i = 0; i < SPIRAL_COUNT; i++) {
  const r = Math.random() * 250;
  const armIndex = Math.floor(Math.random() * arms);
  const theta = (armIndex * Math.PI * 2 / arms) + (r * 0.02) + (Math.random() * 0.4 - 0.2);
  const sx = Math.cos(theta) * r;
  const sz = Math.sin(theta) * r;
  const sy = -35 - (r * 0.4) + (Math.random() * 8 - 4);
  spiralPoints.push(new THREE.Vector3(sx, sy, sz));
}
const spiralGeom = new THREE.BufferGeometry().setFromPoints(spiralPoints);
const spiralMat = new THREE.PointsMaterial({
  color: 0xff3399,
  size: 1.2,
  map: dotTexture,
  transparent: true,
  alphaTest: 0.01,
  depthWrite: false,
  opacity: 0.95,
  blending: THREE.AdditiveBlending,
});
const spiral = new THREE.Points(spiralGeom, spiralMat);
scene.add(spiral);

// ---------- Polvo fino de la galaxia ----------
const DUST_INNER_R = 150;
const DUST_OUTER_R = 380;
const DUST_COUNT = isMobile ? 7000 : 14000;
const dustPoints = [];
for (let i = 0; i < DUST_COUNT; i++) {
  const r = DUST_INNER_R + Math.random() * (DUST_OUTER_R - DUST_INNER_R);
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.acos(2 * Math.random() - 1);
  dustPoints.push(new THREE.Vector3(
    r * Math.sin(phi) * Math.cos(theta),
    r * Math.cos(phi),
    r * Math.sin(phi) * Math.sin(theta)
  ));
}
const dustGeom = new THREE.BufferGeometry().setFromPoints(dustPoints);
const dustMat = new THREE.PointsMaterial({
  color: 0xffc2e6,
  size: 1.0,
  map: dotTexture,
  transparent: true,
  alphaTest: 0.01,
  depthWrite: false,
  opacity: 0.55,
  blending: THREE.AdditiveBlending,
});
const dust = new THREE.Points(dustGeom, dustMat);
scene.add(dust);

// ---------- Resplandor central ----------
function makeGlow(size = 768, c1 = '255,51,153', c2 = '255,102,204') {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(size / 2, size / 2, size * 0.05, size / 2, size / 2, size * 0.5);
  grad.addColorStop(0, `rgba(${c1},0.7)`);
  grad.addColorStop(0.5, `rgba(${c2},0.2)`);
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(c);
}
const glow = new THREE.Sprite(new THREE.SpriteMaterial({
  map: makeGlow(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
}));
glow.scale.set(450, 450, 1);
scene.add(glow);

// ---------- Anillos orbitales ----------
function ringTexture(size = 768) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  g.translate(size / 2, size / 2);
  const r1 = size * 0.35, r2 = size * 0.48;
  const grd = g.createRadialGradient(0, 0, r1 * 0.6, 0, 0, r2);
  grd.addColorStop(0.0, 'rgba(255,200,255,1)');
  grd.addColorStop(0.3, 'rgba(255,102,204,1)');
  grd.addColorStop(0.7, 'rgba(204,0,153,0.8)');
  grd.addColorStop(1.0, 'rgba(0,0,0,0)');
  g.fillStyle = grd;
  g.beginPath(); g.arc(0, 0, r2, 0, Math.PI * 2); g.arc(0, 0, r1, 0, Math.PI * 2, true); g.closePath(); g.fill();
  return new THREE.CanvasTexture(c);
}
const ring1 = new THREE.Mesh(new THREE.RingGeometry(80, 115, 128), new THREE.MeshBasicMaterial({ map: ringTexture(), transparent: true, side: THREE.DoubleSide, opacity: 0.32, blending: THREE.AdditiveBlending }));
const ring2 = new THREE.Mesh(new THREE.RingGeometry(125, 155, 128), new THREE.MeshBasicMaterial({ map: ringTexture(), transparent: true, side: THREE.DoubleSide, opacity: 0.2, blending: THREE.AdditiveBlending }));
ring1.rotation.x = ring2.rotation.x = Math.PI / 2;
scene.add(ring1); scene.add(ring2);

// ---------- Frases flotantes ----------
const baseWords = [
  'Feliz día, Amy 💗',
  'Amy, mi universo 🌌',
  'Eres mi persona favorita ✨',
  'Contigo todo tiene sentido 💞',
  'Mi corazón es tuyo, Amy 💓',
  'Gracias por existir, Amy ❤️',
  'Amy, mi lugar favorito 🏠',
  'Nuestra historia apenas empieza 💫',
];
const PHRASE_REPEAT = isMobile ? 11 : 16;
const WORDS = [];
for (let i = 0; i < PHRASE_REPEAT; i++) WORDS.push(...baseWords);

function makeTextTexture(text, color) {
  const c = document.createElement('canvas');
  c.width = 1024; c.height = 128;
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, c.width, c.height);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  let fontSize = 50;
  ctx.font = `700 ${fontSize}px "Playfair Display", serif`;
  while (ctx.measureText(text).width > c.width - 50 && fontSize > 26) {
    fontSize -= 2;
    ctx.font = `700 ${fontSize}px "Playfair Display", serif`;
  }
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = color;
  ctx.shadowBlur = 25;
  ctx.fillText(text, c.width / 2, c.height / 2);
  return new THREE.CanvasTexture(c);
}
const COLORS = ['#ff66cc', '#cc66ff', '#ff99cc', '#ff3399', '#ff66a3', '#ffa0f8', '#e0a7ff', '#ff4488', '#ff99ff'];
const textGroup = new THREE.Group();
scene.add(textGroup);

document.fonts.ready.then(() => {
  for (let i = 0; i < WORDS.length; i++) {
    const tex = makeTextTexture(WORDS[i], COLORS[i % COLORS.length]);
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, alphaTest: 0.01 });
    const sp = new THREE.Sprite(mat);
    sp.scale.set(98, 12.25, 1);
    const phi = Math.acos(2 * Math.random() - 1);
    const theta = Math.random() * Math.PI * 2;
    const r = DUST_INNER_R + Math.random() * (DUST_OUTER_R - DUST_INNER_R - 30);
    sp.position.set(r * Math.sin(phi) * Math.cos(theta), r * Math.cos(phi), r * Math.sin(phi) * Math.sin(theta));
    sp.userData = { phi, theta, radius: r, speed: 0.001 + Math.random() * 0.001 };
    textGroup.add(sp);
  }
});

// ---------- Cámara interactiva (arrastrar para rotar, rueda para zoom) ----------
let dragging = false;
let lastX = 0, lastY = 0;
let velX = 0, velY = 0;
let idleTime = 0;

function onPointerDown(x, y) { dragging = true; lastX = x; lastY = y; velX = 0; velY = 0; idleTime = 0; }
function onPointerMove(x, y) {
  if (!dragging) return;
  const dx = x - lastX, dy = y - lastY;
  lastX = x; lastY = y;
  velX = dx * 0.005;
  velY = dy * 0.005;
  rotY += velX;
  rotX = Math.min(Math.PI - 0.15, Math.max(0.15, rotX + velY));
  idleTime = 0;
}
function onPointerUp() { dragging = false; }

canvas.addEventListener('mousedown', (e) => onPointerDown(e.clientX, e.clientY));
window.addEventListener('mousemove', (e) => onPointerMove(e.clientX, e.clientY));
window.addEventListener('mouseup', onPointerUp);
canvas.addEventListener('touchstart', (e) => { const t = e.touches[0]; onPointerDown(t.clientX, t.clientY); }, { passive: true });
canvas.addEventListener('touchmove', (e) => { const t = e.touches[0]; onPointerMove(t.clientX, t.clientY); }, { passive: true });
canvas.addEventListener('touchend', onPointerUp);
canvas.addEventListener('wheel', (e) => {
  targetDist = Math.min(900, Math.max(150, targetDist + e.deltaY * 0.3));
  idleTime = 0;
}, { passive: true });

// ---------- Bucle de animación ----------
const clock = new THREE.Clock();
function animate() {
  requestAnimationFrame(animate);
  const dt = clock.getDelta();
  const elapsed = clock.elapsedTime;

  if (!dragging) {
    idleTime += dt;
    // Rotación suave automática cuando nadie interactúa, más inercia al soltar.
    rotY += velX * 0.9 + (idleTime > 1.2 ? 0.0007 : 0);
    rotX += velY * 0.9;
    rotX = Math.min(Math.PI - 0.15, Math.max(0.15, rotX));
    velX *= 0.92;
    velY *= 0.92;
  }

  currentDist += (targetDist - currentDist) * 0.08;
  camera.position.set(
    currentDist * Math.sin(rotX) * Math.sin(rotY),
    currentDist * Math.cos(rotX),
    currentDist * Math.sin(rotX) * Math.cos(rotY)
  );
  camera.lookAt(0, 0, 0);

  heart.rotation.y += 0.0009;
  spiral.rotation.y += 0.0012;
  dust.rotation.y += 0.0004;
  ring1.rotation.z += 0.0015;
  ring2.rotation.z -= 0.001;
  glow.material.opacity = 0.85 + Math.sin(elapsed * 1.4) * 0.15;

  textGroup.children.forEach((sp) => {
    const d = sp.userData;
    d.theta += d.speed;
    sp.position.set(
      d.radius * Math.sin(d.phi) * Math.cos(d.theta),
      d.radius * Math.cos(d.phi),
      d.radius * Math.sin(d.phi) * Math.sin(d.theta)
    );
  });

  renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', () => {
  renderer.setSize(innerWidth, innerHeight);
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
});
