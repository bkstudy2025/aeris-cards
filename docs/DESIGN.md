# AERIS Design-System · v1.0
### Die DNA jeder AERIS-Karte — verbindlich, konkret, messbar

> Phase 0 aus `AERIS_PLAN.md`. Jede Karte wird gegen dieses Dokument reviewt.
> Tokens = CSS Custom Properties mit Präfix `--aeris-*`, zentral in `src/shared/tokens.ts`.

---

## 0 · Charakter (in einem Satz)

**Dunkles Glas, das aufleuchtet, wenn das Zuhause lebt.**
Ruhig im Ruhezustand, eindeutig im Aktivzustand, niemals dekorativ ohne Funktion.

---

## 1 · Farbsystem (Dark-first)

### 1.1 Basis-Flächen
| Token | Wert | Verwendung |
|---|---|---|
| `--aeris-bg` | `#0b0f15` | View-Hintergrund (empfohlenes Theme) |
| `--aeris-surface` | `linear-gradient(155deg, rgba(255,255,255,.065), rgba(255,255,255,.022))` | Kachel AUS (dunkles Glas) |
| `--aeris-surface-border` | `rgba(255,255,255,.08)` | Kachel-Rand AUS |
| `--aeris-overlay` | `rgba(16,22,30,.82)` + `backdrop-filter: blur(14px)` | Quick-Sheet, Dialoge (Glas NUR hier konsequent) |
| `--aeris-shadow` | `0 4px 16px rgba(0,0,0,.26)` | Standard-Kachelschatten |

### 1.2 Der Kipp (Herzstück — Apple-Prinzip, AERIS-Ausführung)
Eine Kachel hat **zwei Welten**. Der Wechsel ist der wichtigste visuelle Moment im System:

| | AUS (dunkel) | AN (hell, akzentgetönt) |
|---|---|---|
| Fläche | `--aeris-surface` | `linear-gradient(155deg, color-mix(in srgb, var(--accent) 18%, #f4f6f9), color-mix(in srgb, var(--accent) 8%, #e8ecf2))` |
| Text Name | `#ffffff` | `#10151c` |
| Text Sub | `rgba(255,255,255,.45)` | `rgba(16,21,28,.55)` |
| Icon-Quadrat | `rgba(255,255,255,.92)` Fläche, Icon `#2b3440` | Fläche `var(--accent)`, Icon `#ffffff` |
| Rand | `--aeris-surface-border` | `color-mix(in srgb, var(--accent) 45%, transparent)` |
| Schatten | `--aeris-shadow` | `0 6px 24px color-mix(in srgb, var(--accent) 30%, rgba(0,0,0,.2))` |
| Übergang | — | `300ms cubic-bezier(.2,.8,.3,1)` auf allen Eigenschaften |

**Regel:** Der Kipp ist binär erkennbar aus 3 m Entfernung. Wenn man hinsehen muss → durchgefallen.

### 1.3 Raum-Akzente (Identitätsfarben)
Jeder Raum besitzt genau EINE Farbe; sie zieht sich durch Karte, Seite, Badges, Glow:

| Raum-Typ | Token | Hex |
|---|---|---|
| Wohnzimmer | `--aeris-room-living` | `#59b8ff` |
| Esszimmer | `--aeris-room-dining` | `#ffb74d` |
| Küche | `--aeris-room-kitchen` | `#ff7043` |
| Bad | `--aeris-room-bath` | `#4dd0e1` |
| Kind 1 | `--aeris-room-kid1` | `#9575cd` |
| Schlafzimmer | `--aeris-room-sleep` | `#7986cb` |
| Kind 2 | `--aeris-room-kid2` | `#f06292` |
| Flur/Neutral | `--aeris-room-neutral` | `#90a4ae` |

Nutzer können pro Karte überschreiben (`accent:` im Editor) — die Tokens sind Defaults.

### 1.4 Zustands-/Funktionsfarben (semantisch, NICHT raumgebunden)
| Token | Hex | Bedeutung |
|---|---|---|
| `--aeris-heat` | `#ff7043` | Heizen aktiv |
| `--aeris-cool` | `#4fc3f7` | Kühlen aktiv |
| `--aeris-dry` | `#ffb74d` | Trocknen |
| `--aeris-fan` | `#4db6ac` | Lüften |
| `--aeris-ok` | `#81c784` | Erfolg / alles gut |
| `--aeris-warn` | `#ffb44d` | Achtung (Fenster offen, Batterie) |
| `--aeris-danger` | `#ff6b6b` | Fehler / Konflikt / Offline |
| `--aeris-idle-icon` | `rgba(255,255,255,.55)` | inaktive Icons |

