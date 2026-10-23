import { mountProjection, photoInfo } from './projection.js';

const stage = document.querySelector('#viewport');
const buttons = [...document.querySelectorAll('.tab')];
const methodNote = document.querySelector('#method-note');
const original = document.querySelector('#open-original');
const standalone = document.querySelector('#open-test');
const dialog = document.querySelector('#photo-dialog');
const dialogImage = dialog.querySelector('img');
const dialogText = dialog.querySelector('p');

const modes = {
  model: {
    src: '../estudo-proporcoes/?study=proportion-v2',
    note: ['01 · Modelo proporcional — revisão parcial', 'Sala/cozinha mais largas e terraço elevado com escada lateral. O ambiente adicional das fotos 23–26 ainda não está incorporado: sua ligação não foi identificada. Os 120 m² e os desníveis são hipóteses de modelagem, não medição nem confirmação de três pavimentos.']
  },
  photo: {
    note: ['02 · Projeção da foto', 'A foto é mantida como aparência. Arraste ou use o ângulo para um pequeno deslocamento projetivo; não há mapa de profundidade, 360° ou geometria escondida inventada.']
  },
  points: {
    src: './pontos.html',
    note: ['03 · Pontos triangulados', 'Somente os pontos obtidos de correspondências entre fotos se tornam visíveis. Espaços sem recobrimento ficam vazios; isso é evidência de limite, não ausência de ambiente.']
  }
};

let cleanup = () => {};
let selectedPhoto = 0;

function openOriginal(photo = selectedPhoto) {
  const item = photoInfo(photo);
  dialogImage.src = item.src;
  dialogImage.alt = `Fotografia original ${item.id}`;
  dialogText.textContent = `Foto ${item.id} · ${item.group}. Arquivo comercial original local; não é medição.`;
  if (!dialog.open) dialog.showModal();
}

function mountFrame(src, title) {
  const frame = document.createElement('iframe');
  frame.src = src;
  frame.title = title;
  frame.loading = 'eager';
  stage.replaceChildren(frame);
}

function select(mode, focus = false) {
  cleanup(); cleanup = () => {};
  const config = modes[mode];
  buttons.forEach(button => {
    const selected = button.dataset.mode === mode;
    button.setAttribute('aria-selected', String(selected));
    button.tabIndex = selected ? 0 : -1;
    if (selected && focus) button.focus();
  });
  methodNote.replaceChildren(Object.assign(document.createElement('b'), { textContent: config.note[0] }), Object.assign(document.createElement('span'), { textContent: config.note[1] }));
  original.hidden = mode !== 'photo';
  original.style.display = mode === 'photo' ? 'inline-block' : 'none';
  standalone.hidden = mode === 'photo';
  if (config.src) standalone.href = config.src;
  stage.setAttribute('aria-labelledby', `tab-${mode}`);
  if (mode === 'photo') {
    const projection = mountProjection(stage, {
      onPhotoChange(index) { selectedPhoto = index; }
    });
    cleanup = projection.destroy;
    selectedPhoto = projection.currentPhoto();
  } else {
    mountFrame(config.src, config.note[0]);
  }
}

buttons.forEach((button, index) => {
  button.addEventListener('click', () => select(button.dataset.mode, true));
  button.addEventListener('keydown', event => {
    const next = event.key === 'ArrowRight' ? (index + 1) % buttons.length : event.key === 'ArrowLeft' ? (index + buttons.length - 1) % buttons.length : event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 : -1;
    if (next >= 0) { event.preventDefault(); select(buttons[next].dataset.mode, true); }
  });
});
original.addEventListener('click', () => openOriginal());
dialog.querySelector('.dialog-close').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
select('model');
