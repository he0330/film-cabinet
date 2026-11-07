const params = new URLSearchParams(location.search);
const film = {
  filmId: params.get('filmId') || 'kodak-gold-400',
  filmColor: params.get('filmColor') || '#f2c128',
  modelType: params.get('modelType') || '35mm-canister',
  filmName: params.get('filmName') || 'KODAK GOLD 400',
};

window.filmDetail = film;
document.title = `${film.filmName} · 胶卷浏览`;
document.querySelector('#film-title').textContent = film.filmName;
document.querySelector('#film-meta').textContent = `${film.modelType.toUpperCase()} · ${film.filmColor.toUpperCase()}`;
document.querySelector('#archive-code').textContent = `ROLL / ${film.filmId.toUpperCase()}`;

const FRAME_TOTAL = 36;
const input = document.querySelector('#file-input');
const uploadButton = document.querySelector('#upload-zone');
const strip = document.querySelector('#strip');
const thumbnails = document.querySelector('#thumb-grid');
const preview = document.querySelector('#large-preview');
const selectedLabel = document.querySelector('#selected-label');
const selectedName = document.querySelector('#selected-name');
const noteInput = document.querySelector('#photo-note');
const noteToolbar = document.querySelector('.note-toolbar');
const annotationToggle = document.querySelector('#annotation-toggle');
const annotationBack = document.querySelector('#annotation-back');
const annotationAdd = document.querySelector('#annotation-add');
const annotationStyle = document.querySelector('#annotation-style');
const annotationConfirm = document.querySelector('#annotation-confirm');
const textStylePopover = document.querySelector('#text-style-popover');
const polaroid = document.querySelector('.polaroid');
const sceneRoot = document.querySelector('.tabletop-scene');
const detailBackgroundToggle = document.querySelector('#detail-background-toggle');
const detailBackgroundPanel = document.querySelector('#detail-background-panel');
const detailBackgroundClose = document.querySelector('#detail-background-close');
const detailBackgroundPresets = document.querySelector('#detail-background-presets');
const detailBackgroundFile = document.querySelector('#detail-background-file');
const audioFileInput = document.querySelector('#audio-file');
const audioUploadButton = document.querySelector('#audio-upload');
const audioToggleButton = document.querySelector('#audio-toggle');
const soundWave = document.querySelector('#sound-wave');
const cameraLabelInput = document.querySelector('#camera-label-input');
const tourToggle = document.querySelector('#tour-toggle');
const tourNotes = document.querySelector('#tour-notes');
const tourAudio = document.querySelector('#tour-audio');
const projectorExit = document.querySelector('#projector-exit');
const projectorHall = document.querySelector('#projector-hall');
const projectorThumbnails = document.querySelector('#projector-thumbnails');
const projectorImageA = document.querySelector('#projector-image-a');
const projectorImageB = document.querySelector('#projector-image-b');
const canisterCameraSticker = document.querySelector('#canister-camera-sticker');
const canisterCameraImage = document.querySelector('#canister-camera-image');
const canisterCameraFallback = document.querySelector('#canister-camera-fallback');
const canisterCameraLabel = document.querySelector('#canister-camera-label');
const cameraChoice = document.querySelector('.camera-choice');
canisterCameraImage.addEventListener('error', () => { canisterCameraImage.style.display = 'none'; });
let annotationMode = false;
let draggingNoteId = null;
let activeNoteId = null;
let scalingNote = null;
let stylePanelOpen = false;
let tourTimer = null;
let isTouring = false;
let tourIncludeNotes = true;
let projectorPhotoIndexes = [];
let projectorTourPosition = 0;
let projectorActiveSlot = 'a';
let projectorIdleTimer = null;
const audioPlayer = new Audio();
const projectorSound = new Audio('assets/projector.mp3');
projectorSound.loop = true;
projectorSound.volume = .38;
let activeAudioFrameId = null;
const FRAME_EXTRAS_KEY = `film-browser-extras-v1:${film.filmId}`;
const IMAGE_DATABASE_NAME = 'film-browser-images-v1';
const IMAGE_STORE_NAME = 'frames';

