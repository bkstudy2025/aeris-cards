/**
 * Default MDI icons per domain (overridable in every card editor).
 * Outline at rest; filled variant on active state where MDI offers a pair.
 */

const DOMAIN_ICONS: Record<string, { off: string; on: string }> = {
  light: { off: "mdi:lightbulb-outline", on: "mdi:lightbulb" },
  switch: { off: "mdi:power-plug-outline", on: "mdi:power-plug" },
  climate: { off: "mdi:thermostat", on: "mdi:thermostat" },
  cover: { off: "mdi:window-shutter", on: "mdi:window-shutter-open" },
  fan: { off: "mdi:fan-off", on: "mdi:fan" },
  media_player: { off: "mdi:speaker-off", on: "mdi:speaker" },
  vacuum: { off: "mdi:robot-vacuum", on: "mdi:robot-vacuum" },
  lock: { off: "mdi:lock", on: "mdi:lock-open-variant" },
  binary_sensor: { off: "mdi:checkbox-blank-circle-outline", on: "mdi:checkbox-marked-circle" },
  sensor: { off: "mdi:gauge", on: "mdi:gauge" },
  scene: { off: "mdi:palette-outline", on: "mdi:palette" },
  script: { off: "mdi:script-text-outline", on: "mdi:script-text" },
  person: { off: "mdi:account-outline", on: "mdi:account" },
  camera: { off: "mdi:cctv", on: "mdi:cctv" },
};

export function iconFor(entityId: string, active: boolean): string {
  const domain = entityId.split(".")[0];
  const pair = DOMAIN_ICONS[domain];
  if (!pair) return "mdi:checkbox-blank-circle-outline";
  return active ? pair.on : pair.off;
}
