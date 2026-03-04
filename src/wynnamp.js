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

  /* ---------- color skins ---------- */
  const SKINS = [
    {
      name: 'Amber',
      top: '#D4A017',
      bottom: '#8B6914',
      peak: '#FFD700',
      glow: 'rgba(212, 160, 23, 0.6)',
      dim: 'rgba(212, 160, 23, 0.2)',
      accent: '#D4A017',
      accentBright: '#FFD700',
      line: '#D4A017',
    },
    {
      name: 'Arcana',
      top: '#B44EFF',
      bottom: '#6B21A8',
      peak: '#D88FFF',
      glow: 'rgba(153, 51, 255, 0.6)',
      dim: 'rgba(153, 51, 255, 0.2)',
      accent: '#9933FF',
      accentBright: '#CC77FF',
      line: '#B44EFF',
    },
    {
      name: 'Nature',
      top: '#33CC55',
      bottom: '#1A7A30',
      peak: '#77FF99',
      glow: 'rgba(51, 204, 85, 0.6)',
      dim: 'rgba(51, 204, 85, 0.2)',
      accent: '#33CC55',
      accentBright: '#66FF88',
      line: '#33CC55',
    },
    {
      name: 'Hydro',
      top: '#4499FF',
      bottom: '#2255AA',
      peak: '#88CCFF',
      glow: 'rgba(68, 153, 255, 0.6)',
      dim: 'rgba(68, 153, 255, 0.2)',
      accent: '#4499FF',
      accentBright: '#88CCFF',
      line: '#4499FF',
    },
  ];

  /* ---------- viz modes ---------- */
  const VIZ_MODES = ['bars', 'oscilloscope', 'scatter'];
  let vizModeIdx = 0;
  let skinIdx = 0;

  function skin() { return SKINS[skinIdx]; }

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
  const skinBadge      = root.querySelector('.wa-title-badge');

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
  let freqData   = null;
  let timeData   = null;
  let vizRAF     = null;

  /* ---------- visualization ---------- */
  const ctx = vizCanvas.getContext('2d');
  const BAR_COUNT  = 32;
  const BAR_GAP    = 1;

  // peak hold
  let peaks = new Array(BAR_COUNT).fill(0);
  let peakDecay = new Array(BAR_COUNT).fill(0);

  // scatter particles
  let particles = [];

  function initAudioContext() {
    if (audioCtx) return;
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.8;
    source = audioCtx.createMediaElementSource(audio);
    source.connect(analyser);
    analyser.connect(audioCtx.destination);
    freqData = new Uint8Array(analyser.frequencyBinCount);
    timeData = new Uint8Array(analyser.frequencyBinCount);
  }

  /* ---------- apply skin to CSS ---------- */
  function applySkin() {
    const s = skin();
    root.style.setProperty('--wa-accent', s.accent);
    root.style.setProperty('--wa-accent-bright', s.accentBright);
    root.style.setProperty('--wa-glow', s.glow);
    if (skinBadge) {
      skinBadge.textContent = 'ChantCast';
      skinBadge.title = s.name + ' skin — click to change';
    }
  }

  /* ---------- viz: spectrum bars ---------- */
  function drawBars(W, H) {
    const s = skin();

    if (!analyser || !isPlaying) {
      const barW = (W - (BAR_COUNT - 1) * BAR_GAP) / BAR_COUNT;
      for (let i = 0; i < BAR_COUNT; i++) {
        const x = i * (barW + BAR_GAP);
        ctx.fillStyle = s.dim;
        ctx.fillRect(x, H - 2, barW, 2);
      }
      return;
    }

    analyser.getByteFrequencyData(freqData);

    const barW = (W - (BAR_COUNT - 1) * BAR_GAP) / BAR_COUNT;
    const bins = freqData.length;
    const binStep = Math.floor(bins / BAR_COUNT);

    for (let i = 0; i < BAR_COUNT; i++) {
      let sum = 0;
      const start = i * binStep;
      for (let j = start; j < start + binStep && j < bins; j++) {
        sum += freqData[j];
      }
      const avg = sum / binStep;
      const barH = (avg / 255) * H * 0.9;

      const x = i * (barW + BAR_GAP);
      const y = H - barH;

      const grad = ctx.createLinearGradient(x, H, x, y);
      grad.addColorStop(0, s.bottom);
      grad.addColorStop(1, s.top);
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
        ctx.fillStyle = s.peak;
        ctx.fillRect(x, H - peaks[i] - 2, barW, 2);
      }
    }
  }

  /* ---------- viz: oscilloscope ---------- */
  function drawOscilloscope(W, H) {
    const s = skin();

    if (!analyser || !isPlaying) {
      // idle: flat line at center
      ctx.strokeStyle = s.dim;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, H / 2);
      ctx.lineTo(W, H / 2);
      ctx.stroke();
      return;
    }

    analyser.getByteTimeDomainData(timeData);

    // glow layer
    ctx.shadowColor = s.glow;
    ctx.shadowBlur = 8;
    ctx.strokeStyle = s.top;
    ctx.lineWidth = 2;
    ctx.beginPath();

    const sliceW = W / timeData.length;
    for (let i = 0; i < timeData.length; i++) {
      const v = timeData[i] / 128.0;
      const y = (v * H) / 2;
      if (i === 0) ctx.moveTo(0, y);
      else ctx.lineTo(i * sliceW, y);
    }
    ctx.stroke();

    // brighter core line
    ctx.shadowBlur = 0;
    ctx.strokeStyle = s.peak;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i < timeData.length; i++) {
      const v = timeData[i] / 128.0;
      const y = (v * H) / 2;
      if (i === 0) ctx.moveTo(0, y);
      else ctx.lineTo(i * sliceW, y);
    }
    ctx.stroke();
  }

  /* ---------- viz: scatter / particles ---------- */
  function drawScatter(W, H) {
    const s = skin();

    if (!analyser || !isPlaying) {
      // idle: a few dim dots
      for (let i = 0; i < 5; i++) {
        ctx.fillStyle = s.dim;
        const x = (W / 6) * (i + 1);
        ctx.beginPath();
        ctx.arc(x, H / 2, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
      return;
    }

    analyser.getByteFrequencyData(freqData);

    // compute overall energy
    let energy = 0;
    for (let i = 0; i < freqData.length; i++) energy += freqData[i];
    energy /= freqData.length * 255;

    // spawn new particles based on energy
    const spawnCount = Math.floor(energy * 6);
    for (let i = 0; i < spawnCount; i++) {
      // pick a random frequency bin for color intensity
      const bin = Math.floor(Math.random() * freqData.length);
      const intensity = freqData[bin] / 255;
      particles.push({
        x: Math.random() * W,
        y: H,
        vx: (Math.random() - 0.5) * 2,
        vy: -(1 + Math.random() * 3 + energy * 4),
        life: 1.0,
        decay: 0.01 + Math.random() * 0.02,
        size: 1 + intensity * 3,
        intensity: intensity,
      });
    }

    // update and draw particles
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.05; // gentle gravity
      p.life -= p.decay;

      if (p.life <= 0 || p.y < -10 || p.y > H + 10) {
        particles.splice(i, 1);
        continue;
      }

      const alpha = p.life * p.intensity;
      ctx.shadowColor = s.glow;
      ctx.shadowBlur = 4;

      // interpolate between bottom and top color based on height
      ctx.fillStyle = `rgba(${hexToRgb(s.top)}, ${alpha})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.shadowBlur = 0;

    // cap particle count
    if (particles.length > 300) {
      particles = particles.slice(-200);
    }
  }

  /* ---------- hex to rgb helper ---------- */
  function hexToRgb(hex) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `${r}, ${g}, ${b}`;
  }

  /* ---------- main draw loop ---------- */
  function drawViz() {
    const rect = vizCanvas.getBoundingClientRect();
    const W = rect.width;
    const H = rect.height;
    ctx.clearRect(0, 0, W, H);

    // dark background
    ctx.fillStyle = '#0A0806';
    ctx.fillRect(0, 0, W, H);

    const mode = VIZ_MODES[vizModeIdx];
    if (mode === 'bars') drawBars(W, H);
    else if (mode === 'oscilloscope') drawOscilloscope(W, H);
    else if (mode === 'scatter') drawScatter(W, H);

    // subtle scan line overlay
    ctx.fillStyle = 'rgba(0,0,0,0.08)';
    for (let y = 0; y < H; y += 3) {
      ctx.fillRect(0, y, W, 1);
    }

    if (isPlaying) vizRAF = requestAnimationFrame(drawViz);
  }

  /* ---------- viz click to cycle ---------- */
  vizCanvas.style.cursor = 'pointer';
  vizCanvas.title = 'Click to change visualization';
  vizCanvas.addEventListener('click', function () {
    vizModeIdx = (vizModeIdx + 1) % VIZ_MODES.length;
    // reset state for clean transition
    peaks.fill(0);
    peakDecay.fill(0);
    particles = [];
    if (!isPlaying) drawViz();
  });

  /* ---------- skin click to cycle ---------- */
  if (skinBadge) {
    skinBadge.style.cursor = 'pointer';
    skinBadge.addEventListener('click', function () {
      skinIdx = (skinIdx + 1) % SKINS.length;
      applySkin();
      renderPlaylist();
      if (!isPlaying) drawViz();
    });
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
    marquee.textContent = text;
    marquee.style.animation = 'none';
    marquee.offsetHeight; // reflow
    marquee.style.animation = '';
  }

  function setIdleMarquee() {
    setMarquee('WynnAmp v2.7.3 — ChantCast Edition — Select a track to begin...');
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

    try { initAudioContext(); } catch(e) { /* ok */ }
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();

    audio.play().then(() => {
      isPlaying = true;
      updateButtons();
      drawViz();
    }).catch(() => {
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
    vizCanvas.logicalW = rect.width;
    vizCanvas.logicalH = rect.height;
  }

  const origDrawViz = drawViz;

  window.addEventListener('resize', sizeCanvas);
  sizeCanvas();

  /* ---------- init ---------- */
  applySkin();
  renderPlaylist();
  setIdleMarquee();
  updateButtons();
  drawViz();

})();