const NOTE_FONTS = {
  zhi: 'Zhi Mang Xing, KaiTi, cursive',
  ma: 'Ma Shan Zheng, KaiTi, cursive',
  long: 'Long Cang, KaiTi, cursive',
  serif: 'Noto Serif SC, Songti SC, serif',
};

// This key is deliberately different from the cabinet page's background key.
const DETAIL_BACKGROUND_KEY = 'film-browser-background-v1';
const detailBackgroundThemes = [
  { id: 'paper', name: '纸白', value: 'radial-gradient(ellipse at 55% 38%, #fffdf8 0%, #f3eee6 55%, #e7ddd1 100%)' },
  { id: 'sage', name: '鼠尾草', value: 'linear-gradient(145deg, #eef0e8, #cad6c8)' },
  { id: 'clay', name: '陶土', value: 'linear-gradient(145deg, #f2e2d6, #d6b5a1)' },
  { id: 'mist', name: '雾蓝', value: 'linear-gradient(145deg, #edf3f4, #cad9de)' },
];

function applyDetailBackground(background, save = true) {
  document.body.style.background = background;
  sceneRoot.style.background = 'transparent';
  if (save) {
    try { localStorage.setItem(DETAIL_BACKGROUND_KEY, JSON.stringify({ type: 'background', value: background })); }
    catch { window.alert('背景图片过大，无法长期保存；本次浏览仍会正常显示。'); }
  }
}
function renderDetailBackgroundPresets(activeId = null) {
  detailBackgroundPresets.innerHTML = detailBackgroundThemes.map((theme) => `<button type="button" data-detail-background="${theme.id}" class="${theme.id === activeId ? 'is-selected' : ''}" style="--preview:${theme.value}">${theme.name}</button>`).join('');
}
function setDetailPreset(id, save = true) {
  const theme = detailBackgroundThemes.find((item) => item.id === id) || detailBackgroundThemes[0];
  applyDetailBackground(theme.value, save);
  renderDetailBackgroundPresets(theme.id);
  if (save) localStorage.setItem(DETAIL_BACKGROUND_KEY, JSON.stringify({ type: 'preset', id: theme.id }));
}
function restoreDetailBackground() {
  try {
    const saved = JSON.parse(localStorage.getItem(DETAIL_BACKGROUND_KEY));
    if (saved?.type === 'preset') return setDetailPreset(saved.id, false);
    if (saved?.type === 'background' && saved.value) { applyDetailBackground(saved.value, false); renderDetailBackgroundPresets(null); return; }
  } catch { /* use the quiet paper default */ }
  setDetailPreset('paper', false);
}
detailBackgroundToggle.addEventListener('click', () => {
  detailBackgroundPanel.classList.add('is-open');
  detailBackgroundPanel.setAttribute('aria-hidden', 'false');
});
detailBackgroundClose.addEventListener('click', () => {
  detailBackgroundPanel.classList.remove('is-open');
  detailBackgroundPanel.setAttribute('aria-hidden', 'true');
});
detailBackgroundPresets.addEventListener('click', (event) => {
  const choice = event.target.closest('[data-detail-background]');
  if (choice) setDetailPreset(choice.dataset.detailBackground);
});
detailBackgroundFile.addEventListener('change', () => {
  const [file] = detailBackgroundFile.files || [];
  if (!file) return;
  const reader = new FileReader();
  reader.addEventListener('load', () => {
    applyDetailBackground(`center / cover fixed no-repeat url("${reader.result}")`);
    renderDetailBackgroundPresets(null);
  });
  reader.readAsDataURL(file);
  detailBackgroundFile.value = '';
});
restoreDetailBackground();

/**
 * Single source of truth for the whole roll.
 * imageUrl is a local object URL and is always released when replaced/unloaded.
 */
const frames = Array.from({ length: FRAME_TOTAL }, (_, index) => ({
  id: `frame-${index + 1}`,
  imageUrl: null,
  fileName: '',
  notes: [],
  audioUrl: null,
  audioName: '',
  cameraLabel: '',
  cameraIcon: 'camera-1',
  isSelected: index === 0,
}));
window.filmFrames = frames;

