# Vertical Slats Card 


[![HACS](https://img.shields.io/badge/HACS-Default-orange.svg)](https://github.com/hacs/default)
[![GitHub Release](https://img.shields.io/github/v/release/nfmsh/vertical-slats-card)](https://github.com/nfmsh/vertical-slats-card/releases)
[![License: MIT](https://img.shields.io/github/license/nfmsh/vertical-slats-card)](LICENSE)
[![GitHub Activity](https://img.shields.io/github/last-commit/nfmsh/vertical-slats-card)](https://github.com/nfmsh/vertical-slats-card/commits/main)
[![Community Forum](https://img.shields.io/badge/community-forum-brightgreen)]([https://community.home-assistant.io/](https://community.home-assistant.io/t/vertical-slats-card-fabric-style-vertical-blinds-hacs/982579))


A polished Home Assistant Lovelace card that visually represents **vertical blinds** with animated slats.

Built for the reality many of us live in: vertical blind motors that only support **open / close**, not tilt position.  
This card keeps control honest while still giving you a clean, believable slat animation.

---

## Highlights

- 🎞️ Smooth animated vertical slats (DIV-based, no SVG transition weirdness)
- 🧵 Fabric-friendly look (soft highlight, not glossy)
- 🧠 Visual state via an `input_number` helper (0–100)
- ☀️ Optional **lux-based auto-tint** (uses an illuminance sensor)
- 🛡️ Safe fallback if sensors are `unknown` / `unavailable`
- 🧩 Fully config-driven (no hard-coded entities)
- 🧰 Built-in Lovelace editor UI (configure without YAML)

---

## Demo / screenshots

Slat Card In Open State:

![Slat Card Open](/docs/screenshots/card-open.png)

Slat Card In Closed state:

![Slat Card Closed](/docs/screenshots/card-closed.png)

UI Card Editor:

![Slat Card Closed](/docs/screenshots/card-editor1.png)
![Slat Card Closed](/docs/screenshots/card-editor2.png)
![Slat Card Closed](/docs/screenshots/card-editor3.png)



---

## Installation

Installation via HACS (recommended)

This card is available through HACS.

Steps:

- Open HACS in Home Assistant

- Go to Frontend

- Click Explore & Download Repositories

- Search for Vertical Slats Card

- Select the card and click Download

- Restart Home Assistant (or reload the frontend)

- Add the card to your dashboard

That’s it. No manual file copying required.

After installation

HACS automatically registers the card resources.
You can now add the card from the Lovelace UI:

- Edit your dashboard

- Add Card

- Search for Vertical Slats Card

- Configure using the built-in editor UI

### Manual

1. Copy the files from this repo's `dist/` folder into Home Assistant:

```
/config/www/vertical-slats-card/
  ├─ vertical-slats-card.js
  
```

2. Add both as **JavaScript Module** resources:

**Settings → Dashboards → Resources → Add Resource**

```
/local/vertical-slats-card/vertical-slats-card.js

```

3. Refresh your browser (hard refresh if needed).

---

## Required setup

### 1) A cover entity
Your actual blinds device:

```yaml
entity: cover.livingroom_blinds
```

### 2) A visual helper (`input_number`)
This is used only for the animation:

```yaml
input_number:
  livingroom_slats_visual:
    min: 0
    max: 100
    step: 1
```

- `0` = visually closed
- `100` = visually open

---

## Recommended scripts (optional, but keeps things tidy)

Use scripts so the card triggers one “thing” and your logic stays central:

```yaml
script:
  livingroom_slats_open:
    alias: Livingroom slats open
    sequence:
      - service: cover.open_cover
        target:
          entity_id: cover.livingroom_blinds
      - service: input_number.set_value
        target:
          entity_id: input_number.livingroom_slats_visual
        data:
          value: 100

  livingroom_slats_close:
    alias: Livingroom slats close
    sequence:
      - service: cover.close_cover
        target:
          entity_id: cover.livingroom_blinds
      - service: input_number.set_value
        target:
          entity_id: input_number.livingroom_slats_visual
        data:
          value: 0
```

---

## Usage

### Minimal config

```yaml
type: custom:vertical-slats-card
name: Living Room Blinds
entity: cover.livingroom_blinds
visual_entity: input_number.livingroom_slats_visual
```

### Typical config (scripts + no meter)

```yaml
type: custom:vertical-slats-card
name: Living Room Blinds
entity: cover.livingroom_blinds
visual_entity: input_number.livingroom_slats_visual
open_script: script.livingroom_slats_open
close_script: script.livingroom_slats_close
invert: true
show_meter: false
```

---

## Fabric colours (dark green example)

For dark green fabric blinds:

```yaml
slat_color: "#3f4f45"
slat_shine_color: "rgba(255,255,255,0.16)"
```

Guideline: for fabric, shine is a *soft lift*, not a glossy reflection.

---

## Lux auto-tint (optional)

Auto-tint gently adjusts slat colour based on an illuminance sensor (typically outdoor).  
It’s subtle: slightly washed in bright daylight, slightly deeper at dusk.

```yaml
fabric_mode: true
auto_tint: lux
light_entity: sensor.porch_lighting_sensor_illuminance
lux_min: 0
lux_max: 60000
slat_color: "#3f4f45"  # hex recommended for tinting
```

### Safeguard behavior
If the lux sensor is `unknown`, `unavailable`, missing, or non-numeric, the card falls back to `slat_color` without errors or flicker.

---

## Configuration options

| Option | Type | Default | Notes |
|---|---|---:|---|
| `name` | string | `"Vertical Blinds"` | Card title |
| `entity` | string | **required** | Cover entity |
| `visual_entity` | string | **required** | `input_number` for visual state |
| `open_script` | string | `null` | Optional script for open |
| `close_script` | string | `null` | Optional script for close |
| `invert` | boolean | `false` | Reverse animation direction |
| `show_buttons` | boolean | `true` | Show Open/Close buttons |
| `show_meter` | boolean | `false` | Show percentage meter |
| `slats` | number | `11` | Range 3–25 |
| `slat_color` | string | theme-based | Hex recommended if auto-tint enabled |
| `slat_shine_color` | string | auto | Optional override |
| `fabric_mode` | boolean | `true` | Softer highlight/opacity |
| `auto_tint` | `"off"\|"lux"` | `"off"` | Lux-based tint mode |
| `light_entity` | string | `null` | Lux sensor entity |
| `lux_min` | number | `0` | Lux at minimum tint |
| `lux_max` | number | `60000` | Lux at maximum tint |

---

## Troubleshooting

### “My changes don’t show up”
- Bump your resource URL with a querystring:  
  `/local/vertical-slats-card/vertical-slats-card-v2.js?v=6`
- Hard refresh your browser (Ctrl+F5) or try a private/incognito window.

### “The slats don’t animate”
- Confirm `visual_entity` exists and updates (0–100).
- Check Developer Tools → States to see the helper value changing.

### “Auto-tint doesn’t work”
- Ensure `auto_tint: lux` and `light_entity: sensor.*` are set.
- `slat_color` should be a hex value for tinting (e.g. `#3f4f45`).
- Verify `lux_min`/`lux_max` make sense for your sensor.

---

## Roadmap (nice-to-haves)

- Optional preset palette (fabric warm/cool/dark)
- Optional label (“Open” / “Closed”) instead of %
- HACS packaging (when ready)

---

## Contributing

PRs welcome. Keep changes:
- backwards compatible where possible
- config-driven (no hard-coded entity ids)
- friendly to Home Assistant themes

---

## Known limitations

- This card does **not** provide real tilt control.
  Many vertical blind motors only expose `open_cover` / `close_cover`, and this card intentionally does not pretend otherwise.

- Slat rotation is a **visual representation** driven by an `input_number` helper.
  The helper reflects the *last commanded state*, not physical feedback from the motor.

- Lux-based auto-tint adjusts **appearance only**.
  It does not affect blind behavior or automation logic.

- This card assumes a single blind group.
  Per-slat or partial-rotation hardware is outside the scope of this project.

These limitations are intentional and align with common real-world vertical blind hardware.

---

## Support & feedback

If you encounter a bug or have a feature request:

- Open an issue on GitHub
- Include your card configuration
- Include Home Assistant version and browser if relevant

Please note that feature requests should respect the design goals of the card, especially the separation between visual state and device capability.

---

## License & Attribution

This project is licensed under the MIT License.

You are free to fork, modify, and redistribute this project under the terms of that license.

If you publish a fork or derivative work, you must:

- Retain the original copyright notice
- Include a copy of the MIT license
- Clearly indicate your changes

Forking and improving the project is encouraged.

Repackaging or redistributing it without proper attribution is a violation of the license and undermines the open source community.
