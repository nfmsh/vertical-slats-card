/* Vertical Slats Card (Production) - single-file bundle: card + editor V1.1.0
 *
 * Card type: custom:vertical-slats-card
 * Element:   <vertical-slats-card>
 * Editor:    <vertical-slats-card-editor>
 *
 * Required:
 *   entity: cover.*
 *
 * Optional:
 *   name: string
 *   invert: boolean
 *   show_buttons: boolean
 *   show_percentage: boolean
 *   auto_hide_buttons: boolean
 *   slats: number (3..25)
 *   device_min: number (default 0)
 *   device_max: number (default 100)
 *
 * Styling:
 *   slat_gap: number px (default 6)
 *   slat_radius: number px (default 10)
 *   slat_height: number px (default 92)
 *   slat_min_scale: number (default 0.10)
 *   shine_strength: number 0..1 (default 1.0)
 *   shine_width: number 0.2..0.9 (default 0.55)
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
 *
 * Tap action:
 *   tap_action: "toggle" | "more-info" | "none" (default "toggle")
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

    static getConfigElement() {
      return document.createElement("vertical-slats-card-editor");
    }

    static getStubConfig() {
      return {
        type: "custom:vertical-slats-card",
        name: "Vertical Blinds",
        entity: "",
        show_buttons: true,
        show_percentage: false,
        auto_hide_buttons: false,
        device_min: 0,
        device_max: 100,
      };
    }

    setConfig(config) {
      if (!config.entity) throw new Error("Missing 'entity' (cover.*).");

      this.config = {
        name: "Vertical Blinds",
        slats: 11,
        show_buttons: true,
        invert: false,

        show_percentage: false,
        auto_hide_buttons: false,

        // calibration
        device_min: 0,
        device_max: 100,

        // styling
        slat_gap: 6,
        slat_radius: 10,
        slat_height: 92,
        slat_min_scale: 0.10,
        shine_strength: 1.0,
        shine_width: 0.55,

        // colors
        slat_color: null,
        slat_shine_color: null,

        // fabric & tint
        fabric_mode: true,
        auto_tint: "off",
        light_entity: null,
        lux_min: 0,
        lux_max: 60000,

        // interactions
        tap_action: "toggle",

        ...config,
      };

      this._lastVisual = this._lastVisual ?? 0;
    }

    getCardSize() {
      return this.config.show_buttons ? 3 : 2;
    }

    // ---------- utilities ----------
    _clamp(v, lo = 0, hi = 100) {
      v = Number(v);
      if (!Number.isFinite(v)) return lo;
      return Math.max(lo, Math.min(hi, v));
    }

    _clamp01(v) {
      v = Number(v);
      if (!Number.isFinite(v)) return 0;
      return Math.max(0, Math.min(1, v));
    }

    _getState(entityId) {
      return this.hass?.states?.[entityId] || null;
    }

    _isOffline() {
      const st = this._getState(this.config.entity);
      if (!st) return true;
      return st.state === "unavailable" || st.state === "unknown";
    }

    _deviceRange() {
      let min = Number(this.config.device_min);
      let max = Number(this.config.device_max);
      if (!Number.isFinite(min)) min = 0;
      if (!Number.isFinite(max)) max = 100;

      if (max === min) max = min + 1;
      if (max < min) [min, max] = [max, min];
      return { min, max };
    }

    _toVisual(rawDeviceValue) {
      const { min, max } = this._deviceRange();
      const raw = this._clamp(rawDeviceValue, min, max);
      const t = (raw - min) / (max - min);
      return this._clamp(t * 100, 0, 100);
    }

    _readDeviceValueFromCover() {
      const st = this._getState(this.config.entity);
      if (!st) return null;

      const tilt = st.attributes?.current_tilt_position;
      if (tilt !== undefined && tilt !== null) {
        const n = Number(tilt);
        if (Number.isFinite(n)) return n;
      }

      const pos = st.attributes?.current_position;
      if (pos !== undefined && pos !== null) {
        const n = Number(pos);
        if (Number.isFinite(n)) return n;
      }

      if (st.state === "open") return this._deviceRange().max;
      if (st.state === "closed") return this._deviceRange().min;

      return null;
    }

    _getVisualTilt() {
      const raw = this._readDeviceValueFromCover();
      if (raw === null) return this._lastVisual ?? 0;

      const vis = this._toVisual(raw);
      this._lastVisual = vis;
      return vis;
    }

    _getCoverStatus() {
      const st = this._getState(this.config.entity);
      const s = st?.state;

      if (s === "opening") return "OPENING";
      if (s === "closing") return "CLOSING";
      if (s === "open") return "OPEN";
      if (s === "closed") return "CLOSED";
      if (s === "stopped") return "STOPPED";
      if (this._isOffline()) return "OFFLINE";

      return this._getVisualTilt() >= 50 ? "OPEN" : "CLOSED";
    }

    _isMoving(status) {
      return status === "OPENING" || status === "CLOSING";
    }

    _supports(feature) {
      const st = this._getState(this.config.entity);
      const f = Number(st?.attributes?.supported_features ?? 0);
      return Number.isFinite(f) ? ((f & feature) !== 0) : false;
    }

    async _setDeviceValue(rawDeviceValue) {
      const entity_id = this.config.entity;

      // HA cover supported_features bitmask constants:
      // SET_POSITION = 4, SET_TILT_POSITION = 128
      const SET_POSITION = 4;
      const SET_TILT_POSITION = 128;

      const { min, max } = this._deviceRange();
      const raw = this._clamp(rawDeviceValue, min, max);

      if (this._supports(SET_TILT_POSITION)) {
        await this.hass.callService("cover", "set_cover_tilt_position", {
          entity_id,
          tilt_position: raw,
        });
        return;
      }

      if (this._supports(SET_POSITION)) {
        await this.hass.callService("cover", "set_cover_position", {
          entity_id,
          position: raw,
        });
        return;
      }

      if (raw >= (min + max) / 2) {
        await this.hass.callService("cover", "open_cover", { entity_id });
      } else {
        await this.hass.callService("cover", "close_cover", { entity_id });
      }
    }

    async _open() {
      const { max } = this._deviceRange();
      return this._setDeviceValue(max);
    }

    async _close() {
      const { min } = this._deviceRange();
      return this._setDeviceValue(min);
    }

    async _toggle() {
      return this._getVisualTilt() >= 50 ? this._close() : this._open();
    }

    _moreInfo() {
      const ev = new Event("hass-more-info", { bubbles: true, composed: true });
      ev.detail = { entityId: this.config.entity };
      this.dispatchEvent(ev);
    }

    _handleTap() {
      if (this._isOffline()) return;

      const a = (this.config.tap_action || "toggle").toLowerCase();
      if (a === "none") return;
      if (a === "more-info") return this._moreInfo();
      return this._toggle();
    }

    _onKeyDown(ev) {
      if (ev.key === "Enter" || ev.key === " ") {
        ev.preventDefault();
        this._handleTap();
      }
    }

    // ---------- Auto-tint helpers ----------
    _parseHexColor(input) {
      if (typeof input !== "string") return null;
      const hex = input.trim().replace("#", "");
      if (![3, 6].includes(hex.length)) return null;

      const full = hex.length === 3 ? hex.split("").map((c) => c + c).join("") : hex;
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
      return { r: this._mix(c1.r, c2.r, t), g: this._mix(c1.g, c2.g, t), b: this._mix(c1.b, c2.b, t) };
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

    _computeFabricColors({ moving }) {
      const base = this.config.slat_color;
      const baseRgb = this._parseHexColor(base);

      const strength = this._clamp01(this.config.shine_strength ?? 1.0);
      const motionBoost = moving ? 0.14 : 0.0;

      if (!baseRgb) {
        const baseOpacity = this.config.fabric_mode ? 0.75 : 0.85;
        const shineOpacity = ((this.config.fabric_mode ? 0.35 : 0.55) * strength) + motionBoost;
        return {
          slatColor: base || "var(--primary-text-color)",
          shineColor: this.config.slat_shine_color || "rgba(255,255,255,0.22)",
          baseOpacity,
          shineOpacity: this._clamp01(shineOpacity),
        };
      }

      const k = this._getLuxFactorSafe();
      if (k === null) {
        return {
          slatColor: base,
          shineColor: this.config.slat_shine_color || "rgba(255,255,255,0.25)",
          baseOpacity: 0.78,
          shineOpacity: this._clamp01((0.32 * strength) + motionBoost),
        };
      }

      const warmWhite = { r: 250, g: 248, b: 244 };
      const softDeep = { r: 60, g: 60, b: 62 };

      const brighten = 0.10 + 0.18 * k;
      const deepen = 0.08 * (1 - k);

      const brightened = this._mixColor(baseRgb, warmWhite, brighten);
      const finalRgb = this._mixColor(brightened, softDeep, deepen);

      return {
        slatColor: this._rgbToHex(finalRgb),
        shineColor: this.config.slat_shine_color || "rgba(255,255,255,0.25)",
        baseOpacity: 0.78,
        shineOpacity: this._clamp01((0.32 * strength) + motionBoost),
      };
    }

    render() {
      if (!this.hass || !this.config) return html``;

      const offline = this._isOffline();
      const tilt = this._getVisualTilt(); // visual 0..100
      const t0 = tilt / 100;
      const t = this.config.invert ? (1 - t0) : t0;

      const status = this._getCoverStatus();
      const moving = this._isMoving(status);

      const minScale = this._clamp(Number(this.config.slat_min_scale), 0.02, 0.40);
      const sx = minScale + (1 - minScale) * t;

      const slatCount = Math.max(3, Math.min(25, Number(this.config.slats) || 11));
      const slats = Array.from({ length: slatCount }, (_, i) => i);

      const gap = this._clamp(Number(this.config.slat_gap), 0, 24);
      const radius = this._clamp(Number(this.config.slat_radius), 0, 24);
      const height = this._clamp(Number(this.config.slat_height), 48, 160);

      const shineWidthRaw = Number(this.config.shine_width);
      const shineWidth = Number.isFinite(shineWidthRaw) ? Math.max(0.2, Math.min(0.9, shineWidthRaw)) : 0.55;
      const shinePeak = `${Math.round(shineWidth * 100)}%`;

      const colors = this._computeFabricColors({ moving });

      const pct = Math.round(tilt);
      const badge = this.config.show_percentage && status !== "OFFLINE"
        ? `${status} \u2022 ${pct}%`
        : status;

      // Realistic daylight bleed behind slats area
      const closedAlpha = 0.12;
      const openAlpha = 0.02;
      const vizAlpha = closedAlpha + (openAlpha - closedAlpha) * t;

      const nearOpen = tilt >= 99;
      const nearClosed = tilt <= 1;
      const autoHide = !!this.config.auto_hide_buttons;

      const showCloseBtn = !autoHide || !nearClosed;
      const showOpenBtn = !autoHide || !nearOpen;
      const disableButtons = offline;

      return html`
        <ha-card>
          <div class="wrap">
            <div class="header">
              <div class="title">${this.config.name}</div>
            </div>

            <div
              class="viz ${offline ? "offline" : ""}"
              style="--viz-alpha:${vizAlpha}; --shine-peak:${shinePeak};"
              @click=${() => this._handleTap()}
              @keydown=${this._onKeyDown}
              role="button"
              tabindex="0"
              aria-label="Blinds ${badge.toLowerCase()}"
            >
              <div
                class="slatRow ${moving ? "moving" : ""}"
                style="
                  --sx:${sx};
                  --slat-color:${colors.slatColor};
                  --shine-color:${colors.shineColor};
                  --slat-base-opacity:${colors.baseOpacity};
                  --slat-shine-opacity:${colors.shineOpacity};
                  --slat-gap:${gap}px;
                  --slat-radius:${radius}px;
                  --slat-height:${height}px;
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

              <div class="status">${badge}</div>
            </div>

            ${this.config.show_buttons ? html`
              <div class="buttons">
                ${showCloseBtn ? html`
                  <button class="chip" ?disabled=${disableButtons} @click=${(e) => { e.stopPropagation(); this._close(); }}>
                    Close
                  </button>
                ` : html``}

                ${showOpenBtn ? html`
                  <button class="chip primary" ?disabled=${disableButtons} @click=${(e) => { e.stopPropagation(); this._open(); }}>
                    Open
                  </button>
                ` : html``}
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
        .title { font-size: 1.05rem; font-weight: 650; opacity: 0.95; }

        .viz {
          position: relative;
          border-radius: 14px;
          padding: 10px;
          background: rgba(0,0,0,var(--viz-alpha, 0.06));
          cursor: pointer;
          user-select: none;
          outline: none;
        }
        .viz:focus-visible { box-shadow: 0 0 0 2px var(--primary-color); }

        .viz.offline {
          cursor: default;
          opacity: 0.78;
          filter: grayscale(0.25);
        }

        .slatRow {
          display: grid;
          grid-auto-flow: column;
          grid-auto-columns: 1fr;
          gap: var(--slat-gap, 6px);
          height: var(--slat-height, 92px);
        }

        .slat {
          position: relative;
          border-radius: var(--slat-radius, 10px);
          overflow: hidden;
        }

        .slatBase, .slatShine {
          position: absolute;
          inset: 0;
          transform-origin: 50% 50%;
          transform: scaleX(var(--lsx, var(--sx, 1)));
          transition: transform 320ms ease;
          border-radius: var(--slat-radius, 10px);
        }

        .slatBase {
          background: var(--slat-color);
          opacity: var(--slat-base-opacity, 0.78);
        }

        .slatShine {
          background: linear-gradient(
            90deg,
            transparent 0%,
            var(--shine-color) var(--shine-peak, 55%),
            transparent 100%
          );
          opacity: var(--slat-shine-opacity, 0.32);
          mix-blend-mode: overlay;
        }

        /* Motion-aware shine movement (subtle) */
        .slatRow.moving .slatShine {
          animation: vscShine 1.2s ease-in-out infinite;
        }

        @keyframes vscShine {
          0% { transform: scaleX(var(--lsx, var(--sx, 1))) translateX(-4%); }
          50% { transform: scaleX(var(--lsx, var(--sx, 1))) translateX(4%); }
          100% { transform: scaleX(var(--lsx, var(--sx, 1))) translateX(-4%); }
        }

        .status {
          position: absolute;
          left: 10px;
          bottom: 10px;
          padding: 4px 8px;
          border-radius: 999px;
          font-size: 0.75rem;
          font-weight: 750;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          background: rgba(0,0,0,0.22);
          color: var(--primary-text-color);
          backdrop-filter: blur(6px);
          -webkit-backdrop-filter: blur(6px);
          pointer-events: none;
          opacity: 0.90;
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
        .chip:disabled { opacity: 0.5; cursor: default; }

        @media (prefers-reduced-motion: reduce) {
          .slatBase, .slatShine { transition: none; }
          .slatRow.moving .slatShine { animation: none; }
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
      description: "Vertical blinds slats animation with calibration, status badge, and optional lux-tint.",
    });
  }

  // ------------------------------ EDITOR ------------------------------
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

      // Clean empty strings so YAML stays tidy
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

        { name: "tap_action", selector: { select: { mode: "dropdown", options: [
          { label: "Toggle", value: "toggle" },
          { label: "More info", value: "more-info" },
          { label: "None", value: "none" },
        ] } } },

        { name: "invert", selector: { boolean: {} } },
        { name: "show_buttons", selector: { boolean: {} } },

        { name: "show_percentage", selector: { boolean: {} } },
        { name: "auto_hide_buttons", selector: { boolean: {} } },

        { name: "slats", selector: { number: { min: 3, max: 25, step: 1, mode: "slider" } } },

        { name: "device_min", selector: { number: { min: -1000, max: 1000, step: 1, mode: "box" } } },
        { name: "device_max", selector: { number: { min: -1000, max: 1000, step: 1, mode: "box" } } },

        { name: "slat_gap", selector: { number: { min: 0, max: 24, step: 1, mode: "slider" } } },
        { name: "slat_radius", selector: { number: { min: 0, max: 24, step: 1, mode: "slider" } } },
        { name: "slat_height", selector: { number: { min: 48, max: 160, step: 1, mode: "slider" } } },
        { name: "slat_min_scale", selector: { number: { min: 0.02, max: 0.40, step: 0.01, mode: "slider" } } },
        { name: "shine_strength", selector: { number: { min: 0, max: 1, step: 0.05, mode: "slider" } } },
        { name: "shine_width", selector: { number: { min: 0.2, max: 0.9, step: 0.05, mode: "slider" } } },

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
        tap_action: "Tap action",
        invert: "Invert animation",
        show_buttons: "Show buttons",
        show_percentage: "Show percentage in badge",
        auto_hide_buttons: "Auto-hide Open/Close at endpoints",
        slats: "Slat count",
        device_min: "Device min (fully closed)",
        device_max: "Device max (fully open)",
        slat_gap: "Slat gap (px)",
        slat_radius: "Slat corner radius (px)",
        slat_height: "Slat area height (px)",
        slat_min_scale: "Closed thinness",
        shine_strength: "Shine strength",
        shine_width: "Shine width",
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
            Tip: If your device reports max open as <b>75</b> (common for SwitchBot), set
            <code>device_max: 75</code> so “fully open” displays as 100%.
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
