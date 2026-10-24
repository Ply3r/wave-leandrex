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

// Uma tentativa. Devolve a matriz de indices de cor, ou null se houve contradicao.
function attempt(rows, cols, { weights, allowed }, rnd) {
  const n = weights.length
  const cells = rows * cols
  const possible = new Uint8Array(cells * n).fill(1)
  const count = new Int32Array(cells).fill(n)

  // Remove de `cell` as cores que nenhum vizinho ja decidido permite. Falso = contradicao.
  const propagate = (start) => {
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

  // Poda inicial: cores que nao cabem em lugar nenhum (ex.: so aparecem no canto da entrada).
  if (!propagate(Array.from({ length: cells }, (_, i) => i))) return null

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

    if (next === -1) break // todas as celulas tem exatamente uma cor

    // Sorteia a cor pelo peso (frequencia na entrada) entre as ainda possiveis.
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

    if (!propagate([next])) return null
  }

  const board = []
  for (let r = 0; r < rows; r += 1) {
    const row = []
    for (let c = 0; c < cols; c += 1) {
      const cell = r * cols + c
      for (let k = 0; k < n; k += 1) if (possible[cell * n + k]) row.push(k)
    }
    board.push(row)
  }
  return board
}

// Gera um tabuleiro rows x cols parecido com a entrada. Em caso de contradicao, tenta de novo.
// Retorna { ok, board, attempts }; `board` e uma matriz de cores (as mesmas da entrada).
export function generate(input, { rows, cols, patternSize = 3, rnd = Math.random, maxAttempts = 100 } = {}) {
  const n = Math.min(patternSize, input.length, input[0].length)
  const rules = learnRules(input, n)

  // Cada celula da grade de tiles pinta um bloco n x n, entao a grade e (n - 1) menor.
  const gridRows = rows - n + 1
  const gridCols = cols - n + 1

  for (let attempts = 1; attempts <= maxAttempts; attempts += 1) {
    const grid = attempt(gridRows, gridCols, rules, rnd)
    if (!grid) continue

    const board = Array.from({ length: rows }, () => new Array(cols))
    grid.forEach((row, r) => row.forEach((k, c) => {
      const pattern = rules.patterns[k]
      for (let i = 0; i < n; i += 1) for (let j = 0; j < n; j += 1) board[r + i][c + j] = pattern[i * n + j]
    }))

    return { ok: true, attempts, board }
  }

  return { ok: false, attempts: maxAttempts, board: null }
}
