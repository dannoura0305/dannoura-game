// 境界侵食 P13：node の中で区画の組み立てを動かすための最小のブラウザの代わり（キャンバスは何も描かない・大きさだけ）。
import { register } from 'node:module';
register(new URL('./loader.mjs', import.meta.url));
const noop = () => {};
function ctx2d(canvas) {
  const grad = { addColorStop: noop };
  const base = {
    canvas, font: '10px sans-serif', measureText: t => ({ width: String(t).length * (parseFloat(/(\d+)px/.exec(base.font)?.[1]) || 10) * 0.9, actualBoundingBoxAscent: 8, actualBoundingBoxDescent: 2 }),
    createLinearGradient: () => grad, createRadialGradient: () => grad, createConicGradient: () => grad, createPattern: () => ({}),
    getImageData: (x, y, w, h) => ({ width: w, height: h, data: new Uint8ClampedArray(Math.max(1, w * h * 4)) }),
    createImageData: (w, h) => ({ width: w, height: h, data: new Uint8ClampedArray(Math.max(1, w * h * 4)) }),
    getTransform: () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }), isPointInPath: () => false, getLineDash: () => [],
  };
  return new Proxy(base, { get: (o, k) => (k in o ? o[k] : noop), set: (o, k, v) => { o[k] = v; return true; } });
}
class FakeCanvas { constructor() { this.width = 300; this.height = 150; this.style = {}; } getContext() { return this._g || (this._g = ctx2d(this)); } toDataURL() { return 'data:,'; } addEventListener() {} }
const el = () => ({ style: {}, classList: { add: noop, remove: noop, toggle: noop, contains: () => false }, appendChild: noop, addEventListener: noop, setAttribute: noop, querySelector: () => null });
globalThis.document = globalThis.document || { createElement: t => (t === 'canvas' ? new FakeCanvas() : el()), createElementNS: (ns, t) => (t === 'canvas' ? new FakeCanvas() : el()), getElementById: () => null, querySelector: () => null, body: el(), documentElement: el(), addEventListener: noop };
globalThis.window = globalThis.window || globalThis;
globalThis.self = globalThis.self || globalThis;
globalThis.OffscreenCanvas = globalThis.OffscreenCanvas || FakeCanvas;
globalThis.HTMLCanvasElement = globalThis.HTMLCanvasElement || FakeCanvas;
globalThis.ImageData = globalThis.ImageData || class { constructor(d, w, h) { this.data = d; this.width = w; this.height = h; } };
globalThis.requestAnimationFrame = globalThis.requestAnimationFrame || (f => setTimeout(f, 16));
globalThis.matchMedia = globalThis.matchMedia || (() => ({ matches: false, addEventListener: noop }));
globalThis.localStorage = globalThis.localStorage || { getItem: () => null, setItem: noop, removeItem: noop };
globalThis.location = globalThis.location || { search: '', href: 'http://localhost/shinshoku.html' };
if (!globalThis.navigator || !globalThis.navigator.userAgent) try { Object.defineProperty(globalThis, 'navigator', { value: { userAgent: 'node', hardwareConcurrency: 4, maxTouchPoints: 0 }, configurable: true }); } catch {}
