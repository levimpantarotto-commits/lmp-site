const review = document.querySelector('#revisao-3d');

review.addEventListener('load', () => {
  review.removeAttribute('aria-busy');
});

review.setAttribute('aria-busy', 'true');
