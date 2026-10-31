// Painterly pond hero engine. Copied from the pond-water.html prototype
// (kept outside the repo); keep createPondWater in sync with it when tuning.
/**
 * Painterly pond hero — WebGL2.
 *
 *  The camera looks across a large pond at an angle (a zoomed-in view), so
 *  everything on the water is foreshortened: circles read as ellipses and
 *  waves bunch up toward the far edge.
 *
 *  Waves (analytic, so they're smooth at any resolution):
 *   • a long swell from one distant source off camera, rolling across in
 *     slowly beating groups;
 *   • gusty wind ripples from a different direction.
 *
 *  Colour (Fresnel): facets turned away from you mirror a turquoise sky with
 *  soft clouds; facets facing you show the pond's greens, lit to yellow-green
 *  and cream where they catch the light.
 *
 *  Passes per frame (optimized):
 *   1. Stroke cache (tiny): for every brush cell on screen, work out the dab's
 *      colour, angle and drift once, into a small atlas (~25k cells).
 *   2. Water (half resolution): the underpainting colour, Fresnel mix, glint
 *      and caustics — mostly hidden under dabs, so half-res is plenty.
 *   3. Paint (full-res): three layers of dabs read from the cache over the
 *      upsampled water, brushed highlights, lilies and canvas grain.
 *  Unoptimized, every pixel evaluated the water ~10× (once per dab that might
 *  cover it). That path is kept so the benchmark can compare.
 *
 *  Quality profiles: Full (desktop), Lite (phones: 1× resolution, 24 fps, no
 *  finest brush layer), Still (one frame). Auto picks by device and steps
 *  down — resolution, then Lite, then Still — if frames run over budget.
 *
 *  createPondWater(canvas, options) → { state, stats, benchmark, redraw, destroy } | null
 */
