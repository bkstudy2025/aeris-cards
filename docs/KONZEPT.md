# AERIS — Das Konzept
### Warum wir besser sind als Apple, Samsung & Tuya — und was die Community wirklich will

> Begleitdokument zu `AERIS_PLAN.md` (der Plan sagt WIE, dieses Dokument sagt WAS und WARUM).

---

## 1 · Zielbild

Ein Karten-System für Home Assistant, das die **Eleganz von Apple**, die **Ergonomie von
Samsung** und den **Pragmatismus von Tuya** vereint — und an genau den Stellen weitergeht,
an denen deren Nutzer nachweislich leiden. Lokal, sofort, familientauglich, unverkennbar.

---

## 2 · Konkurrenz-Analyse: Schwächen → AERIS-Antwort

### 🍎 Apple Home
| Schwäche (von Nutzern bemängelt) | AERIS-Antwort |
|---|---|
| Versteckt zu viel: Raumklima (Temp/Feuchte) nur nach mehreren Taps sichtbar | `aeris-room-card` zeigt Temp + Feuchte + Verlauf **immer** auf der Raumkarte |
| Keine Verläufe/Kontext — nur Momentaufnahme | Sparkline (24 h Klima) direkt in der Karte |
| Automationen passieren kommentarlos („warum ist das Licht aus?") | `aeris-attention` erklärt, was das Haus tut und warum |
| HomeKit-only — große Geräteauswahl bleibt draußen | HA-Basis: ALLES ist integrierbar (Zigbee, Tuya, Shelly, ESPHome …) |
| Kaum anpassbar (Farben, Layout fix) | Token-System: Raumfarben, Tageszeit-Themes, alles per CSS-Variable |
| **Was wir übernehmen:** | Der Kipp-Effekt (An-Kachel wird hell), 1-Tap-Toggle, Long-Press-Detail |

### 📱 Samsung SmartThings
| Schwäche | AERIS-Antwort |
|---|---|
| Cloud-Lag: Tap → 1–3 s Wartezeit, Offline = tot | HA = **lokal**: Reaktion < 100 ms, läuft ohne Internet |
| App überladen: Werbung, „Life"-Tab, Promo-Karten | Hauptscreen zeigt NUR Status + Szenen (Manifest-Regel 3) |
| Inkonsistente Geräte-Panels je nach Hersteller | EIN `aeris-tile` für alle Domains — identische Bedienlogik überall |
| Komplexe Einrichtung für Familienmitglieder | Oma-Prinzip: keine Admin-Elemente auf dem Dashboard sichtbar |
| **Was wir übernehmen:** | One-UI-Ergonomie (Anzeige oben, Interaktion in Daumen-Nähe), Map-/Raum-Denke |

### 🔌 Tuya / Smart Life
| Schwäche | AERIS-Antwort |
|---|---|
| 100 verschiedene Panel-Designs (jeder Hersteller anders) | Ein Design-System, eine Typo-Skala, ein Verhalten |
| Cloud-Roundtrip auch im eigenen WLAN | lokal via HA (tuya-local/Zigbee) |
| Übersetzungs-Chaos, technische Begriffe | Deutsche Klartexte, von Menschen formuliert („Heizt", nicht „hvac_action: heating") |
| Datenschutz-Bedenken (China-Cloud) | 100 % lokal, keine Telemetrie |
| **Was wir übernehmen:** | Tap-to-Run-Szenen prominent oben (= `aeris-scenes`) |

### 🏠 Und innerhalb der HA-Welt? (Mushroom, Bubble, native Tiles)
| Schwäche der HA-Karten-Landschaft | AERIS-Antwort |
|---|---|
| Mushroom: schön, aber neutral-grau — keine Identität, kein Zustand-Kipp | Raumfarben-DNA + Apple-Kipp |
| Bubble Card: Popup-zentriert, Module = Hacks im CSS-Template | echte Lit-Karten, saubere Architektur |
| Native Tiles: funktional, aber steril; kein Gesamtsystem | durchgängige Designsprache vom Hero bis zum Slider |
| ALLE: keine zeigt proaktiv Probleme | `aeris-attention` — gibt es nirgendwo sonst |

---

## 3 · Community-Schmerzpunkte → Feature

Recherchiert (HA-Forum, HowToGeek, Usability-Studien):

| # | O-Ton der Community | AERIS-Feature |
|---|---|---|
| 1 | „Zu viele Taps für eine Aktion — meine Eltern geben auf" | **Tap-Budget**: Badge auf Raumkarte = 1 Tap Licht; Szene = 1 Tap; Hero-Stat = 1 Tap |
| 2 | „Dashboards sind vollgestopft — niemand findet den Lichtschalter" | **Drei-Ebenen-Architektur**: Hauptscreen = nur Status + Szenen. Graphen/Kameras leben in Ebene 3 |
| 3 | „Frau/Familie nutzt wieder die Wandschalter" | **Oma-Prinzip**: ≥ 44 px Touchziele, Klartext, identische Bedienung überall |
| 4 | „Hat mein Tap funktioniert?" | **Sofort-Feedback**: optischer Kipp + Haptik bei JEDEM Tap, optimistisches UI (Kachel kippt sofort, korrigiert bei Fehler) |
| 5 | „Fenster offen und die Heizung lief den ganzen Tag" | **`aeris-attention`**: erkennt Konflikte selbst und meldet sie — mit 1-Tap-Lösung |
| 6 | „Batterie vom Sensor war leer, hab's wochenlang nicht gemerkt" | `aeris-attention`: Batterie-/Offline-Wächter eingebaut |
| 7 | „Jede Karte braucht YAML-Frickelei" | Jede AERIS-Karte hat einen **vollwertigen visuellen Editor** |
| 8 | „Sieht auf dem Tablet gut aus, auf dem Handy kaputt" | **Mobile-first**: entworfen für 390 px Breite, skaliert hoch (nicht umgekehrt) |

---

## 4 · Der Tap-Vergleich (messbar besser)

Alltags-Szenarien, gezählt ab Home-Screen der jeweiligen App:

| Szenario | Apple Home | SmartThings | Tuya | **AERIS** |
|---|---|---|---|---|
| Wohnzimmer-Licht aus | 1–2 | 2–3 | 2 | **1** (Badge auf Raumkarte) |
| Heizung im Bad +1° | 3–4 | 3–4 | 3 | **2** (Raumkarte → Stepper) |
| „Gute Nacht" (alles aus + Rollos) | 2 (Szene suchen) | 2–3 | 1–2 | **1** (Szenen-Leiste oben) |
| Welche Fenster sind offen? | 2–3 (suchen) | 3+ | nicht aggregiert | **0–1** (Hero zeigt's, Tap für Liste) |
| Fenster-offen-Heizung-Konflikt bemerken | ∞ (zeigt keiner) | ∞ | ∞ | **0** (meldet sich selbst) |
| Saugroboter: nur die Küche saugen | n/a | 3–4 | 3 | **2** (Raumseite → „Raum saugen") |

> **Die letzte Zeile mit der „0" ist unser Marketing.** Kein System der Großen
> kommt von sich aus auf den Nutzer zu. AERIS schon.

---

## 5 · Was jede Karte konkret besser macht

### `aeris-room-card` — die beste Raumkarte im HA-Ökosystem
- Identitätsfarbe + Apple-Kipp (Raum „leuchtet", wenn aktiv)
- Temp + Feuchte + 24-h-Sparkline immer sichtbar (Apple zeigt: nichts davon)
- Geräte-Badges mit 1-Tap-Toggle (Licht/Rollo direkt von der Übersicht)
- Fenster-Warnung integriert
- Long-Press → Quick-Sheet, Tap → Raumseite

### `aeris-tile` — ein Bedienelement statt zehn
- Erkennt die Domain selbst: Licht → Toggle+Dimmer · Klima → Modus-Chips+Stepper ·
  Rollo → Auf/Stop/Ab+Position · Media → Transport · Schalter → Toggle
- Überall identische Anatomie: Icon-Quadrat links, Zustand rechts, Name unten
- Optimistisches UI: kippt sofort, Status bestätigt nach
- Nicht verfügbar ≠ kaputt: ausgegraut mit Klartext-Grund

### `aeris-scenes` — Tap-to-Run, aber schön
- 1 Tap, Bestätigungs-Blitz + Haptik, Swipe bei vielen Szenen
- Szenen können navigieren (z. B. „Sauger" → Robby-Seite)

### `aeris-status` — der Hero
- Begrüßung + Datum, Haus-Aggregat (Licht/Heizung/Fenster/Ø-Temp)
- **Stats tappbar**: „2 Lichter" → Liste mit Aus-Knopf (Apple-Pattern, besser umgesetzt)
- Kalender-Badge mit Termin-Zähler

### `aeris-attention` — das Alleinstellungsmerkmal
Regelwerk (lokal, kein Cloud-AI):
- Fenster offen + Heizung an im selben Raum → „Heizung pausieren?"
- Fenster/Tür länger als X min offen bei Außentemp < Y°
- Batterie < 15 % bei Sensoren
- Gerät offline/unavailable seit > X h
- Sauger: Fehler oder festgefahren
- Erscheint NUR im Problemfall — sonst unsichtbar (kein Dauerrauschen)
- Jede Meldung hat eine 1-Tap-Aktion zur Lösung

---

## 6 · Positionierung (die Nische)

> **„Das familientaugliche Premium-Designsystem für Home Assistant."**

- Nicht das funktionsreichste (das ist HA selbst) —
- nicht das minimalste (das ist Mushroom) —
- sondern das, das **am besten aussieht UND von jedem bedient werden kann
  UND von selbst mitdenkt**. Diese Kombination existiert nicht — weder bei
  den Großen noch in HACS.