`aeris-attention` nutzt ausschließlich `warn`/`danger`/`ok` — Raumfarben sind dort tabu
(Warnungen müssen systemweit identisch aussehen).

### 1.5 Tageszeit-Tönung (Phase 4, Tokens jetzt schon definiert)
Ein einziger Hue-Shift-Token färbt View-Hintergrund + Hero:
| Phase | `--aeris-daylight` |
|---|---|
| 05–09 Uhr | `#ffb37a` (warmes Morgenlicht) |
| 09–17 Uhr | `#4fc3f7` (neutral kühl) |
| 17–21 Uhr | `#ff9e6d` (Abendorange) |
| 21–05 Uhr | `#3d5a80` (Nachtblau, gedimmt) |

---

## 2 · Typografie

System-Font (HA-Standard: Roboto/SF) — keine Custom-Fonts (Performance, Oma-Prinzip).

| Stufe | Token | Größe / Gewicht / Sonstiges | Verwendung |
|---|---|---|---|
| Hero-Zahl | `--aeris-type-hero` | 27px / 300 / `tabular-nums`, `letter-spacing -0.5px` | Temperatur, Position-% |
| Titel | `--aeris-type-title` | 19px / 800 | Seiten-/Hero-Überschrift |
| Name | `--aeris-type-name` | 14.5px / 800 | Kachel-Name |
| Sub | `--aeris-type-sub` | 11.5px / 500 | Zustandstext, Raum |
| Label | `--aeris-type-label` | 12.5px / 800 / UPPERCASE, `letter-spacing .7px` | Sektions-Titel |

**Maximal diese 5 Stufen.** Einheiten-Zeichen (°, %) immer 55 % Opazität, 60 % Größe der Zahl.

### Sprachregeln (Oma-Prinzip)
- Deutsch, aktiv, kurz: „Heizt" statt „hvac_action: heating", „Saugt" statt „cleaning"
- Niemals Entity-IDs, niemals Englisch im UI
- Zustandstexte zentral in `src/shared/i18n.ts` (DE primär, EN sekundär)

---

## 3 · Geometrie & Raster

| Token | Wert |
|---|---|
| `--aeris-radius-card` | `21px` (Kacheln) |
| `--aeris-radius-icon` | `13px` (Icon-Quadrat) |
| `--aeris-radius-control` | `12px` (Chips, Stepper, Buttons) |
| `--aeris-radius-pill` | `20px` (Status-Pills, Toggle) |
| `--aeris-gap` | `10px` (Grid-Abstand) |
| `--aeris-pad-card` | `12px 14px` (Kachel-Innenraum) |
| Icon-Quadrat | `40×40px`, Icon `22px` |
| Toggle | `44×26px`, Knopf `21px` |
| Kachel-Minimum | `100px` Höhe, **niemals** unter `44px` Touchziel für ein Bedienelement |

**Anatomie jeder Kachel (verbindlich):**
```
┌─────────────────────────────┐
│ [Icon-Quadrat]   [Wert/Tgl] │  ← Kopfzeile: Identität links, Zustand/Aktion rechts
│                             │
│ Name                        │  ← 14.5/800
│ Zustandstext                │  ← 11.5/500, gedimmt
│ [── Steuerung ──]           │  ← optional: Slider / Chips / Tasten
└─────────────────────────────┘
```
Diese Anatomie ist bei Licht, Klima, Rollo, Media, Sensor **identisch** — nur die
Steuerzeile wechselt. (Anti-Tuya-Regel: ein Layout, nicht hundert.)

---

## 4 · Motion (immer mit Funktion, nie Deko)

| Token | Wert | Zweck |
|---|---|---|
| `--aeris-ease` | `cubic-bezier(.2,.8,.3,1)` | Standard (entspannt-federnd) |
| `--aeris-t-state` | `300ms` | Zustandswechsel (Kipp) |
| `--aeris-t-press` | `120ms` | Press-Feedback |
| `--aeris-t-enter` | `400ms` | Eintritt einer Kachel |
| Stagger | `55ms` pro Kachel, max. 8 gestaffelt | Seiten-Eintritt (Cascade) |
| Press-Scale | `scale(.97)` Kachel / `scale(.9)` Kleinelemente | Tap-Quittung |
| Toggle-Knopf | `280ms cubic-bezier(.3,1.3,.5,1)` (Overshoot) | der eine erlaubte „Charakter-Move" |

