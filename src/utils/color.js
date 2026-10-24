// Conversoes de cor usadas pelo seletor de cor. Cores sao sempre "#RRGGBB" em maiusculas,
// o mesmo formato do tabuleiro (ex.: o branco da borracha e "#FFFFFF").

export const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value))

// h em graus (0-360), s e v entre 0 e 1 -> [r, g, b] inteiros de 0 a 255
export function hsvToRgb(h, s, v) {
  const hue = ((h % 360) + 360) % 360
  const c = v * s
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1))
  const m = v - c

  let rgb
  if (hue < 60) rgb = [c, x, 0]
  else if (hue < 120) rgb = [x, c, 0]
  else if (hue < 180) rgb = [0, c, x]
  else if (hue < 240) rgb = [0, x, c]
  else if (hue < 300) rgb = [x, 0, c]
  else rgb = [c, 0, x]

  return rgb.map((channel) => Math.round((channel + m) * 255))
}

// [r, g, b] de 0 a 255 -> [h (0-360), s (0-1), v (0-1)]
export function rgbToHsv(r, g, b) {
  const rn = r / 255
  const gn = g / 255
  const bn = b / 255
  const max = Math.max(rn, gn, bn)
  const delta = max - Math.min(rn, gn, bn)

  let h = 0
  if (delta !== 0) {
    if (max === rn) h = ((gn - bn) / delta) % 6
    else if (max === gn) h = (bn - rn) / delta + 2
    else h = (rn - gn) / delta + 4
    h *= 60
    if (h < 0) h += 360
  }

  return [h, max === 0 ? 0 : delta / max, max]
}

export function rgbToHex([r, g, b]) {
  return '#' + [r, g, b].map((channel) => channel.toString(16).padStart(2, '0')).join('').toUpperCase()
}

// "#abc", "abc", "#aabbcc" ou "aabbcc" -> "#AABBCC"; qualquer outra coisa -> null
export function normalizeHex(text) {
  const match = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(String(text).trim())
  if (!match) return null

  let digits = match[1]
  if (digits.length === 3) digits = digits.split('').map((d) => d + d).join('')
  return '#' + digits.toUpperCase()
}

export function hexToRgb(hex) {
  const normalized = normalizeHex(hex)
  if (!normalized) return null
  return [1, 3, 5].map((i) => parseInt(normalized.slice(i, i + 2), 16))
}

export function hexToHsv(hex) {
  const rgb = hexToRgb(hex)
  return rgb ? rgbToHsv(...rgb) : null
}

export function hsvToHex(h, s, v) {
  return rgbToHex(hsvToRgb(h, s, v))
}