function safeRevoke(url) {
  if (url && url.startsWith('blob:')) URL.revokeObjectURL(url);
}
function persistFrameExtras() {
  const data = frames.map(({ id, notes, audioUrl, audioName, cameraLabel, cameraIcon }) => ({ id, notes, audioUrl, audioName, cameraLabel, cameraIcon }));
  try { localStorage.setItem(FRAME_EXTRAS_KEY, JSON.stringify(data)); }
  catch { window.alert('音频文件过大，无法长期保存；本次浏览仍可正常播放。'); }
}
function restoreFrameExtras() {
  try {
    const data = JSON.parse(localStorage.getItem(FRAME_EXTRAS_KEY) || '[]');
    data.forEach((saved) => {
      const frame = frames.find((item) => item.id === saved.id);
      if (!frame) return;
      frame.notes = Array.isArray(saved.notes) ? saved.notes : [];
      frame.audioUrl = typeof saved.audioUrl === 'string' ? saved.audioUrl : null;
      frame.audioName = typeof saved.audioName === 'string' ? saved.audioName : '';
      frame.cameraLabel = typeof saved.cameraLabel === 'string' ? saved.cameraLabel : '';
      frame.cameraIcon = saved.cameraIcon === 'camera-2' ? 'camera-2' : 'camera-1';
    });
  } catch { /* Local storage is optional; start with a clean roll if unavailable. */ }
}
restoreFrameExtras();

