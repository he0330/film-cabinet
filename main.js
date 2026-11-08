import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { gsap } from 'gsap';

const host = document.querySelector('#canvas-wrap');
const instruction = document.querySelector('.instruction');
const filmPicker = document.querySelector('#film-picker');
const filmNameInput = document.querySelector('#film-name-input');
const filmColorOptions = document.querySelector('#film-color-options');
const takeFilmButton = document.querySelector('#take-film');
const filmPickerClose = document.querySelector('#film-picker-close');
const hoverTagPreview = document.querySelector('#hover-tag-preview');
const tagNoteEditor = document.querySelector('#tag-note-editor');
const tagNoteTitle = document.querySelector('#tag-note-title');
const tagNoteInput = document.querySelector('#tag-note-input');
const tagNoteCancel = document.querySelector('#tag-note-cancel');
const tagNoteConfirm = document.querySelector('#tag-note-confirm');
const backgroundToggle = document.querySelector('#background-toggle');
const backgroundPanel = document.querySelector('#background-panel');
const backgroundClose = document.querySelector('#background-close');
const backgroundPresets = document.querySelector('#background-presets');
const backgroundFile = document.querySelector('#background-file');
const sampleSticker = document.querySelector('#sample-sticker');
const trashSticker = document.querySelector('#trash-sticker');
const paperboxIntro = document.querySelector('#paperbox-intro');
const paperboxOpen = document.querySelector('#paperbox-open');

// The first screen is a small paper-box sticker.  Opening it reveals the
// already loaded cabinet behind it, making the cabinet feel as if it pops out.
function openPaperboxIntro() {
  if (!paperboxIntro || paperboxIntro.classList.contains('is-opening')) return;
  paperboxIntro.classList.add('is-opening');
  window.setTimeout(() => document.body.classList.add('intro-ready'), 210);
  window.setTimeout(() => paperboxIntro.classList.add('is-gone'), 680);
}
paperboxOpen?.addEventListener('click', openPaperboxIntro);
paperboxOpen?.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); openPaperboxIntro(); }
});
const scene = new THREE.Scene();
scene.background = null;

function getCanvasSize() {
  const bounds = host.getBoundingClientRect();
  return {
    width: Math.max(1, Math.round(bounds.width || window.innerWidth || 1)),
    height: Math.max(1, Math.round(bounds.height || window.innerHeight || 1)),
  };
}
const initialCanvasSize = getCanvasSize();
const camera = new THREE.PerspectiveCamera(38, initialCanvasSize.width / initialCanvasSize.height, 0.1, 100);
// Start facing the cabinet straight on; users can still drag to inspect the sides.
const homeCamera = new THREE.Vector3(0, 0.25, 13.6);
const homeTarget = new THREE.Vector3(0, 0.25, 0);
camera.position.copy(homeCamera);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(initialCanvasSize.width, initialCanvasSize.height, false);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.setClearColor(0x000000, 0);
host.appendChild(renderer.domElement);

function resizeRenderer() {
  const { width: canvasWidth, height: canvasHeight } = getCanvasSize();
  camera.aspect = canvasWidth / canvasHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(canvasWidth, canvasHeight, false);
}
// Codex's embedded local-file preview may mount the page before it receives a size.
// Observing the container makes the actual cabinet appear as soon as the panel lays out.
new ResizeObserver(resizeRenderer).observe(host);
requestAnimationFrame(resizeRenderer);

const BACKGROUND_STORAGE_KEY = 'film-cabinet-background-v1';
const backgroundThemes = [
  { id: 'paper', name: '纸白', css: 'radial-gradient(ellipse at 50% 67%, #ece6df 0%, #fbfaf8 54%, #fff 100%)' },
  { id: 'sage', name: '鼠尾草', css: 'linear-gradient(145deg, #e7ebe2, #cfd8cb)' },
  { id: 'clay', name: '陶土', css: 'linear-gradient(145deg, #ead9cf, #d7bcae)' },
  { id: 'mist', name: '雾蓝', css: 'linear-gradient(145deg, #e1e8eb, #c7d4db)' },
];
let backgroundTexture = null;

function releaseBackgroundTexture() {
  if (backgroundTexture) {
    backgroundTexture.dispose();
    backgroundTexture = null;
  }
}
function saveBackground(value) {
  try { localStorage.setItem(BACKGROUND_STORAGE_KEY, JSON.stringify(value)); }
  catch { window.alert('背景图片太大，无法保存到本地；本次浏览仍可正常使用。'); }
}
function renderBackgroundPresets(activeId) {
  backgroundPresets.innerHTML = backgroundThemes.map((theme) => `<button type="button" data-background-id="${theme.id}" class="${activeId === theme.id ? 'is-selected' : ''}" style="--preview:${theme.css}">${theme.name}</button>`).join('');
}
function applyPresetBackground(id, shouldSave = true) {
  const theme = backgroundThemes.find((item) => item.id === id) || backgroundThemes[0];
  releaseBackgroundTexture();
  scene.background = null;
  host.style.background = theme.css;
  document.body.style.background = theme.css;
  renderBackgroundPresets(theme.id);
  if (shouldSave) saveBackground({ type: 'preset', id: theme.id });
}
function applyImageBackground(dataUrl, shouldSave = true) {
  releaseBackgroundTexture();
  new THREE.TextureLoader().load(dataUrl, (texture) => {
    texture.colorSpace = THREE.SRGBColorSpace;
    backgroundTexture = texture;
    scene.background = texture;
    host.style.background = '#e8e6e1';
    document.body.style.background = '#e8e6e1';
    renderBackgroundPresets(null);
  });
  if (shouldSave) saveBackground({ type: 'image', dataUrl });
}
function restoreBackground() {
  try {
    const saved = JSON.parse(localStorage.getItem(BACKGROUND_STORAGE_KEY));
    if (saved?.type === 'image' && saved.dataUrl) { applyImageBackground(saved.dataUrl, false); return; }
    if (saved?.type === 'preset') { applyPresetBackground(saved.id, false); return; }
  } catch { /* Fall back to the default paper background. */ }
  applyPresetBackground('paper', false);
}
backgroundToggle.addEventListener('click', () => {
  backgroundPanel.classList.add('is-open');
  backgroundPanel.setAttribute('aria-hidden', 'false');
});
backgroundClose.addEventListener('click', () => {
  backgroundPanel.classList.remove('is-open');
  backgroundPanel.setAttribute('aria-hidden', 'true');
});
backgroundPresets.addEventListener('click', (event) => {
  const choice = event.target.closest('[data-background-id]');
  if (choice) applyPresetBackground(choice.dataset.backgroundId);
});
backgroundFile.addEventListener('change', (event) => {
  const [file] = event.target.files || [];
  if (!file) return;
  const reader = new FileReader();
  reader.addEventListener('load', () => applyImageBackground(reader.result));
  reader.readAsDataURL(file);
  event.target.value = '';
});
restoreBackground();

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.07;
controls.target.copy(homeTarget);
controls.minDistance = 7.3;
controls.maxDistance = 16;
controls.minPolarAngle = 0.55;
controls.maxPolarAngle = 1.42;
controls.maxAzimuthAngle = 1.45;
controls.minAzimuthAngle = -1.45;
// Commit the front-facing target before the first rendered frame.
controls.update();

