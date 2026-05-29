// LAB / OKLab color mixing utilities — mistura perceptual de cores.
// Usamos OKLab (Björn Ottosson, 2020) por ser leve, sem white-point e
// perceptualmente uniforme — ideal para misturar pigmentos visualmente.

function srgbToLinear(c) {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}
function linearToSrgb(c) {
  const v = c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
  return Math.max(0, Math.min(255, Math.round(v * 255)));
}

export function hexToOklab(hex) {
  const h = hex.replace("#", "");
  const r = srgbToLinear(parseInt(h.substring(0, 2), 16));
  const g = srgbToLinear(parseInt(h.substring(2, 4), 16));
  const b = srgbToLinear(parseInt(h.substring(4, 6), 16));
  const l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b;
  const m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b;
  const s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b;
  const l_ = Math.cbrt(l);
  const m_ = Math.cbrt(m);
  const s_ = Math.cbrt(s);
  return {
    L: 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_,
    a: 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_,
    b: 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_,
  };
}

export function oklabToHex({ L, a, b }) {
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;
  const lLin = l_ ** 3;
  const mLin = m_ ** 3;
  const sLin = s_ ** 3;
  const r = 4.0767416621 * lLin - 3.3077115913 * mLin + 0.2309699292 * sLin;
  const g = -1.2684380046 * lLin + 2.6097574011 * mLin - 0.3413193965 * sLin;
  const bb = -0.0041960863 * lLin - 0.7034186147 * mLin + 1.707614701 * sLin;
  return (
    "#" +
    [linearToSrgb(r), linearToSrgb(g), linearToSrgb(bb)]
      .map((v) => v.toString(16).padStart(2, "0"))
      .join("")
  );
}

// Mistura perceptual em OKLab — t ∈ [0,1] = peso da cor B.
export function mixOklab(hexA, hexB, t = 0.5) {
  const A = hexToOklab(hexA);
  const B = hexToOklab(hexB);
  return oklabToHex({
    L: A.L * (1 - t) + B.L * t,
    a: A.a * (1 - t) + B.a * t,
    b: A.b * (1 - t) + B.b * t,
  });
}

// Mistura por RGB linear (subtrativa aproximada) — visualmente menos vibrante.
export function mixRgbLinear(hexA, hexB, t = 0.5) {
  const ha = hexA.replace("#", "");
  const hb = hexB.replace("#", "");
  const ra = srgbToLinear(parseInt(ha.substring(0, 2), 16));
  const ga = srgbToLinear(parseInt(ha.substring(2, 4), 16));
  const ba = srgbToLinear(parseInt(ha.substring(4, 6), 16));
  const rb = srgbToLinear(parseInt(hb.substring(0, 2), 16));
  const gb = srgbToLinear(parseInt(hb.substring(2, 4), 16));
  const bb = srgbToLinear(parseInt(hb.substring(4, 6), 16));
  return (
    "#" +
    [
      linearToSrgb(ra * (1 - t) + rb * t),
      linearToSrgb(ga * (1 - t) + gb * t),
      linearToSrgb(ba * (1 - t) + bb * t),
    ]
      .map((v) => v.toString(16).padStart(2, "0"))
      .join("")
  );
}

// ΔE perceptual aproximado em OKLab (distância euclidiana × 100).
export function deltaEOk(hexA, hexB) {
  const A = hexToOklab(hexA);
  const B = hexToOklab(hexB);
  const dL = A.L - B.L;
  const da = A.a - B.a;
  const db = A.b - B.b;
  return Math.sqrt(dL * dL + da * da + db * db) * 100;
}
