import { AERIS_VERSION } from "./shared/tokens";

export { AerisBaseCard } from "./shared/base-card";
export { tokens } from "./shared/tokens";
export { localizeState } from "./shared/i18n";
export { iconFor } from "./shared/icons";

/* Cards register themselves on import. */
import "./cards/aeris-tile/aeris-tile";
import "./cards/aeris-room-card/aeris-room-card";

console.info(
  `%c AERIS CARDS %c v${AERIS_VERSION} `,
  "background:#0b0f15;color:#59b8ff;font-weight:700;border-radius:4px 0 0 4px;padding:2px 6px;",
  "background:#59b8ff;color:#0b0f15;font-weight:700;border-radius:0 4px 4px 0;padding:2px 6px;"
);
