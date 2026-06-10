/**
 * Plain-language state texts (manifesto rule 5: grandma-proof).
 * German first, English fallback. Never show raw entity states in the UI.
 */

type Lang = "de" | "en";

const STATES: Record<Lang, Record<string, string>> = {
  de: {
    on: "An",
    off: "Aus",
    open: "Offen",
    opening: "Öffnet…",
    closed: "Geschlossen",
    closing: "Schließt…",
    locked: "Abgeschlossen",
    unlocked: "Offen",
    heat: "Heizen",
    heating: "Heizt",
    cool: "Kühlen",
    cooling: "Kühlt",
    dry: "Trocknen",
    drying: "Trocknet",
    fan_only: "Lüften",
    fan: "Lüftet",
    auto: "Automatik",
    heat_cool: "Automatik",
    idle: "Bereit",
    docked: "Angedockt",
    cleaning: "Saugt",
    returning: "Kehrt zurück",
    paused: "Pausiert",
    playing: "Spielt",
    home: "Zuhause",
    not_home: "Unterwegs",
    unavailable: "Nicht erreichbar",
    unknown: "Unbekannt",
  },
  en: {
    on: "On",
    off: "Off",
    open: "Open",
    opening: "Opening…",
    closed: "Closed",
    closing: "Closing…",
    locked: "Locked",
    unlocked: "Unlocked",
    heat: "Heat",
    heating: "Heating",
    cool: "Cool",
    cooling: "Cooling",
    dry: "Dry",
    drying: "Drying",
    fan_only: "Fan",
    fan: "Fan",
    auto: "Auto",
    heat_cool: "Auto",
    idle: "Idle",
    docked: "Docked",
    cleaning: "Cleaning",
    returning: "Returning",
    paused: "Paused",
    playing: "Playing",
    home: "Home",
    not_home: "Away",
    unavailable: "Unavailable",
    unknown: "Unknown",
  },
};

export function localizeState(state: string, lang?: string): string {
  const l: Lang = lang?.startsWith("de") ? "de" : "en";
  return STATES[l][state.toLowerCase()] ?? state;
}
