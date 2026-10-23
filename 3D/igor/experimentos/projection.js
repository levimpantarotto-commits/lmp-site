const groups = [
  ['Fachada e chegada', [3, 4, 5, 27, 28]], ['Mezanino', [0, 1, 2]],
  ['Cozinha e social', [6, 7, 8, 10, 11]], ['Quartos e banheiros', [12, 13, 14, 15, 16, 17, 18]],
  ['Deck e área externa', [9, 19, 20, 21, 22]], ['Ambiente adicional — ligação não confirmada', [23, 24, 25, 26]]
];
const id = n => String(n).padStart(2, '0');
export function photoInfo(index) {
  const group = groups.find(([, photos]) => photos.includes(index))?.[0] || 'Acervo';
  return { id: id(index), group, src: `../assets/${id(index)}.jpg` };
}
const allPhotos = groups.flatMap(([, photos]) => photos);

export function mountProjection(host, { onPhotoChange }) {
  let index = allPhotos.indexOf(3), angle = 0, dragging = null;
  const node = document.createElement('section');
  node.className = 'projection';
  node.innerHTML = `<div class="projection-frame" tabindex="0" aria-describedby="projection-help"><div class="projected-plane"><img draggable="false" alt=""></div><p class="projection-badge">FOTO PROJETADA · MOVIMENTO LIMITADO</p></div><div class="projection-tools"><label>Foto <select aria-label="Escolher fotografia"></select></label><label>Ângulo <input type="range" min="-12" max="12" value="0" aria-label="Pequeno ângulo de projeção"><output>0°</output></label><button type="button">Redefinir</button><p id="projection-help">Arraste lateralmente para comparar o enquadramento. O fundo não ganha profundidade: esta é a própria foto em um plano, apresentada em perspectiva.</p></div>`;
  host.replaceChildren(node);
  const frame = node.querySelector('.projection-frame');
  const plane = node.querySelector('.projected-plane');
  const image = node.querySelector('img');
  const select = node.querySelector('select');
  const input = node.querySelector('input');
  const output = node.querySelector('output');
  const reset = node.querySelector('button');
  groups.forEach(([group, photos]) => {
    const optgroup = document.createElement('optgroup'); optgroup.label = group;
    photos.forEach(photo => { const opt = document.createElement('option'); opt.value = photo; opt.textContent = `Foto ${id(photo)} · ${group}`; optgroup.append(opt); });
    select.append(optgroup);
  });
  function render() {
    const info = photoInfo(allPhotos[index]);
    image.src = info.src;
    image.alt = `Foto ${info.id}: ${info.group}`;
    select.value = String(allPhotos[index]);
    plane.style.transform = `rotateY(${angle}deg) translateX(${angle * 2}px)`;
    output.textContent = `${Math.round(angle*10)/10}°`;
    onPhotoChange(allPhotos[index]);
  }
  const onSelect = () => { index = Math.max(0, allPhotos.indexOf(Number(select.value))); angle = 0; input.value = '0'; render(); };
  const onRange = () => { angle = Number(input.value); render(); };
  const onDown = event => { dragging = { x: event.clientX, start: angle }; frame.setPointerCapture(event.pointerId); };
  const onMove = event => { if (!dragging) return; angle = Math.max(-12, Math.min(12, dragging.start + (event.clientX - dragging.x) / 13)); input.value = String(angle); render(); };
  const onUp = () => { dragging = null; };
  const onKey = event => { if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); angle = Math.max(-12, Math.min(12, angle + (event.key === 'ArrowLeft' ? -1 : 1))); input.value = String(angle); render(); } };
  select.addEventListener('change', onSelect); input.addEventListener('input', onRange); reset.addEventListener('click', () => { angle = 0; input.value = '0'; render(); });
  frame.addEventListener('pointerdown', onDown); frame.addEventListener('pointermove', onMove); frame.addEventListener('pointerup', onUp); frame.addEventListener('pointercancel', onUp); frame.addEventListener('keydown', onKey);
  render();
  return { currentPhoto: () => allPhotos[index], destroy() { select.removeEventListener('change', onSelect); input.removeEventListener('input', onRange); frame.remove(); node.remove(); } };
}
