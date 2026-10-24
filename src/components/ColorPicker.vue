<script>
  import { clamp, hexToHsv, hsvToHex, normalizeHex } from '../utils/color';

  const PRESETS = [
    '#000000', '#7F7F7F', '#8B4513', '#E53935', '#FB8C00', '#FDD835',
    '#43A047', '#00897B', '#1E88E5', '#3949AB', '#8E24AA', '#EC407A'
  ];

  export default {
    props: {
      modelValue: { type: String, default: '#000000' },
      // cores ja usadas no desenho, para reaproveitar com um clique
      swatches: { type: Array, default: () => [] }
    },
    emits: ['update:modelValue'],
    data() {
      const [h, s, v] = hexToHsv(this.modelValue) || [0, 0, 0];

      return { h, s, v, dragging: null, hex_text: normalizeHex(this.modelValue) || '#000000', presets: PRESETS };
    },
    computed: {
      hex() {
        return hsvToHex(this.h, this.s, this.v);
      },
      hue_color() {
        return hsvToHex(this.h, 1, 1);
      }
    },
    watch: {
      modelValue(value) {
        // mudou por fora (ex.: clicou numa amostra); so sincroniza se for outra cor
        const hex = normalizeHex(value);
        if (!hex || hex === this.hex) return;

        const [h, s, v] = hexToHsv(hex);
        // cinza/preto/branco nao tem matiz: mantem o que estava para o seletor nao "pular"
        if (s > 0 && v > 0) this.h = h;
        this.s = s;
        this.v = v;
        this.hex_text = hex;
      }
    },
    methods: {
      commit() {
        this.hex_text = this.hex;
        this.$emit('update:modelValue', this.hex);
      },

      // posicao do ponteiro dentro do elemento, de 0 a 1 em cada eixo
      relative(event, element) {
        const rect = element.getBoundingClientRect();

        return [
          clamp((event.clientX - rect.left) / rect.width),
          clamp((event.clientY - rect.top) / rect.height)
        ];
      },

      startDrag(kind, event) {
        this.dragging = kind;
        event.currentTarget.setPointerCapture(event.pointerId);
        this.drag(kind, event);
      },

      drag(kind, event) {
        if (this.dragging !== kind) return;

        const [x, y] = this.relative(event, event.currentTarget);
        if (kind === 'area') {
          this.s = x;
          this.v = 1 - y;
        } else {
          this.h = x * 360;
        }
        this.commit();
      },

      endDrag(event) {
        this.dragging = null;
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
          event.currentTarget.releasePointerCapture(event.pointerId);
        }
      },

      // teclado: setas movem 1% (Shift: 10%)
      keyArea(event) {
        const step = event.shiftKey ? 0.1 : 0.01;
        const moves = {
          ArrowLeft: () => { this.s = clamp(this.s - step); },
          ArrowRight: () => { this.s = clamp(this.s + step); },
          ArrowUp: () => { this.v = clamp(this.v + step); },
          ArrowDown: () => { this.v = clamp(this.v - step); }
        };
        if (!moves[event.key]) return;

        event.preventDefault();
        moves[event.key]();
        this.commit();
      },

      keyHue(event) {
        const step = event.shiftKey ? 30 : 3;
        const delta = { ArrowLeft: -step, ArrowDown: -step, ArrowRight: step, ArrowUp: step }[event.key];
        if (delta === undefined) return;

        event.preventDefault();
        this.h = clamp(this.h + delta, 0, 360);
        this.commit();
      },

      typeHex(event) {
        this.hex_text = event.target.value;

        const hex = normalizeHex(this.hex_text);
        if (!hex) return;

        const [h, s, v] = hexToHsv(hex);
        if (s > 0 && v > 0) this.h = h;
        this.s = s;
        this.v = v;
        this.$emit('update:modelValue', hex);
      },

      // ao sair do campo com texto invalido, volta para a cor atual
      resetHex() {
        this.hex_text = this.hex;
      },

      choose(hex) {
        this.$emit('update:modelValue', hex);
      }
    }
  }
</script>

