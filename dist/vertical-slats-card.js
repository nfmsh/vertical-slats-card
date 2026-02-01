/* Vertical Slats Card
 *
 * Animated fabric-style vertical blinds for Home Assistant
 *
 * Required:
 *   entity: cover.*
 *   visual_entity: input_number.* (0–100)
 *
 * Optional:
 *   open_script, close_script
 *   invert, show_meter, show_buttons, slats
 *   slat_color: CSS color (hex recommended for auto-tint)
 *   slat_shine_color: optional override
 *
 * Auto-tint (lux):
 *   auto_tint: "lux" | "off" (default "off")
 *   light_entity: sensor.* (outside illuminance)
 *   lux_min: number (default 0)
 *   lux_max: number (default 60000)
 *   fabric_mode: boolean (default true)
 */

const LitElement = Object.getPrototypeOf(customElements.get("ha-panel-lovelace"));
const html = LitElement.prototype.html;
const css = LitElement.prototype.css;

class VerticalSlatsCard extends LitElement {
  static get properties() {
    return { hass: {}, config: {} };
  }

  // ---- Lovelace editor hooks ----
  static getConfigElement() {
    return document.createElement("vertical-slats-card-editor");
  }

  static getStubConfig() {
    return {
      type: "custom:vertical-slats-card",
      name: "Vertical Blinds",
      entity: "",
      visual_entity: "",
      show_buttons: true,
      show_meter: false,
      invert: false,
      slats: 11,
      fabric_mode: true,
      auto_tint: "off",
      light_entity: "",
      lux_min: 0,
      lux_max: 60000,
      slat_color: "#e7e1d6",
      slat_shine_color: "",
      open_script: "",
      close_script: "",
    };
  }

  setConfig(config) {
    if (!config.entity) throw new Error("Missing 'entity' (cover.*).");
    if (!config.visual_entity) throw new Error("Missing 'visual_entity' (input_number.*).");

    this.config = {
      name: "Vertical Blinds",
      slats: 11,
      open_value: 100,
      close_value: 0,
      show_buttons: true,
      show_meter: false,
      invert: false,

      slat_color: null,
      slat_shine_color: null,

      fabric_mode: true,
      auto_tint: "off",
      light_entity: null,
      lux_min: 0,
      lux_max: 60000,

      open_script: null,
      close_script: null,

      ...config,
    };
  }

  getCardSize() {
    return this.config.show_buttons ? 3 : 2;
  }

  _clamp(v) {
    v = Number(v);
    if (!Number.isFinite(v)) return 0;
    return Math.max(0, Math.min(100, v));
  }

  _clamp01(v) {
    v = Number(v);
    if (!Number.isFinite(v)) return 0;
    return Math.max(0, Math.min(1, v));
  }

  _getVisualTilt() {
    const st = this.hass?.states?.[this.config.visual_entity];
    return st ? this._clamp(st.state) : 0;
  }

  async _setVisualTilt(v) {
    await this.hass.callService("input_number", "set_value", {
      entity_id: this.config.visual_entity,
      value: this._clamp(v),
    });
  }

  async _open() {
    if (this.config.open_script) {
      await this.hass.callService("script", "turn_on", { entity_id: this.config.open_script });
      return;
    }
    await this.hass.callService("cover", "open_cover", { entity_id: this.config.entity });
    await this._setVisualTilt(this.config.open_value);
  }

  async _close() {
    if (this.config.close_script) {
      await this.hass.callService("script", "turn_on", { entity_id: this.config.close_script });
      return;
    }
    await this.hass.callService("cover", "close_cover", { entity_id: this.config.entity });
    await this._setVisualTilt(this.config.close_value);
  }

  async _toggle() {
    return this._getVisualTilt() >= 50 ? this._close() : this._open();
  }

  /* ---------- Auto-tint helpers ---------- */

  _parseHexColor(input) {
    if (typeof input !== "string") return null;
    const hex = input.trim().replace("#", "");
    if (![3, 6].includes(hex.length)) return null;

    const full = hex.length === 3
      ? hex.split("").map((c) => c + c).join("")
      : hex;

    const n = Number.parseInt(full, 16);
    if (!Number.isFinite(n)) return null;

    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  }

  _rgbToHex({ r, g, b }) {
    const to2 = (x) => x.toString(16).padStart(2, "0");
    return `#${to2(r)}${to2(g)}${to2(b)}`;
  }

  _mix(a, b, t) {
    return Math.round(a + (b - a) * t);
  }

  _mixColor(c1, c2, t) {
    return {
      r: this._mix(c1.r, c2.r, t),
      g: this._mix(c1.g, c2.g, t),
      b: this._mix(c1.b, c2.b, t),
    };
  }

