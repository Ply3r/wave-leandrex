class Tile {
  constructor(pos, value) {
    this.pos = pos;
    this.value = value;
  }

  getOptions() {
    const obj = {}

    if (this.up) obj.up = this.up;
    if (this.down) obj.down = this.down;
    if (this.left) obj.left = this.left;
    if (this.right) obj.right = this.right;

    return obj
  }
}

export default Tile;