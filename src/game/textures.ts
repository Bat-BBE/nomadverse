import * as THREE from 'three';

// Small canvas-generated textures with Mongolian ornament motifs (алхан хээ
// meander, түмэн өлзий-style knot, circles), so the demo ships no image assets.

const cache = new Map<string, THREE.CanvasTexture>();

function make(key: string, w: number, h: number, draw: (g: CanvasRenderingContext2D) => void) {
  const hit = cache.get(key);
  if (hit) return hit;
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  const g = cv.getContext('2d')!;
  draw(g);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  cache.set(key, t);
  return t;
}

/** Repeating meander (алхан хээ) along a horizontal strip. */
function meander(g: CanvasRenderingContext2D, x0: number, y0: number, w: number, h: number, color: string) {
  const u = h / 5;
  g.strokeStyle = color;
  g.lineWidth = u * 0.9;
  g.lineCap = 'square';
  g.beginPath();
  for (let x = x0; x < x0 + w; x += u * 6) {
    g.moveTo(x, y0 + h - u);
    g.lineTo(x, y0 + u);
    g.lineTo(x + u * 4, y0 + u);
    g.lineTo(x + u * 4, y0 + h - u * 2);
    g.lineTo(x + u * 2, y0 + h - u * 2);
    g.lineTo(x + u * 2, y0 + u * 3);
    g.moveTo(x, y0 + h - u);
    g.lineTo(x + u * 6, y0 + h - u);
  }
  g.stroke();
}

/** Endless-knot inspired lattice in a square. */
function knot(g: CanvasRenderingContext2D, cx: number, cy: number, s: number, color: string) {
  g.save();
  g.translate(cx, cy);
  g.rotate(Math.PI / 4);
  g.strokeStyle = color;
  g.lineWidth = s * 0.06;
  const n = 3;
  const step = s / n;
  for (let i = 0; i <= n; i++) {
    const p = -s / 2 + i * step;
    g.beginPath();
    g.moveTo(-s / 2, p);
    g.lineTo(s / 2, p);
    g.moveTo(p, -s / 2);
    g.lineTo(p, s / 2);
    g.stroke();
  }
  // loops on the corners
  for (const [x, y] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
    g.beginPath();
    g.arc((x * s) / 2, (y * s) / 2, step / 2, 0, Math.PI * 2);
    g.stroke();
  }
  g.restore();
}

function noise(g: CanvasRenderingContext2D, w: number, h: number, alpha: number, n = 4000) {
  for (let i = 0; i < n; i++) {
    g.fillStyle = Math.random() < 0.5 ? `rgba(0,0,0,${alpha})` : `rgba(255,255,255,${alpha})`;
    g.fillRect(Math.random() * w, Math.random() * h, 2, 2);
  }
}

export function feltTexture() {
  return make('felt', 512, 128, (g) => {
    g.fillStyle = '#ece5d6';
    g.fillRect(0, 0, 512, 128);
    noise(g, 512, 128, 0.04, 9000);
    // weathering: dust rising from the ground, faint vertical folds
    const grd = g.createLinearGradient(0, 128, 0, 50);
    grd.addColorStop(0, 'rgba(120,100,70,0.35)');
    grd.addColorStop(1, 'rgba(120,100,70,0)');
    g.fillStyle = grd;
    g.fillRect(0, 50, 512, 78);
    for (let x = 0; x < 512; x += 21 + Math.random() * 20) {
      g.fillStyle = `rgba(90,80,60,${0.04 + Math.random() * 0.05})`;
      g.fillRect(x, 0, 3 + Math.random() * 5, 128);
    }
  });
}

export function roofTexture() {
  return make('roof', 512, 256, (g) => {
    g.fillStyle = '#efe8da';
    g.fillRect(0, 0, 512, 256);
    noise(g, 512, 256, 0.035, 9000);
    // blue ornamental band along the eave (bottom of the cone)
    g.fillStyle = '#2b5a93';
    g.fillRect(0, 214, 512, 30);
    meander(g, 0, 218, 512, 22, '#e9dfc9');
    g.fillStyle = '#e9dfc9';
    g.fillRect(0, 244, 512, 12);
    // radial seam lines appear as vertical stripes on a cone UV
    g.strokeStyle = 'rgba(120,100,80,0.18)';
    g.lineWidth = 2;
    for (let x = 0; x < 512; x += 32) {
      g.beginPath();
      g.moveTo(x, 0);
      g.lineTo(x, 256);
      g.stroke();
    }
  });
}

