/**
 * AG&W Screenshot Carousel + Lightbox
 * - Auto-crossfade, pauses on hover
 * - Hover shows control bar with prev/next/magnify
 * - Click magnify (or image) opens fullscreen lightbox
 */
(function () {
  const carousel = document.getElementById('screenshot-carousel');
  if (!carousel) return;

  const track = carousel.querySelector('.carousel-track');
  const images = Array.from(track.querySelectorAll('img'));
  if (images.length === 0) return;

  let current = 0;
  let interval = null;
  const DELAY = 4000;

  // --- Build carousel control bar ---
  const bar = document.createElement('div');
  bar.className = 'carousel-bar';
  bar.innerHTML =
    '<button class="carousel-btn" data-action="prev" aria-label="Previous">&#x276E;</button>' +
    '<span class="carousel-counter"></span>' +
    '<button class="carousel-btn" data-action="next" aria-label="Next">&#x276F;</button>' +
    '<button class="carousel-btn carousel-zoom" data-action="zoom" aria-label="View full size">&#x1F50D;</button>';
  carousel.appendChild(bar);

  const counter = bar.querySelector('.carousel-counter');

  function updateCounter() {
    counter.textContent = (current + 1) + ' / ' + images.length;
  }

  // --- Carousel ---

  // All images absolutely positioned; first one visible
  images.forEach((img, i) => {
    img.style.opacity = i === 0 ? '1' : '0';
  });
  updateCounter();

  function showSlide(next) {
    if (next === current) return;
    const prev = current;
    current = next;

    images[current].style.opacity = '1';
    images[current].style.zIndex = '1';

    images[prev].style.zIndex = '0';
    images[prev].style.opacity = '0';

    // Reset z-index after transition
    setTimeout(() => {
      images.forEach((img, i) => {
        img.style.zIndex = i === current ? '1' : '0';
      });
    }, 700);

    updateCounter();
  }

  function advance() {
    showSlide((current + 1) % images.length);
  }

  function prevSlide() {
    showSlide((current - 1 + images.length) % images.length);
  }

  function startAutoplay() {
    if (interval) return;
    interval = setInterval(advance, DELAY);
  }

  function stopAutoplay() {
    clearInterval(interval);
    interval = null;
  }

  // Hover pauses autoplay
  carousel.addEventListener('mouseenter', stopAutoplay);
  carousel.addEventListener('mouseleave', startAutoplay);

  // Bar button handlers
  bar.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    e.stopPropagation();
    const action = btn.dataset.action;
    if (action === 'prev') prevSlide();
    if (action === 'next') advance();
    if (action === 'zoom') openLightbox(current);
  });

  // Click image itself opens lightbox
  track.addEventListener('click', () => {
    openLightbox(current);
  });

  track.style.cursor = 'pointer';
  startAutoplay();

  // --- Lightbox ---

  const lightbox = document.getElementById('lightbox');
  const lbImg = document.getElementById('lightbox-img');
  const lbCounter = document.getElementById('lb-counter');
  const lbPrev = document.getElementById('lb-prev');
  const lbNext = document.getElementById('lb-next');
  const lbClose = document.getElementById('lb-close');
  const lbBackdrop = lightbox.querySelector('.lightbox-backdrop');

  let lbIndex = 0;

  function openLightbox(index) {
    lbIndex = index;
    updateLightbox();
    lightbox.hidden = false;
    requestAnimationFrame(() => lightbox.classList.add('open'));
    document.body.style.overflow = 'hidden';
    stopAutoplay();
  }

  function closeLightbox() {
    lightbox.classList.remove('open');
    setTimeout(() => {
      lightbox.hidden = true;
      document.body.style.overflow = '';
      startAutoplay();
    }, 300);
  }

  function updateLightbox() {
    lbImg.src = images[lbIndex].src;
    lbImg.alt = images[lbIndex].alt;
    lbCounter.textContent = (lbIndex + 1) + ' / ' + images.length;
  }

  function lbPrevSlide() {
    lbIndex = (lbIndex - 1 + images.length) % images.length;
    updateLightbox();
  }

  function lbNextSlide() {
    lbIndex = (lbIndex + 1) % images.length;
    updateLightbox();
  }

  lbPrev.addEventListener('click', (e) => { e.stopPropagation(); lbPrevSlide(); });
  lbNext.addEventListener('click', (e) => { e.stopPropagation(); lbNextSlide(); });
  lbClose.addEventListener('click', (e) => { e.stopPropagation(); closeLightbox(); });
  lbBackdrop.addEventListener('click', closeLightbox);

  lbImg.addEventListener('click', (e) => e.stopPropagation());

  document.addEventListener('keydown', (e) => {
    if (lightbox.hidden) return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowLeft') lbPrevSlide();
    if (e.key === 'ArrowRight') lbNextSlide();
  });
})();
