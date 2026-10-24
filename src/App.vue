<script>
  import { collapse, seededRandom } from './utils/wfc';
  import ColorPicker from './components/ColorPicker.vue';
  import RangeSlider from './components/RangeSlider.vue';

  const WHITE = '#FFFFFF';

  export default {
    components: { ColorPicker, RangeSlider },
    data: ()  => ({
      mouse_active: false,
      is_done: false,
      error: "",
      attempts: 0,
      run_id: 0, // incrementa para cancelar uma animacao em andamento
      animating: false,
      skipping: false,
      anim_speed: 5, // 1 (lento) a 10 (rapido)
      durations: [20, 12, 8, 5, 3.5, 2.5, 1.5, 1, 0.5, 0.2], // segundos por velocidade
      view_board: null, // tabuleiro de pixels {color, alpha} do passo atual
      focus: null, // celula decidida no ultimo passo
      undecided: 0,
      restarts: 0,
      tool: "draw", // draw | erase
      color: "#000000",
      full_maze_size: 20,
      output_input: 20, // valor do slider enquanto ele e arrastado
      maze_size: 10,
      initial_board: [],
      full_board: []
    }),
    computed: {
      // tabuleiro mostrado: o desenho de entrada ou o resultado gerado
      board() {
        if (this.animating && this.view_board) return this.view_board;
        return this.is_done ? this.full_board : this.initial_board;
      },
      // Duracao pretendida da animacao, em segundos, para a velocidade escolhida.
      duration() {
        return this.durations[this.anim_speed - 1];
      },
      // cores ja usadas no desenho (sem o branco, que e a borracha)
      used_colors() {
        return [...new Set(this.initial_board.flat())].filter((color) => color !== WHITE);
      }
    },
    mounted() {
      this.create_boards();
      window.addEventListener('mousedown', this.onMouseDown);
      window.addEventListener('mouseup', this.onMouseUp);
    },
    beforeUnmount() {
      window.removeEventListener('mousedown', this.onMouseDown);
      window.removeEventListener('mouseup', this.onMouseUp);
    },
    methods: {
      blank(size) {
        return Array.from({ length: size }, () => new Array(size).fill(WHITE));
      },

      create_boards() {
        this.initial_board = this.blank(this.maze_size);
        this.full_board = this.blank(this.full_maze_size);
      },

      // Muda o tamanho do desenho mantendo o que ja foi pintado (a partir do canto superior esquerdo).
      resizeInput(size) {
        const board = this.blank(size);
        this.initial_board.forEach((row, r) => row.forEach((color, c) => {
          if (r < size && c < size) board[r][c] = color;
        }));

        this.maze_size = size;
        this.initial_board = board;
        this.cancel(); // o resultado (ou a animacao) era de outro desenho
        this.is_done = false;
        this.error = "";
      },

      // Muda o tamanho do resultado; se ja havia um, gera de novo no tamanho novo.
      resizeOutput(size) {
        this.full_maze_size = size;
        this.full_board = this.blank(size);
        if (this.is_done) this.finish();
      },

      onMouseDown() {
        this.mouse_active = true;
      },

      onMouseUp() {
        this.mouse_active = false;
      },

      draw(r_index, c_index) {
        if (!this.mouse_active || this.is_done) return;
        this.paint(r_index, c_index);
      },

      paint(r_index, c_index) {
        if (this.is_done) return;

        const new_row = [...this.initial_board[r_index]];
        new_row[c_index] = this.tool === "erase" ? WHITE : this.color;

        this.initial_board[r_index] = new_row;
      },

      cancel() {
        this.run_id += 1;
        this.animating = false;
        this.skipping = false;
        this.view_board = null;
        this.focus = null;
      },

      // Roda o WFC passo a passo, desenhando o estado a cada quadro. Celulas indecisas ficam
      // transparentes (quanto menos opcoes, mais opacas) e a ultima decidida ganha um contorno.
      async finish() {
        this.cancel();
        const run_id = this.run_id;

        const options = { rows: this.full_maze_size, cols: this.full_maze_size };

        // Passada rapida so para contar os quadros; a animacao repete a mesma execucao (mesma
        // semente) e mostra varios quadros por vez para durar o tempo escolhido no slider.
        const seed = Math.floor(Math.random() * 2 ** 32);
        const counter = collapse(this.initial_board, { ...options, rnd: seededRandom(seed) });
        let frames = 0;
        while (!counter.next().done) frames += 1;

        const run = collapse(this.initial_board, { ...options, rnd: seededRandom(seed) });
        const batch_size = Math.max(1, Math.ceil(frames / (this.duration * 60)));

        this.error = "";
        this.restarts = 0;
        this.is_done = true;
        this.animating = true;

        let step;
        for (;;) {
          const delay = this.skipping ? 0 : 16;
          const batch = this.skipping ? Infinity : batch_size;

          let last = null;
          for (let i = 0; i < batch; i += 1) {
            step = run.next();
            if (step.done) break;

            if (step.value.restart) this.restarts += 1;
            last = step.value;
          }

          if (run_id !== this.run_id) return; // cancelado (Clear, outro tamanho, outro Finish)
          if (step.done) break;

          // view() so vale antes do proximo next(); por isso e chamada aqui, logo apos o lote
          if (last && last.view) {
            this.view_board = last.view();
            this.focus = last.focus;
            this.undecided = last.undecided();
          }

          await new Promise((resolve) => setTimeout(resolve, delay));
          if (run_id !== this.run_id) return;
        }

        const result = step.value;
        this.attempts = result.attempts;
        this.animating = false;
        this.skipping = false;
        this.view_board = null;
        this.focus = null;

        if (!result.ok) {
          this.is_done = false;
          this.error = "Could not build a board from this drawing. Try drawing more of the pattern.";
          return;
        }

        this.full_board = result.board;
      },

      skip() {
        this.skipping = true;
      },

      clear() {
        this.cancel();
        this.is_done = false;
        this.error = "";
        this.attempts = 0;
        this.create_boards();
      },

      tileStyle(cell) {
        if (typeof cell === "string") return { backgroundColor: cell };
        return { backgroundColor: cell.color, opacity: cell.alpha };
      }
    }
  }
