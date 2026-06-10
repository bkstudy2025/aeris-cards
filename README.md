# Aeris Cards

> **The family-friendly premium design system for Home Assistant.**
> Dark glass that lights up when your home is alive.

⚠️ **Work in progress** — Aeris is under active development. The first cards
(`aeris-room-card`, `aeris-tile`, `aeris-scenes`, `aeris-status`) are being built
right now. Watch/star the repo to follow along.

## Why Aeris?

Every smart home app fails its users somewhere: too many taps, cluttered
dashboards, no feedback, family members giving up and using wall switches.
Aeris is built against five measurable principles:

| # | Principle | Rule |
|---|-----------|------|
| 1 | **Tap budget** | Everyday action = 1 tap · room action = 2 · everything else = 3 |
| 2 | **State is light** | Active tiles flip bright — readable from the couch in 3 seconds |
| 3 | **Three layers** | Glance → long-press → detail page. The main screen shows status + scenes, nothing else |
| 4 | **The home responds** | Every tap gives instant visual + haptic feedback. Problems report themselves |
| 5 | **Grandma-proof** | Touch targets ≥ 44 px, plain language, no admin clutter |

A feature that breaks a rule does not ship.

## Planned cards

- **`aeris-room-card`** — room at a glance: accent color, climate, device badges
  with 1-tap toggle, window warning, 24 h sparkline
- **`aeris-tile`** — one tile for every device type (light, switch, climate,
  cover, fan, media) with the same anatomy everywhere
- **`aeris-scenes`** — tap-to-run scene bar with confirmation flash
- **`aeris-status`** — greeting hero with whole-home aggregation and tappable stats
- **`aeris-attention`** — the unique one: a card that only appears when something
  needs you ("window open while heating — bathroom") with a 1-tap fix

## Documentation

- [Concept & competitive analysis](docs/KONZEPT.md)
- [Roadmap](docs/PLAN.md)
- [Design system](docs/DESIGN.md)

## Installation (once released)

HACS → Custom repositories → `bkstudy2025/aeris-cards` (Dashboard) → install →
add `aeris-cards.js` as a Lovelace resource.

## License

MIT © Marcel Beitlich
