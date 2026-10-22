/**
 * AG&W Screenshot Carousel + Lightbox
 * - Auto-crossfade every few seconds; pauses on hover, on keyboard focus,
 *   with its own pause button, and when animations are paused site-wide
 *   (the motion toggle or prefers-reduced-motion; see background.js)
 * - Control bar (prev / pause / next / magnify) shows on hover or focus
 * - Magnify (or a click on the image) opens a modal lightbox
 */
(function () {
  const carousel = document.getElementById('screenshot-carousel');
  if (!carousel) return;

  const track = carousel.querySelector('.carousel-track');
  const images = Array.from(track.querySelectorAll('img'));
  if (images.length === 0) return;

  let current = 0;
  let interval = null;
  let userPaused = false;   // the carousel's own pause button
  let hovering = false;
  let focused = false;
  const DELAY = 4000;

  function motionPaused() {
    return document.documentElement.classList.contains('motion-paused');
  }

  // --- Build carousel control bar ---
  const bar = document.createElement('div');
  bar.className = 'carousel-bar';
  bar.innerHTML =
    '<button type="button" class="carousel-btn" data-action="prev" aria-label="Previous screenshot">&#x276E;</button>' +
    '<span class="carousel-counter" aria-hidden="true"></span>' +
    '<button type="button" class="carousel-btn" data-action="next" aria-label="Next screenshot">&#x276F;</button>' +
    '<button type="button" class="carousel-btn carousel-pause" data-action="pause" aria-label="Pause slideshow" aria-pressed="false">&#x275A;&#x275A;</button>' +
    '<button type="button" class="carousel-btn carousel-zoom" data-action="zoom" aria-label="View screenshot full size">&#x1F50D;</button>';
  carousel.appendChild(bar);

  // Announces manual slide changes (autoplay stays silent)
  const live = document.createElement('p');
  live.className = 'sr-only';
  live.setAttribute('aria-live', 'polite');
  carousel.appendChild(live);

  const counter = bar.querySelector('.carousel-counter');
  const pauseBtn = bar.querySelector('.carousel-pause');

  function updateCounter() {
    counter.textContent = (current + 1) + ' / ' + images.length;
  }

  function updateHidden() {
    images.forEach((img, i) => {
      if (i === current) img.removeAttribute('aria-hidden');
      else img.setAttribute('aria-hidden', 'true');
    });
  }

  // --- Carousel ---

  // All images absolutely positioned; first one visible
  images.forEach((img, i) => {
    img.style.opacity = i === 0 ? '1' : '0';
  });
  updateCounter();
  updateHidden();

  function showSlide(next, announce) {
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
    updateHidden();
    if (announce) {
      live.textContent = 'Screenshot ' + (current + 1) + ' of ' + images.length + ': ' + images[current].alt;
    }
  }

  function advance(announce) {
    showSlide((current + 1) % images.length, announce);
  }

  function prevSlide(announce) {
    showSlide((current - 1 + images.length) % images.length, announce);
  }

  function shouldPlay() {
    return !userPaused && !hovering && !focused && !motionPaused() && lightbox.hidden;
  }

  function syncAutoplay() {
    if (shouldPlay()) {
      if (!interval) interval = setInterval(() => advance(false), DELAY);
    } else if (interval) {
      clearInterval(interval);
      interval = null;
    }
  }

  function setUserPaused(paused) {
    userPaused = paused;
    pauseBtn.setAttribute('aria-pressed', paused ? 'true' : 'false');
    pauseBtn.setAttribute('aria-label', paused ? 'Play slideshow' : 'Pause slideshow');
    pauseBtn.innerHTML = paused ? '&#x25B6;' : '&#x275A;&#x275A;';
    syncAutoplay();
  }

  // Hover and keyboard focus pause autoplay
  carousel.addEventListener('mouseenter', () => { hovering = true; syncAutoplay(); });
  carousel.addEventListener('mouseleave', () => { hovering = false; syncAutoplay(); });
  carousel.addEventListener('focusin', () => { focused = true; syncAutoplay(); });
  carousel.addEventListener('focusout', (e) => {
    if (!carousel.contains(e.relatedTarget)) { focused = false; syncAutoplay(); }
  });
  document.addEventListener('agw:motion', syncAutoplay);

  // Bar button handlers
  bar.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    e.stopPropagation();
    const action = btn.dataset.action;
    if (action === 'prev') prevSlide(true);
    if (action === 'next') advance(true);
    if (action === 'pause') setUserPaused(!userPaused);
    if (action === 'zoom') openLightbox(current, btn);
  });

  // Click image itself opens lightbox (the magnify button is the keyboard route)
  track.addEventListener('click', () => {
    openLightbox(current, bar.querySelector('.carousel-zoom'));
  });

  track.style.cursor = 'pointer';

  // --- Lightbox (modal dialog) ---

  const lightbox = document.getElementById('lightbox');
  const lbImg = document.getElementById('lightbox-img');
  const lbCounter = document.getElementById('lb-counter');
  const lbPrev = document.getElementById('lb-prev');
  const lbNext = document.getElementById('lb-next');
  const lbClose = document.getElementById('lb-close');
  const lbBackdrop = lightbox.querySelector('.lightbox-backdrop');

  let lbIndex = 0;
  let returnFocus = null;

  function openLightbox(index, opener) {
    lbIndex = index;
    returnFocus = opener || document.activeElement;
    updateLightbox();
    lightbox.hidden = false;
    requestAnimationFrame(() => lightbox.classList.add('open'));
    document.body.style.overflow = 'hidden';
    syncAutoplay();
    lbClose.focus();
  }

  function closeLightbox() {
    lightbox.classList.remove('open');
    lightbox.hidden = true;
    document.body.style.overflow = '';
    if (returnFocus && typeof returnFocus.focus === 'function') returnFocus.focus();
    syncAutoplay();
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
    if (e.key === 'Escape') { e.preventDefault(); closeLightbox(); return; }
    if (e.key === 'ArrowLeft') lbPrevSlide();
    if (e.key === 'ArrowRight') lbNextSlide();
    if (e.key === 'Tab') {
      // Keep focus inside the dialog
      const focusables = [lbPrev, lbNext, lbClose];
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      else if (!lightbox.contains(document.activeElement)) { e.preventDefault(); first.focus(); }
    }
  });

  syncAutoplay();
})();