</script>

<template>
  <div class="container">
    <div class="panel">
      <v-row>
        <v-col>
          <ColorPicker v-model="color" :swatches="used_colors" @update:model-value="tool = 'draw'" />
        </v-col>
      </v-row>
      <v-row>
        <v-col>
          <v-btn-toggle v-model="tool" mandatory class="d-flex justify-center">
            <v-btn value="draw">
              <v-icon>mdi-pencil</v-icon>
            </v-btn>

            <v-btn value="erase">
              <v-icon>mdi-eraser-variant</v-icon>
            </v-btn>
          </v-btn-toggle>
        </v-col>
      </v-row>
      <RangeSlider
        :model-value="maze_size"
        label="Drawing size"
        :value-text="`${maze_size} × ${maze_size}`"
        hint="keeps your drawing"
        :min="5"
        :max="24"
        @update:model-value="resizeInput"
      />
      <RangeSlider
        v-model="output_input"
        label="Result size"
        :value-text="`${output_input} × ${output_input}`"
        hint="regenerates the result"
        :min="10"
        :max="40"
        @change="resizeOutput"
      />
      <RangeSlider
        v-model="anim_speed"
        label="Animation speed"
        :value-text="`~${duration} s`"
        hint="slow to fast"
        :min="1"
        :max="10"
      />
      <v-row>
        <v-col>
          <v-btn
            @click="finish"
            :disabled="animating"
            class="d-flex justify-center mt-2"
            color="success"
            block
          >
            Finish
          </v-btn>
          <v-btn
            v-if="animating"
            @click="skip"
            class="d-flex justify-center mt-2"
            variant="tonal"
            block
          >
            Skip animation
          </v-btn>
          <v-btn
            @click="clear"
            class="d-flex justify-center mt-2"
            block
          >
            Clear
          </v-btn>
          <v-alert v-if="animating" class="mt-4" type="info" density="compact">
            {{ undecided }} cells undecided<span v-if="restarts"> · restarted {{ restarts }}x</span>
            <div class="legend">Faded = undecided. Red outline = just decided.</div>
          </v-alert>
          <v-alert v-else-if="error" class="mt-4" type="warning" density="compact">
            {{ error }}
          </v-alert>
          <v-alert v-else-if="is_done" class="mt-4" type="success" density="compact">
            Done in {{ attempts }} {{ attempts === 1 ? "attempt" : "attempts" }}
          </v-alert>
        </v-col>
      </v-row>
    </div>
    <div
      class="board"
      :style="{ gridTemplateColumns: `repeat(${board.length}, 1fr)`, gridTemplateRows: `repeat(${board.length}, 1fr)` }"
    >
      <div
        v-for="(row, r_index) in board"
        :key="r_index + '- row'"
        class="row"
      >
        <div
          v-for="(col, c_index) in row"
          :key="c_index + '- col - ' + r_index + ' - row'"
          @mouseover="draw(r_index, c_index)"
          @mousedown="paint(r_index, c_index)"
          :style="tileStyle(col)"
          :class="{ col: true, tile_focus: focus && focus[0] === r_index && focus[1] === c_index }"
          draggable="false"
        ></div>
      </div>
    </div>
  </div>
</template>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  overflow-x: hidden;
}

.container {
  --board-size: min(800px, calc(100vw - 32px), calc(100vh - 32px));

  min-height: 100vh;
  padding: 16px;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 24px;
  background-color: rgb(179, 205, 196);
}

.panel {
  width: 300px;
  max-width: 100%;
}

.board {
  width: var(--board-size);
  height: var(--board-size);
  background: white;
  border: 5px solid black;
  display: grid;
  user-select: none;
}

.row {
  display: contents;
}

.col {
  min-width: 0;
  min-height: 0;
}

.tile_focus {
  position: relative;
  z-index: 1;
  outline: 2px solid #e53935;
  outline-offset: -2px;
}

.legend {
  margin-top: 4px;
  font-size: 0.75rem;
  opacity: 0.85;
}

@media only screen and (max-width: 900px) {
  .container {
    --board-size: min(800px, calc(100vw - 32px));

    flex-direction: column-reverse;
    justify-content: flex-start;
  }
}
</style>
