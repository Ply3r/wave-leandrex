<script>
  import { generate } from './utils/wfc';
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
        return this.is_done ? this.full_board : this.initial_board;
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
        this.is_done = false; // o resultado anterior era de outro desenho
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

      finish() {
        const result = generate(this.initial_board, {
          rows: this.full_maze_size,
          cols: this.full_maze_size
        });

        this.attempts = result.attempts;

        if (!result.ok) {
          this.error = "Could not build a board from this drawing. Try drawing more of the pattern.";
          return;
        }

        this.error = "";
        this.full_board = result.board;
        this.is_done = true;
      },

      clear() {
        this.is_done = false;
        this.error = "";
        this.attempts = 0;
        this.create_boards();
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
      <v-row>
        <v-col>
          <v-btn
            @click="finish"
            class="d-flex justify-center mt-2"
            color="success"
            block
          >
            Finish
          </v-btn>
          <v-btn
            @click="clear"
            class="d-flex justify-center mt-2"
            block
          >
            Clear
          </v-btn>
          <v-alert v-if="error" class="mt-4" type="warning" density="compact">
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
          :style="{ backgroundColor: col }"
          class="col"
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

@media only screen and (max-width: 900px) {
  .container {
    --board-size: min(800px, calc(100vw - 32px));

    flex-direction: column-reverse;
    justify-content: flex-start;
  }
}
</style>
