import { hexToRgb, rgbToHex } from './color'

// Wave Function Collapse com regras de vizinhanca aprendidas de uma imagem de entrada.
//
// O "tile" pode ser um pixel (patternSize 1) ou um bloco NxN da entrada (patternSize > 1,
// modelo de sobreposicao). Com 1 pixel as regras so dizem "a cor A pode ficar do lado da
// cor B", o que nao captura formas (linhas, cantos...) e a saida parece ruido. Com blocos
// 3x3 cada bloco carrega um pedaco da forma, e dois blocos so ficam vizinhos se as
// partes que se sobrepoem forem iguais.
//
// Ideia: cada celula da saida comeca podendo ser QUALQUER cor da entrada. A cada passo
// escolhemos a celula mais "decidida" (menor entropia, mais de uma opcao), fixamos uma
// cor para ela (sorteada pela frequencia na entrada) e propagamos as consequencias:
// os vizinhos perdem as cores que nunca apareceram ao lado dessa cor na entrada. Se
// alguma celula ficar sem nenhuma opcao, houve uma contradicao e recomecamos.

// Gerador de numeros aleatorios com semente (mulberry32): a mesma semente repete a mesma
// geracao, o que permite contar os quadros de uma execucao e depois animar exatamente ela.
export function seededRandom(seed) {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// cima, baixo, esquerda, direita. O oposto de i e i ^ 1 (0<->1, 2<->3).
const DIRECTIONS = [[-1, 0], [1, 0], [0, -1], [0, 1]]

// Aprende os tiles (pixels ou blocos NxN), a frequencia de cada um e, para cada direcao,
// quais tiles podem ficar ao lado de cada tile.
export function learnRules(input, patternSize = 1) {
  const n = patternSize
  const patterns = []
  const weights = []
  const index = new Map()

  const rows = input.length
  const cols = input[0].length
  for (let r = 0; r + n <= rows; r += 1) {
    for (let c = 0; c + n <= cols; c += 1) {
      const pattern = []
      for (let i = 0; i < n; i += 1) for (let j = 0; j < n; j += 1) pattern.push(input[r + i][c + j])

      const key = pattern.join('|')
      if (!index.has(key)) {
        index.set(key, patterns.length)
        patterns.push(pattern)
        weights.push(0)
      }
      weights[index.get(key)] += 1
    }
  }

  // allowed[direcao][tile] = conjunto de tiles permitidos nessa direcao
  const allowed = DIRECTIONS.map(() => patterns.map(() => new Set()))

  if (n === 1) {
    // Pixel unico: nao ha sobreposicao, entao vale o que foi visto lado a lado na entrada.
    input.forEach((row, r) => row.forEach((color, c) => {
      DIRECTIONS.forEach(([dr, dc], d) => {
        const neighbor = input[r + dr] && input[r + dr][c + dc]
        if (neighbor !== undefined) allowed[d][index.get(color)].add(index.get(neighbor))
      })
    }))
  } else {
    // Blocos: b pode ficar na direcao (dr, dc) de a se as partes sobrepostas forem iguais.
    const fits = (a, b, dr, dc) => {
      for (let i = 0; i < n; i += 1) {
        for (let j = 0; j < n; j += 1) {
          const ai = i + dr
          const aj = j + dc
          if (ai < 0 || aj < 0 || ai >= n || aj >= n) continue
          if (a[ai * n + aj] !== b[i * n + j]) return false
        }
      }
      return true
    }

    DIRECTIONS.forEach(([dr, dc], d) => {
      patterns.forEach((a, ai) => patterns.forEach((b, bi) => {
        if (fits(a, b, dr, dc)) allowed[d][ai].add(bi)
      }))
    })
  }

  return { patterns, patternSize: n, weights, allowed }
}

// Uma tentativa, como gerador: cada `yield` e um quadro (uma celula decidida ou uma celula
// processada na propagacao das consequencias) e o valor retornado e a grade de tiles, ou
// null se houve contradicao.
//
// Cada quadro traz `undecided()` (quantas celulas ainda estao indecisas) e `view()`, que monta
// o tabuleiro de PIXELS no estado atual: { color, alpha } por pixel, com alpha menor quanto
// mais indecisa a celula. Os dois so valem ate o proximo `next()`, porque as estruturas
// internas continuam sendo alteradas.
function* attemptSteps(rows, cols, { patterns, patternSize, weights, allowed }, rnd) {
  const n = weights.length
  const cells = rows * cols
  const possible = new Uint8Array(cells * n).fill(1)
  const count = new Int32Array(cells).fill(n)

  // Remove de cada vizinho as opcoes que nenhuma opcao da celula permite. E um gerador: cede um
  // quadro a cada celula processada, para a animacao mostrar a restricao se espalhando.
  // Retorna falso se alguma celula ficou sem opcoes (contradicao).
  const info = { step: 0, focus: null }

  function* propagate(start) {
    const stack = start
    while (stack.length) {
      const current = stack.pop()
      const r = Math.floor(current / cols)
      const c = current % cols

      for (let d = 0; d < DIRECTIONS.length; d += 1) {
        const nr = r + DIRECTIONS[d][0]
        const nc = c + DIRECTIONS[d][1]
        if (nr < 0 || nc < 0 || nr >= rows || nc >= cols) continue

        const neighbor = nr * cols + nc
        const permitted = new Uint8Array(n)
        for (let k = 0; k < n; k += 1) {
          if (!possible[current * n + k]) continue
          allowed[d][k].forEach((other) => { permitted[other] = 1 })
        }

        let changed = false
        for (let k = 0; k < n; k += 1) {
          if (possible[neighbor * n + k] && !permitted[k]) {
            possible[neighbor * n + k] = 0
            count[neighbor] -= 1
            changed = true
          }
        }

        if (count[neighbor] === 0) return false
        if (changed) stack.push(neighbor)
      }

      yield frame()
    }
    return true
  }

  // Entropia de Shannon ponderada pelas frequencias, com um desempate aleatorio minimo.
  const entropy = (cell) => {
    let sum = 0
    let sumLog = 0
    for (let k = 0; k < n; k += 1) {
      if (!possible[cell * n + k]) continue
      sum += weights[k]
      sumLog += weights[k] * Math.log(weights[k])
    }
    return Math.log(sum) - sumLog / sum + rnd() * 1e-6
  }

  // Tabuleiro de pixels no estado atual. Cada pixel pertence a uma celula (a ultima linha e
  // coluna de pixels vem dos blocos da borda) e mostra a cor media das opcoes que ainda restam.
  const rgbCache = new Map()
  const rgb = (color) => {
    if (!rgbCache.has(color)) rgbCache.set(color, hexToRgb(color) || [128, 128, 128])
    return rgbCache.get(color)
  }

  const view = () => {
    const board = []
    for (let R = 0; R < rows + patternSize - 1; R += 1) {
      const line = []
      for (let C = 0; C < cols + patternSize - 1; C += 1) {
        const r = Math.min(R, rows - 1)
        const c = Math.min(C, cols - 1)
        const cell = r * cols + c
        const offset = (R - r) * patternSize + (C - c)

        let first = null
        let mixed = false
        let total = 0
        const sum = [0, 0, 0]
        for (let k = 0; k < n; k += 1) {
          if (!possible[cell * n + k]) continue
          const color = patterns[k][offset]
          if (first === null) first = color
          else if (color !== first) mixed = true

          const [red, green, blue] = rgb(color)
          sum[0] += red * weights[k]
          sum[1] += green * weights[k]
          sum[2] += blue * weights[k]
          total += weights[k]
        }

        if (!mixed) {
          line.push({ color: first, alpha: 1 })
        } else {
          const certainty = n > 1 ? 1 - (count[cell] - 1) / (n - 1) : 1
          line.push({ color: rgbToHex(sum.map((value) => Math.round(value / total))), alpha: 0.12 + 0.5 * certainty })
        }
      }
      board.push(line)
    }
    return Object.freeze(board)
  }

  const undecided = () => count.reduce((total, value) => total + (value > 1 ? 1 : 0), 0)
  const frame = () => ({ step: info.step, focus: info.focus, undecided, view })

  // Poda inicial: tiles que nao cabem em lugar nenhum (ex.: so aparecem no canto da entrada).
  if (!(yield* propagate(Array.from({ length: cells }, (_, i) => i)))) return null

  yield frame()

  for (;;) {
    let next = -1
    let lowest = Infinity
    for (let cell = 0; cell < cells; cell += 1) {
      if (count[cell] <= 1) continue
      const value = entropy(cell)
      if (value < lowest) {
        lowest = value
        next = cell
      }
    }

    if (next === -1) break // todas as celulas tem exatamente uma opcao

    // Sorteia pelo peso (frequencia na entrada) entre as opcoes ainda possiveis.
    let total = 0
    for (let k = 0; k < n; k += 1) if (possible[next * n + k]) total += weights[k]
    let pick = rnd() * total
    let chosen = -1
    for (let k = 0; k < n; k += 1) {
      if (!possible[next * n + k]) continue
      chosen = k
      pick -= weights[k]
      if (pick < 0) break
    }

    for (let k = 0; k < n; k += 1) possible[next * n + k] = k === chosen ? 1 : 0
    count[next] = 1

    info.step += 1
    info.focus = [Math.floor(next / cols), next % cols]
    yield frame()

    if (!(yield* propagate([next]))) return null
  }

  const grid = []
  for (let r = 0; r < rows; r += 1) {
    const row = []
    for (let c = 0; c < cols; c += 1) {
      const cell = r * cols + c
      for (let k = 0; k < n; k += 1) if (possible[cell * n + k]) row.push(k)
    }
    grid.push(row)
  }
  return grid
}

// Gerador de alto nivel: cada `yield` e { attempt, step, focus, undecided, view } ou, quando
// uma tentativa bate numa contradicao e recomeca, { attempt, restart: true }.
// O valor retornado e { ok, attempts, board } (`board` e a matriz de cores da entrada).
export function* collapse(input, { rows, cols, patternSize = 3, rnd = Math.random, maxAttempts = 100 } = {}) {
  const n = Math.min(patternSize, input.length, input[0].length)
  const rules = learnRules(input, n)

  // Cada celula da grade de tiles pinta um bloco n x n, entao a grade e (n - 1) menor.
  const gridRows = rows - n + 1
  const gridCols = cols - n + 1

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const run = attemptSteps(gridRows, gridCols, rules, rnd)

    let step
    while (!(step = run.next()).done) yield { attempt, ...step.value }

    const grid = step.value
    if (!grid) {
      yield { attempt, restart: true }
      continue
    }

    const board = Array.from({ length: rows }, () => new Array(cols))
    grid.forEach((row, r) => row.forEach((k, c) => {
      const pattern = rules.patterns[k]
      for (let i = 0; i < n; i += 1) for (let j = 0; j < n; j += 1) board[r + i][c + j] = pattern[i * n + j]
    }))

    return { ok: true, attempts: attempt, board }
  }

  return { ok: false, attempts: maxAttempts, board: null }
}

// Gera sem animar. Retorna { ok, board, attempts }.
export function generate(input, options) {
  const run = collapse(input, options)

  let step
  while (!(step = run.next()).done);
  return step.value
}