export function createPondWater(canvas, options = {}) {
  const gl = canvas.getContext('webgl2', {
    alpha: false, antialias: false, depth: false, stencil: false,
    premultipliedAlpha: false, powerPreference: 'high-performance',
  });
  if (!gl) return null;

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const touchDevice = window.matchMedia('(hover: none) and (pointer: coarse)').matches;

  const state = Object.assign({
    speed: 1,                       // time multiplier
    swell: 1,                       // long waves from the distant source
    waveDir: 43,                    // bearing the swell comes from (0 = far side, 90 = right, 180 = behind you)
    waveDist: 12,                   // distance to the swell's source, in screen heights
    wind: 1,                        // gusty ripples
    windDir: 256,                   // bearing the wind blows from
    view: 63,                       // degrees from straight down at screen centre
    sky: 1,                         // reflection strength
    paint: 1,                       // 0 = raw water render, 1 = Monet brushwork
    lines: 0.35,                    // brushed highlight strength
    brush: 1,                       // stroke size multiplier
    flowers: 1,                     // lily density multiplier
    paused: false,
    time: 30.0,
    profile: 'auto',                // 'auto' | 'full' | 'lite' | 'still'
    mobileProfile: 'lite',          // what 'auto' uses on phones/tablets ('lite' or 'still')
    optimize: true,                 // stroke cache + half-res water (turn off only to compare)
    adaptive: true,                 // step quality down when frames run over budget
    quietEl: null,                  // element to keep calm water behind (default: an ellipse at centre)
    quietPad: [1.35, 1.6],          // quiet-zone radii as multiples of quietEl's half-size
    lilyQuiet: 0.75,                // how strongly lilies avoid the quiet zone (>1 clears its core entirely)
    lilySpread: 1.667,              // lower = lilies keep a wider berth around it
  }, options);

  const PROFILES = {
    full:  { label: 'Full',  maxDpr: 1.25, fps: 30, fine: true,  animate: true },
    lite:  { label: 'Lite',  maxDpr: 1.0,  fps: 24, fine: false, animate: true },
    still: { label: 'Still', maxDpr: 1.25, fps: 0,  fine: true,  animate: false },
  };
  // Brush layers. Cell size is in screen units (× Brush slider).
  const LAYERS = [
    { cell: 0.050, seed: 17, density: 1.00, wind: 0.25 },
    { cell: 0.030, seed: 41, density: 0.75, wind: 0.40 },
    { cell: 0.017, seed: 73, density: 0.38, wind: 0.60 },
  ];
  const HALF_FOV_LONG = 11;         // degrees, across the screen's longer side (narrow = zoomed in)
  const NOISE_SIZE = 512;
  const DEG = Math.PI / 180;

  // ---------------------------------------------------------------- shaders
  const VS = `#version 300 es
  in vec2 aPos;
  void main() { gl_Position = vec4(aPos, 0.0, 1.0); }`;

  const COMMON = `
  uniform vec2 uBand;          // cos, sin of the brush direction (along the swell crests on screen)
  vec2 toBand(vec2 p)   { return vec2(uBand.x * p.x + uBand.y * p.y, -uBand.y * p.x + uBand.x * p.y); }
  vec2 fromBand(vec2 q) { return vec2(uBand.x * q.x - uBand.y * q.y,  uBand.y * q.x + uBand.x * q.y); }

  float hash12(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
  }
  vec4 hash42(vec2 p) {
    vec4 p4 = fract(vec4(p.xyxy) * vec4(0.1031, 0.1030, 0.0973, 0.1099));
    p4 += dot(p4, p4.wzxy + 33.33);
    return fract((p4.xxyz + p4.yzzw) * p4.zywx);
  }
  float vnoise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    float a = hash12(i), b = hash12(i + vec2(1, 0));
    float c = hash12(i + vec2(0, 1)), d = hash12(i + vec2(1, 1));
    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
  }`;

  // --- tileable noise, baked once: r clouds, g pond weed, b gusts, a detail ---
  const BAKE_FS = COMMON + `
  uniform float uSize;
  out vec4 outColor;
  float pnoise(vec2 p, float P) {
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    float a = hash12(mod(i, P)), b = hash12(mod(i + vec2(1, 0), P));
    float c = hash12(mod(i + vec2(0, 1), P)), d = hash12(mod(i + vec2(1, 1), P));
    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
  }
  float pfbm(vec2 uv, float P, float seed, int oct) {
    float s = 0.0, a = 0.5, n = 0.0;
    for (int i = 0; i < 6; i++) {
      if (i >= oct) break;
      s += a * pnoise(uv * P + seed * vec2(17.0, 31.0), P);
      n += a; a *= 0.5; P *= 2.0;
    }
    return s / n;
  }
  void main() {
    vec2 uv = gl_FragCoord.xy / uSize;
    vec2 w = vec2(pfbm(uv, 4.0, 5.0, 3), pfbm(uv, 4.0, 9.0, 3)) - 0.5;
    outColor = vec4(
      pfbm(uv + 0.09 * w, 4.0, 1.0, 6),     // clouds
      pfbm(uv + 0.05 * w, 6.0, 2.0, 5),     // pond weed
      pfbm(uv + 0.12 * w, 3.0, 3.0, 4),     // gust patches
      pfbm(uv, 12.0, 4.0, 4));              // detail
  }`;

  // --- the water: shared by the stroke cache and the paint pass ---------------
  const WATER = `
  uniform sampler2D uNoise;
  uniform vec2  uRes;
  uniform vec2  uSpan;
  uniform float uTime;
  uniform vec3  uCam;         // camera position (water plane is z = 0)
  uniform vec3  uFwd;
  uniform vec3  uUp;
  uniform float uFocal;       // ray spread per screen unit
  uniform float uWScale;      // world → wave units
  uniform float uSTilt;       // how much the brushwork shrinks toward the far edge
  uniform float uSwell;
  uniform float uWind;
  uniform float uSky;
  uniform vec2  uQuietC;      // centre of the quiet zone behind the headline (screen units)
  uniform vec2  uQuietR;      // its radii
  uniform float uLilyQuiet;   // how strongly lilies avoid it
  uniform float uLilySpread;  // exponent on the quiet mask for lilies (<1 = wider berth)
  uniform vec2  uSrc;         // the swell's source (wave units; screen centre = origin)
  uniform vec2  uWindTo;      // unit vector the wind blows toward
  uniform vec2  uGustOff;     // how far the gust pattern has drifted downwind
  uniform float uLayerCell[3];
  uniform float uLayerSeed[3];
  uniform float uLayerDensity[3];
  uniform float uLayerWind[3];

  const vec3 SUN = vec3(-0.2981, 0.7454, 0.5963);   // seen in reflections (glints)
  const vec3 LIT = vec3(-0.4506, -0.3505, 0.8211);  // light on the water: from behind-left of the viewer

  float quietAt(vec2 p) { vec2 d = (p - uQuietC) / uQuietR; return exp(-dot(d, d)); }

  // Screen → water plane. Returns wave-space position; E = unit vector from
  // the water toward the eye (E.z = sine of the grazing angle).
  vec2 toWorld(vec2 p, out vec3 E) {
    vec3 d = normalize(uFwd + (p.x * vec3(1.0, 0.0, 0.0) + p.y * uUp) * uFocal);
    d.z = min(d.z, -0.08);                                      // never reach the horizon
    vec3 P = uCam + d * (-uCam.z / d.z);
    E = normalize(uCam - P);
    return P.xy * uWScale;
  }

  // Long swell from one distant source. xy = surface gradient, z = focusing (−∇²h).
  vec3 swell(vec2 W, float t) {
    vec2 dv = W - uSrc;
    float r = max(length(dv), 1e-4);
    vec2 dir = dv / r;
    // (wavelength, slope amplitude, phase speed, phase offset) — close
    // wavelengths from the same source beat into slow travelling groups
    vec4 C[3] = vec4[3](
      vec4(1.05, 0.20, 0.060, 0.0),
      vec4(0.80, 0.10, 0.052, 1.3),
      vec4(0.62, 0.06, 0.046, 2.6));
    vec3 acc = vec3(0.0);
    for (int i = 0; i < 3; i++) {
      float k = 6.2832 / C[i].x;
      float ph = k * (r - C[i].z * t) + C[i].w;
      acc.xy += C[i].y * cos(ph) * dir;
      acc.z  += C[i].y * k * sin(ph);
    }
    // spreading: stronger nearer the source (normalised at screen centre), calm right at the source
    float spread = min(sqrt(length(uSrc) / max(r, 0.3)), 2.5) * smoothstep(0.0, 0.25, r);
    return acc * uSwell * spread;
  }

  // Value noise with analytic first and second derivatives.
  void vnoiseD(vec2 p, out vec2 dn, out vec2 dd) {
    vec2 i = floor(p), f = fract(p);
    vec2 u   = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
    vec2 du  = 30.0 * f * f * (f * (f - 2.0) + 1.0);
    vec2 ddu = 60.0 * f * (f * (2.0 * f - 3.0) + 1.0);
    float a = hash12(i), b = hash12(i + vec2(1, 0)), c = hash12(i + vec2(0, 1)), d = hash12(i + vec2(1, 1));
    vec2 k = vec2(b - a + (a - b - c + d) * u.y, c - a + (a - b - c + d) * u.x);
    dn = du * k;
    dd = ddu * k;
  }

  // Wind ripples: irregular wavelets stretched across the wind, drifting
  // downwind, only where a gust is passing. xy = gradient, z = −∇²h.
  vec3 wind(vec2 W, float t, float far) {
    float g = textureLod(uNoise, (W - uGustOff) * 0.22 + vec2(0.37, 0.11), 0.0).b;
    float gust = mix(0.1, 1.0, smoothstep(0.45, 0.68, g)) * uWind * far;
    if (gust < 0.002) return vec3(0.0);
    vec3 acc = vec3(0.0);
    for (int o = 0; o < 2; o++) {
      float a = o == 0 ? 0.0 : 0.45;
      vec2 al = vec2(uWindTo.x * cos(a) - uWindTo.y * sin(a), uWindTo.x * sin(a) + uWindTo.y * cos(a));
      vec2 ac = vec2(-al.y, al.x);
      vec2 fr = o == 0 ? vec2(14.0, 5.0) : vec2(25.0, 9.0);
      float A = o == 0 ? 0.0026 : 0.0012;
      vec2 q = vec2(dot(W, al), dot(W, ac)) * fr - vec2(t * (o == 0 ? 0.5 : 0.7), 0.0) + float(o) * 17.3;
      vec2 dn, dd;
      vnoiseD(q, dn, dd);
      vec2 gl = dn * fr;
      acc.xy += A * (al * gl.x + ac * gl.y);
      acc.z  -= A * (dd.x * fr.x * fr.x + dd.y * fr.y * fr.y);
    }
    return acc * gust;
  }

  vec3 skyCol(vec3 R, float t, float lod, out float sun) {
    float el = max(R.z, 0.03);
    vec3 col = mix(vec3(0.42, 0.78, 0.88), vec3(0.10, 0.47, 0.74), pow(el, 0.6));     // pale turquoise → cerulean
    vec2 cuv = R.xy / (el + 0.2) * 0.16 + vec2(t * 0.0025, t * 0.0009);
    float c = textureLod(uNoise, cuv, lod).r;
    float cloud = smoothstep(0.57, 0.72, c);
    vec3 cc = mix(vec3(0.62, 0.86, 0.90), vec3(0.88, 0.96, 0.94), smoothstep(0.55, 0.72, c));
    col = mix(col, cc, cloud * 0.75);
    sun = pow(max(dot(R, SUN), 0.0), 240.0);
    return col + vec3(1.0, 0.96, 0.86) * sun * 2.0;
  }

  vec3 ramp5(float x, vec3 a, vec3 b, vec3 c, vec3 d, vec3 e) {
    x = clamp(x, 0.0, 1.0) * 4.0;
    vec3 r = mix(a, b, clamp(x, 0.0, 1.0));
    r = mix(r, c, clamp(x - 1.0, 0.0, 1.0));
    r = mix(r, d, clamp(x - 2.0, 0.0, 1.0));
    return mix(r, e, clamp(x - 3.0, 0.0, 1.0));
  }

  // Looking into the pond: deep greens, brightening to yellow-green and cream
  // on slopes that catch the light. Refraction shifts the weed pattern.
  vec3 pondCol(vec2 W, vec2 p, vec3 n, vec3 T, float t, float lod) {
    const float DEPTH = 0.1;
    vec2 off = T.xy * DEPTH / max(-T.z, 0.3);
    vec2 buv = (W + off) * vec2(0.3, 0.45) + vec2(t * 0.001, 0.0);
    vec4 nz = textureLod(uNoise, buv, lod);
    float lit = dot(n, LIT) - LIT.z;
    float tone = 0.23 + 3.0 * lit + 0.8 * (nz.g - 0.5) + 0.4 * (nz.a - 0.5) - 0.15 * quietAt(p);
    return ramp5(tone,
      vec3(0.030, 0.19, 0.080),                                 // deep forest green
      vec3(0.060, 0.32, 0.120),                                 // pond green
      vec3(0.150, 0.46, 0.180),                                 // leaf
      vec3(0.540, 0.69, 0.300),                                 // yellow-green
      vec3(0.860, 0.85, 0.600));                                // cream
  }

  // The water at screen point p, in parts.
  struct Water { vec3 sky; vec3 pond; float F; float sun; float dim; float focus; vec2 grad; float fs; };
  Water water(vec2 p, float t, float lod, float windAmt) {
    Water w;
    vec3 E;
    vec2 W = toWorld(p, E);
    vec3 s = swell(W, t) + wind(W, t, windAmt * smoothstep(0.14, 0.3, E.z));   // far ripples fade (they'd alias)
    vec3 n = normalize(vec3(-s.xy, 1.0));
    float cosi = clamp(dot(n, E), 0.0, 1.0);
    float q = quietAt(p);
    // Painter's Fresnel: broader than physical, with a firmer mirror/window edge.
    w.F = smoothstep(0.30, 0.78, pow(1.0 - cosi, 2.0) * 1.35 * uSky) * (1.0 - 0.45 * q);
    w.sky = skyCol(reflect(-E, n), t, lod, w.sun);
    w.pond = pondCol(W, p, n, refract(-E, n, 0.752), t, lod);
    w.sun *= w.F;
    w.dim = 1.0 - 0.22 * q;                                     // quiet zone behind the headline
    w.focus = s.z;
    w.grad = s.xy;
    w.fs = E.z;                                                 // foreshortening of the plane on screen
    return w;
  }
  vec3 compose(Water w, float F) { return mix(w.pond, w.sky, F) * w.dim; }

  // Brush space: screen space with a little perspective, so dabs shrink toward the far edge.
  vec2 toBrush(vec2 p)   { return toBand(p / max(1.0 - uSTilt * p.y, 0.4)); }
  vec2 fromBrush(vec2 b) { vec2 v = fromBand(b); return v / (1.0 + uSTilt * v.y); }

  // Everything a dab needs from the water, evaluated once at its cell's centre:
  // colour (committed to mostly-sky or mostly-pond), angle along the crests,
  // and how far it rides the swell.
  void cellInfo(vec2 cid, float cell, float seed, float windAmt, out vec3 wc, out float ang, out vec2 shift) {
    vec4 h = hash42(cid + seed);
    vec4 k = hash42(cid * 1.731 + seed + 19.19);
    vec2 c = cid + 0.5 + (h.xy - 0.5) * 0.6;
    Water wa = water(fromBrush(c * cell), uTime, 1.5, windAmt);
    wc = clamp(compose(wa, smoothstep(0.2, 0.8, wa.F + (k.y - 0.5) * 0.25)), 0.0, 1.0);
    vec2 gs = vec2(wa.grad.x, wa.grad.y * wa.fs);               // gradient as seen on screen
    vec2 tq = toBand(vec2(-gs.y, gs.x));
    vec2 tan2 = vec2(tq.x * tq.x - tq.y * tq.y, 2.0 * tq.x * tq.y) / max(dot(tq, tq), 1e-8);
    vec2 dv = mix(vec2(1.0, 0.0), tan2, 0.7 * smoothstep(0.03, 0.15, length(gs)));
    ang = 0.5 * atan(dv.y, dv.x + 1e-5) + (k.x - 0.5) * 0.45;
    shift = clamp(toBand(gs) * 0.012 / cell, -0.15, 0.15);
  }`;

  // --- 1. stroke cache: one texel per brush cell, all layers stacked ----------
  const CACHE_FS = COMMON + WATER + `
  uniform vec4 uCellMin[3];   // per layer: xy = first cell id, z = first atlas row
  layout(location = 0) out vec4 outA;   // rgb colour, a = angle / π
  layout(location = 1) out vec4 outB;   // xy = ride shift
  void main() {
    vec2 tc = floor(gl_FragCoord.xy);
    int layer = tc.y >= uCellMin[2].z ? 2 : (tc.y >= uCellMin[1].z ? 1 : 0);
    vec4 lm = uCellMin[layer];
    vec2 cid = vec2(tc.x, tc.y - lm.z) + lm.xy;
    if (hash42(cid + uLayerSeed[layer]).w > uLayerDensity[layer]) {   // no dab in this cell
      outA = vec4(0.0); outB = vec4(0.5); return;
    }
    vec3 wc; float ang; vec2 shift;
    cellInfo(cid, uLayerCell[layer], uLayerSeed[layer], uLayerWind[layer], wc, ang, shift);
    outA = vec4(wc, fract(ang / 3.14159265));
    outB = vec4(shift / 0.3 + 0.5, 0.0, 1.0);
  }`;

  // --- 2. water at half resolution (underpainting, Fresnel, glint, caustics) ---
  const WATERPASS_FS = COMMON + WATER + `
  uniform vec2 uWaterRes;
  layout(location = 0) out vec4 outA;   // rgb water colour, a = Fresnel (sky fraction)
  layout(location = 1) out vec4 outB;   // x = sun glint, y = caustics
  void main() {
    vec2 frag = gl_FragCoord.xy * (uRes / uWaterRes);           // this texel's centre in full-res pixels
    vec2 p = (frag - 0.5 * uRes) / min(uRes.x, uRes.y);
    Water wp = water(p, uTime, 0.0, 1.0);
    vec3 raw = compose(wp, wp.F);
    float caus = smoothstep(1.8, 4.0, wp.focus) * (1.0 - wp.F) * (1.0 - 0.6 * quietAt(p));
    raw += vec3(0.50, 0.58, 0.22) * caus * 0.25;
    outA = vec4(clamp(raw, 0.0, 1.0), wp.F);
    outB = vec4(clamp(wp.sun, 0.0, 1.0), caus, 0.0, 1.0);
  }`;

  // --- 3. paint --------------------------------------------------------------
  const PAINT_FS = COMMON + WATER + `
  uniform float uPaint;
  uniform float uBrush;
  uniform float uFlowers;
  uniform float uLines;
  uniform float uFine;        // 1 = include the finest brush layer
  uniform sampler2D uCacheA;
  uniform sampler2D uCacheB;
  uniform vec4 uCellMin[3];
  uniform sampler2D uWaterA;
  uniform sampler2D uWaterB;
  uniform float uHalfWater;   // 1 = read the half-res water pass instead of evaluating per pixel
  out vec4 outColor;

  // One dab's coverage at offset d (cell units) from its centre.
  float dabShape(vec2 d, float ang, vec4 h, vec4 k, out float br, out float v) {
    float ca = cos(ang), sa = sin(ang);
    vec2 l = vec2(ca * d.x + sa * d.y, -sa * d.x + ca * d.y);
    float u = l.x / mix(0.72, 0.95, k.y);
    v = l.y / (mix(0.28, 0.40, k.z) * (1.0 - 0.28 * u * u));
    br = 0.0;
    if (abs(u) > 1.15 || abs(v) > 1.15) return 0.0;
    br = vnoise(vec2(v * 6.0 + h.x * 37.0, u * 1.4 + h.y * 11.0));   // bristles
    return (1.0 - smoothstep(0.6, 1.0, abs(v) + 0.22 * (br - 0.5)))
         * (1.0 - smoothstep(0.55, 1.0, abs(u) + 0.45 * (br - 0.5)));  // dry-brush tails
  }
  vec3 dabColour(vec3 wc, vec3 fpix, float wet, float jit, float contrast, vec4 k, float br, float v) {
    vec3 col = mix(wc, fpix, wet) * (1.0 + (k.w - 0.5) * jit);   // wet-in-wet: blend toward the local colour
    col = (col - 0.35) * contrast + 0.35;
    col *= 0.88 + 0.22 * br;
    return col * mix(0.94, 1.0, smoothstep(1.0, 0.55, abs(v)));
  }

  // A layer of Monet dabs. The top two dabs covering this pixel (by random
  // priority) are composited over 'base'.
  void strokes(int layer, vec2 p, float t, float jit, float contrast, float wet, vec3 fpix, inout vec3 base) {
    float cell = uLayerCell[layer], seed = uLayerSeed[layer], density = uLayerDensity[layer];
    vec2 g = toBrush(p) / cell;
    vec2 id = floor(g);
    vec3 c1 = vec3(0.0), c2 = vec3(0.0);
    float a1 = 0.0, a2 = 0.0, p1 = -1.0, p2 = -1.0;
  #if STROKE_CACHE
    vec4 lm = uCellMin[layer];
    ivec2 lim = textureSize(uCacheA, 0) - 1;
  #endif

    for (int j = -1; j <= 1; j++)
    for (int i = -1; i <= 1; i++) {
      vec2 cid = id + vec2(float(i), float(j));
      vec4 h = hash42(cid + seed);
      if (h.w > density) continue;
      vec2 c = cid + 0.5 + (h.xy - 0.5) * 0.6;
      vec2 d = g - c;
      if (dot(d, d) > 1.44) continue;                           // beyond any stroke's reach
      vec4 k = hash42(cid * 1.731 + seed + 19.19);

      vec3 wc; float ang; vec2 shift;
  #if STROKE_CACHE
      ivec2 tc = clamp(ivec2(cid - lm.xy + vec2(0.0, lm.z)), ivec2(0), lim);
      vec4 ca = texelFetch(uCacheA, tc, 0);
      wc = ca.rgb;
      ang = ca.a * 3.14159265;
      shift = (texelFetch(uCacheB, tc, 0).xy - 0.5) * 0.3;
  #else
      cellInfo(cid, cell, seed, uLayerWind[layer], wc, ang, shift);
  #endif
      ang += 0.08 * sin(t * 0.5 + k.w * 6.2832);                // slow rocking
      d -= shift;                                               // the dab rides the swell

      float br, v;
      float a = dabShape(d, ang, h, k, br, v);
      if (a < 0.004) continue;
      vec3 col = dabColour(wc, fpix, wet, jit, contrast, k, br, v);

      float pr = h.z;
      if (pr > p1)      { c2 = c1; a2 = a1; p2 = p1; c1 = col; a1 = a; p1 = pr; }
      else if (pr > p2) { c2 = col; a2 = a; p2 = pr; }
    }
    base = mix(base, c2, a2);
    base = mix(base, c1, a1);
  }

  // Brushed line along one contour of a scalar field (swells, thins, lifts off).
  void contour(inout vec3 col, vec2 p, float s, float gpx, float level,
               vec3 ink, float widthPx, float amt, float seed) {
    float d = (s - level) / gpx;
    float n  = vnoise(p * 22.0 + seed);
    float n2 = vnoise(p * 61.0 + seed * 1.7);
    float w = widthPx * (0.35 + 1.1 * n);
    float a = 1.0 - smoothstep(0.5 * w - 0.6, 0.5 * w + 0.9, abs(d) + widthPx * 0.3 * (n2 - 0.5));
    a *= smoothstep(0.22, 0.42, n);
    float br = vnoise(vec2(d * 0.7 + seed, n * 9.0));
    a *= 0.7 + 0.3 * br;
    col = mix(col, ink * (0.92 + 0.12 * br), clamp(a * amt, 0.0, 1.0));
  }

  // Lily blooms that drift slowly and rock on the swell.
  void lilies(vec2 p, float cell, float t, float amount, inout vec3 base) {
    float drift = t * 0.006;
    vec2 g = (toBrush(p) + vec2(drift, 0.0)) / cell;
    vec2 id = floor(g);
    vec3 c1 = vec3(0.0); float a1 = 0.0, p1 = -1.0;

    for (int j = -1; j <= 1; j++)
    for (int i = -1; i <= 1; i++) {
      vec2 cid = id + vec2(float(i), float(j));
      vec4 h = hash42(cid + 913.7);
      vec4 k = hash42(cid * 1.37 + 271.3);
      if (!(k.w < amount * 0.14)) continue;                    // (written so a hash of exactly 0, or NaN, can't slip through)
      vec2 c = cid + 0.5 + (h.xy - 0.5) * 0.5;
      vec2 home = fromBand(c * cell);
      vec2 cp = fromBrush(c * cell - vec2(drift, 0.0));

      float dens = vnoise(home * 5.0 + 3.7) * 0.65 + vnoise(home * 13.0 + 1.3) * 0.35;
      float pth = smoothstep(0.68, 0.86, dens) * amount * 0.14;
      pth *= max(0.0, 1.0 - uLilyQuiet * pow(quietAt(cp), uLilySpread));   // default: a slightly tighter ellipse than the quiet zone
      if (!(k.w < pth)) continue;

      vec3 E;
      vec2 W = toWorld(cp, E);
      vec2 gr = swell(W, t).xy;
      c += clamp(toBand(vec2(gr.x, gr.y * E.z)) * 0.03 / cell, -0.2, 0.2);   // rocked by the swell

      vec2 d = g - c;
      vec2 e = d / (vec2(0.56, 0.32) * mix(0.55, 1.15, h.z));
      float n = vnoise(d * 7.0 + h.x * 31.0);
      float r = length(e) + 0.45 * (n - 0.5);
      float a = 1.0 - smoothstep(0.62, 0.95, r);
      if (a < 0.004) continue;

      vec3 lav = vec3(0.70, 0.52, 0.90);
      vec3 mag = vec3(0.89, 0.42, 0.84);
      vec3 vio = vec3(0.56, 0.42, 0.86);
      vec3 colA = mix(mix(vio, lav, smoothstep(0.0, 0.5, k.z)), mag, smoothstep(0.55, 0.9, k.z));
      vec3 colB = mix(lav, mag, step(0.5, k.y));
      vec3 col = mix(colA, colB, smoothstep(0.35, 0.7, vnoise(d * 5.0 + h.y * 17.0)));
      col = mix(col, vec3(0.99, 0.80, 0.95), smoothstep(0.65, 0.0, r) * 0.6 * h.w);
      col *= 0.86 + 0.28 * n;

      if (h.z > p1) { c1 = col; a1 = a; p1 = h.z; }
    }
    base = mix(base, c1, a1);
  }

  void main() {
    vec2 frag = gl_FragCoord.xy;
    float px = min(uRes.x, uRes.y);
    vec2 p = (frag - 0.5 * uRes) / px;                          // shorter side = 1 unit
    float t = uTime;

    vec3 raw; float F, sun, caus;
    if (uHalfWater > 0.5) {
      vec2 uv = frag / uRes;
      vec4 wa = textureLod(uWaterA, uv, 0.0), wb = textureLod(uWaterB, uv, 0.0);
      raw = wa.rgb; F = wa.a; sun = wb.x; caus = wb.y;
    } else {
      Water wp = water(p, t, 0.0, 1.0);
      F = wp.F; sun = wp.sun;
      raw = compose(wp, F);
      // Caustics: where the wind ripples focus light onto the pond floor.
      caus = smoothstep(1.8, 4.0, wp.focus) * (1.0 - F) * (1.0 - 0.6 * quietAt(p));
      raw += vec3(0.50, 0.58, 0.22) * caus * 0.25;
    }
    float gpx = max(fwidth(F), 1e-4);

    vec3 col = raw;
    if (uPaint > 0.001) {
      vec3 painted = raw * 0.9;                                 // underpainting
      strokes(0, p, t,       0.10, 1.00, 0.20, raw, painted);
      strokes(1, p, t * 1.1, 0.14, 1.05, 0.25, raw, painted);

      float lw = 0.010 * px * uBrush;
      float la = uLines * (1.0 - 0.5 * quietAt(p));
      contour(painted, p, F, gpx, 0.40, vec3(0.88, 0.96, 0.96), lw,       0.85 * la, 3.1);   // rims of sky patches
      contour(painted, p, F, gpx, 0.24, vec3(0.62, 0.84, 0.88), lw * 0.8, 0.40 * la, 7.3);   // softer inner rims

      vec2 bq = toBand(p);
      float streak = 0.6 + 0.8 * vnoise(bq * vec2(28.0, 85.0));
      painted = mix(painted, vec3(0.78, 0.84, 0.46), clamp(caus * streak * 0.45 * min(uLines * 2.0, 1.0), 0.0, 1.0));

      if (uFine > 0.5) strokes(2, p, t * 1.2, 0.16, 1.06, 0.45, raw, painted);

      float fleck = vnoise(bq * vec2(45.0, 140.0)) * 0.6 + vnoise(bq * vec2(14.0, 40.0)) * 0.6;
      painted = mix(painted, vec3(1.0, 0.99, 0.95), smoothstep(0.25, 0.6, sun * fleck) * 0.9);

      col = mix(raw, painted, uPaint);
    }

    lilies(p, 0.024 * uBrush, t, uFlowers, col);

    float weave = vnoise(vec2(p.x * 380.0, p.y * 38.0)) + vnoise(vec2(p.x * 38.0, p.y * 380.0)) - 1.0;
    col *= 1.0 + 0.035 * weave * uPaint;
    col += (hash12(frag) - 0.5) * 0.025;

    vec2 vq = frag / uRes - 0.5;
    col *= 1.0 - 0.18 * dot(vq, vq);
    outColor = vec4(clamp(col, 0.0, 1.0), 1.0);
  }`;

  // ---------------------------------------------------------------- GL setup
  const header = (defines = {}) => '#version 300 es\nprecision highp float;\n' +
    Object.entries(defines).map(([k, v]) => `#define ${k} ${v}\n`).join('');

  function compile(type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      const log = gl.getShaderInfoLog(s);
      gl.deleteShader(s);
      throw new Error('Shader compile failed:\n' + log);
    }
    return s;
  }
  function makeProgram(fsSrc) {
    const p = gl.createProgram();
    gl.attachShader(p, compile(gl.VERTEX_SHADER, VS));
    gl.attachShader(p, compile(gl.FRAGMENT_SHADER, fsSrc));
    gl.bindAttribLocation(p, 0, 'aPos');
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    const u = {};
    const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < n; i++) {
      const name = gl.getActiveUniform(p, i).name.replace(/\[0\]$/, '');
      u[name] = gl.getUniformLocation(p, name);
    }
    return { p, u };
  }

  const t0Compile = performance.now();
  let bakeProg, cacheProg, waterProg, paintCached, paintDirect = null;
  try {
    bakeProg = makeProgram(header() + BAKE_FS);
    cacheProg = makeProgram(header() + CACHE_FS);
    waterProg = makeProgram(header() + WATERPASS_FS);
    paintCached = makeProgram(header({ STROKE_CACHE: 1 }) + PAINT_FS);
  } catch (err) {
    console.error(err);
    return null;
  }
  const compileMs = performance.now() - t0Compile;
  // The uncached paint program is only needed to compare; build it on demand.
  function getPaintDirect() {
    if (!paintDirect) paintDirect = makeProgram(header({ STROKE_CACHE: 0 }) + PAINT_FS);
    return paintDirect;
  }

  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

  function makeTexture(w, h, { filter = gl.LINEAR, wrap = gl.CLAMP_TO_EDGE } = {}) {
    gl.activeTexture(gl.TEXTURE3);                              // scratch unit, never sampled
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrap);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrap);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    return tex;
  }

  // Bake the tileable noise once.
  const noiseTex = makeTexture(NOISE_SIZE, NOISE_SIZE, { wrap: gl.REPEAT });
  {
    const fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, noiseTex, 0);
    gl.viewport(0, 0, NOISE_SIZE, NOISE_SIZE);
    gl.useProgram(bakeProg.p);
    gl.uniform1f(bakeProg.u.uSize, NOISE_SIZE);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.deleteFramebuffer(fbo);
  }

  // Stroke cache atlas: two RGBA8 targets, grown as needed.
  let atlas = null;
  function ensureAtlas(w, h) {
    if (atlas && atlas.w >= w && atlas.h >= h) return;
    if (atlas) { gl.deleteTexture(atlas.a); gl.deleteTexture(atlas.b); gl.deleteFramebuffer(atlas.fbo); }
    const W = Math.ceil(w / 32) * 32, H = Math.ceil(h / 32) * 32;
    const a = makeTexture(W, H, { filter: gl.NEAREST });
    const b = makeTexture(W, H, { filter: gl.NEAREST });
    const fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, a, 0);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT1, gl.TEXTURE_2D, b, 0);
    gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1]);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    atlas = { a, b, fbo, w: W, h: H };
  }

  // Half-resolution water targets, matched to the canvas.
  let waterRT = null;
  function ensureWater() {
    const w = Math.max(1, Math.ceil(canvas.width / 2)), h = Math.max(1, Math.ceil(canvas.height / 2));
    if (waterRT && waterRT.w === w && waterRT.h === h) return;
    if (waterRT) { gl.deleteTexture(waterRT.a); gl.deleteTexture(waterRT.b); gl.deleteFramebuffer(waterRT.fbo); }
    const a = makeTexture(w, h), b = makeTexture(w, h);
    const fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, a, 0);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT1, gl.TEXTURE_2D, b, 0);
    gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1]);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    waterRT = { a, b, fbo, w, h };
  }

  // GPU timing where the browser allows it (Chrome desktop; not Safari/Firefox).
  const timerExt = gl.getExtension('EXT_disjoint_timer_query_webgl2');
  const queries = [];
  const gpuSamples = [];
  function pollQueries() {
    while (queries.length) {
      const q = queries[0];
      if (!gl.getQueryParameter(q, gl.QUERY_RESULT_AVAILABLE)) break;
      if (!gl.getParameter(timerExt.GPU_DISJOINT_EXT)) gpuSamples.push(gl.getQueryParameter(q, gl.QUERY_RESULT) / 1e6);
      gl.deleteQuery(q);
      queries.shift();
    }
    if (gpuSamples.length > 30) gpuSamples.splice(0, gpuSamples.length - 30);
  }
  const avg = (xs) => xs.reduce((s, x) => s + x, 0) / xs.length;

  // ---------------------------------------------------------------- profiles & sizing
  let active = 'full';              // the profile actually in use
  let chosen = null;                // state.profile at the last resolve
  let degraded = false;             // Auto stepped down at runtime
  let quality = 1;
  let span = [1, 1];
  let quiet = [0, 0, Math.SQRT1_2, Math.sqrt(0.05)];   // centre xy, radii xy
  let dirty = true;

  function resolveProfile() {
    chosen = state.profile;
    degraded = false;
    quality = 1;
    if (reducedMotion) active = 'still';
    else if (state.profile !== 'auto') active = state.profile;
    else active = touchDevice ? state.mobileProfile : 'full';
  }

  function resize() {
    const rect = canvas.getBoundingClientRect();
    if (rect.width < 2 || rect.height < 2) return;
    const scale = Math.min(window.devicePixelRatio || 1, PROFILES[active].maxDpr) * quality;
    const w = Math.max(1, Math.round(rect.width * scale));
    const h = Math.max(1, Math.round(rect.height * scale));
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    const m = Math.min(rect.width, rect.height);
    span = [rect.width / m, rect.height / m];
    quiet = [0, 0, Math.SQRT1_2, Math.sqrt(0.05)];
    if (state.quietEl) {
      const q = state.quietEl.getBoundingClientRect();
      if (q.width > 0 && q.height > 0) {
        quiet = [
          (q.left + q.width / 2 - rect.left - rect.width / 2) / m,
          -(q.top + q.height / 2 - rect.top - rect.height / 2) / m,   // GL y points up
          (q.width / 2 / m) * state.quietPad[0],
          (q.height / 2 / m) * state.quietPad[1],
        ];
      }
    }
    dirty = true;
  }

  // ---------------------------------------------------------------- per-frame parameters
  // Bearings: 0° = far side of the pond, 90° = right, 180° = behind the viewer, 270° = left.
  const waveSource = () => {
    const a = state.waveDir * DEG;
    return [Math.sin(a) * state.waveDist, Math.cos(a) * state.waveDist];
  };
  const windTo = () => {
    const a = state.windDir * DEG;
    return [-Math.sin(a), -Math.cos(a)];
  };
  // Gust patches drift downwind; accumulate so turning the wind doesn't make them jump.
  const gustOff = (() => { const w = windTo(); return [w[0] * state.time * 0.09, w[1] * state.time * 0.09]; })();

  function frameParams() {
    // A camera above the pond, pitched down; narrow field of view = zoomed in.
    const maxSpan = Math.max(span[0], span[1]);
    const focal = Math.tan(HALF_FOV_LONG * DEG) / (0.5 * maxSpan);
    const halfV = Math.atan(focal * span[1] / 2);
    let pitch = (90 - state.view) * DEG;
    pitch = Math.min(Math.max(pitch, halfV + 6 * DEG), 80 * DEG);   // keep the horizon off screen
    const src = waveSource();
    // Brushwork runs along the swell crests as they appear on screen at the centre.
    const len = Math.hypot(src[0], src[1]) || 1;
    let ang = Math.atan2((-src[0] / len) * Math.sin(pitch), src[1] / len);
    if (ang > Math.PI / 2) ang -= Math.PI;
    if (ang <= -Math.PI / 2) ang += Math.PI;
    const band = [Math.cos(ang), Math.sin(ang)];
    const sTilt = 0.35 / Math.max(1, span[1]);

    // Which brush cells can touch the screen, per layer → atlas rows.
    const fine = PROFILES[active].fine;
    const cells = LAYERS.map((L) => L.cell * state.brush);
    const bounds = [];
    let row = 0, cols = 1;
    LAYERS.forEach((L, i) => {
      if (i === 2 && !fine) { bounds.push([0, 0, 1e6, 0]); return; }
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      for (const sx of [-0.5, 0.5]) for (const sy of [-0.5, 0.5]) {
        const x = sx * span[0], y = sy * span[1];
        const k = 1 / Math.max(1 - sTilt * y, 0.4);
        const vx = x * k, vy = y * k;
        const gx = (band[0] * vx + band[1] * vy) / cells[i];
        const gy = (-band[1] * vx + band[0] * vy) / cells[i];
        x0 = Math.min(x0, gx); x1 = Math.max(x1, gx); y0 = Math.min(y0, gy); y1 = Math.max(y1, gy);
      }
      const minX = Math.floor(x0) - 2, minY = Math.floor(y0) - 2;
      const c = Math.floor(x1) + 2 - minX + 1, r = Math.floor(y1) + 2 - minY + 1;
      bounds.push([minX, minY, row, r]);
      row += r; cols = Math.max(cols, c);
    });

    return {
      cam: [0, -1 / Math.tan(pitch), 1],
      fwd: [0, Math.cos(pitch), -Math.sin(pitch)],
      up: [0, Math.sin(pitch), Math.cos(pitch)],
      focal,
      wscale: Math.sin(pitch) / focal,   // = 1 / (camera distance × focal): shorter side ≈ 1 wave unit at centre
      src, wind: windTo(), band, sTilt, cells, bounds, atlasW: cols, atlasH: row,
    };
  }

  function setShared(prog, f) {
    const u = prog.u;
    const set = (name, fn) => { if (u[name] != null) fn(u[name]); };
    gl.useProgram(prog.p);
    set('uNoise', (l) => gl.uniform1i(l, 0));
    set('uRes', (l) => gl.uniform2f(l, canvas.width, canvas.height));
    set('uSpan', (l) => gl.uniform2f(l, span[0], span[1]));
    set('uTime', (l) => gl.uniform1f(l, state.time));
    set('uCam', (l) => gl.uniform3fv(l, f.cam));
    set('uFwd', (l) => gl.uniform3fv(l, f.fwd));
    set('uUp', (l) => gl.uniform3fv(l, f.up));
    set('uFocal', (l) => gl.uniform1f(l, f.focal));
    set('uWScale', (l) => gl.uniform1f(l, f.wscale));
    set('uSTilt', (l) => gl.uniform1f(l, f.sTilt));
    set('uBand', (l) => gl.uniform2f(l, f.band[0], f.band[1]));
    set('uSwell', (l) => gl.uniform1f(l, state.swell));
    set('uWind', (l) => gl.uniform1f(l, state.wind));
    set('uSky', (l) => gl.uniform1f(l, state.sky));
    set('uQuietC', (l) => gl.uniform2f(l, quiet[0], quiet[1]));
    set('uQuietR', (l) => gl.uniform2f(l, quiet[2], quiet[3]));
    set('uLilyQuiet', (l) => gl.uniform1f(l, state.lilyQuiet));
    set('uLilySpread', (l) => gl.uniform1f(l, state.lilySpread));
    set('uSrc', (l) => gl.uniform2f(l, f.src[0], f.src[1]));
    set('uWindTo', (l) => gl.uniform2f(l, f.wind[0], f.wind[1]));
    set('uGustOff', (l) => gl.uniform2f(l, gustOff[0], gustOff[1]));
    set('uLayerCell', (l) => gl.uniform1fv(l, f.cells));
    set('uLayerSeed', (l) => gl.uniform1fv(l, LAYERS.map((L) => L.seed)));
    set('uLayerDensity', (l) => gl.uniform1fv(l, LAYERS.map((L) => L.density)));
    set('uLayerWind', (l) => gl.uniform1fv(l, LAYERS.map((L) => L.wind)));
    set('uCellMin', (l) => gl.uniform4fv(l, f.bounds.flat()));
  }

  // ---------------------------------------------------------------- render
  function render() {
    const f = frameParams();
    gl.bindVertexArray(vao);
    const opt = state.optimize && state.paint > 0.001;
    if (opt) { ensureAtlas(f.atlasW, f.atlasH); ensureWater(); }   // (creates textures on the scratch unit)
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, noiseTex);

    if (opt) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, atlas.fbo);            // 1. stroke cache
      gl.viewport(0, 0, f.atlasW, f.atlasH);
      setShared(cacheProg, f);
      gl.drawArrays(gl.TRIANGLES, 0, 3);

      gl.bindFramebuffer(gl.FRAMEBUFFER, waterRT.fbo);          // 2. half-res water
      gl.viewport(0, 0, waterRT.w, waterRT.h);
      setShared(waterProg, f);
      gl.uniform2f(waterProg.u.uWaterRes, waterRT.w, waterRT.h);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    const prog = state.optimize ? paintCached : getPaintDirect();   // 3. paint
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, canvas.width, canvas.height);
    setShared(prog, f);
    if (atlas) {
      gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, atlas.a);
      gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, atlas.b);
    }
    if (waterRT) {
      gl.activeTexture(gl.TEXTURE4); gl.bindTexture(gl.TEXTURE_2D, waterRT.a);
      gl.activeTexture(gl.TEXTURE5); gl.bindTexture(gl.TEXTURE_2D, waterRT.b);
    }
    const u = prog.u;
    if (u.uCacheA != null) gl.uniform1i(u.uCacheA, 1);
    if (u.uCacheB != null) gl.uniform1i(u.uCacheB, 2);
    if (u.uWaterA != null) gl.uniform1i(u.uWaterA, 4);
    if (u.uWaterB != null) gl.uniform1i(u.uWaterB, 5);
    if (u.uHalfWater != null) gl.uniform1f(u.uHalfWater, opt ? 1 : 0);
    gl.uniform1f(u.uPaint, state.paint);
    gl.uniform1f(u.uBrush, state.brush);
    gl.uniform1f(u.uFlowers, state.flowers);
    gl.uniform1f(u.uLines, state.lines);
    gl.uniform1f(u.uFine, PROFILES[active].fine ? 1 : 0);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  function renderTimed() {
    if (timerExt && queries.length < 4) {
      const q = gl.createQuery();
      gl.beginQuery(timerExt.TIME_ELAPSED_EXT, q);
      render();
      gl.endQuery(timerExt.TIME_ELAPSED_EXT);
      queries.push(q);
    } else {
      render();
    }
  }

  // ---------------------------------------------------------------- loop
  let visible = true;
  const io = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; });
  io.observe(canvas);

  const WATCHED = ['time', 'swell', 'waveDir', 'waveDist', 'wind', 'windDir', 'view', 'sky', 'paint', 'lines', 'brush', 'flowers', 'optimize'];
  const lastParams = {};
  function paramsChanged() {
    let changed = false;
    for (const key of WATCHED) {
      if (lastParams[key] !== state[key]) { lastParams[key] = state[key]; changed = true; }
    }
    return changed;
  }

  let raf = 0, last = performance.now(), firstFrame = true, benchRunning = false;
  let framesSinceCheck = 0, intervals = [], rendered = 0, totalRendered = 0, statWindowStart = performance.now(), liveFps = 0;

  function afterRender() {
    rendered++; totalRendered++;
    if (firstFrame) { firstFrame = false; options.onReady && options.onReady(); }
  }

  function adapt(prof) {
    // Over budget? Prefer measured GPU time; otherwise how far frame intervals overshoot the target.
    const budget = 1000 / prof.fps;
    const over = gpuSamples.length >= 10
      ? avg(gpuSamples) > 0.7 * budget
      : avg(intervals) > 1.35 * budget;
    intervals = [];
    if (!over) return;
    if (quality > 0.62) { quality *= 0.85; resize(); return; }
    if (state.profile !== 'auto') return;                       // a chosen profile only loses resolution
    if (active === 'full') { active = 'lite'; quality = 1; degraded = true; resize(); }
    else if (active === 'lite') { active = 'still'; quality = 1; degraded = true; resize(); }
  }

  function frame(now) {
    raf = requestAnimationFrame(frame);
    if (benchRunning) return;
    if (chosen !== state.profile) { resolveProfile(); resize(); }
    if (!visible || document.hidden) { last = now; return; }
    if (timerExt) pollQueries();

    const prof = PROFILES[active];
    if (!prof.animate) {                                        // still: draw once, then only on changes
      const ch = paramsChanged();
      if (dirty || (ch && !firstFrame)) { dirty = false; render(); afterRender(); }
      last = now;
      return;
    }
    if (now - last < 1000 / prof.fps - 2) return;
    const dt = Math.min(0.1, (now - last) / 1000);
    intervals.push(now - last);
    last = now;

    if (!state.paused) {
      const sdt = dt * state.speed;
      state.time += sdt;
      const w = windTo();
      gustOff[0] += w[0] * sdt * 0.09;
      gustOff[1] += w[1] * sdt * 0.09;
    }
    const ch = paramsChanged();
    if (!(dirty || ch)) return;
    dirty = false;
    renderTimed();
    afterRender();

    if (state.adaptive && ++framesSinceCheck >= 45 && totalRendered > 30) { framesSinceCheck = 0; adapt(prof); }
  }

  function stats() {
    const now = performance.now();
    const secs = (now - statWindowStart) / 1000;
    if (secs > 0.4) { liveFps = rendered / secs; rendered = 0; statWindowStart = now; }
    return {
      fps: liveFps,
      gpuMs: gpuSamples.length ? avg(gpuSamples) : null,
      gpuTimer: !!timerExt,
      width: canvas.width,
      height: canvas.height,
      profile: active,
      degraded,
      quality,
      optimize: state.optimize,
      compileMs,
    };
  }

  // ---------------------------------------------------------------- benchmark
  // Renders a fixed sequence of frames, uncapped, waiting for the GPU to finish
  // each one (a 1-pixel readback), for several configurations.
  async function benchmark({ frames = 24, onProgress } = {}) {
    if (benchRunning) return null;
    benchRunning = true;
    const saved = { optimize: state.optimize, active, quality, degraded, time: state.time, gust: gustOff.slice() };
    const px = new Uint8Array(4);
    const configs = [
      { label: 'Before (unoptimized, Full)', profile: 'full', optimize: false },
      { label: 'Optimized, Full (desktop)',  profile: 'full', optimize: true },
      { label: 'Optimized, Lite (phones)',   profile: 'lite', optimize: true },
    ];
    const results = [];
    try {
      for (let c = 0; c < configs.length; c++) {
        const cfg = configs[c];
        onProgress && onProgress(`Running ${c + 1}/${configs.length}: ${cfg.label}…`);
        active = cfg.profile; state.optimize = cfg.optimize; quality = 1; resize();
        const times = [];
        for (let i = 0; i < frames + 3; i++) {                  // first 3 = warm-up (and lazy compile)
          state.time = saved.time + i / 30;
          const t0 = performance.now();
          render();
          gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
          const ms = performance.now() - t0;
          if (i >= 3) times.push(ms);
          await new Promise((r) => setTimeout(r, 0));
        }
        times.sort((a, b) => a - b);
        results.push({
          label: cfg.label,
          width: canvas.width, height: canvas.height,
          medianMs: times[Math.floor(times.length / 2)],
          p90Ms: times[Math.floor(times.length * 0.9)],
        });
      }
    } finally {
      state.optimize = saved.optimize; active = saved.active; quality = saved.quality; degraded = saved.degraded;
      state.time = saved.time; gustOff[0] = saved.gust[0]; gustOff[1] = saved.gust[1];
      resize();
      benchRunning = false;
    }
    let renderer = 'unknown';
    const dbg = gl.getExtension('WEBGL_debug_renderer_info');
    if (dbg) renderer = gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL);
    return { renderer, dpr: window.devicePixelRatio || 1, results };
  }

  // ---------------------------------------------------------------- start
  resolveProfile();
  const ro = new ResizeObserver(resize);
  ro.observe(canvas);
  if (state.quietEl) ro.observe(state.quietEl);
  resize();
  raf = requestAnimationFrame(frame);

  function onLost(e) { e.preventDefault(); cancelAnimationFrame(raf); options.onLost && options.onLost(); }
  canvas.addEventListener('webglcontextlost', onLost);

  return {
    state,
    stats,
    benchmark,
    redraw() { dirty = true; },
    setQuality(q) { quality = q; resize(); },
    destroy() {
      cancelAnimationFrame(raf);
      ro.disconnect(); io.disconnect();
      canvas.removeEventListener('webglcontextlost', onLost);
      gl.deleteTexture(noiseTex);
      if (atlas) { gl.deleteTexture(atlas.a); gl.deleteTexture(atlas.b); gl.deleteFramebuffer(atlas.fbo); }
      if (waterRT) { gl.deleteTexture(waterRT.a); gl.deleteTexture(waterRT.b); gl.deleteFramebuffer(waterRT.fbo); }
    },
  };
}
