<script>
  import { generate } from './utils/wfc';

  export default {
    data: ()  => ({
      mouse_active: false,
      is_done: false,
      error: "",
      attempts: 0,
      pencil_value: "#000000",
      full_maze_size: 20,
      maze_size: 10,
      initial_board: [],
      full_board: []
    }),
    computed: {
      // tabuleiro mostrado: o desenho de entrada ou o resultado gerado
      board() {
        return this.is_done ? this.full_board : this.initial_board;
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
      create_boards() {
        const blank = (size) => Array.from({ length: size }, () => new Array(size).fill('#FFFFFF'));

        this.initial_board = blank(this.maze_size);
        this.full_board = blank(this.full_maze_size);
      },

      onMouseDown() {
        this.mouse_active = true;
      },

      onMouseUp() {
        this.mouse_active = false;
      },

      draw(r_index, c_index) {
        if (!this.mouse_active || this.is_done) return;

        const new_row = [...this.initial_board[r_index]];
        new_row[c_index] = this.pencil_value;

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
        <v-col class="my-5 d-flex justify-center">
          <v-color-picker
            v-model="pencil_value"
          ></v-color-picker>
        </v-col>
      </v-row>
      <v-row>
        <v-col>
          <v-btn-toggle v-model="pencil_value" class="d-flex justify-center">
            <v-btn value="#000000">
              <v-icon>mdi-pencil</v-icon>
            </v-btn>

            <v-btn value="#FFFFFF">
              <v-icon>mdi-eraser-variant</v-icon>
            </v-btn>
          </v-btn-toggle>
        </v-col>
      </v-row>
      <v-row>
        <v-col>
          <v-btn
            @click="finish"
            class="d-flex justify-center"
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
