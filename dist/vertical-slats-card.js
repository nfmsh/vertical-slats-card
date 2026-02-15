/* Vertical Slats Card (single-file bundle: card + editor)
 *
 * Animated fabric-style vertical blinds for Home Assistant.
 *
 * Required:
 *   entity: cover.*
 *   visual_entity: input_number.* (0–100)  // used for animation state
 *
 * Optional:
 *   open_script: script.*   // called on Open
 *   close_script: script.*  // called on Close
 *   invert: boolean
 *   show_buttons: boolean
 *   show_meter: boolean
 *   slats: number (3..25)
 *
 * Colors:
 *   slat_color: CSS color (hex recommended if auto_tint=lux)
 *   slat_shine_color: CSS color (optional)
 *
 * Lux auto-tint (appearance only):
 *   auto_tint: "off" | "lux"
 *   light_entity: sensor.*
 *   lux_min: number
 *   lux_max: number
 *   fabric_mode: boolean
 */

(() => {
  const LitElement = Object.getPrototypeOf(customElements.get("ha-panel-lovelace"));
  const html = LitElement.prototype.html;
  const css = LitElement.prototype.css;

  // ------------------------------ CARD ------------------------------
  class VerticalSlatsCard extends LitElement {
    static get properties() {
      return { hass: {}, config: {} };
    }

    // Lovelace editor hooks
    static getConfigElement() {
      return document.createElement("vertical-slats-card-editor");
    }

    static getStubConfig() {
      return {
        type: "custom:vertical-slats-card",
        name: "Vertical Blinds",
        entity: "",
        visual_entity: "",
        open_script: "",
        close_script: "",
        invert: false,
        show_buttons: true,
        show_meter: false,
        slats: 11,
        fabric_mode: true,
        auto_tint: "off",
        light_entity: "",
        lux_min: 0,
        lux_max: 60000,
        slat_color: "#e7e1d6",
        slat_shine_color: "",
      };
    }

    setConfig(config) {
      if (!config.entity) throw new Error("Missing 'entity' (cover.*).");
      if (!config.visual_entity) throw new Error("Missing 'visual_entity' (input_number.*).");

      this.config = {
        name: "Vertical Blinds",
        slats: 11,
        show_buttons: true,
        show_meter: false,
        invert: false,

        open_script: null,
        close_script: null,

        // colors
        slat_color: null,
        slat_shine_color: null,

        // fabric & tint
        fabric_mode: true,
        auto_tint: "off", // "off" | "lux"
        light_entity: null,
        lux_min: 0,
        lux_max: 60000,

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

    _getState(entityId) {
      return this.hass?.states?.[entityId] || null;
    }

    _getVisualTilt() {
      const st = this._getState(this.config.visual_entity);
      return st ? this._clamp(st.state) : 0;
    }

    async _setVisualTilt(v) {
      await this.hass.callService("input_number", "set_value", {
        entity_id: this.config.visual_entity,
        value: this._clamp(v),
      });
    }

    async _runScript(entityId) {
      if (!entityId) return;
      await this.hass.callService("script", "turn_on", { entity_id: entityId });
    }

    async _open() {
      if (this.config.open_script) {
        await this._runScript(this.config.open_script);
        return;
      }
      await this.hass.callService("cover", "open_cover", { entity_id: this.config.entity });
      await this._setVisualTilt(100);
    }

    async _close() {
      if (this.config.close_script) {
        await this._runScript(this.config.close_script);
        return;
      }
      await this.hass.callService("cover", "close_cover", { entity_id: this.config.entity });
      await this._setVisualTilt(0);
    }

    async _toggle() {
      return this._getVisualTilt() >= 50 ? this._close() : this._open();
    }

    _onKeyDown(ev) {
      if (ev.key === "Enter" || ev.key === " ") {
        ev.preventDefault();
        this._toggle();
      }
    }

    // ---------- Auto-tint helpers ----------
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
      if ((this.config.auto_tint || "off") !== "lux") return null;
      if (!this.config.light_entity) return null;

      const st = this._getState(this.config.light_entity);
      if (!st) return null;

      const raw = st.state;
      if (raw === "unknown" || raw === "unavailable") return null;

      const lux = Number(raw);
      if (!Number.isFinite(lux)) return null;

      const min = Number(this.config.lux_min);
      const max = Number(this.config.lux_max);
      if (!Number.isFinite(min) || !Number.isFinite(max) || max <= min) return null;

      return this._clamp01((lux - min) / (max - min));
    }

    _computeFabricColors() {
      const base = this.config.slat_color;
      const baseRgb = this._parseHexColor(base);

      // If base isn't hex, don't tint (still allow CSS vars like var(--...))
      if (!baseRgb) {
        return {
          slatColor: base || "var(--primary-text-color)",
          shineColor: this.config.slat_shine_color || "rgba(255,255,255,0.22)",
          baseOpacity: this.config.fabric_mode ? 0.75 : 0.85,
          shineOpacity: this.config.fabric_mode ? 0.35 : 0.55,
        };
      }

      const k = this._getLuxFactorSafe();
      if (k === null) {
        return {
          slatColor: base,
          shineColor: this.config.slat_shine_color || "rgba(255,255,255,0.25)",
          baseOpacity: 0.78,
          shineOpacity: 0.32,
        };
      }

      const warmWhite = { r: 250, g: 248, b: 244 };
      const softDeep  = { r: 60,  g: 60,  b: 62 };

      const brighten = 0.10 + 0.18 * k;  // 0.10..0.28
      const deepen   = 0.08 * (1 - k);   // 0.08..0.00

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

      const tilt = this._getVisualTilt(); // 0..100
      const t0 = tilt / 100;
      const t = this.config.invert ? (1 - t0) : t0;

      // Thin (closed) -> wide (open)
      const sx = 0.10 + 0.90 * t;

      const slatCount = Math.max(3, Math.min(25, Number(this.config.slats) || 11));
      const slats = Array.from({ length: slatCount }, (_, i) => i);

      const colors = this._computeFabricColors();

      return html`
        <ha-card>
          <div class="wrap">
            <div class="header">
              <div class="title">${this.config.name}</div>
            </div>

            <div
              class="viz"
              @click=${this._toggle}
              @keydown=${this._onKeyDown}
              role="button"
              tabindex="0"
              aria-label="Toggle blinds"
            >
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

              ${this.config.show_meter ? html`
                <div class="meter" aria-hidden="true">
                  <div class="meterFill" style="width:${tilt}%;"></div>
                </div>
              ` : html``}
            </div>

            ${this.config.show_buttons ? html`
              <div class="buttons">
                <button class="chip" @click=${(e) => { e.stopPropagation(); this._close(); }}>
                  Close
                </button>
                <button class="chip primary" @click=${(e) => { e.stopPropagation(); this._open(); }}>
                  Open
                </button>
              </div>
            ` : html``}
          </div>
        </ha-card>
      `;
    }

    static get styles() {
      return css`
        ha-card { overflow: hidden; }
        .wrap { padding: 14px; display: grid; gap: 12px; }

        .header { display: flex; align-items: baseline; }
        .title { font-size: 1.05rem; font-weight: 650; opacity: 0.95; }

        .viz {
          border-radius: 14px;
          padding: 10px;
          background: rgba(0,0,0,0.06);
          cursor: pointer;
          user-select: none;
          outline: none;
        }
        .viz:focus-visible {
          box-shadow: 0 0 0 2px var(--primary-color);
        }

        .slatRow {
          display: grid;
          grid-auto-flow: column;
          grid-auto-columns: 1fr;
          gap: 6px;
          height: 92px;
        }

        .slat {
          position: relative;
          border-radius: 10px;
          overflow: hidden;
        }

        .slatBase, .slatShine {
          position: absolute;
          inset: 0;
          transform-origin: 50% 50%;
          transform: scaleX(var(--lsx, var(--sx, 1)));
          transition: transform 320ms ease;
          border-radius: 10px;
        }

        .slatBase {
          background: var(--slat-color);
          opacity: var(--slat-base-opacity, 0.78);
        }

        .slatShine {
          background: linear-gradient(90deg, transparent, var(--shine-color), transparent);
          opacity: var(--slat-shine-opacity, 0.32);
          mix-blend-mode: overlay;
        }

        .meter {
          height: 8px;
          border-radius: 99px;
          background: rgba(0,0,0,0.12);
          overflow: hidden;
          margin-top: 10px;
        }
        .meterFill {
          height: 100%;
          border-radius: 99px;
          background: var(--primary-color);
          opacity: 0.70;
          transition: width 320ms ease;
        }

        .buttons { display: flex; justify-content: flex-end; gap: 8px; }
        .chip {
          border: 0;
          border-radius: 999px;
          padding: 8px 12px;
          background: rgba(0,0,0,0.06);
          color: var(--primary-text-color);
          font-weight: 650;
          cursor: pointer;
        }
        .chip.primary { background: rgba(0,0,0,0.10); }
        .chip:active { transform: translateY(1px); }

        @media (prefers-reduced-motion: reduce) {
          .slatBase, .slatShine, .meterFill { transition: none; }
          .chip:active { transform: none; }
        }
      `;
    }
  }

  if (!customElements.get("vertical-slats-card")) {
    customElements.define("vertical-slats-card", VerticalSlatsCard);
  }

  window.customCards = window.customCards || [];
  if (!window.customCards.some((c) => c.type === "vertical-slats-card")) {
    window.customCards.push({
      type: "vertical-slats-card",
      name: "Vertical Slats Card",
      description: "Animated fabric-style vertical blinds with optional lux auto-tint and UI editor support.",
    });
  }

  // ------------------------------ EDITOR (bundled) ------------------------------
  class VerticalSlatsCardEditor extends LitElement {
    static get properties() {
      return { hass: {}, _config: { state: true } };
    }

    setConfig(config) {
      this._config = { ...config };
    }

    _valueChanged(ev) {
      if (!this._config || !this.hass) return;
      if (!ev.detail || !ev.detail.value) return;

      const next = { ...this._config, ...ev.detail.value };

      // Clean empty strings for nicer YAML
      for (const k of Object.keys(next)) {
        if (typeof next[k] === "string" && next[k].trim() === "") delete next[k];
      }

      this._config = next;

      this.dispatchEvent(new CustomEvent("config-changed", {
        detail: { config: next },
        bubbles: true,
        composed: true,
      }));
    }

    _schema() {
      const c = this._config || {};
      const isLux = (c.auto_tint || "off") === "lux";

      const schema = [
        { name: "name", selector: { text: {} } },
        { name: "entity", selector: { entity: { domain: "cover" } } },
        { name: "visual_entity", selector: { entity: { domain: "input_number" } } },

        { name: "open_script", selector: { entity: { domain: "script" } } },
        { name: "close_script", selector: { entity: { domain: "script" } } },

        { name: "invert", selector: { boolean: {} } },
        { name: "show_buttons", selector: { boolean: {} } },
        { name: "show_meter", selector: { boolean: {} } },

        { name: "slats", selector: { number: { min: 3, max: 25, step: 1, mode: "slider" } } },

        { name: "slat_color", selector: { text: {} } },
        { name: "slat_shine_color", selector: { text: {} } },

        { name: "fabric_mode", selector: { boolean: {} } },
        {
          name: "auto_tint",
          selector: {
            select: {
              mode: "dropdown",
              options: [
                { label: "Off", value: "off" },
                { label: "Lux sensor", value: "lux" },
              ],
            },
          },
        },
      ];

      if (isLux) {
        schema.push(
          { name: "light_entity", selector: { entity: { domain: "sensor" } } },
          { name: "lux_min", selector: { number: { min: 0, max: 200000, step: 1, mode: "box" } } },
          { name: "lux_max", selector: { number: { min: 0, max: 200000, step: 1, mode: "box" } } },
        );
      }

      return schema;
    }

    _labelFor(name) {
      const labels = {
        name: "Name",
        entity: "Cover entity",
        visual_entity: "Visual helper (input_number)",
        open_script: "Open script (optional)",
        close_script: "Close script (optional)",
        invert: "Invert animation",
        show_buttons: "Show buttons",
        show_meter: "Show meter",
        slats: "Slat count",
        slat_color: "Slat color (hex recommended for tint)",
        slat_shine_color: "Shine color (optional)",
        fabric_mode: "Fabric mode",
        auto_tint: "Auto-tint",
        light_entity: "Lux sensor entity",
        lux_min: "Lux minimum",
        lux_max: "Lux maximum",
      };
      return labels[name] || name;
    }

    render() {
      if (!this.hass) return html``;

      return html`
        <div class="wrap">
          <ha-form
            .hass=${this.hass}
            .data=${this._config}
            .schema=${this._schema()}
            .computeLabel=${(s) => this._labelFor(s.name)}
            @value-changed=${this._valueChanged}
          ></ha-form>

          <div class="hint">
            Tip: For lux auto-tint, use a hex <b>slat_color</b> like <code>#ded1b6</code>.
            If the sensor is unavailable, the card falls back to the base color automatically.
          </div>
        </div>
      `;
    }

    static get styles() {
      return css`
        .wrap { display: grid; gap: 12px; padding: 8px 0; }
        .hint {
          font-size: 0.9rem;
          opacity: 0.8;
          padding: 8px 10px;
          border-radius: 12px;
          background: rgba(0,0,0,0.04);
        }
        code { font-family: monospace; }
      `;
    }
  }

  if (!customElements.get("vertical-slats-card-editor")) {
    customElements.define("vertical-slats-card-editor", VerticalSlatsCardEditor);
  }
})();