  _getLuxFactorSafe() {
    if (this.config.auto_tint !== "lux") return null;
    if (!this.config.light_entity) return null;

    const st = this.hass?.states?.[this.config.light_entity];
    if (!st || st.state === "unknown" || st.state === "unavailable") return null;

    const lux = Number(st.state);
    if (!Number.isFinite(lux)) return null;

    const min = Number(this.config.lux_min);
    const max = Number(this.config.lux_max);
    if (!Number.isFinite(min) || !Number.isFinite(max) || max <= min) return null;

    return this._clamp01((lux - min) / (max - min));
  }

  _computeFabricColors() {
    const baseHex = this.config.slat_color;
    const baseRgb = this._parseHexColor(baseHex);

    if (!baseRgb) {
      return {
        slatColor: baseHex || "var(--primary-text-color)",
        shineColor: this.config.slat_shine_color || "rgba(255,255,255,0.22)",
        baseOpacity: this.config.fabric_mode ? 0.75 : 0.85,
        shineOpacity: this.config.fabric_mode ? 0.35 : 0.55,
      };
    }

    const k = this._getLuxFactorSafe();
    if (k === null) {
      return {
        slatColor: baseHex,
        shineColor: this.config.slat_shine_color || "rgba(255,255,255,0.25)",
        baseOpacity: 0.78,
        shineOpacity: 0.32,
      };
    }

    const warmWhite = { r: 250, g: 248, b: 244 };
    const softDeep  = { r: 60,  g: 60,  b: 62 };

    const brighten = 0.10 + 0.18 * k;
    const deepen   = 0.08 * (1 - k);

    const brightened = this._mixColor(baseRgb, warmWhite, brighten);
    const finalRgb   = this._mixColor(brightened, softDeep, deepen);

    return {
      slatColor: this._rgbToHex(finalRgb),
      shineColor: this.config.slat_shine_color || "rgba(255,255,255,0.25)",
      baseOpacity: 0.78,
      shineOpacity: 0.32,
    };
  }

  render() {
    if (!this.hass || !this.config) return html``;

    const tilt = this._getVisualTilt();
    const t0 = tilt / 100;
    const t = this.config.invert ? (1 - t0) : t0;
    const sx = 0.10 + 0.90 * t;

    const slatCount = Math.max(3, Math.min(25, Number(this.config.slats)));
    const slats = Array.from({ length: slatCount }, (_, i) => i);

    const colors = this._computeFabricColors();

    return html`
      <ha-card>
        <div class="wrap">
          <div class="header">
            <div class="title">${this.config.name}</div>
          </div>

          <div class="viz" @click=${this._toggle} role="button" tabindex="0">
            <div
              class="slatRow"
              style="
                --sx:${sx};
                --slat-color:${colors.slatColor};
                --shine-color:${colors.shineColor};
                --slat-base-opacity:${colors.baseOpacity};
                --slat-shine-opacity:${colors.shineOpacity};
              "
            >
              ${slats.map((i) => {
                const wave = Math.sin((i / Math.max(1, slatCount - 1)) * Math.PI) * 0.08;
                const local = Math.max(0.08, sx * (1 - wave));
                return html`
                  <div class="slat" style="--lsx:${local};">
                    <div class="slatBase"></div>
                    <div class="slatShine"></div>
                  </div>
                `;
              })}
            </div>
          </div>
        </div>
      </ha-card>
    `;
  }

  static get styles() {
    return css`
      ha-card { overflow: hidden; }
      .wrap { padding: 14px; display: grid; gap: 12px; }
      .title { font-size: 1.05rem; font-weight: 650; }
      .viz { border-radius: 14px; padding: 10px; background: rgba(0,0,0,0.06); cursor: pointer; }
      .slatRow { display: grid; grid-auto-flow: column; gap: 6px; height: 92px; }
      .slat { position: relative; border-radius: 10px; overflow: hidden; }
      .slatBase, .slatShine {
        position: absolute;
        inset: 0;
        transform-origin: 50% 50%;
        transform: scaleX(var(--lsx, var(--sx)));
        transition: transform 320ms ease;
        border-radius: 10px;
      }
      .slatBase { background: var(--slat-color); opacity: var(--slat-base-opacity); }
      .slatShine {
        background: linear-gradient(90deg, transparent, var(--shine-color), transparent);
        opacity: var(--slat-shine-opacity);
        mix-blend-mode: overlay;
      }
    `;
  }
}

customElements.define("vertical-slats-card", VerticalSlatsCard);
window.customCards = window.customCards || [];
window.customCards.push({
  type: "vertical-slats-card",
  name: "Vertical Slats Card",
  description: "Animated fabric-style vertical blinds with optional lux auto-tint.",
});
