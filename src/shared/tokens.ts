import { css } from "lit";

export const AERIS_VERSION = "0.1.0";

/**
 * Aeris design tokens (see docs/DESIGN.md).
 * Every card embeds this block in its shadow DOM. Users may override any
 * token via a Home Assistant theme (e.g. `aeris-radius-card: "16px"`).
 */
export const tokens = css`
  :host {
    /* surfaces (dark-first) */
    --aeris-bg: var(--aeris-bg-override, #0b0f15);
    --aeris-surface: linear-gradient(
      155deg,
      rgba(255, 255, 255, 0.065),
      rgba(255, 255, 255, 0.022)
    );
    --aeris-surface-border: rgba(255, 255, 255, 0.08);
    --aeris-shadow: 0 4px 16px rgba(0, 0, 0, 0.26);

    /* room accents (defaults, overridable per card) */
    --aeris-room-living: #59b8ff;
    --aeris-room-dining: #ffb74d;
    --aeris-room-kitchen: #ff7043;
    --aeris-room-bath: #4dd0e1;
    --aeris-room-kid1: #9575cd;
    --aeris-room-sleep: #7986cb;
    --aeris-room-kid2: #f06292;
    --aeris-room-neutral: #90a4ae;

    /* functional state colors (never room-bound) */
    --aeris-heat: #ff7043;
    --aeris-cool: #4fc3f7;
    --aeris-dry: #ffb74d;
    --aeris-fan: #4db6ac;
    --aeris-ok: #81c784;
    --aeris-warn: #ffb44d;
    --aeris-danger: #ff6b6b;
    --aeris-idle-icon: rgba(255, 255, 255, 0.55);

    /* text */
    --aeris-text: #ffffff;
    --aeris-text-sub: rgba(255, 255, 255, 0.45);
    --aeris-text-on-light: #10151c;
    --aeris-text-sub-on-light: rgba(16, 21, 28, 0.55);

    /* geometry */
    --aeris-radius-card: 21px;
    --aeris-radius-icon: 13px;
    --aeris-radius-control: 12px;
    --aeris-radius-pill: 20px;
    --aeris-gap: 10px;
    --aeris-pad-card: 12px 14px;

    /* motion */
    --aeris-ease: cubic-bezier(0.2, 0.8, 0.3, 1);
    --aeris-ease-knob: cubic-bezier(0.3, 1.3, 0.5, 1);
    --aeris-t-state: 300ms;
    --aeris-t-press: 120ms;
    --aeris-t-enter: 400ms;
  }

  @media (prefers-reduced-motion: reduce) {
    :host {
      --aeris-t-state: 0ms;
      --aeris-t-press: 0ms;
      --aeris-t-enter: 0ms;
    }
  }
`;