<template>
  <div class="picker">
    <div
      class="picker_area"
      :style="{ backgroundColor: hue_color }"
      role="application"
      tabindex="0"
      aria-label="Color saturation and brightness. Use the arrow keys."
      @pointerdown="startDrag('area', $event)"
      @pointermove="drag('area', $event)"
      @pointerup="endDrag"
      @pointercancel="endDrag"
      @keydown="keyArea"
    >
      <div
        class="picker_handle"
        :style="{ left: s * 100 + '%', top: (1 - v) * 100 + '%', backgroundColor: hex }"
      ></div>
    </div>

    <div
      class="picker_hue"
      role="slider"
      tabindex="0"
      aria-label="Hue"
      aria-valuemin="0"
      aria-valuemax="360"
      :aria-valuenow="Math.round(h)"
      @pointerdown="startDrag('hue', $event)"
      @pointermove="drag('hue', $event)"
      @pointerup="endDrag"
      @pointercancel="endDrag"
      @keydown="keyHue"
    >
      <div
        class="picker_handle"
        :style="{ left: (h / 360) * 100 + '%', top: '50%', backgroundColor: hue_color }"
      ></div>
    </div>

    <div class="picker_row">
      <div class="picker_preview" :style="{ backgroundColor: hex }"></div>
      <input
        class="picker_hex"
        type="text"
        maxlength="7"
        spellcheck="false"
        aria-label="Hex color"
        :value="hex_text"
        @input="typeHex"
        @blur="resetHex"
      />
    </div>

    <template v-if="swatches.length">
      <div class="picker_title">In your drawing</div>
      <div class="picker_swatches">
        <button
          v-for="color in swatches"
          :key="'used' + color"
          class="picker_swatch"
          :class="{ picker_swatch_active: color === hex }"
          :style="{ backgroundColor: color }"
          :aria-label="'Use ' + color"
          @click="choose(color)"
        ></button>
      </div>
    </template>

    <div class="picker_title">Palette</div>
    <div class="picker_swatches">
      <button
        v-for="color in presets"
        :key="'preset' + color"
        class="picker_swatch"
        :class="{ picker_swatch_active: color === hex }"
        :style="{ backgroundColor: color }"
        :aria-label="'Use ' + color"
        @click="choose(color)"
      ></button>
    </div>
  </div>
</template>

<style scoped>
.picker {
  width: 100%;
  padding: 12px;
  border-radius: 12px;
  background: white;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.25);
}

.picker_area {
  position: relative;
  width: 100%;
  height: 150px;
  border-radius: 8px;
  cursor: crosshair;
  touch-action: none;
  /* branco -> cor na horizontal, transparente -> preto na vertical */
  background-image:
    linear-gradient(to top, #000, rgba(0, 0, 0, 0)),
    linear-gradient(to right, #fff, rgba(255, 255, 255, 0));
}

.picker_hue {
  position: relative;
  width: 100%;
  height: 14px;
  margin-top: 14px;
  border-radius: 7px;
  cursor: pointer;
  touch-action: none;
  background: linear-gradient(
    to right,
    #f00 0%, #ff0 17%, #0f0 33%, #0ff 50%, #00f 67%, #f0f 83%, #f00 100%
  );
}

.picker_handle {
  position: absolute;
  width: 18px;
  height: 18px;
  border: 3px solid white;
  border-radius: 50%;
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.45), 0 1px 4px rgba(0, 0, 0, 0.4);
  transform: translate(-50%, -50%);
  pointer-events: none;
}

.picker_area:focus-visible,
.picker_hue:focus-visible {
  outline: 3px solid rgba(0, 150, 110, 0.5);
  outline-offset: 2px;
}

.picker_row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 14px;
}

.picker_preview {
  flex: none;
  width: 38px;
  height: 38px;
  border-radius: 8px;
  box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.25);
}

.picker_hex {
  flex: 1;
  min-width: 0;
  height: 38px;
  padding: 0 10px;
  border: 1px solid rgba(0, 0, 0, 0.3);
  border-radius: 8px;
  font-family: monospace;
  font-size: 1rem;
  text-transform: uppercase;
}

.picker_hex:focus {
  outline: none;
  border-color: rgb(0, 150, 110);
  box-shadow: 0 0 0 3px rgba(0, 150, 110, 0.25);
}

.picker_title {
  margin: 14px 0 6px;
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: rgba(0, 0, 0, 0.55);
}

.picker_swatches {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.picker_swatch {
  width: 26px;
  height: 26px;
  border: 2px solid white;
  border-radius: 6px;
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.3);
  cursor: pointer;
}

.picker_swatch:hover {
  transform: scale(1.1);
}

.picker_swatch_active {
  box-shadow: 0 0 0 2px rgb(0, 150, 110);
}
</style>