scene.add(new THREE.HemisphereLight(0xfff7ed, 0x5b3825, 2.1));
const keyLight = new THREE.DirectionalLight(0xffe2c7, 3.4);
keyLight.position.set(6, 8, 7);
keyLight.castShadow = true;
keyLight.shadow.mapSize.set(2048, 2048);
keyLight.shadow.camera.left = -9;
keyLight.shadow.camera.right = 9;
keyLight.shadow.camera.top = 9;
keyLight.shadow.camera.bottom = -9;
scene.add(keyLight);
const fillLight = new THREE.DirectionalLight(0xd6e9ff, 1.35);
fillLight.position.set(-7, 4, 2);
scene.add(fillLight);

const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.ShadowMaterial({ color: 0x3b2416, opacity: 0.18 }));
floor.rotation.x = -Math.PI / 2;
floor.position.y = -3.35;
floor.receiveShadow = true;
scene.add(floor);

const cabinet = new THREE.Group();
cabinet.position.y = -0.05;
scene.add(cabinet);
const wood = new THREE.MeshStandardMaterial({ color: 0x9c623e, roughness: 0.54, metalness: 0.02 });
const edgeWood = new THREE.MeshStandardMaterial({ color: 0xb57850, roughness: 0.43, metalness: 0.02 });
const innerWood = new THREE.MeshStandardMaterial({ color: 0x835037, roughness: 0.67 });
const brass = new THREE.MeshStandardMaterial({ color: 0xd6a851, roughness: 0.32, metalness: 0.72 });
const glass = new THREE.MeshPhysicalMaterial({ color: 0xcfe6ed, transparent: true, opacity: 0.24, roughness: 0.08, transmission: 0.28, side: THREE.DoubleSide, depthWrite: false });

function box(width, height, depth, material, x = 0, y = 0, z = 0, parent = cabinet) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

const width = 5.8;
const height = 6.3;
const depth = 2.35;
const board = 0.26;
box(width + 0.18, board, depth + 0.2, edgeWood, 0, height / 2, 0);
box(width + 0.18, board, depth + 0.2, edgeWood, 0, -height / 2, 0);
box(board, height, depth, wood, -width / 2, 0, 0);
box(board, height, depth, wood, width / 2, 0, 0);
box(width, height, board, innerWood, 0, 0, -depth / 2 + board / 2);
const shelfYs = [2.05, 1.02, -0.01, -1.04, -2.07];
const dividerXs = [-1.33, 0, 1.33];
for (const y of shelfYs) box(width - board * 2, 0.13, depth - board * 1.25, edgeWood, 0, y, 0.04);
for (const x of dividerXs) box(0.14, height - board * 2, depth - board * 1.15, edgeWood, x, 0, 0.03);

const rollCore = new THREE.MeshStandardMaterial({ color: 0x292724, roughness: 0.58, metalness: 0.06 });
const capMaterial = new THREE.MeshStandardMaterial({ color: 0x20201e, roughness: 0.42, metalness: 0.18 });
const labelStyles = [
  { base: '#f2c128', accent: '#1d1b18', ink: '#1d1b18', brand: 'KODAK', name: 'GOLD', iso: '100' },
  { base: '#f2c128', accent: '#1d1b18', ink: '#1d1b18', brand: 'KODAK', name: 'GOLD', iso: '200' },
  { base: '#f2c128', accent: '#1d1b18', ink: '#1d1b18', brand: 'KODAK', name: 'GOLD', iso: '400' },
  { base: '#f1eee2', accent: '#e24a34', ink: '#252320', brand: 'KODAK', name: 'PORTRA', iso: '160' },
  { base: '#f1eee2', accent: '#e24a34', ink: '#252320', brand: 'KODAK', name: 'PORTRA', iso: '400' },
  { base: '#f1eee2', accent: '#e24a34', ink: '#252320', brand: 'KODAK', name: 'PORTRA', iso: '800' },
  { base: '#f6f1e4', accent: '#276cbb', ink: '#244b83', brand: 'KODAK', name: 'EKTAR', iso: '100' },
  { base: '#f2e3d0', accent: '#252525', ink: '#252525', brand: 'KODAK', name: 'TRI-X', iso: '400' },
  { base: '#f4eee0', accent: '#28733f', ink: '#1f3b28', brand: 'FUJIFILM', name: 'PRO 400H', iso: '400' },
  { base: '#f3efdc', accent: '#2c8c55', ink: '#235a3a', brand: 'FUJIFILM', name: 'C200', iso: '200' },
  { base: '#eef1ee', accent: '#2b8960', ink: '#235540', brand: 'FUJICOLOR', name: 'SUPERIA', iso: '400' },
  { base: '#e4f1e9', accent: '#338e59', ink: '#255b3c', brand: 'FUJICOLOR', name: 'X-TRA', iso: '400' },
  { base: '#efe4f2', accent: '#a03f92', ink: '#772d6b', brand: 'FUJIFILM', name: 'PROVIA', iso: '100F' },
  { base: '#f1e5f0', accent: '#b84a95', ink: '#7b2d67', brand: 'FUJIFILM', name: 'VELVIA', iso: '50' },
  { base: '#252525', accent: '#d34635', ink: '#f5eee1', brand: 'ILFORD', name: 'HP5', iso: '400' },
  { base: '#eeeeea', accent: '#1e1e1e', ink: '#202020', brand: 'ILFORD', name: 'FP4', iso: '125' },
  { base: '#e7e7e5', accent: '#4d4d4b', ink: '#202020', brand: 'ILFORD', name: 'DELTA', iso: '100' },
  { base: '#252525', accent: '#aa2d35', ink: '#f0e9e0', brand: 'ILFORD', name: 'DELTA', iso: '3200' },
  { base: '#f4eed9', accent: '#4e8558', ink: '#31583a', brand: 'KENTMERE', name: 'PAN', iso: '100' },
  { base: '#f2ead6', accent: '#3e7b56', ink: '#2e563d', brand: 'KENTMERE', name: 'PAN', iso: '400' },
  { base: '#eaf0ec', accent: '#3b76bc', ink: '#254f87', brand: 'KONICA', name: 'CENTURIA', iso: '100' },
  { base: '#f6f0dd', accent: '#e87d29', ink: '#9e4617', brand: 'KONICA', name: 'VISTA', iso: '200' },
  { base: '#f4efde', accent: '#ce6b2e', ink: '#88431f', brand: 'AGFA', name: 'VISTA', iso: '400' },
  { base: '#171717', accent: '#f0a832', ink: '#f5ead6', brand: 'LOMOGRAPHY', name: 'COLOR', iso: '800' },
];

function createFilmLabelTexture(style) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const context = canvas.getContext('2d');
  context.fillStyle = style.base;
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = style.accent;
  context.fillRect(0, 0, canvas.width, 40);
  context.fillRect(0, 216, canvas.width, 40);
  context.fillRect(0, 40, 28, 176);
  context.fillRect(canvas.width - 28, 40, 28, 176);
  context.fillStyle = style.ink;
  context.textAlign = 'center';
  context.font = '900 27px Arial';
  context.fillText(style.brand, 256, 31);
  context.font = `900 ${style.name.length > 7 ? 32 : 43}px Arial`;
  context.fillText(style.name, 256, 112);
  context.font = '900 78px Arial';
  context.fillText(style.iso, 256, 193);
  context.font = '700 15px Arial';
  context.fillText('35mm · COLOR NEGATIVE · 36 EXP', 256, 242);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return texture;
}

