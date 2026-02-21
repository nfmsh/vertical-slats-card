# Changelog

All notable changes to this project are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/)  
and this project follows [Semantic Versioning](https://semver.org/).

---

## [1.1.0] - 2026-02-21
### Added

- Dynamic status badge showing:

  - OPENING

  - OPEN

  - CLOSING

  - CLOSED

  - OFFLINE

- Optional percentage display in the status badge.

- auto_hide_buttons option to hide Open/Close buttons at endpoints.

- Offline state styling for unavailable or unknown entities.

- Motion-aware shine animation while blinds are moving.

- Realistic slat background lighting that brightens as blinds open.

- device_min and device_max configuration options for device calibration (e.g., SwitchBot tilt max 75).

- Support for both current_tilt_position and current_position attributes.

- Keyboard accessibility support (Enter / Space activation).

### Changed

- Improved cover control logic:

  - Uses set_cover_tilt_position when supported.

  - Falls back to set_cover_position when tilt is not available.

  - Falls back to open_cover / close_cover if neither position service is supported.

- Improved internal state handling to reduce visual flicker.

- Improved animation smoothness and re-render efficiency.

### Compatibility

- Fully backward compatible with v1.0.x.

- No breaking changes.

---

## [1.0.2] - 2026-02-15

### Fixed
- Editor UI not showing

---

## [1.0.1] – 2026-02-01

### Added
- Initial public release
- Animated vertical slat visualization
- Fabric-friendly rendering mode
- Optional lux-based auto-tint
- Built-in Lovelace editor UI
- Safeguards for unavailable sensors
- Support for script-driven open / close logic

---

## [Unreleased]

### Added
- 

### Changed
- 

### Fixed
- 
