/* ============================================================
   WynnAmp v2.7.3 Web Edition — VoidSoft
   A faithful web recreation of the in-game music player
   ============================================================ */

(function () {
  'use strict';

  /* ---------- track data ---------- */
  const TRACKS = [
    {
      id: 'dont_bite',
      title: 'If It Don\'t Bite',
      artist: 'No Body and the NeckRomancers',
      src: 'assets/music/if-it-dont-bite_final.mp3',
    },
    {
      id: 'flow_state',
      title: 'Flow State',
      artist: 'The Leaky Cauldrons',
      src: 'assets/music/song1.mp3',
    },
    {
      id: 'dead_mans_hand',
      title: 'Dead Man\'s Hand',
      artist: 'The Jacknives',
      src: 'assets/music/dead_mans_hand.mp3',
    },
  ];

  /* ---------- DOM refs ---------- */
  const root = document.getElementById('wynnamp');
  if (!root) return;

  const marquee       = root.querySelector('.wa-marquee-text');
  const vizCanvas      = root.querySelector('.wa-viz');
  const btnPrev        = root.querySelector('.wa-prev');
  const btnPlay        = root.querySelector('.wa-play');
  const btnPause       = root.querySelector('.wa-pause');
  const btnStop        = root.querySelector('.wa-stop');
  const btnNext        = root.querySelector('.wa-next');
  const seekBar        = root.querySelector('.wa-seek');
  const seekFill       = root.querySelector('.wa-seek-fill');
  const seekThumb      = root.querySelector('.wa-seek-thumb');
  const timeEl         = root.querySelector('.wa-time');
  const durationEl     = root.querySelector('.wa-duration');
  const playlist       = root.querySelector('.wa-playlist');
  const volSlider      = root.querySelector('.wa-vol-slider');
  const volFill        = root.querySelector('.wa-vol-fill');
  const statusMode     = root.querySelector('.wa-status-mode');

  /* ---------- audio ---------- */
  const audio = new Audio();
  audio.crossOrigin = 'anonymous';
  audio.preload = 'none';
  audio.volume = 0.75;

  let currentIdx = -1;
  let isPlaying  = false;
  let audioCtx   = null;
  let analyser   = null;
  let source     = null;
  let dataArray   = null;
  let vizRAF      = null;

  /* ---------- visualization ---------- */
  const ctx = vizCanvas.getContext('2d');
  const BAR_COUNT  = 32;
  const BAR_GAP    = 1;
  // colors
  const BAR_COLOR_TOP    = '#D4A017';
  const BAR_COLOR_BOTTOM = '#8B6914';
  const BAR_PEAK_COLOR   = '#FFD700';

  // peak hold
  let peaks = new Array(BAR_COUNT).fill(0);
  let peakDecay = new Array(BAR_COUNT).fill(0);

  function initAudioContext() {
    if (audioCtx) return;
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.8;
    source = audioCtx.createMediaElementSource(audio);
    source.connect(analyser);
    analyser.connect(audioCtx.destination);
    dataArray = new Uint8Array(analyser.frequencyBinCount);
  }

  function drawViz() {
    const rect = vizCanvas.getBoundingClientRect();
    const W = rect.width;
    const H = rect.height;
    ctx.clearRect(0, 0, W, H);

    // dark background with subtle noise
    ctx.fillStyle = '#0A0806';
    ctx.fillRect(0, 0, W, H);

    if (!analyser || !isPlaying) {
      // idle state: dim bars
      const barW = (W - (BAR_COUNT - 1) * BAR_GAP) / BAR_COUNT;
      for (let i = 0; i < BAR_COUNT; i++) {
        const x = i * (barW + BAR_GAP);
        const h = 2;
        ctx.fillStyle = 'rgba(212, 160, 23, 0.2)';
        ctx.fillRect(x, H - h, barW, h);
      }
      if (isPlaying) vizRAF = requestAnimationFrame(drawViz);
      return;
    }

    analyser.getByteFrequencyData(dataArray);

    const barW = (W - (BAR_COUNT - 1) * BAR_GAP) / BAR_COUNT;
    const bins = dataArray.length;
    const binStep = Math.floor(bins / BAR_COUNT);

    for (let i = 0; i < BAR_COUNT; i++) {
      // average a range of bins for this bar
      let sum = 0;
      const start = i * binStep;
      for (let j = start; j < start + binStep && j < bins; j++) {
        sum += dataArray[j];
      }
      const avg = sum / binStep;
      const barH = (avg / 255) * H * 0.9;

      const x = i * (barW + BAR_GAP);
      const y = H - barH;

      // gradient bar
      const grad = ctx.createLinearGradient(x, H, x, y);
      grad.addColorStop(0, BAR_COLOR_BOTTOM);
      grad.addColorStop(1, BAR_COLOR_TOP);
      ctx.fillStyle = grad;
      ctx.fillRect(x, y, barW, barH);

      // peak hold
      if (barH > peaks[i]) {
        peaks[i] = barH;
        peakDecay[i] = 0;
      } else {
        peakDecay[i] += 0.5;
        peaks[i] = Math.max(0, peaks[i] - peakDecay[i]);
      }

      if (peaks[i] > 2) {
        ctx.fillStyle = BAR_PEAK_COLOR;
        ctx.fillRect(x, H - peaks[i] - 2, barW, 2);
      }
    }

    // subtle scan line overlay
    ctx.fillStyle = 'rgba(0,0,0,0.08)';
    for (let y = 0; y < H; y += 3) {
      ctx.fillRect(0, y, W, 1);
    }

    vizRAF = requestAnimationFrame(drawViz);
  }

  /* ---------- playlist rendering ---------- */
  function renderPlaylist() {
    playlist.innerHTML = '';
    TRACKS.forEach((t, i) => {
      const li = document.createElement('div');
      li.className = 'wa-track' + (i === currentIdx ? ' wa-active' : '');
      li.innerHTML = `<span class="wa-track-num">${i + 1}.</span> ` +
        `<span class="wa-track-artist">${t.artist}</span> — ` +
        `<span class="wa-track-title">${t.title}</span>`;
      li.addEventListener('click', () => loadAndPlay(i));
      playlist.appendChild(li);
    });
  }

  /* ---------- marquee ---------- */
  function setMarquee(text) {
    // duplicate text for seamless scroll
    marquee.textContent = text;
    // reset animation
    marquee.style.animation = 'none';
    marquee.offsetHeight; // reflow
    marquee.style.animation = '';
  }

  function setIdleMarquee() {
    setMarquee('WynnAmp v2.7.3 — VoidCast Edition — Select a track to begin...');
  }

  /* ---------- time formatting ---------- */
  function fmt(s) {
    if (isNaN(s)) return '--:--';
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  }

  /* ---------- transport ---------- */
  function loadAndPlay(idx) {
    if (idx < 0) idx = TRACKS.length - 1;
    if (idx >= TRACKS.length) idx = 0;
    currentIdx = idx;
    const track = TRACKS[idx];

    audio.src = track.src;
    audio.load();

    setMarquee(`${track.artist} — ${track.title}`);
    renderPlaylist();
    statusMode.textContent = 'PLAYING';

    // ensure audio context
    try { initAudioContext(); } catch(e) { /* ok */ }
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();

    audio.play().then(() => {
      isPlaying = true;
      updateButtons();
      drawViz();
    }).catch(() => {
      // autoplay blocked - show play state anyway
      isPlaying = false;
      updateButtons();
    });
  }

  function togglePlay() {
    if (currentIdx < 0) {
      loadAndPlay(0);
      return;
    }
    if (audio.paused) {
      try { initAudioContext(); } catch(e) {}
      if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
      audio.play().then(() => {
        isPlaying = true;
        statusMode.textContent = 'PLAYING';
        updateButtons();
        drawViz();
      });
    } else {
      audio.pause();
      isPlaying = false;
      statusMode.textContent = 'PAUSED';
      updateButtons();
    }
  }

  function stop() {
    audio.pause();
    audio.currentTime = 0;
    isPlaying = false;
    statusMode.textContent = 'STOPPED';
    updateButtons();
    if (vizRAF) cancelAnimationFrame(vizRAF);
    drawViz(); // draw idle state
  }

  function prev() {
    if (currentIdx < 0) return;
    loadAndPlay(currentIdx - 1);
  }

  function next() {
    if (currentIdx < 0) return;
    loadAndPlay(currentIdx + 1);
  }

  function updateButtons() {
    btnPlay.classList.toggle('wa-hidden', isPlaying);
    btnPause.classList.toggle('wa-hidden', !isPlaying);
  }

  /* ---------- seek bar ---------- */
  function updateSeek() {
    if (!audio.duration) return;
    const pct = (audio.currentTime / audio.duration) * 100;
    seekFill.style.width = pct + '%';
    seekThumb.style.left = pct + '%';
    timeEl.textContent = fmt(audio.currentTime);
    durationEl.textContent = fmt(audio.duration);
  }

  function handleSeek(e) {
    const rect = seekBar.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    if (audio.duration) {
      audio.currentTime = pct * audio.duration;
    }
  }

  let seeking = false;
  seekBar.addEventListener('mousedown', (e) => {
    seeking = true;
    handleSeek(e);
  });
  document.addEventListener('mousemove', (e) => {
    if (seeking) handleSeek(e);
  });
  document.addEventListener('mouseup', () => { seeking = false; });

  // touch support
  seekBar.addEventListener('touchstart', (e) => {
    seeking = true;
    handleSeek(e.touches[0]);
  }, { passive: true });
  document.addEventListener('touchmove', (e) => {
    if (seeking) handleSeek(e.touches[0]);
  }, { passive: true });
  document.addEventListener('touchend', () => { seeking = false; });

  /* ---------- volume ---------- */
  let volDragging = false;
  function handleVol(e) {
    const rect = volSlider.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    audio.volume = pct;
    volFill.style.width = (pct * 100) + '%';
  }
  volSlider.addEventListener('mousedown', (e) => { volDragging = true; handleVol(e); });
  document.addEventListener('mousemove', (e) => { if (volDragging) handleVol(e); });
  document.addEventListener('mouseup', () => { volDragging = false; });
  volSlider.addEventListener('touchstart', (e) => { volDragging = true; handleVol(e.touches[0]); }, { passive: true });
  document.addEventListener('touchmove', (e) => { if (volDragging) handleVol(e.touches[0]); }, { passive: true });
  document.addEventListener('touchend', () => { volDragging = false; });

  // init volume display
  volFill.style.width = '75%';

  /* ---------- audio events ---------- */
  audio.addEventListener('timeupdate', updateSeek);
  audio.addEventListener('ended', next);
  audio.addEventListener('loadedmetadata', () => {
    durationEl.textContent = fmt(audio.duration);
  });

  /* ---------- button wiring ---------- */
  btnPrev.addEventListener('click', prev);
  btnPlay.addEventListener('click', togglePlay);
  btnPause.addEventListener('click', togglePlay);
  btnStop.addEventListener('click', stop);
  btnNext.addEventListener('click', next);

  /* ---------- canvas sizing ---------- */
  function sizeCanvas() {
    const dpr = window.devicePixelRatio || 1;
    const rect = vizCanvas.getBoundingClientRect();
    vizCanvas.width  = rect.width * dpr;
    vizCanvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    // reassign logical dimensions for drawing
    vizCanvas.logicalW = rect.width;
    vizCanvas.logicalH = rect.height;
  }

  // override draw to use logical dims
  const origDrawViz = drawViz;

  window.addEventListener('resize', sizeCanvas);
  sizeCanvas();

  /* ---------- init ---------- */
  renderPlaylist();
  setIdleMarquee();
  updateButtons();
  drawViz();

})();