function createFilmRoll(style) {
  const roll = new THREE.Group();
  const labelTexture = createFilmLabelTexture(style);
  const label = new THREE.MeshStandardMaterial({ map: labelTexture, roughness: 0.44, metalness: 0.02 });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.285, 0.285, 0.62, 40), rollCore);
  const labelBand = new THREE.Mesh(new THREE.CylinderGeometry(0.292, 0.292, 0.48, 40, 1, true, Math.PI, Math.PI * 2), label);
  const topCap = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.075, 40), capMaterial);
  const bottomCap = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.075, 40), capMaterial);
  const topHub = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.1, 24), capMaterial);
  const bottomHub = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.1, 24), capMaterial);

  topCap.position.y = 0.347;
  bottomCap.position.y = -0.347;
  topHub.position.y = 0.415;
  bottomHub.position.y = -0.415;
  [body, labelBand, topCap, bottomCap, topHub, bottomHub].forEach((part) => {
    part.castShadow = true;
    part.receiveShadow = true;
    roll.add(part);
  });
  return roll;
}

function createTagTexture(film, note = '') {
  const canvas = document.createElement('canvas');
  canvas.width = 420;
  canvas.height = 164;
  const context = canvas.getContext('2d');
  context.fillStyle = '#f8e9bd';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.strokeStyle = '#a36d2f';
  context.lineWidth = 7;
  context.strokeRect(7, 7, canvas.width - 14, canvas.height - 14);
  context.fillStyle = note.trim() ? '#39291d' : '#9b642a';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.font = note.trim() ? '700 49px "Microsoft YaHei", Arial' : '700 44px "Microsoft YaHei", Arial';
  const text = note.trim() || '＋ 备注';
  context.fillText(text.length > 9 ? `${text.slice(0, 8)}…` : text, 210, 82);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function noteFor(noteKey, fallbackKey) {
  const notes = savedNotes();
  return notes[noteKey] ?? notes[fallbackKey] ?? '';
}

function createFilmTag(film, noteKey = film.filmId) {
  const texture = createTagTexture(film, noteFor(noteKey, film.filmId));
  const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, side: THREE.DoubleSide, depthTest: false, depthWrite: false });
  const tag = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.242), material);
  tag.renderOrder = 10;
  tag.userData.noteTag = { film, noteKey, texture };
  return tag;
}

function randomGenerator(seed) {
  let state = seed >>> 0;
  return () => {
    state += 0x6D2B79F5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

const rows = shelfYs.length + 1;
const cols = dividerXs.length + 1;
const innerWidth = width - board * 2;
const innerHeight = height - board * 2;
const cellWidth = innerWidth / cols;
const cellHeight = innerHeight / rows;
const frontOffset = depth / 2 - board * 1.85;
const FILM_STORAGE_KEY = 'film-cabinet-custom-layout-v1';
const filmLibrary = labelStyles.slice(0, 8).map((style, index) => ({
  id: `film-${index + 1}`,
  name: `${style.name} ${style.iso}`,
  style,
}));
const filmColorChoices = [
  { label: '金黄', style: labelStyles[2] },
  { label: '奶白', style: labelStyles[4] },
  { label: '蓝色', style: labelStyles[6] },
  { label: '黑白', style: labelStyles[7] },
  { label: '绿色', style: labelStyles[8] },
  { label: '紫色', style: labelStyles[12] },
];
const cellPositions = new Map();
const cellTargets = new THREE.Group();
const placedRolls = new THREE.Group();
cabinet.add(cellTargets, placedRolls);
let selectedFilm = null;
let pickerColorIndex = 0;
let carriedRoll = null;
let isOpen = false;
let selectedRoll = null;

function initialCabinetData() {
  return Array.from({ length: rows * cols }, (_, index) => ({ id: `cell-${index + 1}`, filmName: null }));
}
function loadCabinetData() {
  try {
    const saved = JSON.parse(localStorage.getItem(FILM_STORAGE_KEY));
    if (Array.isArray(saved) && saved.length === rows * cols) return saved.map((cell, index) => ({ id: `cell-${index + 1}`, filmName: cell.filmName || null, film: cell.film || null }));
  } catch { /* Start with a clean cabinet if saved data is invalid. */ }
  return initialCabinetData();
}
const cabinetData = loadCabinetData();
function persistCabinetData() { localStorage.setItem(FILM_STORAGE_KEY, JSON.stringify(cabinetData)); }
function normalizeFilm(savedFilm) {
  if (!savedFilm) return null;
  if (typeof savedFilm === 'object' && savedFilm.style) return savedFilm;
  return filmLibrary.find((film) => film.id === savedFilm) || null;
}

function renderColorChoices() {
  filmColorOptions.innerHTML = filmColorChoices.map((choice, index) => `<button type="button" data-color-index="${index}" class="${index === pickerColorIndex ? 'is-selected' : ''}" style="--film-color:${choice.style.base};--film-ink:${choice.style.ink}">${choice.label}</button>`).join('');
}

function openFilmPicker() {
  pickerColorIndex = 0;
  filmNameInput.value = 'GOLD 400';
  renderColorChoices();
  filmPicker.classList.add('is-open');
  filmPicker.setAttribute('aria-hidden', 'false');
  window.setTimeout(() => filmNameInput.focus(), 180);
}

function closeFilmPicker() {
  filmPicker.classList.remove('is-open');
  filmPicker.setAttribute('aria-hidden', 'true');
}

function clearCarriedFilm() {
  selectedFilm = null;
  if (carriedRoll) {
    scene.remove(carriedRoll);
    carriedRoll.traverse((child) => { if (child.material?.map) child.material.map.dispose(); });
    carriedRoll = null;
  }
  instruction.textContent = isOpen ? '点击胶卷旁边的样品开始放置' : '拖动旋转 · 滚轮缩放 · 点击柜门打开';
}

function beginCarryingFilm() {
  const color = filmColorChoices[pickerColorIndex].style;
  const typedName = filmNameInput.value.trim().toUpperCase() || 'MY FILM 400';
  const [brand = 'FILM', ...rest] = typedName.split(/\s+/);
  const iso = rest.pop() || '400';
  const style = { ...color, brand, name: rest.join(' ') || brand, iso };
  selectedFilm = { id: `custom-${Date.now()}`, name: typedName, style };
  if (carriedRoll) scene.remove(carriedRoll);
  carriedRoll = createFilmRoll(style);
  carriedRoll.visible = false;
  carriedRoll.scale.setScalar(1.04);
  carriedRoll.userData.carried = true;
  scene.add(carriedRoll);
  closeFilmPicker();
  instruction.textContent = '移动到空格上，再点击放下 · 点击空白处取消';
}
function renderPlacedRolls() {
  placedRolls.clear();
  selectedRoll = null;
  cabinetData.forEach((cell) => {
    const definition = normalizeFilm(cell.film || cell.filmName);
    const position = cellPositions.get(cell.id);
    if (!definition || !position) return;
    const roll = createFilmRoll(definition.style);
    roll.position.set(position.x, position.y - .04, frontOffset - .12);
    roll.scale.setScalar(.86);
    roll.userData.baseScale = .86;
    roll.userData.cellId = cell.id;
    roll.userData.film = { filmId: definition.id, filmColor: definition.style.base, modelType: '35mm-canister', filmName: definition.name };
    roll.userData.roll = roll;
    const tag = createFilmTag(roll.userData.film, cell.id);
    // A smaller shop-style card at the lower-left of the cubby, in front of the roll.
    tag.position.set(position.x - cellWidth * .26, position.y - cellHeight * .29, frontOffset + .34);
    tag.scale.setScalar(.76);
    tag.userData.baseScale = .76;
    tag.visible = isOpen;
    tag.userData.noteTag.roll = roll;
    tag.userData.cellId = cell.id;
    roll.userData.tag = tag;
    placedRolls.add(roll);
    placedRolls.add(tag);
  });
}
function createCabinetCells() {
  const hitMaterial = new THREE.MeshBasicMaterial({ transparent:true, opacity:0, depthWrite:false, colorWrite:false });
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const index = row * cols + col;
      const id = `cell-${index + 1}`;
      const x = -innerWidth / 2 + cellWidth * (col + .5);
      const y = innerHeight / 2 - cellHeight * (row + .5);
      cellPositions.set(id, { x, y });
      const hitbox = new THREE.Mesh(new THREE.BoxGeometry(cellWidth - .12, cellHeight - .12, .08), hitMaterial);
      hitbox.position.set(x, y, depth / 2 - board * .82);
      hitbox.userData.cellId = id;
      cellTargets.add(hitbox);
    }
  }
}
function placeFilmInCell(cellId) {
  const cell = cabinetData.find((item) => item.id === cellId);
  if (!cell) return;
  if (!selectedFilm) { window.alert('请先点击柜子旁边的胶卷样品。'); return; }
  if (cell.filmName || cell.film) { window.alert('该位置已被占用。'); return; }
  cell.film = selectedFilm;
  cell.filmName = selectedFilm.id;
  persistCabinetData();
  renderPlacedRolls();
  clearCarriedFilm();
}
createCabinetCells();
renderPlacedRolls();