**Pflicht:** `@media (prefers-reduced-motion: reduce)` → alle Animationen aus, nur Opacity.

### Optimistisches UI (Manifest-Regel 4)
Tap → Kachel kippt **sofort** (nicht auf HA-Bestätigung warten) → bestätigt der Zustand
nicht binnen 4 s, kippt sie zurück + kurzes Schütteln (`±3px, 250ms`) + Warn-Rand.

---

## 5 · Haptik & Feedback

| Ereignis | Vibration | Optik |
|---|---|---|
| Toggle / Szene / Modus | `10ms` | Kipp bzw. Blitz (Icon-Fläche 420ms aufhellen) |
| Slider losgelassen | `8ms` | Füllstand rastet |
| Warnung erscheint | `25ms` | Karte gleitet von oben ein |
| Fehler (Optimismus zurückgerollt) | `2×15ms` | Schütteln + Warn-Rand |

---

## 6 · Zustände (jede Karte beherrscht alle fünf)

| Zustand | Darstellung |
|---|---|
| **Aus** | dunkles Glas, Icon-Quadrat weiß, Icon dunkelgrau |
| **An** | der Kipp (hell, akzentgetönt) |
| **Aktiv-Modus** (heizt/kühlt/saugt) | wie An, aber Akzent = Funktionsfarbe (`--aeris-heat` …), Sub-Text nennt Tätigkeit |
| **Nicht verfügbar** | 45 % Opazität, Icon `mdi:help` NICHT — Original-Icon behalten, Sub: Klartext-Grund („Schalter ist aus", „Keine Verbindung") |
| **Warnung** | 1.5px `--aeris-warn`-Rand + Warn-Punkt oben rechts, Fläche bleibt zustandstreu |

---

## 7 · Ikonografie

- **MDI only** (HA-Standard, von der Community erwartet)
- Outline-Varianten bevorzugen; gefüllt nur im An-Zustand, wenn MDI ein Paar anbietet
  (`lightbulb-outline` ↔ `lightbulb`)
- Größen: Kachel-Icon `22px` · Chip/Badge `16–18px` · Hero `24px` — sonst nichts
- Pro Gerätetyp ein Standard-Icon in `src/shared/icons.ts` (überschreibbar im Editor)

---

## 8 · Barrierefreiheit (nicht verhandelbar)

- Touchziele ≥ `44×44px` (Slider-Daumen, Chips, Toggle eingerechnet)
- Kontrast: Name ≥ 7:1, Sub ≥ 4.5:1 — in BEIDEN Kipp-Welten (geprüft je Akzentfarbe;
  zu helle Akzente bekommen automatisch abgedunkelte Textfarbe via `color-mix`)
- Alle Bedienelemente mit `role`/`aria-label`, Slider mit `aria-valuenow`
- `prefers-reduced-motion` respektiert (s. Motion)
- Light-Mode: v1 shipped Dark-only (ehrlich dokumentiert); Light-Tokens sind
  vorbereitet (`--aeris-surface-light` …) und folgen in v1.x

---

## 9 · Token-Implementierung

Alle Tokens leben in `src/shared/tokens.ts` als ein CSS-Template, das jede Karte
in ihren Shadow-DOM einbettet — Nutzer überschreiben via Theme:

```yaml
# Beispiel: HA-Theme-Override durch den Nutzer
aeris-radius-card: "16px"
aeris-room-living: "#00e5ff"
```

**Namensregel:** `--aeris-{bereich}-{name}` · niemals Hex-Werte direkt in Karten-CSS —
ausschließlich Tokens. (Das erzwingt Konsistenz über alle Karten.)

---

## 10 · Review-Checkliste (vor jedem Merge)

- [ ] Kipp aus 3 m erkennbar?
- [ ] Alle 5 Zustände implementiert?
- [ ] Touchziele ≥ 44px?
- [ ] Nur Tokens, kein Roh-Hex?
- [ ] Anatomie-Raster eingehalten?
- [ ] Klartext-Deutsch, keine Entity-IDs?
- [ ] reduced-motion ok?
- [ ] Tap-Budget der Karte dokumentiert?
