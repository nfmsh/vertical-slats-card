const LitElement = Object.getPrototypeOf(customElements.get("ha-panel-lovelace"));
const html = LitElement.prototype.html;
const css = LitElement.prototype.css;

class VerticalSlatsCardV2Editor extends LitElement {
  static get properties() {
    return {
      hass: {},
      _config: { state: true },
    };
  }

  setConfig(config) {
    this._config = { ...config };
  }

  _valueChanged(ev) {
    if (!this._config || !this.hass) return;

    const detail = ev.detail;
    if (!detail || !detail.value) return;

    // Merge changes from ha-form
    const newConfig = { ...this._config, ...detail.value };

    // Normalize empty strings to undefined for cleaner YAML
    for (const k of Object.keys(newConfig)) {
      if (typeof newConfig[k] === "string" && newConfig[k].trim() === "") {
        delete newConfig[k];
      }
    }

    this._config = newConfig;

    this.dispatchEvent(new CustomEvent("config-changed", {
      detail: { config: newConfig },
      bubbles: true,
      composed: true,
    }));
  }

  _schema() {
    const c = this._config || {};
    const isLux = (c.auto_tint || "off") === "lux";

    const base = [
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
      base.push(
        { name: "light_entity", selector: { entity: { domain: "sensor" } } },
        { name: "lux_min", selector: { number: { min: 0, max: 200000, step: 1, mode: "box" } } },
        { name: "lux_max", selector: { number: { min: 0, max: 200000, step: 1, mode: "box" } } },
      );
    }

    return base;
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
      slat_color: "Slat color (hex recommended)",
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
    const cfg = this._config || {};

    return html`
      <div class="wrap">
        <ha-form
          .hass=${this.hass}
          .data=${cfg}
          .schema=${this._schema()}
          .computeLabel=${(s) => this._labelFor(s.name)}
          @value-changed=${this._valueChanged}
        ></ha-form>

        <div class="hint">
          Tip: For lux auto-tint, set <b>slat_color</b> to a hex value like <code>#3f4f45</code>.
          If the sensor is unavailable, the card falls back to the base color automatically.
        </div>
      </div>
    `;
  }

  static get styles() {
    return css`
      .wrap {
        display: grid;
        gap: 12px;
        padding: 8px 0;
      }
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

customElements.define("vertical-slats-card-v2-editor", VerticalSlatsCardV2Editor);