filmColorOptions.addEventListener('click', (event) => {
  const option = event.target.closest('[data-color-index]');
  if (!option) return;
  pickerColorIndex = Number(option.dataset.colorIndex);
  renderColorChoices();
});
takeFilmButton.addEventListener('click', beginCarryingFilm);
filmPickerClose.addEventListener('click', closeFilmPicker);
filmPicker.addEventListener('click', (event) => { if (event.target === filmPicker) closeFilmPicker(); });

// The single large sample roll beside the cabinet is the entrance to the picker.
const sampleRoll = createFilmRoll(labelStyles[2]);
sampleRoll.position.set(-4.55, -2.35, .15);
sampleRoll.scale.setScalar(2.65);
sampleRoll.rotation.z = -.08;
sampleRoll.userData.homePosition = sampleRoll.position.clone();
sampleRoll.userData.homeScale = 2.65;
sampleRoll.userData.sampleRoll = true;
sampleRoll.traverse((child) => { child.userData.sampleRoll = true; });
scene.add(sampleRoll);
sampleRoll.visible = false;

// A small desk bin gives placed rolls a physical, discoverable delete target.
const trashBin = new THREE.Group();
const binMetal = new THREE.MeshStandardMaterial({ color: 0xd2d2cd, roughness: .25, metalness: .78 });
const binShade = new THREE.MeshStandardMaterial({ color: 0x6f716f, roughness: .34, metalness: .66 });
const binInside = new THREE.MeshStandardMaterial({ color: 0x373a39, roughness: .52, metalness: .2 });
const binBody = new THREE.Mesh(new THREE.CylinderGeometry(.56, .43, .9, 48), binMetal);
const baseRim = new THREE.Mesh(new THREE.TorusGeometry(.44, .035, 10, 48), binShade);
const upperRim = new THREE.Mesh(new THREE.TorusGeometry(.565, .04, 10, 48), binShade);
baseRim.rotation.x = Math.PI / 2;
baseRim.position.y = -.45;
upperRim.rotation.x = Math.PI / 2;
upperRim.position.y = .45;
// Raised vertical channels echo the pressed-metal reference rather than a plain cylinder.
for (let index = 0; index < 18; index += 1) {
  const angle = (index / 18) * Math.PI * 2;
  const ridge = new THREE.Mesh(new THREE.BoxGeometry(.042, .55, .055), binShade);
  const radius = .43 + (.12 * ((Math.cos(angle) + 1) / 2));
  ridge.position.set(Math.sin(angle) * radius, 0, Math.cos(angle) * radius);
  ridge.rotation.y = -angle;
  trashBin.add(ridge);
}
const lidPivot = new THREE.Group();
lidPivot.position.set(0, .48, -.2);
lidPivot.rotation.x = -.18;
const lidUnderside = new THREE.Mesh(new THREE.CylinderGeometry(.56, .56, .045, 48), binInside);
const lid = new THREE.Mesh(new THREE.CylinderGeometry(.62, .62, .075, 48), binMetal);
const lidRingA = new THREE.Mesh(new THREE.TorusGeometry(.46, .014, 8, 48), binShade);
const lidRingB = new THREE.Mesh(new THREE.TorusGeometry(.3, .012, 8, 48), binShade);
lidUnderside.position.y = .01;
lid.position.y = .05;
lidRingA.rotation.x = Math.PI / 2;
lidRingB.rotation.x = Math.PI / 2;
lidRingA.position.y = .095;
lidRingB.position.y = .097;
const handle = new THREE.Group();
const handleBar = new THREE.Mesh(new THREE.BoxGeometry(.32, .05, .05), binShade);
const handleLeft = new THREE.Mesh(new THREE.BoxGeometry(.05, .14, .05), binShade);
const handleRight = handleLeft.clone();
handleBar.position.y = .17;
handleLeft.position.set(-.16, .105, 0);
handleRight.position.set(.16, .105, 0);
handle.add(handleBar, handleLeft, handleRight);
lidPivot.add(lidUnderside, lid, lidRingA, lidRingB, handle);
trashBin.add(binBody, baseRim, upperRim, lidPivot);
[binBody, baseRim, upperRim, ...trashBin.children].forEach((part) => { part.traverse?.((child) => { if (child.isMesh) { child.castShadow = true; child.receiveShadow = true; child.userData.trashBin = true; } }); if (part.isMesh) { part.castShadow = true; part.receiveShadow = true; part.userData.trashBin = true; } });
trashBin.position.set(4.4, -2.78, .15);
trashBin.userData.homePosition = trashBin.position.clone();
trashBin.userData.homeScale = 1.23;
trashBin.scale.setScalar(1.23);
trashBin.userData.trashBin = true;
scene.add(trashBin);
trashBin.visible = false;

