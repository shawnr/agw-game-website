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
      artist: 'Nobody and the NeckRomancers',
      src: 'assets/music/if-it-dont-bite_final.mp3',
    },
    {
      id: 'flow_state',
      title: 'Flow State',
      artist: 'The Riddle of Synth',
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
      // UI colors, contrast-matched to Amber (text 7.9:1, playlist 6.8:1,
      // numbers 5.4:1, borders 3.3:1 on the player's panels)
      uiText: '#C9A23A',
      uiMuted: '#B8973A',
      uiDim: '#A08540',
      uiEdge: '#7A6228',
      uiLine: '#2A2010',
      uiLineStrong: '#3A3020',
      accentText: '#D4A017',
      badge: '#D4A017',
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
      uiText: '#C78FFF',
      uiMuted: '#BF7EFF',
      uiDim: '#B062FF',
      uiEdge: '#8B2FE4',
      uiLine: '#32183F',
      uiLineStrong: '#471D67',
      accentText: '#CC77FF',
      badge: '#CC77FF',
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
      uiText: '#31BF50',
      uiMuted: '#2FB24A',
      uiDim: '#2B9C41',
      uiEdge: '#257431',
      uiLine: '#182711',
      uiLineStrong: '#1B3919',
      accentText: '#33CC55',
      badge: '#33CC55',
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
      uiText: '#64AAFF',
      uiMuted: '#4B9DFF',
      uiDim: '#3F8AE4',
      uiEdge: '#3367A5',
      uiLine: '#1B242C',
      uiLineStrong: '#213449',
      accentText: '#4499FF',
      badge: '#4499FF',
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
  const liveRegion     = root.querySelector('.wa-live');

  function announce(text) {
    if (liveRegion) liveRegion.textContent = text;
  }

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
    // Every interface color follows the skin, not just the accent
    root.style.setProperty('--wa-text', s.uiText);
    root.style.setProperty('--wa-muted', s.uiMuted);
    root.style.setProperty('--wa-dim', s.uiDim);
    root.style.setProperty('--wa-edge', s.uiEdge);
    root.style.setProperty('--wa-line', s.uiLine);
    root.style.setProperty('--wa-line-strong', s.uiLineStrong);
    root.style.setProperty('--wa-accent-text', s.accentText);
    root.style.setProperty('--wa-badge', s.badge);
    if (skinBadge) {
      skinBadge.textContent = 'ChantCast';
      skinBadge.title = s.name + ' skin. Click to change.';
      skinBadge.setAttribute('aria-label', 'Player skin: ' + s.name + '. Change skin');
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
  function cycleViz() {
    vizModeIdx = (vizModeIdx + 1) % VIZ_MODES.length;
    // reset state for clean transition
    peaks.fill(0);
    peakDecay.fill(0);
    particles = [];
    if (!isPlaying) drawViz();
    announce('Visualization: ' + VIZ_MODES[vizModeIdx]);
  }
  vizCanvas.addEventListener('click', cycleViz);
  vizCanvas.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); cycleViz(); }
  });

  /* ---------- skin click to cycle ---------- */
  if (skinBadge) {
    skinBadge.style.cursor = 'pointer';
    skinBadge.addEventListener('click', function () {
      skinIdx = (skinIdx + 1) % SKINS.length;
      applySkin();
      renderPlaylist();
      if (!isPlaying) drawViz();
      announce('Player skin: ' + skin().name);
    });
  }

  /* ---------- playlist rendering ---------- */
  function renderPlaylist() {
    playlist.innerHTML = '';
    TRACKS.forEach((t, i) => {
      const li = document.createElement('li');
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'wa-track' + (i === currentIdx ? ' wa-active' : '');
      if (i === currentIdx) btn.setAttribute('aria-current', 'true');
      btn.setAttribute('aria-label', `Play ${t.title} by ${t.artist}`);
      btn.innerHTML = `<span class="wa-track-num">${i + 1}.</span> ` +
        `<span class="wa-track-artist">${t.artist}</span> — ` +
        `<span class="wa-track-title">${t.title}</span>`;
      btn.addEventListener('click', () => loadAndPlay(i));
      li.appendChild(btn);
      playlist.appendChild(li);
    });
  }

  /* ---------- marquee ---------- */
  function setMarquee(text, idle) {
    marquee.classList.toggle('wa-idle', !!idle);
    marquee.textContent = text;
    marquee.style.animation = 'none';
    marquee.offsetHeight; // reflow
    marquee.style.animation = '';
  }

  function setIdleMarquee() {
    setMarquee('WynnAmp v2.7.3 — ChantCast Edition. Select a track to begin...', true);
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
    announce(`Now playing: ${track.title} by ${track.artist}`);

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
      announce('Paused');
    }
  }

  function stop() {
    audio.pause();
    audio.currentTime = 0;
    isPlaying = false;
    statusMode.textContent = 'STOPPED';
    updateButtons();
    announce('Stopped');
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
    // Keep keyboard focus on the transport when Play and Pause swap places
    const hadFocus = document.activeElement === btnPlay || document.activeElement === btnPause;
    btnPlay.classList.toggle('wa-hidden', isPlaying);
    btnPause.classList.toggle('wa-hidden', !isPlaying);
    if (hadFocus) (isPlaying ? btnPause : btnPlay).focus();
  }

  /* ---------- seek bar ---------- */
  function updateSeek() {
    if (!audio.duration) return;
    const pct = (audio.currentTime / audio.duration) * 100;
    seekFill.style.width = pct + '%';
    seekThumb.style.left = pct + '%';
    timeEl.textContent = fmt(audio.currentTime);
    durationEl.textContent = fmt(audio.duration);
    seekBar.setAttribute('aria-valuenow', Math.round(pct));
    seekBar.setAttribute('aria-valuetext', fmt(audio.currentTime) + ' of ' + fmt(audio.duration));
  }

  // Keyboard: arrows step 5 seconds, Page Up/Down 30, Home/End jump
  seekBar.addEventListener('keydown', (e) => {
    if (!audio.duration) return;
    const steps = { ArrowRight: 5, ArrowUp: 5, ArrowLeft: -5, ArrowDown: -5, PageUp: 30, PageDown: -30 };
    let t = null;
    if (e.key in steps) t = audio.currentTime + steps[e.key];
    else if (e.key === 'Home') t = 0;
    else if (e.key === 'End') t = audio.duration - 0.5;
    if (t === null) return;
    e.preventDefault();
    audio.currentTime = Math.max(0, Math.min(audio.duration, t));
    updateSeek();
  });

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
    setVolume(pct);
  }

  function setVolume(pct) {
    audio.volume = pct;
    volFill.style.width = (pct * 100) + '%';
    volSlider.setAttribute('aria-valuenow', Math.round(pct * 100));
    volSlider.setAttribute('aria-valuetext', Math.round(pct * 100) + '%');
  }

  // Keyboard: arrows step 5%, Page Up/Down 20%, Home/End mute/full
  volSlider.addEventListener('keydown', (e) => {
    const steps = { ArrowRight: 0.05, ArrowUp: 0.05, ArrowLeft: -0.05, ArrowDown: -0.05, PageUp: 0.2, PageDown: -0.2 };
    let v = null;
    if (e.key in steps) v = audio.volume + steps[e.key];
    else if (e.key === 'Home') v = 0;
    else if (e.key === 'End') v = 1;
    if (v === null) return;
    e.preventDefault();
    setVolume(Math.max(0, Math.min(1, v)));
  });
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