// Photos are kept as Blobs in IndexedDB, keyed by the current film roll.
// Unlike blob: URLs, this survives returning to the cabinet, refreshing, and reopening this same roll.
function openImageDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(IMAGE_DATABASE_NAME, 1);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(IMAGE_STORE_NAME)) database.createObjectStore(IMAGE_STORE_NAME, { keyPath: 'key' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function saveFrameImage(frame, file) {
  try {
    const database = await openImageDatabase();
    await new Promise((resolve, reject) => {
      const transaction = database.transaction(IMAGE_STORE_NAME, 'readwrite');
      transaction.objectStore(IMAGE_STORE_NAME).put({
        key: `${film.filmId}:${frame.id}`,
        filmId: film.filmId,
        frameId: frame.id,
        fileName: file.name,
        blob: file,
      });
      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error);
    });
    database.close();
  } catch (error) {
    console.warn('无法保存本地照片', error);
  }
}

async function restoreFrameImages() {
  try {
    const database = await openImageDatabase();
    const saved = await new Promise((resolve, reject) => {
      const transaction = database.transaction(IMAGE_STORE_NAME, 'readonly');
      const request = transaction.objectStore(IMAGE_STORE_NAME).getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    database.close();
    saved.filter((item) => item.filmId === film.filmId).forEach((item) => {
      const frame = frames.find((candidate) => candidate.id === item.frameId);
      if (!frame || !item.blob) return;
      safeRevoke(frame.imageUrl);
      frame.imageUrl = URL.createObjectURL(item.blob);
      frame.fileName = item.fileName || '未命名照片';
    });
    if (frames.some((frame) => frame.imageUrl) && !frames[selectedIndex()]?.imageUrl) {
      const firstPhoto = frames.findIndex((frame) => frame.imageUrl);
      frames.forEach((frame, index) => { frame.isSelected = index === firstPhoto; });
    }
    render();
  } catch (error) {
    console.warn('无法恢复本地照片', error);
  }
}

function selectedIndex() {
  return Math.max(0, frames.findIndex((frame) => frame.isSelected));
}

function selectFrame(index, { autoplayAudio = false } = {}) {
  stopAudio();
  frames.forEach((frame, frameIndex) => { frame.isSelected = frameIndex === index; });
  annotationMode = false;
  activeNoteId = frames[index].notes[0]?.id ?? null;
  render();
  if (autoplayAudio) playAudioForFrame(frames[index]);
}

function activeNote(frame = frames[selectedIndex()]) {
  return frame.notes.find((note) => note.id === activeNoteId) ?? null;
}

function createNote(frame = frames[selectedIndex()]) {
  const note = { id: crypto.randomUUID(), text: '', size: 20, position: { x: 50, y: 50 }, fontKey: 'zhi', fontWeight: 700 };
  frame.notes.push(note);
  activeNoteId = note.id;
  return note;
}

function renderAnnotationControls() {
  const hasPhoto = Boolean(frames[selectedIndex()].imageUrl);
  noteInput.disabled = !hasPhoto || !annotationMode || !activeNote();
  annotationToggle.disabled = !hasPhoto || annotationMode;
  annotationBack.hidden = !annotationMode;
  annotationAdd.hidden = !annotationMode;
  annotationAdd.disabled = !hasPhoto || !annotationMode;
  annotationStyle.hidden = !annotationMode;
  annotationStyle.disabled = !hasPhoto || !annotationMode;
  annotationConfirm.hidden = !annotationMode;
  if (!annotationMode) stylePanelOpen = false;
  renderTextStyleControls();
  polaroid.classList.toggle('annotation-mode', annotationMode);
  sceneRoot.classList.toggle('annotation-mode', annotationMode);
  const frame = frames[selectedIndex()];
  cameraLabelInput.value = frame.cameraLabel || '';
  renderCanisterCameraSticker(frame);
  cameraChoice.querySelectorAll('[data-camera-icon]').forEach((button) => button.classList.toggle('is-selected', button.dataset.cameraIcon === frame.cameraIcon));
  audioToggleButton.disabled = !frame.audioUrl;
  audioUploadButton.disabled = !hasPhoto;
  audioToggleButton.classList.toggle('is-playing', activeAudioFrameId === frame.id && !audioPlayer.paused);
  soundWave.classList.toggle('is-playing', activeAudioFrameId === frame.id && !audioPlayer.paused);
}

function renderCanisterCameraSticker(frame = frames[selectedIndex()]) {
  const show = Boolean(frame.cameraLabel.trim());
  canisterCameraSticker.classList.toggle('is-visible', show);
  canisterCameraSticker.setAttribute('aria-hidden', String(!show));
  if (!show) return;
  const icon = frame.cameraIcon === 'camera-2' ? 'camera-2' : 'camera-1';
  canisterCameraImage.src = `assets/${icon}.png`;
  canisterCameraImage.style.display = '';
  canisterCameraFallback.textContent = icon === 'camera-2' ? '◍' : '◉';
  canisterCameraLabel.textContent = frame.cameraLabel;
}

function renderTextStyleControls() {
  const note = activeNote();
  textStylePopover.hidden = !annotationMode || !stylePanelOpen;
  annotationStyle.classList.toggle('is-selected', stylePanelOpen);
  textStylePopover.querySelectorAll('[data-font]').forEach((button) => {
    button.classList.toggle('is-selected', button.dataset.font === (note?.fontKey || 'zhi'));
  });
  textStylePopover.querySelectorAll('[data-weight]').forEach((button) => {
    button.classList.toggle('is-selected', Number(button.dataset.weight) === (note?.fontWeight || 700));
  });
}

function renderPreview() {
  const index = selectedIndex();
  const frame = frames[index];
  if (selectedLabel) selectedLabel.textContent = `FRAME ${String(index + 1).padStart(2, '0')}`;
  if (selectedName) selectedName.textContent = frame.imageUrl ? frame.fileName : 'EMPTY NEGATIVE';
  noteInput.value = activeNote(frame)?.text ?? '';
  preview.style.removeProperty('--photo-ratio');
  if (!frame.imageUrl) {
    preview.innerHTML = '<span class="preview-placeholder">选择左侧底片<br>查看冲印照片</span>';
    return;
  }
  const visibleNotes = !isTouring || tourIncludeNotes || annotationMode;
  preview.innerHTML = `<img src="${frame.imageUrl}" alt="${frame.fileName}">${visibleNotes ? frame.notes.map((note) => {
    const visibleText = note.text || (annotationMode && note.id === activeNoteId ? '备注' : '');
    if (!visibleText) return '';
    const fontFamily = NOTE_FONTS[note.fontKey] || NOTE_FONTS.zhi;
    const fontWeight = note.fontWeight || 700;
    return `<span class="photo-note-overlay ${note.id === activeNoteId ? 'is-active' : ''}" data-note-id="${note.id}" style="left:${note.position.x}%;top:${note.position.y}%;--note-size:${note.size ?? 20}px;font-family:${fontFamily};font-weight:${fontWeight}">${escapeHtml(visibleText)}${annotationMode ? `<button class="note-scale-handle" type="button" data-note-id="${note.id}" aria-label="拖动调整备注大小">＋</button>` : ''}</span>`;
  }).join('') : ''}`;
  const previewImage = preview.querySelector('img');
  const setNaturalRatio = () => {
    if (previewImage.naturalWidth && previewImage.naturalHeight) {
      preview.style.setProperty('--photo-ratio', `${previewImage.naturalWidth} / ${previewImage.naturalHeight}`);
    }
  };
  previewImage.addEventListener('load', setNaturalRatio, { once: true });
  if (previewImage.complete) setNaturalRatio();
  if (isTouring) {
    preview.classList.remove('projector-fade');
    requestAnimationFrame(() => preview.classList.add('projector-fade'));
  }
}

function renderFrames() {
  strip.innerHTML = `${frames.map((frame, index) => `
    <button class="frame ${frame.isSelected ? 'active' : ''}" type="button" data-index="${index}" aria-label="第 ${index + 1} 格底片">
      <span class="frame-picture">${frame.imageUrl
        ? `<img src="${frame.imageUrl}" alt="${frame.fileName}">`
        : '<span class="empty"><b>＋</b></span>'}
      </span>${frame.imageUrl && frame.notes.some((note) => note.text.trim()) ? `<span class="frame-note">${escapeHtml(frame.notes.filter((note) => note.text.trim()).slice(0, 2).map((note) => note.text).join(' · '))}</span>` : ''}
    </button>`).join('')}<span class="film-tail" aria-hidden="true"></span>`;
}

function renderThumbnails() {
  if (!thumbnails) return;
  const filled = frames.filter((frame) => frame.imageUrl);
  thumbnails.innerHTML = filled.map((frame) => {
    const index = frames.indexOf(frame);
    return `<button class="thumb" type="button" data-index="${index}" aria-label="选择第 ${index + 1} 格图片"><img src="${frame.imageUrl}" alt="${frame.fileName}"></button>`;
  }).join('');
}

function render() {
  renderFrames();
  renderPreview();
  renderThumbnails();
  renderAnnotationControls();
}

function escapeHtml(value) {
  return value.replace(/[&<>'"]/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;',
  })[character]);
}

function revokeFrameUrl(frame) {
  safeRevoke(frame.imageUrl);
}

function fillFrames(fileList) {
  const files = Array.from(fileList).filter((file) => file.type.startsWith('image/'));
  if (!files.length) return;

  const emptyIndices = frames
    .map((frame, index) => (!frame.imageUrl ? index : -1))
    .filter((index) => index >= 0);
  const fillCount = Math.min(files.length, emptyIndices.length);

  files.slice(0, fillCount).forEach((file, order) => {
    const frame = frames[emptyIndices[order]];
    revokeFrameUrl(frame);
    frame.imageUrl = URL.createObjectURL(file);
    frame.fileName = file.name;
    void saveFrameImage(frame, file);
  });

  if (fillCount) selectFrame(emptyIndices[0]);
  if (files.length > fillCount) {
    window.alert(`剩余空白底片格不足：已填入 ${fillCount} 张，其余 ${files.length - fillCount} 张未添加。`);
  }
  render();
}

function stopAudio() {
  if (!audioPlayer.paused) audioPlayer.pause();
  audioPlayer.currentTime = 0;
  activeAudioFrameId = null;
  soundWave.classList.remove('is-playing');
  audioToggleButton.classList.remove('is-playing');
  audioToggleButton.querySelector('span').textContent = '播放音乐';
}
function playAudioForFrame(frame = frames[selectedIndex()]) {
  if (!frame?.audioUrl) { stopAudio(); return; }
  if (activeAudioFrameId !== frame.id || audioPlayer.src !== frame.audioUrl) {
    audioPlayer.src = frame.audioUrl;
    activeAudioFrameId = frame.id;
  }
  audioPlayer.play().then(() => {
    soundWave.classList.add('is-playing');
    audioToggleButton.classList.add('is-playing');
    audioToggleButton.querySelector('span').textContent = '暂停音乐';
  }).catch(() => window.alert('该音频暂时无法播放。'));
}
function scrollSelectedFrameIntoView() {
  const target = strip.querySelector(`.frame[data-index="${selectedIndex()}"]`);
  if (!target) return;
  strip.scrollTo({ top: Math.max(0, target.offsetTop - strip.offsetTop - 18), behavior: 'smooth' });
}

function renderProjectorThumbnails() {
  projectorThumbnails.innerHTML = projectorPhotoIndexes.map((index) => {
    const frame = frames[index];
    return `<button class="projector-thumb ${index === selectedIndex() ? 'is-active' : ''}" type="button" data-projector-index="${index}" aria-label="播放第 ${index + 1} 张照片"><img src="${frame.imageUrl}" alt="${escapeHtml(frame.fileName)}"></button>`;
  }).join('');
  const active = projectorThumbnails.querySelector('.projector-thumb.is-active');
  if (active) window.setTimeout(() => active.scrollIntoView({ behavior: 'smooth', block: 'center' }), 0);
}

function renderProjectorFrame() {
  const frame = frames[selectedIndex()];
  if (!frame?.imageUrl) return;
  const outgoing = projectorActiveSlot === 'a' ? projectorImageA : projectorImageB;
  const incoming = projectorActiveSlot === 'a' ? projectorImageB : projectorImageA;
  incoming.alt = frame.fileName;
  incoming.src = frame.imageUrl;
  outgoing.classList.remove('is-active');
  incoming.classList.remove('is-active');
  requestAnimationFrame(() => incoming.classList.add('is-active'));
  projectorActiveSlot = projectorActiveSlot === 'a' ? 'b' : 'a';
  renderProjectorThumbnails();
}

function resetProjectorIdleTimer() {
  if (!isTouring) return;
  document.body.classList.remove('is-idle');
  window.clearTimeout(projectorIdleTimer);
  projectorIdleTimer = window.setTimeout(() => document.body.classList.add('is-idle'), 3000);
}

function showProjectionFrame(index, { autoplayAudio = false } = {}) {
  selectFrame(index, { autoplayAudio });
  scrollSelectedFrameIntoView();
  renderProjectorFrame();
}

function scheduleNextTourFrame() {
  window.clearTimeout(tourTimer);
  if (projectorTourPosition >= projectorPhotoIndexes.length - 1) {
    tourTimer = window.setTimeout(stopTour, 3000);
    return;
  }
  tourTimer = window.setTimeout(() => {
    projectorTourPosition += 1;
    showProjectionFrame(projectorPhotoIndexes[projectorTourPosition], { autoplayAudio: tourAudio.checked });
    scheduleNextTourFrame();
  }, 3000);
}

function stopTour() {
  if (tourTimer) { window.clearInterval(tourTimer); window.clearTimeout(tourTimer); }
  window.clearTimeout(projectorIdleTimer);
  tourTimer = null;
  projectorIdleTimer = null;
  isTouring = false;
  tourToggle.classList.remove('is-playing');
  tourToggle.innerHTML = '<span class="control-icon">▶</span>一键放映';
  projectorSound.pause();
  projectorSound.currentTime = 0;
  document.body.classList.remove('projector-mode', 'is-idle');
  projectorExit.hidden = true;
  projectorHall.setAttribute('aria-hidden', 'true');
  stopAudio();
  render();
}
function startTour() {
  projectorPhotoIndexes = frames.map((frame, index) => frame.imageUrl ? index : -1).filter((index) => index >= 0);
  if (!projectorPhotoIndexes.length) { window.alert('请先上传至少一张照片。'); return; }
  isTouring = true;
  tourIncludeNotes = tourNotes.checked;
  document.body.classList.add('projector-mode');
  projectorExit.hidden = false;
  projectorHall.setAttribute('aria-hidden', 'false');
  projectorSound.currentTime = 0;
  projectorSound.play().catch(() => { /* Add assets/projector.mp3 to enable this effect. */ });
  tourToggle.classList.add('is-playing');
  tourToggle.innerHTML = '<span class="control-icon">■</span>停止放映';
  projectorTourPosition = 0;
  projectorActiveSlot = 'a';
  projectorImageA.classList.remove('is-active');
  projectorImageB.classList.remove('is-active');
  showProjectionFrame(projectorPhotoIndexes[projectorTourPosition], { autoplayAudio: tourAudio.checked });
  resetProjectorIdleTimer();
  scheduleNextTourFrame();
}

audioUploadButton.addEventListener('click', () => {
  if (!frames[selectedIndex()].imageUrl) return;
  audioFileInput.click();
});
audioFileInput.addEventListener('change', () => {
  const [file] = audioFileInput.files || [];
  const frame = frames[selectedIndex()];
  if (!file || !frame.imageUrl) return;
  safeRevoke(frame.audioUrl);
  const reader = new FileReader();
  reader.addEventListener('load', () => {
    frame.audioUrl = String(reader.result);
    frame.audioName = file.name;
    persistFrameExtras();
    render();
  });
  reader.readAsDataURL(file);
  audioFileInput.value = '';
});
audioToggleButton.addEventListener('click', () => {
  const frame = frames[selectedIndex()];
  if (!frame.audioUrl) return;
  if (activeAudioFrameId === frame.id && !audioPlayer.paused) stopAudio();
  else playAudioForFrame(frame);
});
audioPlayer.addEventListener('ended', () => { activeAudioFrameId = null; render(); });
cameraLabelInput.addEventListener('input', () => {
  frames[selectedIndex()].cameraLabel = cameraLabelInput.value;
  persistFrameExtras();
  renderPreview();
  renderCanisterCameraSticker();
});
cameraChoice.addEventListener('click', (event) => {
  const button = event.target.closest('[data-camera-icon]');
  if (!button) return;
  frames[selectedIndex()].cameraIcon = button.dataset.cameraIcon;
  persistFrameExtras();
  render();
});
tourToggle.addEventListener('click', () => {
  if (isTouring) stopTour(); else startTour();
});
projectorExit.addEventListener('click', stopTour);
projectorThumbnails.addEventListener('click', (event) => {
  const thumb = event.target.closest('[data-projector-index]');
  if (!thumb || !isTouring) return;
  const index = Number(thumb.dataset.projectorIndex);
  const nextPosition = projectorPhotoIndexes.indexOf(index);
  if (nextPosition < 0) return;
  projectorTourPosition = nextPosition;
  showProjectionFrame(index, { autoplayAudio: tourAudio.checked });
  scheduleNextTourFrame();
  resetProjectorIdleTimer();
});
window.addEventListener('pointermove', () => resetProjectorIdleTimer(), { passive: true });
window.addEventListener('keydown', () => resetProjectorIdleTimer());

uploadButton.addEventListener('click', () => input.click());
input.addEventListener('change', () => {
  fillFrames(input.files);
  input.value = '';
});
noteInput.addEventListener('input', () => {
  const frame = frames[selectedIndex()];
  if (!frame.imageUrl) return;
  const note = activeNote(frame) ?? createNote(frame);
  note.text = noteInput.value;
  persistFrameExtras();
  renderFrames();
  renderPreview();
});

noteToolbar.addEventListener('click', (event) => {
  const button = event.target.closest('[data-insert]');
  if (!button || noteInput.disabled) return;
  const frame = frames[selectedIndex()];
  const note = activeNote(frame) ?? createNote(frame);
  const token = button.dataset.insert;
  const start = noteInput.selectionStart ?? note.text.length;
  const end = noteInput.selectionEnd ?? start;
  note.text = `${note.text.slice(0, start)}${token}${note.text.slice(end)}`;
  persistFrameExtras();
  noteInput.value = note.text;
  renderFrames();
  renderPreview();
  noteInput.focus();
  const caret = start + token.length;
  noteInput.setSelectionRange(caret, caret);
});

annotationToggle.addEventListener('click', () => {
  if (!frames[selectedIndex()].imageUrl) return;
  annotationMode = true;
  render();
});

annotationBack.addEventListener('click', () => {
  annotationMode = false;
  stylePanelOpen = false;
  render();
});

annotationAdd.addEventListener('click', () => {
  if (!frames[selectedIndex()].imageUrl) return;
  createNote();
  render();
  noteInput.focus();
});

annotationStyle.addEventListener('click', () => {
  if (!frames[selectedIndex()].imageUrl) return;
  if (!activeNote()) createNote();
  stylePanelOpen = !stylePanelOpen;
  renderTextStyleControls();
});

textStylePopover.addEventListener('click', (event) => {
  const choice = event.target.closest('[data-font],[data-weight]');
  if (!choice) return;
  const note = activeNote() ?? createNote();
  if (choice.dataset.font) note.fontKey = choice.dataset.font;
  if (choice.dataset.weight) note.fontWeight = Number(choice.dataset.weight);
  persistFrameExtras();
  renderFrames();
  renderPreview();
  renderTextStyleControls();
});

annotationConfirm.addEventListener('click', () => {
  const frame = frames[selectedIndex()];
  frame.notes = frame.notes.filter((note) => note.text.trim());
  activeNoteId = frame.notes[0]?.id ?? null;
  annotationMode = false;
  stylePanelOpen = false;
  persistFrameExtras();
  render();
});

preview.addEventListener('pointerdown', (event) => {
  if (!annotationMode) return;
  const handle = event.target.closest('.note-scale-handle');
  if (handle) {
    const note = frames[selectedIndex()].notes.find((item) => item.id === handle.dataset.noteId);
    if (!note) return;
    activeNoteId = note.id;
    scalingNote = { id: note.id, startX: event.clientX, startY: event.clientY, startSize: note.size ?? 20 };
    event.preventDefault();
    return;
  }
  if (!event.target.classList.contains('photo-note-overlay')) return;
  activeNoteId = event.target.dataset.noteId;
  draggingNoteId = activeNoteId;
  noteInput.value = activeNote()?.text ?? '';
  renderPreview();
  event.preventDefault();
});

window.addEventListener('pointermove', (event) => {
  if (scalingNote && annotationMode) {
    const note = frames[selectedIndex()].notes.find((item) => item.id === scalingNote.id);
    if (!note) return;
    note.size = Math.min(64, Math.max(10, scalingNote.startSize + (event.clientX - scalingNote.startX - (event.clientY - scalingNote.startY)) * 0.15));
    const overlay = preview.querySelector(`[data-note-id="${scalingNote.id}"]`);
    if (overlay) overlay.style.setProperty('--note-size', `${note.size}px`);
    return;
  }
  if (!draggingNoteId || !annotationMode) return;
  const frame = frames[selectedIndex()];
  const note = frame.notes.find((item) => item.id === draggingNoteId);
  if (!note) return;
  const bounds = preview.getBoundingClientRect();
  note.position.x = Math.min(122, Math.max(-22, ((event.clientX - bounds.left) / bounds.width) * 100));
  note.position.y = Math.min(122, Math.max(-22, ((event.clientY - bounds.top) / bounds.height) * 100));
  const overlay = preview.querySelector(`[data-note-id="${draggingNoteId}"]`);
  if (overlay) {
    overlay.style.left = `${note.position.x}%`;
    overlay.style.top = `${note.position.y}%`;
  }
});

window.addEventListener('pointerup', () => { if (draggingNoteId || scalingNote) persistFrameExtras(); draggingNoteId = null; scalingNote = null; });

strip.addEventListener('click', (event) => {
  const frameButton = event.target.closest('[data-index]');
  if (!frameButton) return;
  const index = Number(frameButton.dataset.index);
  selectFrame(index);
  // Empty cells double as a direct upload target.
  if (!frames[index].imageUrl) input.click();
});

strip.addEventListener('dragover', (event) => event.preventDefault());
strip.addEventListener('drop', (event) => {
  event.preventDefault();
  const frameButton = event.target.closest('[data-index]');
  if (frameButton) selectFrame(Number(frameButton.dataset.index));
  fillFrames(event.dataTransfer.files);
});

if (thumbnails) {
  thumbnails.addEventListener('click', (event) => {
    const thumbnail = event.target.closest('[data-index]');
    if (thumbnail) selectFrame(Number(thumbnail.dataset.index));
  });
}

document.querySelector('#download').addEventListener('click', () => window.print());
window.addEventListener('beforeunload', () => { stopTour(); stopAudio(); frames.forEach((frame) => { revokeFrameUrl(frame); safeRevoke(frame.audioUrl); }); });

render();
void restoreFrameImages();