// Gift mode props: both sit on the cabinet's right-hand tabletop, like matching desk toys.
const giftBoxModel = new THREE.Group();
const giftGreen = new THREE.MeshStandardMaterial({ color: 0x438c68, roughness: .5 });
const giftRed = new THREE.MeshStandardMaterial({ color: 0xd94732, roughness: .42 });
box(1.3, 1.16, .94, giftGreen, 0, 0, 0, giftBoxModel);
box(1.48, .24, 1.08, giftGreen, 0, .7, 0, giftBoxModel);
box(.18, 1.48, 1.1, giftRed, 0, .09, .02, giftBoxModel);
box(1.58, .16, .15, giftRed, 0, .86, .03, giftBoxModel);
const bowA = new THREE.Mesh(new THREE.TorusGeometry(.3,.06,10,24,Math.PI * 2), giftRed); bowA.scale.set(1.25,.62,1); bowA.position.set(-.25,1.0,.51);
const bowB = bowA.clone(); bowB.position.x = .25;
const bowCenter = new THREE.Mesh(new THREE.SphereGeometry(.105,18,14), giftRed); bowCenter.position.set(0,1.0,.54);
const waxSeal = new THREE.Mesh(new THREE.CylinderGeometry(.22,.22,.06,24), new THREE.MeshStandardMaterial({color:0x85382d,roughness:.5})); waxSeal.rotation.x=Math.PI/2; waxSeal.position.set(0,.18,.5); waxSeal.visible=false;
const stripeGroup = new THREE.Group(); [-.42,0,.42].forEach((x)=>{const stripe=new THREE.Mesh(new THREE.BoxGeometry(.14,1.2,.035),new THREE.MeshStandardMaterial({color:0xf0d287,roughness:.52}));stripe.position.set(x,0,.5);stripeGroup.add(stripe);}); stripeGroup.visible=false;
giftBoxModel.add(bowA,bowB,bowCenter,waxSeal,stripeGroup); giftBoxModel.position.set(-5.1,-2.12,.12); giftBoxModel.userData.giftBox = true; giftBoxModel.userData.homePosition = giftBoxModel.position.clone(); giftBoxModel.visible = false; scene.add(giftBoxModel);
const mailboxModel = new THREE.Group();
const mailOrange = new THREE.MeshStandardMaterial({ color:0x5d9aab,roughness:.42,metalness:.12 });
const mailCream = new THREE.MeshStandardMaterial({ color:0xf2dfb6,roughness:.58 });
box(1.52,1.08,1.14,mailOrange,0,.22,0,mailboxModel);
const arch = new THREE.Mesh(new THREE.CylinderGeometry(.76,.76,1.14,36,1,false,0,Math.PI),mailOrange); arch.rotation.z = Math.PI / 2; arch.position.y=.76; mailboxModel.add(arch);
box(.16,1.52,.16,mailCream,0,-.83,0,mailboxModel);
const doorFace = new THREE.Mesh(new THREE.PlaneGeometry(1.25,.86), new THREE.MeshStandardMaterial({color:0x72afbe,roughness:.46})); doorFace.position.set(0,.38,.585); mailboxModel.add(doorFace);
const slot = new THREE.Mesh(new THREE.BoxGeometry(.68,.09,.035), new THREE.MeshStandardMaterial({color:0x26393f,roughness:.4})); slot.position.set(0,.65,.61); mailboxModel.add(slot);
const letter = new THREE.Mesh(new THREE.PlaneGeometry(.48,.3), mailCream); letter.position.set(0,.26,.625); mailboxModel.add(letter);
const flag = new THREE.Mesh(new THREE.BoxGeometry(.07,.88,.1),giftRed); flag.position.set(.68,.88,.18); mailboxModel.add(flag);
const flagTop = new THREE.Mesh(new THREE.BoxGeometry(.34,.18,.1),giftRed); flagTop.position.set(.8,1.27,.18); mailboxModel.add(flagTop);
mailboxModel.position.set(-7.05,-1.83,.08); mailboxModel.userData.mailbox = true; mailboxModel.visible = false; scene.add(mailboxModel);
let giftMode = false;
let boxedGiftFilm = null;
let draggedGiftBox = false;
// Keep the packed roll on the 3D box as well as in the local variable.  The
// box can be animated/re-rendered while being dragged, so the model is the
// durable source of truth for the current gift session.
function getBoxedGiftFilm() {
  return boxedGiftFilm || giftBoxModel.userData.packedFilm || null;
}
function setBoxedGiftFilm(film) {
  boxedGiftFilm = film;
  giftBoxModel.userData.packedFilm = film;
}
function setGiftMode(active) {
  giftMode = active;
  if (!active) setBoxedGiftFilm(null);
  clearCarriedFilm(); selectedFilm = null;
  giftBoxModel.position.copy(giftBoxModel.userData.homePosition);
  giftBoxModel.visible = active; mailboxModel.visible = active;
  document.querySelector('#gift-palette')?.classList.toggle('is-visible',active);
  sampleRoll.visible = false; trashBin.visible = false;
  instruction.textContent = active ? '先拖一卷柜中胶卷到礼物盒 · 再把礼物盒拖进邮箱' : '拖动旋转 · 滚轮缩放 · 点击柜门打开';
  if (active && !isOpen) toggleDoor();
}
function isGiftBox(object) { let current=object; while(current){if(current.userData.giftBox)return true;current=current.parent;} return false; }
function isMailbox(object) { let current=object; while(current){if(current.userData.mailbox)return true;current=current.parent;} return false; }
window.addEventListener('gift:packaging', () => setGiftMode(!giftMode));
window.addEventListener('gift:sent', () => { if (giftMode) setGiftMode(false); });
window.addEventListener('gift:style', (event) => { const style=event.detail; bowA.visible=bowB.visible=bowCenter.visible=style==='ribbon'; waxSeal.visible=style==='wax'; stripeGroup.visible=style==='stripe'; if(style==='ribbon'){giftGreen.color.setHex(0x438c68);giftRed.color.setHex(0xd94732);} if(style==='wax'){giftGreen.color.setHex(0xe6cf9c);giftRed.color.setHex(0x85382d);} if(style==='stripe'){giftGreen.color.setHex(0x3f776c);giftRed.color.setHex(0xd6a94f);} gsap.fromTo(giftBoxModel.scale,{x:.88,y:.88,z:.88},{x:1,y:1,z:1,duration:.42,ease:'back.out(2)'}); });
document.querySelector('#gift-palette')?.addEventListener('click',(event)=>{const button=event.target.closest('[data-gift-color]');if(!button)return;const palette={green:0x438c68,pink:0xcc7181,blue:0x4d7db0,cream:0xe9c97f};giftGreen.color.setHex(palette[button.dataset.giftColor]);gsap.fromTo(giftBoxModel.scale,{x:.82,y:.82,z:.82},{x:1,y:1,z:1,duration:.45,ease:'elastic.out(1,.45)'});});

