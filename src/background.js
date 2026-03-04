/**
 * AG&W Background — Mana Stream Portal
 * Ethereal energy streams flying past like a portal to a fantasy realm.
 */
(function () {
  const canvas = document.getElementById('bg-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let w, h, time = 0;

  function resize() {
    w = canvas.width = window.innerWidth;
    h = canvas.height = window.innerHeight;
  }
  window.addEventListener('resize', resize);
  resize();

  // Mana energy colors — each type has a palette
  const MANA_TYPES = [
    { name: 'arcana',  hue: 275, sat: 85, lit: 60, glow: 'rgba(153, 51, 255, ' },   // purple
    { name: 'fire',    hue: 15,  sat: 90, lit: 55, glow: 'rgba(255, 68, 68, ' },     // red-orange
    { name: 'water',   hue: 215, sat: 85, lit: 60, glow: 'rgba(68, 136, 255, ' },    // blue
    { name: 'earth',   hue: 135, sat: 70, lit: 50, glow: 'rgba(68, 221, 68, ' },     // green
    { name: 'gas',     hue: 75,  sat: 75, lit: 55, glow: 'rgba(170, 221, 68, ' },    // yellow-green
    { name: 'gold',    hue: 42,  sat: 85, lit: 55, glow: 'rgba(212, 160, 23, ' },    // amber/gold
  ];

  // --- Mana Stream class — long fluid ribbons flying through space ---
  const STREAM_COUNT = 18;
  const streams = [];

  class ManaStream {
    constructor() {
      this.reset(true);
    }

    reset(initial) {
      const mana = MANA_TYPES[Math.floor(Math.random() * MANA_TYPES.length)];
      this.hue = mana.hue;
      this.sat = mana.sat;
      this.lit = mana.lit;
      this.glow = mana.glow;

      // Streams come from random edges or depth
      this.z = initial ? Math.random() * 1.0 : 0;  // 0 = far, 1 = near
      this.speed = 0.003 + Math.random() * 0.005;

      // Origin point in normalized space (-1 to 1)
      this.ox = (Math.random() - 0.5) * 2.5;
      this.oy = (Math.random() - 0.5) * 2.5;

      // Slight drift
      this.drift = (Math.random() - 0.5) * 0.0003;
      this.driftY = (Math.random() - 0.5) * 0.0003;

      // Wave properties for fluid motion
      this.waveAmp = 0.02 + Math.random() * 0.06;
      this.waveFreq = 1.5 + Math.random() * 3;
      this.wavePhase = Math.random() * Math.PI * 2;

      // Trail length and width
      this.trailLen = 25 + Math.floor(Math.random() * 35);
      this.baseWidth = 1 + Math.random() * 2.5;

      // Brightness pulse
      this.pulseSpeed = 0.5 + Math.random() * 2;
      this.pulsePhase = Math.random() * Math.PI * 2;

      // Store trail history
      this.trail = [];
    }

    update() {
      this.z += this.speed;
      this.ox += this.drift;
      this.oy += this.driftY;
      this.wavePhase += 0.02;

      if (this.z > 1.3) {
        this.reset(false);
        return;
      }

      // Project from 3D-ish space to screen
      const perspective = 0.1 + this.z * this.z * 0.9;
      const wave = Math.sin(this.z * this.waveFreq * Math.PI + this.wavePhase) * this.waveAmp;
      const waveY = Math.cos(this.z * this.waveFreq * 0.7 * Math.PI + this.wavePhase * 1.3) * this.waveAmp * 0.6;

      const sx = w / 2 + (this.ox + wave) * w * perspective;
      const sy = h / 2 + (this.oy + waveY) * h * perspective;

      this.trail.unshift({ x: sx, y: sy, z: this.z });
      if (this.trail.length > this.trailLen) this.trail.pop();
    }

    draw() {
      if (this.trail.length < 3) return;

      const pulse = 0.6 + 0.4 * Math.sin(time * this.pulseSpeed + this.pulsePhase);

      // Draw the stream as a series of segments with varying width and opacity
      for (let i = 0; i < this.trail.length - 1; i++) {
        const t = i / this.trail.length; // 0 = head, 1 = tail
        const p = this.trail[i];
        const p2 = this.trail[i + 1];

        // Width increases as stream gets closer (higher z), tapers at tail
        const zScale = 0.2 + p.z * p.z * 0.8;
        const taper = Math.sin((1 - t) * Math.PI); // smooth taper at both ends
        const lineW = this.baseWidth * zScale * taper;
        if (lineW < 0.1) continue;

        // Alpha: brighter at head, fades at tail, pulsing
        const headFade = Math.min(1, (1 - t) * 3);
        const alpha = Math.min(0.8, 0.15 + zScale * 0.5 * headFade * pulse * taper);
        if (alpha < 0.01) continue;

        // Core line
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.strokeStyle = `hsla(${this.hue}, ${this.sat}%, ${this.lit}%, ${alpha})`;
        ctx.lineWidth = lineW;
        ctx.lineCap = 'round';
        ctx.stroke();

        // Outer glow
        if (lineW > 0.5) {
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.strokeStyle = `hsla(${this.hue}, ${this.sat}%, ${this.lit + 15}%, ${alpha * 0.25})`;
          ctx.lineWidth = lineW * 3.5;
          ctx.lineCap = 'round';
          ctx.stroke();
        }
      }

      // Bright head orb
      if (this.trail.length > 0 && this.z > 0.05 && this.z < 1.15) {
        const head = this.trail[0];
        const zScale = 0.2 + head.z * head.z * 0.8;
        const orbR = this.baseWidth * zScale * 1.5;
        const orbAlpha = Math.min(0.9, 0.3 + zScale * 0.5 * pulse);

        // Soft glow
        const grad = ctx.createRadialGradient(head.x, head.y, 0, head.x, head.y, orbR * 5);
        grad.addColorStop(0, `hsla(${this.hue}, ${this.sat}%, ${this.lit + 20}%, ${orbAlpha * 0.5})`);
        grad.addColorStop(0.3, `hsla(${this.hue}, ${this.sat}%, ${this.lit}%, ${orbAlpha * 0.2})`);
        grad.addColorStop(1, `hsla(${this.hue}, ${this.sat}%, ${this.lit}%, 0)`);
        ctx.beginPath();
        ctx.arc(head.x, head.y, orbR * 5, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();

        // Bright core
        ctx.beginPath();
        ctx.arc(head.x, head.y, orbR * 0.8, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${this.hue}, 40%, 90%, ${orbAlpha * 0.8})`;
        ctx.fill();
      }
    }
  }

  for (let i = 0; i < STREAM_COUNT; i++) streams.push(new ManaStream());

  // --- Ambient sparkle dust (tiny background particles) ---
  const DUST_COUNT = 60;
  const dust = [];

  class Dust {
    constructor() { this.reset(); }
    reset() {
      this.x = Math.random() * w;
      this.y = Math.random() * h;
      this.radius = Math.random() * 1.2 + 0.3;
      this.alpha = Math.random() * 0.3 + 0.05;
      this.hue = MANA_TYPES[Math.floor(Math.random() * MANA_TYPES.length)].hue;
      this.pulseSpeed = 0.3 + Math.random() * 1.5;
      this.pulsePhase = Math.random() * Math.PI * 2;
      this.vx = (Math.random() - 0.5) * 0.15;
      this.vy = (Math.random() - 0.5) * 0.15;
    }
    update() {
      this.x += this.vx;
      this.y += this.vy;
      if (this.x < -5 || this.x > w + 5 || this.y < -5 || this.y > h + 5) this.reset();
    }
    draw() {
      const a = this.alpha * (0.4 + 0.6 * Math.sin(time * this.pulseSpeed + this.pulsePhase));
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${this.hue}, 70%, 70%, ${a})`;
      ctx.fill();
    }
  }

  for (let i = 0; i < DUST_COUNT; i++) dust.push(new Dust());

  // --- Subtle vortex center (very faint radial glow) ---
  function drawVortex() {
    const cx = w / 2;
    const cy = h * 0.4;
    const pulse = 0.5 + 0.5 * Math.sin(time * 0.3);
    const radius = Math.min(w, h) * 0.5;

    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
    grad.addColorStop(0, `rgba(153, 51, 255, ${0.03 + 0.015 * pulse})`);
    grad.addColorStop(0.3, `rgba(212, 160, 23, ${0.01 + 0.008 * pulse})`);
    grad.addColorStop(0.7, 'rgba(153, 51, 255, 0.005)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();
  }

  // --- Faint arcane circle (kept subtle) ---
  function drawArcaneCircle() {
    const cx = w / 2;
    const cy = h * 0.36;
    const radius = Math.min(w, h) * 0.15;
    const alpha = 0.02 + 0.01 * Math.sin(time * 0.5);

    ctx.save();
    ctx.strokeStyle = `rgba(212, 160, 23, ${alpha})`;
    ctx.lineWidth = 0.6;

    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx, cy, radius * 0.85, 0, Math.PI * 2);
    ctx.stroke();

    // Slowly rotating pentacle
    ctx.beginPath();
    const pts = [];
    for (let i = 0; i < 5; i++) {
      const angle = (Math.PI * 2 / 5) * i - Math.PI / 2 + time * 0.04;
      pts.push({
        x: cx + radius * 0.78 * Math.cos(angle),
        y: cy + radius * 0.78 * Math.sin(angle)
      });
    }
    // Star pattern
    ctx.strokeStyle = `rgba(153, 51, 255, ${alpha})`;
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      ctx.moveTo(pts[i].x, pts[i].y);
      ctx.lineTo(pts[(i + 2) % 5].x, pts[(i + 2) % 5].y);
      ctx.stroke();
    }
    ctx.restore();
  }

  function animate() {
    time += 0.016;
    ctx.clearRect(0, 0, w, h);

    // Background layers
    drawVortex();
    drawArcaneCircle();

    // Dust (behind streams)
    for (const d of dust) {
      d.update();
      d.draw();
    }

    // Mana streams
    for (const s of streams) {
      s.update();
      s.draw();
    }

    requestAnimationFrame(animate);
  }

  animate();

  // Intersection Observer for fade-in animations
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
        }
      });
    },
    { threshold: 0.15 }
  );

  document.querySelectorAll('.section').forEach((el) => {
    el.classList.add('fade-in');
    observer.observe(el);
  });
})();
