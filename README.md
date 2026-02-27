# Vertical Slats Card 


[![HACS](https://img.shields.io/badge/HACS-Default-orange.svg)](https://github.com/hacs/default)
[![GitHub Release](https://img.shields.io/github/v/release/nfmsh/vertical-slats-card)](https://github.com/nfmsh/vertical-slats-card/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![GitHub Activity](https://img.shields.io/github/last-commit/nfmsh/vertical-slats-card)](https://github.com/nfmsh/vertical-slats-card/commits/main)
[![Community Forum](https://img.shields.io/badge/community-forum-brightgreen)](https://community.home-assistant.io/t/vertical-slats-card-fabric-style-vertical-blinds-hacs/982579)


A polished Home Assistant Lovelace card that visually represents **vertical blinds** with animated slats.

Built for the reality many of us live in: vertical blind motors that only support **open / close**, not tilt position.  
This card keeps control honest while still giving you a clean, believable slat animation.

---

## ✨ Features

- Animated vertical slats
- Dynamic status badge:
  - `OPENING`
  - `OPEN`
  - `CLOSING`
  - `CLOSED`
  - `OFFLINE`
- Optional percentage display
- Auto-hide Open / Close buttons
- Motion-aware shine animation while moving
- Realistic background lighting behind slats
- Device calibration support (`device_min` / `device_max`)
- Works with:
  - `current_tilt_position`
  - `current_position`
- Automatic service detection:
  - `set_cover_tilt_position`
  - `set_cover_position`
  - `open_cover` / `close_cover` fallback
- Full UI editor support
- Keyboard accessible
- No helpers required
- No scripts required

---

## Demo / screenshots

Slat Card In Open State:

![Slat Card Open](/docs/screenshots/card-open1.1.0.png)

Slat Card In Closed state:

![Slat Card Closed](/docs/screenshots/card-closed1.1.0.png)





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

1. Copy the file from this repo's `dist/` folder into Home Assistant:

```
/config/www/vertical-slats-card/
  ├─ vertical-slats-card.js
  
```

2. Add as a **JavaScript Module** resource:

**Settings → Dashboards → Resources → Add Resource**

```
/local/vertical-slats-card/vertical-slats-card.js

```

3. Refresh your browser (hard refresh if needed).

---

🔄 Migrating from v1.0.x

Earlier versions of this card required:

  - input_number helpers

  - Open/Close scripts

  - Automations to sync helper values

As of v1.1.0, **these are no longer required**.

The card now:

  - Reads current_tilt_position automatically

  - Falls back to current_position

  - Uses native cover services directly

You can safely delete:

  - Any input_number.* helpers created for slat visuals

  - Any scripts created specifically for opening/closing slats

  - Any automations syncing helpers to cover state

⚠ Only remove helpers/scripts if they are no longer used elsewhere in your setup.

---

## Usage

🧱 Basic Configuration
```yaml
type: custom:vertical-slats-card
entity: cover.livingroom_blinds
name: Living Room Blinds
```
---

## Configuration options

| Option              | Type    | Default             | Description                      |
| ------------------- | ------- | ------------------- | -------------------------------- |
| `entity`            | string  | **required**        | Cover entity                     |
| `name`              | string  | `"Vertical Blinds"` | Card title                       |
| `invert`            | boolean | `false`             | Invert animation direction       |
| `show_buttons`      | boolean | `true`              | Show Open/Close buttons          |
| `show_percentage`   | boolean | `false`             | Show percentage in badge         |
| `auto_hide_buttons` | boolean | `false`             | Hide buttons at endpoints        |
| `slats`             | number  | `11`                | Number of slats (3–25)           |
| `device_min`        | number  | `0`                 | Fully closed device value        |
| `device_max`        | number  | `100`               | Fully open device value          |
| `tap_action`        | string  | `"toggle"`          | `toggle`, `more-info`, or `none` |

---

🎛 Device Calibration

Some devices (e.g. SwitchBot Blind Tilt) do not use 0–100 as their full range.

Example:
```yaml
device_min: 0
device_max: 75
```
This ensures the card displays 100% when the device reports 75 as fully open

---

🎨 Styling Options

| Option             | Description                       |
| ------------------ | --------------------------------- |
| `slat_gap`         | Space between slats (px)          |
| `slat_radius`      | Slat corner radius (px)           |
| `slat_height`      | Height of slat area (px)          |
| `slat_min_scale`   | How thin slats appear when closed |
| `shine_strength`   | Shine intensity (0–1)             |
| `shine_width`      | Width of highlight band           |
| `slat_color`       | Base slat color                   |
| `slat_shine_color` | Shine overlay color               |

---

🌤 Optional Lux-Based Tinting

You can tint slats based on outdoor light:
```yaml
auto_tint: lux
light_entity: sensor.Illuminance
lux_min: 0
lux_max: 60000
fabric_mode: true
```
If the sensor is unavailable, the card safely falls back to the base color.

---

🖱 Tap Actions
```yaml
tap_action: toggle      # default
tap_action: more-info
tap_action: none
```
---

🔄 Compatibility

Home Assistant 2023.8+

HACS compatible

Mobile and desktop dashboards

Fully backward compatible with v1.0.x

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