function toggleDeskObject(object, control) {
  const willShow = !object.visible;
  gsap.killTweensOf([object.position, object.scale]);
  if (willShow) {
    const { x, y, z } = object.userData.homePosition;
    object.visible = true;
    object.position.set(x, y + 1.8, z - .18);
    object.scale.setScalar(.08);
    gsap.to(object.position, { x, y, z, duration: .62, ease: 'bounce.out' });
    gsap.to(object.scale, { x: object.userData.homeScale, y: object.userData.homeScale, z: object.userData.homeScale, duration: .48, ease: 'back.out(1.55)' });
  } else {
    gsap.to(object.scale, { x: .05, y: .05, z: .05, duration: .2, ease: 'power2.in', onComplete: () => {
      object.visible = false;
      object.position.copy(object.userData.homePosition);
      object.scale.setScalar(object.userData.homeScale);
    } });
  }
  control.classList.toggle('is-active', willShow);
  control.setAttribute('aria-pressed', String(willShow));
}
sampleSticker.addEventListener('click', () => toggleDeskObject(sampleRoll, sampleSticker));
trashSticker.addEventListener('click', () => toggleDeskObject(trashBin, trashSticker));

const doorPivot = new THREE.Group();
doorPivot.position.set(width / 2 - 0.04, 0, depth / 2 + 0.1);
cabinet.add(doorPivot);
const door = new THREE.Group();
door.position.x = -(width - 0.1) / 2;
doorPivot.add(door);
const doorWidth = width - 0.1;
const doorHeight = height - 0.1;
box(doorWidth, 0.22, 0.22, edgeWood, 0, doorHeight / 2 - 0.11, 0, door);
box(doorWidth, 0.22, 0.22, edgeWood, 0, -doorHeight / 2 + 0.11, 0, door);
box(0.22, doorHeight, 0.22, edgeWood, -doorWidth / 2 + 0.11, 0, 0, door);
box(0.22, doorHeight, 0.22, edgeWood, doorWidth / 2 - 0.11, 0, 0, door);
const glassPane = new THREE.Mesh(new THREE.PlaneGeometry(doorWidth - 0.42, doorHeight - 0.42), glass);
glassPane.position.z = 0.02;
door.add(glassPane);
const knob = new THREE.Mesh(new THREE.SphereGeometry(0.14, 24, 16), brass);
knob.position.set(-doorWidth / 2 + 0.28, 0, 0.18);
knob.castShadow = true;
door.add(knob);
for (const y of [2.25, -2.25]) box(0.11, 0.45, 0.16, brass, -0.02, y, 0.08, doorPivot);

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let pointerDown = null;
let selectedTag = null;
let hoveredRoll = null;
let hoveredTag = null;
let audioContext = null;
let draggedRoll = null;
let pressedRoll = null;
const dragPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -(depth / 2 + .48));
const dragPoint = new THREE.Vector3();