export function doorTexture() {
  return make('door', 256, 384, (g) => {
    g.fillStyle = '#d2581c';
    g.fillRect(0, 0, 256, 384);
    g.strokeStyle = '#f2c14e';
    g.lineWidth = 8;
    g.strokeRect(14, 14, 228, 356);
    meander(g, 26, 28, 204, 34, '#2e5e96');
    meander(g, 26, 322, 204, 34, '#2e5e96');
    knot(g, 128, 150, 110, '#f2c14e');
    g.fillStyle = '#2e5e96';
    g.beginPath();
    g.arc(128, 260, 22, 0, Math.PI * 2);
    g.fill();
  });
}

export function carpetTexture() {
  return make('carpet', 512, 512, (g) => {
    g.fillStyle = '#7e2620';
    g.fillRect(0, 0, 512, 512);
    noise(g, 512, 512, 0.04, 8000);
    g.strokeStyle = '#c99a45';
    g.lineWidth = 6;
    g.beginPath();
    g.arc(256, 256, 236, 0, Math.PI * 2);
    g.stroke();
    g.beginPath();
    g.arc(256, 256, 200, 0, Math.PI * 2);
    g.stroke();
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      knot(g, 256 + Math.cos(a) * 218, 256 + Math.sin(a) * 218, 22, '#1f3f72');
    }
    knot(g, 256, 256, 150, '#e8b04a');
  });
}

export function chestTexture() {
  return make('chest', 512, 256, (g) => {
    g.fillStyle = '#b8461c';
    g.fillRect(0, 0, 512, 256);
    g.strokeStyle = '#f0c45a';
    g.lineWidth = 6;
    g.strokeRect(10, 10, 492, 236);
    knot(g, 128, 128, 120, '#f0c45a');
    knot(g, 384, 128, 120, '#f0c45a');
    g.fillStyle = '#244f86';
    g.beginPath();
    g.arc(256, 128, 34, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = '#f0c45a';
    g.beginPath();
    g.arc(256, 128, 22, 0, Math.PI * 2);
    g.stroke();
  });
}

export function columnTexture() {
  return make('column', 64, 512, (g) => {
    g.fillStyle = '#c9541f';
    g.fillRect(0, 0, 64, 512);
    const bands = [40, 250, 470];
    for (const y of bands) {
      g.fillStyle = '#2b5c94';
      g.fillRect(0, y - 14, 64, 28);
      g.fillStyle = '#e9b84a';
      g.fillRect(0, y - 18, 64, 4);
      g.fillRect(0, y + 14, 64, 4);
    }
    g.strokeStyle = '#e9b84a';
    g.lineWidth = 3;
    for (let y = 80; y < 230; y += 30) {
      g.beginPath();
      g.arc(32, y, 10, 0, Math.PI * 2);
      g.stroke();
    }
  });
}

export function wallClothTexture() {
  return make('wallcloth', 1024, 128, (g) => {
    g.fillStyle = '#efe4cf';
    g.fillRect(0, 0, 1024, 128);
    noise(g, 1024, 128, 0.03, 5000);
    g.fillStyle = '#9c2a22';
    g.fillRect(0, 104, 1024, 24);
    meander(g, 0, 106, 1024, 20, '#e8b04a');
  });
}

/** Weathered granite with orange/grey lichen patches (also used as a bump map). */
export function stoneTexture() {
  return make('stone', 256, 256, (g) => {
    g.fillStyle = '#9a958a';
    g.fillRect(0, 0, 256, 256);
    noise(g, 256, 256, 0.12, 14000);
    for (let i = 0; i < 40; i++) {
      const x = Math.random() * 256;
      const y = Math.random() * 256;
      const r = 4 + Math.random() * 14;
      g.fillStyle = Math.random() < 0.5 ? 'rgba(196,140,60,0.45)' : 'rgba(200,205,190,0.4)';
      g.beginPath();
      g.arc(x, y, r, 0, Math.PI * 2);
      g.fill();
    }
    g.strokeStyle = 'rgba(40,36,30,0.35)';
    g.lineWidth = 1.5;
    for (let i = 0; i < 6; i++) {
      g.beginPath();
      g.moveTo(Math.random() * 256, Math.random() * 256);
      for (let k = 0; k < 4; k++) g.lineTo(Math.random() * 256, Math.random() * 256);
      g.stroke();
    }
  });
}
