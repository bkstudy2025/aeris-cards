# AERIS — Eigenes Karten-System für Home Assistant

> **Mission:** Eine eigene Karten-Familie für Home Assistant, die UI/UX-technisch über
> Apple Home, SmartThings und Tuya hinausgeht — gebaut auf den 5 AERIS-Prinzipien,
> verteilt über HACS, getragen von der HA-Community.

---

## Das Manifest (Definition of Done für JEDES Feature)

| # | Prinzip | Messlatte |
|---|---------|-----------|
| 1 | **Tap-Budget** | Alltag = 1 Tap · Raumaktion = 2 · alles andere = 3 |
| 2 | **Zustand ist Licht** | An-Kacheln kippen hell; vom Sofa in 3 s lesbar |
| 3 | **Drei Ebenen** | Blick → Long-Press → Detailseite. Hauptscreen: nur Status + Szenen |
| 4 | **Das Haus antwortet** | Jeder Tap: Optik + Haptik. Probleme melden sich selbst |
| 5 | **Oma-tauglich** | Touchziele ≥ 44 px, Klartext, kein Admin-Kram sichtbar |

Ein Feature, das eine Regel bricht, wird nicht gemerged. Punkt.

---

## Warum eigene Karten statt Bubble-Card-Module?

| | Module (bisher) | Eigene Karten (neu) |
|---|---|---|
| Kontrolle über DOM/Render | eingeschränkt (Hacks nötig) | vollständig |
| Performance | JS-im-CSS-Template, läuft bei jedem Render | echtes Lit-Element, reaktiv |
| Visueller Editor | rudimentär | vollwertig (ha-form Schema) |
| Verteilung | Modul-Store (Nische) | **HACS** (Standard, riesige Reichweite) |
| Abhängigkeit | Bubble Card Releases | keine |
| Identität | "Bubble Card mit Skin" | **eigene Marke** |

---

## Phasen-Plan

### Phase 0 — Fundament: Design-System definieren *(1 Session)*
Bevor Code entsteht, wird die Sprache festgeschrieben (`DESIGN.md` + Design-Tokens):
- **Farben:** Raum-Akzent-System (jeder Raum eine Identitätsfarbe), Tageszeit-Töne,
  Zustandsfarben (Heizen/Kühlen/Warnung), Dark-first
- **Flächen:** Aus = dunkles Glas · An = helles, akzentgetöntes Glas (Apple-Kipp)
- **Typo-Skala:** Hero-Zahl (Temperatur) / Name / Subtext — max. 3 Stufen
- **Radii & Abstände:** Kachel 21 px, Icon-Quadrat 13 px, Grid-Gap 10 px
- **Motion:** Stagger-Einzug (55 ms), Press-Scale, Zustandswechsel 300 ms; nie dekorativ
- **Haptik:** 10 ms bei Aktion, 25 ms bei Warnung
- Alle Tokens als CSS Custom Properties → Nutzer-Theming möglich

### Phase 1 — Technisches Fundament *(1–2 Sessions)*
- **Stack:** TypeScript + Lit (HA-Standard, auch Mushroom/HA-Frontend nutzen es)
- **Repo-Struktur:** `aeris-cards/` mit `src/cards/`, `src/shared/` (Tokens, Helpers,
  State-Logik), Build via Vite/Rollup → eine `aeris-cards.js`
- **HACS-ready:** `hacs.json`, GitHub Releases, Versionierung (semver)
- **Dev-Umgebung:** lokaler HA-Container/Demo-Config zum Live-Testen
- **Gemeinsame Basis-Klasse:** `AuraBaseCard` (hass-Anbindung, Haptik, Long-Press,
  Tap-Actions, Akzent-Logik) — jede Karte erbt davon

### Phase 2 — Die Core-Vier (MVP) *(je 1–2 Sessions)*
1. **`aeris-room-card`** — die Visitenkarte. Raum-Status auf einen Blick:
   Akzentfarbe, Temp/Feuchte, Geräte-Badges (1-Tap-Toggle), Fenster-Warnung,
   Sparkline. Tap → Raumseite. *Ersetzt room_overview.*
2. **`aeris-tile`** — EINE Karte für alle Gerätetypen (Licht, Schalter, Klima,
   Rollladen, Lüfter, Media): erkennt Domain, rendert passende Steuerung
   (Toggle / Slider / Modus-Chips / Auf-Stop-Ab). Apple-Kipp eingebaut.
   *Ersetzt device_grid + device_tile.*
3. **`aeris-scenes`** — Szenen-/Aktions-Leiste (Swipe, Pfeile, Bestätigungs-Blitz).
   *Ersetzt quick_actions.*
4. **`aeris-status`** — Hero: Begrüßung, Haus-Scan (Licht/Heizung/Fenster/Temp),
   tappbare Stats, Kalender-Badge. *Ersetzt home_hero.*

### Phase 3 — Das Alleinstellungsmerkmal *(1–2 Sessions)*
5. **`aeris-attention`** — „Jetzt wichtig": regelbasierte Engine, die NUR erscheint,
   wenn etwas Aufmerksamkeit braucht: Fenster-offen-Heizung-an-Konflikt, schwache
   Batterien, Sauger-Fehler, lange offene Türen, Geräte offline. Tap = beheben.
   **Keine der großen Apps hat das.**

### Phase 4 — Ebene 2 & Lebendigkeit *(1–2 Sessions)*
6. **Long-Press-Quick-Sheet** — auf jeder aeris-Karte: halten → Overlay mit den
   3 wichtigsten Reglern, ohne Seitenwechsel (Prinzip 3 komplett)
7. **`aeris-weather`** — Ambient-Wetter (Partikel + Tageszeit) als echte Karte
8. **Tageszeit-Theming** — ein zentraler Token-Schalter färbt das ganze System

### Phase 5 — Community-Release *(fortlaufend)*
- GitHub-Repo öffentlich: README mit GIFs, Demo-Dashboard-YAML, Doku DE/EN
- **HACS Default-Repository** beantragen
- HA-Community-Forum-Thread + r/homeassistant Showcase
- Issue-Templates, Diskussions-Board → Feedback-Schleife
- Eigene Nische: „Das familientaugliche Premium-Designsystem für HA"

---

## Migration (nichts geht kaputt)
Das bestehende Dashboard (Bubble-Module) **bleibt produktiv**, während AERIS parallel
entsteht. Pro fertiger Karte wird 1:1 getauscht: room_overview → aeris-room-card usw.
Die YAML-Konfiguration wird bewusst ähnlich gehalten (sanfter Umstieg).

## Risiken & Antworten
- **Namens-Kollision:** vor Release prüfen, ob „aura" im HACS-Namespace frei ist
  (Fallback-Namen sammeln)
- **Scope-Explosion:** Manifest-Regel — jede Karte erst shippen, wenn die 5 Punkte
  erfüllt sind; lieber 4 perfekte Karten als 10 halbe
- **HA-Breaking-Changes:** nur dokumentierte Frontend-APIs nutzen (hass-Objekt,
  ha-form, Custom-Card-API), keine internen Klassen anzapfen

## Erfolgskriterien
- Frau-Test bestanden: jede Alltagsaktion ohne Erklärung gefunden ✓
- Jede Karte: visueller Editor, DE/EN, Dark/Hell, < 50 ms Render
- HACS-Installationen + GitHub-Sterne als Community-Resonanz
