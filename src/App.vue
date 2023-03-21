<!-- eslint-disable no-unused-vars -->
<script>
  import Tile from './utils/Tile';

  const full_maze_size = 20;
  const maze_size = 10;

  export default {
    data: ()  => ({
      mouse_active: false,
      is_done: false,
      pencil_value: "#000000",
      full_maze_size: full_maze_size,
      maze_size: maze_size,
      initial_board: [],
      full_board: [],
      color_pallet: []
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

      mapTileColor(r_index, c_index) {
        const tile = new Tile([r_index, c_index], this.initial_board[r_index][c_index])

        if (this.initial_board[r_index][c_index] !== '#FFFFFF') {
          this.color_pallet = [...new Set([...this.color_pallet, this.initial_board[r_index][c_index]])];
        }

        if (this.initial_board[r_index - 1] && this.initial_board[r_index - 1][c_index]) {
          tile.up = this.initial_board[r_index - 1][c_index];
        }

        if (this.initial_board[r_index + 1] && this.initial_board[r_index + 1][c_index]) {
          tile.down = this.initial_board[r_index + 1][c_index];
        }

        if (this.initial_board[r_index][c_index - 1]) {
          tile.left = this.initial_board[r_index][c_index - 1];
        }

        if (this.initial_board[r_index][c_index + 1]) {
          tile.right = this.initial_board[r_index][c_index + 1];
        }

        return tile;
      },

      getTilesCompatibility() {
        const colors_compatibility = []

        this.initial_board.forEach((row, r_index) => {
          row.forEach((_color, c_index) => {
            colors_compatibility.push(this.mapTileColor(r_index, c_index))
          })
        })

        return colors_compatibility;
      },

      randInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1) + min);
      },

      mapEntropy(curr_pos, curr_color, entropy_board) {
        const entropy_index = entropy_board.findIndex(({ pos }) => pos.toString() === curr_pos.toString());
        entropy_board[entropy_index] = { ...entropy_board[entropy_index], color: curr_color };

        if (this.full_board[curr_pos[0] - 1] && this.full_board[curr_pos[0] - 1][curr_pos[1]]) {
          const up_options = entropy_board.filter(tile => {
            return [
              tile.pos.toString() === [curr_pos[0] - 2, curr_pos[1]].toString(),
              tile.pos.toString() === [curr_pos[0], curr_pos[1] - 1].toString(),
              tile.pos.toString() === [curr_pos[0], curr_pos[1] + 1].toString(),
              tile.pos.toString() === curr_pos.toString(),
            ].some(Boolean)
          }).length;
          entropy_board.push({ options: up_options, pos: [curr_pos[0] - 1, curr_pos[1]], color: null});
        }
        
        if (this.full_board[curr_pos[0] + 1] && this.full_board[curr_pos[0] + 1][curr_pos[1]]) {
          const down_options = entropy_board.filter(tile => {
            return [
              tile.pos.toString() === [curr_pos[0] + 2, curr_pos[1]].toString(),
              tile.pos.toString() === [curr_pos[0], curr_pos[1] - 1].toString(),
              tile.pos.toString() === [curr_pos[0], curr_pos[1] + 1].toString(),
              tile.pos.toString() === curr_pos.toString(),
            ].some(Boolean)
          }).length;
          entropy_board.push({ options: down_options, pos: [curr_pos[0] + 1, curr_pos[1]], color: null});
        }
        
        if (this.full_board[curr_pos[0]][curr_pos[1] - 1]) {
          const left_options = entropy_board.filter(tile => {
            return [
              tile.pos.toString() === [curr_pos[0] - 1, curr_pos[1] - 2].toString(),
              tile.pos.toString() === [curr_pos[0] + 1, curr_pos[1] - 2].toString(),
              tile.pos.toString() === [curr_pos[0], curr_pos[1] - 1].toString(),
              tile.pos.toString() === curr_pos.toString(),
            ].some(Boolean)
          }).length;
          entropy_board.push({ options: left_options, pos: [curr_pos[0], curr_pos[1] - 1], color: null});
        }
        
        if (this.full_board[curr_pos[0]][curr_pos[1] + 1]) {
          const right_options = entropy_board.filter(tile => {
            return [
              tile.pos.toString() === [curr_pos[0] - 1, curr_pos[1] + 2].toString(),
              tile.pos.toString() === [curr_pos[0] + 1, curr_pos[1] + 2].toString(),
              tile.pos.toString() === [curr_pos[0], curr_pos[1] + 1].toString(),
              tile.pos.toString() === curr_pos.toString(),
            ].some(Boolean)
          }).length;
          entropy_board.push({ options: right_options, pos: [curr_pos[0], curr_pos[1] + 1], color: null});
        }
      },
      mapNextColors(next_pos, entropy_board) {
        return [...new Set(
          this.colors_compatibility
            .filter(tile => {
              const directions = {
                up: [next_pos.pos[0] - 1, next_pos.pos[1]].toString(),
                down: [next_pos.pos[0] + 1, next_pos.pos[1]].toString(),
                left: [next_pos.pos[0], next_pos.pos[1] - 1].toString(),
                right: [next_pos.pos[0], next_pos.pos[1] + 1].toString(),
              }
              
              const obj = {}
              const entries = Object.entries(directions);
              entries.forEach(([key, value]) => {
                const color = entropy_board.filter((a) => a.color).find(tile => tile.pos.toString() === value);

                if (color) {
                  obj[key] = color.color;
                }
              })

              return Object.entries(obj).every(([key, value]) => {
                return tile[key] === value;
              })
            }).map(tile => tile.value)
        )]
      },
      waveFunction() {
        this.colors_compatibility = this.getTilesCompatibility();
        let curr_pos = [this.randInt(0, this.full_maze_size), this.randInt(0, this.full_maze_size)];
        let curr_color = this.color_pallet[this.randInt(0, this.color_pallet.length - 1)];

        const entropy_board = [{ options: 0, pos: curr_pos, color: curr_color}];
        const backtrace = [];

        while (backtrace.length < this.full_maze_size ** 2) {
          this.full_board[curr_pos[0]][curr_pos[1]] = curr_color;
          this.mapEntropy(curr_pos, curr_color, entropy_board);
          backtrace.push(curr_pos.toString());

          const next_pos = entropy_board.filter(({ color, pos }) => !color && !backtrace.includes(pos.toString())).sort((a, b) => b.options - a.options)[0];
          const next_color = this.mapNextColors(next_pos, entropy_board);

          curr_pos = next_pos.pos;
          curr_color = next_color[this.randInt(0, next_color.length - 1)];
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
          <v-btn
            @click="() => {
              is_done = false;
              create_boards();
            }"
            class="d-flex justify-center mt-2"
            block
          >
            Clear
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