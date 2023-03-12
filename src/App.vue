<!-- eslint-disable no-unused-vars -->
<script>
  const full_maze_size = 100;
  const maze_size = Math.floor(full_maze_size / 10);

  export default {
    data: ()  => ({
      mouse_active: false,
      is_done: false,
      pencil_value: "#000000",
      full_maze_size: full_maze_size,
      maze_size: maze_size,
      initial_board: [],
      full_board: [],
      entropy_board: [],
    }),
    mounted() {
      this.setMouseEvents();
      this.create_boards();
    },
    watch: {
      is_done() {
        if (this.is_done) {
          this.waveFunction();
        }
      }
    },
    methods: {
      create_boards() {
        const initial_board = [];
        const full_board = [];

        for (let r = 0; r < this.full_maze_size; r++) {
          const i_row = [];
          const f_row = [];

          for (let c = 0; c < this.full_maze_size; c++) {
            if (c <= this.maze_size) i_row.push('#FFFFFF');
            f_row.push('#FFFFFF')
          }

          if (r <= this.maze_size) initial_board.push(i_row);
          full_board.push(f_row);
        }

        this.initial_board = initial_board;
        this.full_board = full_board;
      },
      setMouseEvents() {
        window.addEventListener('mousedown', () => {
          this.mouse_active = true;
        })

        window.addEventListener('mouseup', () => {
          this.mouse_active = false;
        })
      },
      draw(r_index, c_index) {
        if (!this.mouse_active) return;

        const new_row = [...this.initial_board[r_index]];
        new_row[c_index] = this.pencil_value;

        this.initial_board[r_index] = new_row;
      },
      mapNextTileColors(r_index, c_index) {
        const tiles = {
          up: this.initial_board[r_index - 1] ? this.initial_board[r_index - 1][c_index] : null,
          down: this.initial_board[r_index + 1] ? this.initial_board[r_index + 1][c_index] : null,
          left: this.initial_board[r_index] ? this.initial_board[r_index][c_index - 1] : null,
          right: this.initial_board[r_index] ? this.initial_board[r_index][c_index + 1] : null,
        }

        return tiles;
      },
      getTilesCompatibility() {
        const directions = ['up', 'down', 'left', 'right'];
        const colors = {}

        this.initial_board.forEach((row, r_index) => {
          row.forEach((color, c_index) => {
            const next_tiles_colors = this.mapNextTileColors(r_index, c_index);

            if (!Object.keys(colors).includes(color)) {
              colors[color] = directions.reduce((acc, direction) => {
                if (!next_tiles_colors[direction]) {
                  acc[direction] = [];
                  return acc;
                }

                acc[direction] = [next_tiles_colors[direction]];
                return acc;
              }, {})
            }

            directions.forEach((direction) => {
              if (!next_tiles_colors[direction]) return;
              if (!colors[color][direction]) return;
              if (colors[color][direction].includes(next_tiles_colors[direction])) return;

              colors[color][direction].push(next_tiles_colors[direction]);
            })
          })
        })

        return colors;
      },
      randInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1) + min);
      },
      getPosAndColor(pos, color) {
        let nex_pos;
        let next_color;

        return [nex_pos, next_color];
      },
      waveFunction() {
        const colors_compatibility = this.getTilesCompatibility();
        this.entropy_board = new Array(this.full_maze_size)
          .fill(new Array(this.full_maze_size).fill(Infinity));
        const backtrace = [];
        
        const colors_keys = Object.keys(colors_compatibility);
        let curr_color = colors_keys[this.randInt(0, colors_keys.length - 1)];
        let curr_pos = [this.randInt(0, this.full_maze_size), this.randInt(0, this.full_maze_size)];

        while (backtrace.length < this.full_maze_size * this.full_maze_size) {
          this.full_board[curr_pos[0]][curr_pos[1]] = curr_color;

          backtrace.push(curr_pos.toString());
          this.entropy_board[curr_pos[0]][curr_pos[1]] = 0;
          
          const [next_pos, next_color] = this.getPosAndColor(curr_pos, curr_color);
          curr_pos = next_pos;
          curr_color = next_color;
        }
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
            @click="is_done = true"
            class="d-flex justify-center"
            color="success"
            block
          >
            Finish
          </v-btn>
        </v-col>
      </v-row>
    </div>
    <div class="board">
      <div 
        v-for="(row, r_index) in !is_done ? initial_board : full_board"
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

.panel {
  top: 10%;
  left: 5%;
  width: 20vw;
  position: absolute;
}

.container {
  width: 100vw;
  height: 100vh;
  display: grid;
  place-items: center;
  background-color: rgb(179, 205, 196);
}

.board {
  width: 800px;
  height: 800px;
  background: white;
  border: 5px solid black;
  display: grid;
  grid-template-columns: repeat(1fr, 25);
  grid-template-rows: repeat(1fr, 25);
}

.pencil_active {
  filter: opacity(50%);
}

.pencil_button {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 2px solid white;
}

.row {
  display: flex;
}

.col {
  width: 100%;
  height: 100%;
}

</style>