function savedNotes() {
  try { return JSON.parse(localStorage.getItem('film-cabinet-notes') || '{}'); } catch { return {}; }
}
function saveNote(filmId, value) {
  const notes = savedNotes();
  notes[filmId] = value;
  localStorage.setItem('film-cabinet-notes', JSON.stringify(notes));
}
function redrawTag(tag) {
  const { film, noteKey, texture } = tag.userData.noteTag;
  texture.dispose();
  const nextTexture = createTagTexture(film, noteFor(noteKey, film.filmId));
  tag.material.map = nextTexture;
  tag.material.needsUpdate = true;
  tag.userData.noteTag.texture = nextTexture;
}
function closeTagEditor() {
  if (selectedTag) {
    const base = selectedTag.userData.baseScale || .76;
    gsap.to(selectedTag.scale, { x: base, y: base, z: base, duration: .22, ease: 'power2.out' });
  }
  selectedTag = null;
  tagNoteEditor.classList.remove('is-visible');
}
function openTagEditor(tag) {
  if (selectedTag && selectedTag !== tag) {
    const base = selectedTag.userData.baseScale || .76;
    gsap.to(selectedTag.scale, { x: base, y: base, z: base, duration: .18 });
  }
  selectedTag = tag;
  const { film, noteKey } = tag.userData.noteTag;
  tagNoteTitle.textContent = '编辑备注';
  tagNoteInput.value = noteFor(noteKey, film.filmId);
  tagNoteEditor.classList.add('is-visible');
  const base = tag.userData.baseScale || .76;
  gsap.to(tag.scale, { x: base * 1.45, y: base * 1.45, z: base * 1.45, duration: .25, ease: 'back.out(1.5)' });
  window.setTimeout(() => tagNoteInput.focus(), 230);
}
function playTagTick() {
  try {
    audioContext ??= new AudioContext();
    if (audioContext.state === 'suspended') audioContext.resume();
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.type = 'triangle';
    oscillator.frequency.setValueAtTime(610, audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(420, audioContext.currentTime + .07);
    gain.gain.setValueAtTime(.0001, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(.035, audioContext.currentTime + .008);
    gain.gain.exponentialRampToValueAtTime(.0001, audioContext.currentTime + .085);
    oscillator.connect(gain).connect(audioContext.destination);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + .09);
  } catch { /* Browser audio can be unavailable for a local page. */ }
}
function playDoorSound() {
  try {
    audioContext ??= new AudioContext();
    if (audioContext.state === 'suspended') audioContext.resume();
    const now = audioContext.currentTime;
    const gain = audioContext.createGain();
    gain.gain.setValueAtTime(.0001, now);
    gain.gain.exponentialRampToValueAtTime(.12, now + .035);
    gain.gain.exponentialRampToValueAtTime(.0001, now + .52);
    gain.connect(audioContext.destination);
    [155, 178].forEach((frequency, index) => {
      const oscillator = audioContext.createOscillator();
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(frequency, now + index * .07);
      oscillator.frequency.exponentialRampToValueAtTime(frequency * .7, now + .48);
      oscillator.connect(gain);
      oscillator.start(now + index * .07);
      oscillator.stop(now + .54);
    });
  } catch { /* Sound is optional if local-file audio is blocked. */ }
}
function renderHoverTagPreview(roll) {
  if (!isOpen || !roll || !roll.userData.tag) {
    hoverTagPreview.classList.remove('is-visible');
    return;
  }
  const tag = roll.userData.tag;
  const { film, noteKey } = tag.userData.noteTag;
  const note = noteFor(noteKey, film.filmId) || '＋ 添加备注';
  hoverTagPreview.textContent = note;
  hoverTagPreview.classList.add('is-visible');
}
function setHoveredRoll(roll) {
  if (hoveredRoll === roll) return;
  if (hoveredRoll) {
    const base = hoveredRoll.userData.baseScale || .86;
    gsap.to(hoveredRoll.scale, { x: base, y: base, z: base, duration: .16, ease: 'power2.out' });
  }
  hoveredRoll = roll;
  renderHoverTagPreview(roll);
  if (!roll) return;
  const base = roll.userData.baseScale || .86;
  gsap.to(roll.scale, { x: base * 1.12, y: base * 1.12, z: base * 1.12, duration: .18, ease: 'back.out(1.45)' });
  playTagTick();
}
function setHoveredTag(tag) {
  if (hoveredTag === tag) return;
  if (hoveredTag && hoveredTag !== selectedTag) {
    const base = hoveredTag.userData.baseScale || .76;
    gsap.to(hoveredTag.scale, { x: base, y: base, z: base, duration: .16, ease: 'power2.out' });
  }
  hoveredTag = tag;
  if (!tag || tag === selectedTag) return;
  const base = tag.userData.baseScale || .76;
  gsap.to(tag.scale, { x: base * 1.28, y: base * 1.28, z: base * 1.28, duration: .18, ease: 'back.out(1.4)' });
}
function selectRoll(roll) {
  if (selectedRoll && selectedRoll !== roll) {
    const oldBase = selectedRoll.userData.baseScale || .86;
    gsap.to(selectedRoll.scale, { x: oldBase, y: oldBase, z: oldBase, duration: .2, ease: 'power2.out' });
  }
  selectedRoll = roll;
  const base = roll.userData.baseScale || .86;
  gsap.to(roll.scale, { x: base * 1.14, y: base * 1.14, z: base * 1.14, duration: .24, ease: 'back.out(1.65)' });
  playTagTick();
}
function moveCamera(opening) {
  const position = opening ? { x: 0, y: 0.7, z: 10.6 } : { x: homeCamera.x, y: homeCamera.y, z: homeCamera.z };
  const target = opening ? { x: 0, y: 0.1, z: 0.25 } : { x: homeTarget.x, y: homeTarget.y, z: homeTarget.z };
  gsap.to(camera.position, { ...position, duration: 1.15, ease: 'power3.inOut', onUpdate: () => controls.update() });
  gsap.to(controls.target, { ...target, duration: 1.15, ease: 'power3.inOut', onUpdate: () => controls.update() });
}
function toggleDoor() {
  isOpen = !isOpen;
  if (!isOpen) {
    closeTagEditor();
    setHoveredRoll(null);
    setHoveredTag(null);
    selectedRoll = null;
  }
  cabinet.traverse((object) => {
    if (object.userData.noteTag) object.visible = isOpen;
  });
  if (isOpen) playDoorSound();
  // The hinge is on the right, so the glass door swings outward to screen-right.
  gsap.to(doorPivot.rotation, { y: isOpen ? 1.92 : 0, duration: 0.86, ease: 'power3.inOut' });
  moveCamera(isOpen);
  instruction.textContent = isOpen ? (selectedFilm ? '移动到空格上，再点击放下 · 点击空白处取消' : '点击胶卷样品添加 · 拖动已放入胶卷到垃圾桶删除') : '拖动旋转 · 滚轮缩放 · 点击柜门打开';
}

function getFilmData(object) {
  let current = object;
  while (current) {
    if (current.userData.film) return current.userData.film;
    current = current.parent;
  }
  return null;
}
function getTag(object) {
  let current = object;
  while (current) {
    if (current.userData.noteTag) return current;
    current = current.parent;
  }
  return null;
}
function getCellId(object) {
  let current = object;
  while (current) {
    if (current.userData.cellId) return current.userData.cellId;
    current = current.parent;
  }
  return null;
}
function isSampleRoll(object) {
  let current = object;
  while (current) {
    if (current.userData.sampleRoll) return true;
    current = current.parent;
  }
  return false;
}
function isTrashBin(object) {
  let current = object;
  while (current) {
    if (current.userData.trashBin) return true;
    current = current.parent;
  }
  return false;
}
function removeFilmFromCell(cellId) {
  const cell = cabinetData.find((item) => item.id === cellId);
  if (!cell) return;
  cell.film = null;
  cell.filmName = null;
  persistCabinetData();
  renderPlacedRolls();
  instruction.textContent = '胶卷已放入垃圾桶';
  window.setTimeout(() => { if (isOpen && !selectedFilm) instruction.textContent = '点击柜子旁边的胶卷样品开始放置'; }, 1100);
}
function resetTrashBin(active = false) {
  const scale = trashBin.userData.homeScale || 1;
  gsap.to(trashBin.scale, { x: active ? scale * 1.16 : scale, y: active ? scale * 1.16 : scale, z: active ? scale * 1.16 : scale, duration: .16, ease: 'power2.out' });
}
function getFilmRoll(object) {
  let current = object;
  while (current) {
    if (current.userData.roll) return current.userData.roll;
    if (current.userData.noteTag?.roll) return current.userData.noteTag.roll;
    current = current.parent;
  }
  return null;
}

renderer.domElement.addEventListener('pointerdown', (event) => {
  pointerDown = { x: event.clientX, y: event.clientY };
  if (!isOpen || selectedFilm) return;
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
  raycaster.setFromCamera(pointer, camera);
  const giftHit = giftMode && raycaster.intersectObject(giftBoxModel, true).some((item) => isGiftBox(item.object));
  if (giftHit && getBoxedGiftFilm()) {
    draggedGiftBox = true;
    controls.enabled = false;
    gsap.to(giftBoxModel.scale, { x:1.08,y:1.08,z:1.08,duration:.16,overwrite:true });
    return;
  }
  // A click on the label must open its editor, never begin a drag-to-delete.
  const hit = raycaster.intersectObjects(placedRolls.children, true)
    .find((item) => !getTag(item.object) && getFilmRoll(item.object));
  const roll = hit && getFilmRoll(hit.object);
  if (!roll) return;
  // Do not turn a normal click into a drag.  Dragging starts only after movement.
  pressedRoll = roll;
});
renderer.domElement.addEventListener('pointermove', (event) => {
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
  raycaster.setFromCamera(pointer, camera);
  if (draggedGiftBox) {
    if (raycaster.ray.intersectPlane(dragPlane, dragPoint)) giftBoxModel.position.copy(dragPoint);
    const overMailbox = raycaster.intersectObject(mailboxModel, true).some((item) => isMailbox(item.object));
    gsap.to(mailboxModel.scale, { x:overMailbox?1.1:1,y:overMailbox?1.1:1,z:overMailbox?1.1:1,duration:.15,overwrite:true });
    renderer.domElement.style.cursor = overMailbox ? 'copy' : 'grabbing';
    return;
  }
  if (pressedRoll && pointerDown && Math.hypot(event.clientX - pointerDown.x, event.clientY - pointerDown.y) > 6) {
    draggedRoll = pressedRoll;
    pressedRoll = null;
    controls.enabled = false;
    gsap.to(draggedRoll.scale, { x: 1.04, y: 1.04, z: 1.04, duration: .14, ease: 'power2.out' });
  }
  if (draggedRoll) {
    if (raycaster.ray.intersectPlane(dragPlane, dragPoint)) draggedRoll.position.copy(dragPoint);
    const overTrash = raycaster.intersectObject(trashBin, true).some((item) => isTrashBin(item.object));
    const overGift = giftMode && raycaster.intersectObject(giftBoxModel, true).some((item) => isGiftBox(item.object));
    resetTrashBin(overTrash);
    gsap.to(giftBoxModel.scale, { x: overGift ? 1.1 : 1, y: overGift ? 1.1 : 1, z: overGift ? 1.1 : 1, duration:.15, overwrite:true });
    renderer.domElement.style.cursor = overGift ? 'copy' : (overTrash ? 'no-drop' : 'grabbing');
    return;
  }
  const hits = raycaster.intersectObjects([...cabinet.children, sampleRoll, giftBoxModel, mailboxModel], true);
  const cellHit = isOpen && hits.find((item) => getCellId(item.object));
  const cellId = cellHit && getCellId(cellHit.object);
  if (selectedFilm && isOpen) {
    const cell = cellId && cabinetData.find((item) => item.id === cellId);
    if (cellId && cell && !cell.filmName && !cell.film) {
      const position = cellPositions.get(cellId);
      carriedRoll.position.set(position.x, position.y - .04, frontOffset - .18);
      carriedRoll.visible = true;
      renderer.domElement.style.cursor = 'copy';
    } else {
      carriedRoll.visible = false;
      renderer.domElement.style.cursor = 'not-allowed';
    }
    setHoveredRoll(null);
    setHoveredTag(null);
    return;
  }
  const tagHit = hits.find((item) => getTag(item.object));
  const tag = tagHit && getTag(tagHit.object);
  const rollHit = hits.find((item) => !getTag(item.object) && getFilmRoll(item.object));
  const roll = rollHit && getFilmRoll(rollHit.object);
  renderer.domElement.style.cursor = isSampleRoll(hits[0]?.object) || tag || roll ? 'pointer' : 'grab';
  if (tag) {
    setHoveredRoll(null);
    setHoveredTag(tag);
  } else {
    setHoveredTag(null);
    setHoveredRoll(roll || null);
  }
});
renderer.domElement.addEventListener('pointerleave', () => { setHoveredRoll(null); setHoveredTag(null); pressedRoll = null; if (carriedRoll) carriedRoll.visible = false; });
renderer.domElement.addEventListener('pointerup', (event) => {
  if (draggedGiftBox) {
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    const sentToMailbox = raycaster.intersectObject(mailboxModel, true).some((item) => isMailbox(item.object));
    const wasClick = pointerDown && Math.hypot(event.clientX - pointerDown.x, event.clientY - pointerDown.y) <= 6;
    draggedGiftBox = false;
    controls.enabled = true;
    gsap.to(mailboxModel.scale, { x:1,y:1,z:1,duration:.15,overwrite:true });
    if (wasClick) {
      instruction.textContent = '礼物已准备好，填写寄送信息后即可发送';
      gsap.to(giftBoxModel.position, { x:giftBoxModel.userData.homePosition.x,y:giftBoxModel.userData.homePosition.y,z:giftBoxModel.userData.homePosition.z,duration:.3,ease:'back.out(1.4)' });
      window.dispatchEvent(new CustomEvent('gift:compose', { detail: getBoxedGiftFilm() }));
    } else if (sentToMailbox && window.confirm('确认把这份礼物投入邮箱并继续填写寄送信息吗？')) {
      gsap.to(giftBoxModel.position, { x:mailboxModel.position.x, y:mailboxModel.position.y + .05, z:mailboxModel.position.z + .55, duration:.28, ease:'back.in(1.4)', onComplete:() => {
        window.dispatchEvent(new CustomEvent('gift:compose', { detail: getBoxedGiftFilm() }));
      }});
    } else {
      gsap.to(giftBoxModel.position, { x:giftBoxModel.userData.homePosition.x,y:giftBoxModel.userData.homePosition.y,z:giftBoxModel.userData.homePosition.z,duration:.42,ease:'back.out(1.4)' });
    }
    gsap.to(giftBoxModel.scale, { x:1,y:1,z:1,duration:.15,overwrite:true });
    return;
  }
  if (draggedRoll) {
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    const deleteRoll = raycaster.intersectObject(trashBin, true).some((item) => isTrashBin(item.object));
    const intoGift = giftMode && raycaster.intersectObject(giftBoxModel, true).some((item) => isGiftBox(item.object));
    const droppedRoll = draggedRoll;
    const cellId = droppedRoll.userData.cellId;
    draggedRoll = null;
    controls.enabled = true;
    resetTrashBin(false);
    gsap.to(giftBoxModel.scale, { x:1,y:1,z:1,duration:.15,overwrite:true });
    if (intoGift) {
      const film = droppedRoll.userData.film;
      // The cabinet stores navigation fields as filmId/filmName.  The old
      // code read id/name, leaving the gift with an empty id after packing.
      const giftFilm = {
        id: film?.filmId || film?.id,
        name: film?.filmName || film?.name || '未命名胶卷'
      };
      const note = savedNotes()[droppedRoll.userData.noteKey || giftFilm.id] || '';
      if (!giftFilm.id) {
        window.alert('这卷胶卷的信息不完整，请重新放入一次。');
        renderPlacedRolls();
        return;
      }
      if (window.confirm(`是否把“${note || giftFilm.name}”胶卷放进礼物盒？`)) {
        setBoxedGiftFilm(giftFilm);
        instruction.textContent = '胶卷已装进礼物盒 · 点击右侧邮箱写收件人并发送';
        gsap.fromTo(giftBoxModel.position,{y:-2.05},{y:-2.25,duration:.42,ease:'bounce.out'});
      }
      renderPlacedRolls();
    } else if (deleteRoll) removeFilmFromCell(cellId);
    else renderPlacedRolls();
    return;
  }
  pressedRoll = null;
  if (!pointerDown || Math.hypot(event.clientX - pointerDown.x, event.clientY - pointerDown.y) > 6) return;
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObjects([...cabinet.children, sampleRoll, giftBoxModel, mailboxModel], true);
  const cellHit = hits.find((hit) => getCellId(hit.object));
  const tagHit = hits.find((hit) => getTag(hit.object));
  const rollHit = hits.find((hit) => !getTag(hit.object) && getFilmRoll(hit.object));
  const tag = tagHit && getTag(tagHit.object);
  const roll = rollHit && getFilmRoll(rollHit.object);
  const cellId = cellHit && getCellId(cellHit.object);
  const sampleHit = hits.find((hit) => isSampleRoll(hit.object));
  const giftHit = hits.find((hit) => isGiftBox(hit.object));
  const mailboxHit = hits.find((hit) => isMailbox(hit.object));
  if (giftHit && giftMode) {
    if (!getBoxedGiftFilm()) instruction.textContent = '先把柜中的一卷胶卷拖进礼物盒';
    else window.dispatchEvent(new CustomEvent('gift:compose', { detail: getBoxedGiftFilm() }));
  } else if (mailboxHit && giftMode) {
    if (!getBoxedGiftFilm()) window.alert('先把一卷胶卷拖进礼物盒。');
    else instruction.textContent = '请把礼物盒拖进邮箱；投递前会再次确认';
  } else if (sampleHit && !giftMode) {
    openFilmPicker();
  } else if (selectedFilm && isOpen && cellId) {
    placeFilmInCell(cellId);
  } else if (selectedFilm && isOpen) {
    clearCarriedFilm();
  } else if (isOpen && tag) {
    openTagEditor(tag);
  } else if (isOpen && roll) {
    const params = new URLSearchParams(roll.userData.film);
    window.location.href = `interface2.html?${params.toString()}`;
  } else if (raycaster.intersectObjects(door.children, true).length) {
    toggleDoor();
  } else if (isOpen) {
    toggleDoor();
  }
});
tagNoteCancel.addEventListener('click', closeTagEditor);
tagNoteConfirm.addEventListener('click', () => {
  if (!selectedTag) return;
  const { noteKey } = selectedTag.userData.noteTag;
  saveNote(noteKey, tagNoteInput.value.trim());
  redrawTag(selectedTag);
  renderHoverTagPreview(selectedTag.userData.noteTag.roll);
  closeTagEditor();
});
window.addEventListener('resize', resizeRenderer);
function animate() { requestAnimationFrame(animate); controls.update(); renderer.render(scene, camera); }
animate();
