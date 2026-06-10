import { css, html, nothing, LitElement } from "lit";
import type { TemplateResult } from "lit";
import { AerisBaseCard } from "../../shared/base-card";
import { tokens } from "../../shared/tokens";
import { localizeState } from "../../shared/i18n";
import { iconFor } from "../../shared/icons";

/**
 * aeris-room-card — the card IS the room.
 *
 * The Light Aura engine: the card stays dark glass, and real light blooms
 * where it is in the room. Each device may carry a `position` (9-zone grid);
 * active lights glow from that zone in their REAL color (rgb_color) and
 * scaled by their REAL brightness. Heating glows warm from the radiator
 * zone, an open window casts a cool draft shimmer — and pulses red when
 * the heating runs at the same time. Nothing like it exists elsewhere.
 */

type DeviceDef = string | { entity: string; position?: string };

interface RoomConfig {
  type: string;
  name?: string;
  icon?: string;
  accent?: string;
  navigate?: string;
  temp_entity?: string;
  humidity_entity?: string;
  devices?: DeviceDef[];
  window_entities?: DeviceDef[];
  graph_hours?: number;
}

interface NormDevice {
  entity: string;
  position: string;
}

const TOGGLE_BADGE = new Set(["light", "switch", "input_boolean", "fan", "cover"]);
const HISTORY_TTL = 10 * 60 * 1000;

/* 9-zone grid → gradient centers */
const POS: Record<string, string> = {
  "top-left": "16% 10%",
  top: "50% 6%",
  "top-right": "84% 10%",
  left: "8% 48%",
  center: "50% 42%",
  right: "92% 48%",
  "bottom-left": "16% 84%",
  bottom: "50% 90%",
  "bottom-right": "84% 84%",
};

/* zero-config spread when no positions are set */
const AUTO_POS = [
  "top",
  "top-right",
  "left",
  "right",
  "top-left",
  "center",
  "bottom-right",
  "bottom-left",
];

export class AerisRoomCard extends AerisBaseCard {
  static properties = {
    ...AerisBaseCard.properties,
    _series: { state: true },
  };

  declare _config?: RoomConfig & Record<string, unknown>;
  private _series: number[] = [];
  private _historyAt = 0;
  private _historyFor = "";

  constructor() {
    super();
    this.addEventListener("aeris-longpress", () => {
      const first = this._devices[0];
      if (first) this.moreInfo(first.entity);
    });
  }

  /* ---------- lovelace ---------- */

  setConfig(config: Record<string, unknown>): void {
    if (!config.name) throw new Error("aeris-room-card: 'name' is required");
    super.setConfig(config);
  }

  getCardSize(): number {
    return 3;
  }

  getGridOptions(): Record<string, unknown> {
    return { columns: 6, rows: 4, min_columns: 6, min_rows: 3 };
  }

  static getConfigElement(): HTMLElement {
    return document.createElement("aeris-room-card-editor");
  }

  static getStubConfig(): Record<string, unknown> {
    return { name: "Wohnzimmer", icon: "mdi:sofa" };
  }

  /* ---------- data ---------- */

  private _normalize(defs: DeviceDef[] | undefined, autoSpread: boolean): NormDevice[] {
    return (defs ?? []).map((d, i) => {
      if (typeof d === "string")
        return {
          entity: d,
          position: autoSpread ? AUTO_POS[i % AUTO_POS.length] : "top",
        };
      return {
        entity: d.entity,
        position: d.position ?? (autoSpread ? AUTO_POS[i % AUTO_POS.length] : "top"),
      };
    });
  }

  private get _devices(): NormDevice[] {
    return this._normalize(this._config?.devices, true);
  }

  private get _windows(): NormDevice[] {
    return this._normalize(this._config?.window_entities, false);
  }

  private get _accent(): string {
    return this._config?.accent || "var(--aeris-room-neutral)";
  }

  private get _activeCount(): number {
    return this._devices.filter(
      (d) => this.isActive(d.entity) && this.isAvailable(d.entity)
    ).length;
  }

  private get _windowOpen(): boolean {
    return this._windows.some(
      (w) => this.isActive(w.entity) && this.isAvailable(w.entity)
    );
  }

  /** Window open while a climate device actually heats/cools. */
  private get _conflict(): boolean {
    if (!this._windowOpen) return false;
    return this._devices.some((d) => {
      if (!d.entity.startsWith("climate.") || !this.isAvailable(d.entity)) return false;
      const action = this.entity(d.entity)?.attributes?.hvac_action as
        | string
        | undefined;
      if (action) return action === "heating" || action === "cooling";
      return this.isActive(d.entity);
    });
  }

  private _sensorValue(id?: string, digits = 0): string | undefined {
    if (!id || !this.isAvailable(id)) return undefined;
    const n = Number(this.entity(id)?.state);
    if (!Number.isFinite(n)) return undefined;
    return n.toFixed(digits);
  }

  private _sub(lang?: string): string {
    const de = lang?.startsWith("de");
    if (this._conflict) return de ? "Fenster offen, Heizung läuft!" : "Window open while heating!";
    if (this._windowOpen) return de ? "Fenster offen" : "Window open";
    const n = this._activeCount;
    if (n === 0) return de ? "Alles aus" : "All off";
    if (n === 1) return de ? "1 Gerät an" : "1 device on";
    return de ? `${n} Geräte an` : `${n} devices on`;
  }

  /* ---------- the Light Aura engine ---------- */

  private _glowFor(d: NormDevice): { color: string; opacity: number } | undefined {
    const id = d.entity;
    if (!this.isAvailable(id)) return undefined;
    const domain = id.split(".")[0];
    const attrs = this.entity(id)?.attributes ?? {};
    const active = this.isActive(id);

    if (domain === "climate") {
      const action = attrs.hvac_action as string | undefined;
      if (action === "heating") return { color: "255,112,67", opacity: 0.5 };
      if (action === "cooling") return { color: "79,195,247", opacity: 0.5 };
      return undefined;
    }
    if (!active) return undefined;
    if (domain === "light") {
      const rgb = attrs.rgb_color as [number, number, number] | undefined;
      const color = rgb ? rgb.join(",") : "255,214,150";
      const bri = attrs.brightness as number | undefined;
      const pct = bri != null ? bri / 255 : 1;
      return { color, opacity: 0.3 + 0.45 * pct };
    }
    if (domain === "cover") return undefined;
    if (domain === "media_player") return { color: "149,117,205", opacity: 0.4 };
    return { color: "150,200,255", opacity: 0.35 };
  }

  private _renderAura(): TemplateResult[] {
    const layers: TemplateResult[] = [];
    for (const d of this._devices) {
      const glow = this._glowFor(d);
      const at = POS[d.position] ?? POS.top;
      layers.push(html`
        <div
          class="glow"
          style="background: radial-gradient(58% 52% at ${at}, rgba(${glow?.color ?? "0,0,0"}, .85), transparent 72%); opacity:${glow ? glow.opacity : 0};"
        ></div>
      `);
    }
    const conflict = this._conflict;
    for (const w of this._windows) {
      const open = this.isActive(w.entity) && this.isAvailable(w.entity);
      const at = POS[w.position] ?? POS.top;
      layers.push(html`
        <div
          class="glow draft ${conflict && open ? "pulse" : ""}"
          style="background: radial-gradient(64% 58% at ${at}, rgba(${conflict ? "255,107,107" : "126,156,190"}, .6), transparent 74%); opacity:${open ? (conflict ? 0.85 : 0.5) : 0};"
        ></div>
      `);
    }
    return layers;
  }

  /* ---------- history sparkline ---------- */

  protected updated(): void {
    this._maybeFetchHistory();
    this._draw();
  }

  private _maybeFetchHistory(): void {
    const id = this._config?.temp_entity;
    if (!id || !this.hass?.callWS) return;
    const now = Date.now();
    if (this._historyFor === id && now - this._historyAt < HISTORY_TTL) return;
    this._historyAt = now;
    this._historyFor = id;
    const hours = this._config?.graph_hours ?? 24;
    const end = new Date();
    const start = new Date(end.getTime() - hours * 3600 * 1000);
    this.hass
      .callWS<Record<string, Array<{ s?: string; state?: string }>>>({
        type: "history/history_during_period",
        start_time: start.toISOString(),
        end_time: end.toISOString(),
        minimal_response: true,
        no_attributes: true,
        entity_ids: [id],
      })
      .then((resp) => {
        const rows = resp?.[id] ?? [];
        const values: number[] = [];
        for (const row of rows) {
          const n = Number(row.s ?? row.state);
          if (Number.isFinite(n)) values.push(n);
        }
        const max = 60;
        this._series =
          values.length > max
            ? values.filter((_, i) => i % Math.ceil(values.length / max) === 0)
            : values;
      })
      .catch(() => {
        /* decoration only */
      });
  }

  private _draw(): void {
    const canvas = this.renderRoot.querySelector("canvas");
    if (!canvas || this._series.length < 2) return;
    const rect = canvas.getBoundingClientRect();
    if (rect.width < 2 || rect.height < 2) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const w = rect.width;
    const h = rect.height;
    ctx.clearRect(0, 0, w, h);
    let min = Infinity;
    let max = -Infinity;
    for (const v of this._series) {
      if (v < min) min = v;
      if (v > max) max = v;
    }
    const range = max - min || 1;
    const step = w / (this._series.length - 1);
    const pts = this._series.map((v, i) => ({
      x: i * step,
      y: h - 3 - ((v - min) / range) * (h - 8),
    }));
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length - 1; i++) {
      const cx = (pts[i].x + pts[i + 1].x) / 2;
      const cy = (pts[i].y + pts[i + 1].y) / 2;
      ctx.quadraticCurveTo(pts[i].x, pts[i].y, cx, cy);
    }
    ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
    ctx.strokeStyle = "#ffffff";
    ctx.globalAlpha = 0.22;
    ctx.lineWidth = 2;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.stroke();
  }

  /* ---------- interactions ---------- */

  private _onCardClick(): void {
    if (this.consumeLongPress()) return;
    const nav = this._config?.navigate;
    if (nav) this.navigate(nav);
  }

  private _onBadge(id: string, e: Event): void {
    e.stopPropagation();
    const domain = id.split(".")[0];
    if (TOGGLE_BADGE.has(domain)) this.toggleEntity(id);
    else this.moreInfo(id);
  }

  /* ---------- render ---------- */

  protected render(): TemplateResult | typeof nothing {
    if (!this._config || !this.hass) return nothing;
    const lang = this.hass.language;
    const on = this._activeCount > 0;
    const conflict = this._conflict;

    const temp = this._sensorValue(this._config.temp_entity, 1);
    const hum = this._sensorValue(this._config.humidity_entity, 0);

    return html`
      <div
        class="card ${on ? "on" : ""} ${conflict ? "conflict" : ""}"
        style="--accent:${this._accent}"
        role="button"
        tabindex="0"
        aria-label=${this._config.name ?? ""}
        @click=${this._onCardClick}
        @pointerdown=${this.pressStart}
        @pointerup=${this.pressEnd}
        @pointerleave=${this.pressEnd}
      >
        ${this._renderAura()}
        <canvas class="spark" aria-hidden="true"></canvas>
        <div class="head">
          <div class="iconbox" aria-hidden="true">
            <ha-icon .icon=${this._config.icon ?? "mdi:home"}></ha-icon>
          </div>
          <div class="climate">
            ${temp != null
              ? html`<div class="value">
                  ${Math.round(Number(temp))}<span class="unit">°</span>
                </div>`
              : nothing}
            ${hum != null
              ? html`<div class="hum">
                  <ha-icon icon="mdi:water-percent"></ha-icon>${hum} %
                </div>`
              : nothing}
          </div>
        </div>
        <div class="grow"></div>
        <div class="namerow">
          <div class="name">${this._config.name}</div>
          ${this._windowOpen
            ? html`<div class="winpill ${conflict ? "danger" : ""}" aria-hidden="true">
                <ha-icon icon="mdi:window-open-variant"></ha-icon>
              </div>`
            : nothing}
        </div>
        <div class="sub ${conflict ? "warntext" : ""}">${this._sub(lang)}</div>
        ${this._devices.length
          ? html`<div class="badges" @click=${(e: Event) => e.stopPropagation()}>
              ${this._devices.map((d) => {
                const a = this.isActive(d.entity) && this.isAvailable(d.entity);
                return html`
                  <button
                    class="badge ${a ? "on" : ""}"
                    aria-label=${(this.entity(d.entity)?.attributes?.friendly_name as string) ?? d.entity}
                    title=${localizeState(this.displayState(d.entity), lang)}
                    @click=${(e: Event) => this._onBadge(d.entity, e)}
                  >
                    <ha-icon .icon=${iconFor(d.entity, a)}></ha-icon>
                  </button>
                `;
              })}
            </div>`
          : nothing}
      </div>
    `;
  }

  /* ---------- styles ---------- */

  static styles = [
    tokens,
    css`
      :host {
        display: block;
        height: 100%;
      }
      .card {
        position: relative;
        box-sizing: border-box;
        height: 100%;
        min-height: 150px;
        display: flex;
        flex-direction: column;
        padding: var(--aeris-pad-card);
        border-radius: var(--aeris-radius-card);
        background:
          radial-gradient(120% 100% at 50% 120%, rgba(255, 255, 255, 0.03), transparent 60%),
          #10151d;
        border: 1px solid var(--aeris-surface-border);
        box-shadow: var(--aeris-shadow);
        color: var(--aeris-text);
        cursor: pointer;
        overflow: hidden;
        -webkit-tap-highlight-color: transparent;
        transition:
          border-color var(--aeris-t-state) var(--aeris-ease),
          box-shadow var(--aeris-t-state) var(--aeris-ease),
          transform var(--aeris-t-press) var(--aeris-ease);
      }
      .card:active {
        transform: scale(0.97);
      }
      .card.on {
        border-color: color-mix(in srgb, var(--accent) 38%, transparent);
      }
      .card.conflict {
        border-color: var(--aeris-danger);
        box-shadow: 0 0 0 1px var(--aeris-danger),
          0 6px 24px color-mix(in srgb, var(--aeris-danger) 35%, rgba(0, 0, 0, 0.2));
      }

      /* —— the Light Aura: light blooms where it lives —— */
      .glow {
        position: absolute;
        inset: 0;
        border-radius: inherit;
        pointer-events: none;
        transition: opacity 700ms var(--aeris-ease);
        will-change: opacity;
      }
      .glow.pulse {
        animation: aeris-pulse 1.6s ease-in-out infinite;
      }
      @keyframes aeris-pulse {
        0%, 100% { opacity: 0.85; }
        50% { opacity: 0.45; }
      }
      @media (prefers-reduced-motion: reduce) {
        .glow.pulse {
          animation: none;
        }
      }

      .spark {
        position: absolute;
        left: 0;
        right: 0;
        bottom: 0;
        width: 100%;
        height: 36%;
        pointer-events: none;
        -webkit-mask-image: linear-gradient(to top, #000 55%, transparent);
        mask-image: linear-gradient(to top, #000 55%, transparent);
      }

      .head {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 10px;
        position: relative;
      }
      .iconbox {
        width: 42px;
        height: 42px;
        border-radius: var(--aeris-radius-icon);
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(255, 255, 255, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.12);
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
        flex-shrink: 0;
        transition:
          background var(--aeris-t-state) var(--aeris-ease),
          box-shadow var(--aeris-t-state) var(--aeris-ease);
      }
      .iconbox ha-icon {
        --mdc-icon-size: 23px;
        color: rgba(255, 255, 255, 0.85);
        transition: color var(--aeris-t-state) var(--aeris-ease);
      }
      .card.on .iconbox {
        background: var(--accent);
        border-color: transparent;
        box-shadow: 0 0 22px color-mix(in srgb, var(--accent) 60%, transparent);
      }
      .card.on .iconbox ha-icon {
        color: #fff;
      }

      .climate {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 2px;
      }
      .value {
        font-size: 27px;
        font-weight: 300;
        letter-spacing: -0.5px;
        font-variant-numeric: tabular-nums;
        line-height: 1;
        text-shadow: 0 1px 8px rgba(0, 0, 0, 0.45);
      }
      .value .unit {
        font-size: 16px;
        opacity: 0.55;
      }
      .hum {
        display: inline-flex;
        align-items: center;
        gap: 2px;
        font-size: 11.5px;
        font-weight: 600;
        color: rgba(255, 255, 255, 0.6);
        font-variant-numeric: tabular-nums;
      }
      .hum ha-icon {
        --mdc-icon-size: 13px;
        color: var(--aeris-cool);
      }

      .grow {
        flex: 1;
        min-height: 8px;
      }

      .namerow {
        display: flex;
        align-items: center;
        gap: 8px;
        position: relative;
      }
      .name {
        flex: 1;
        min-width: 0;
        font-size: 16px;
        font-weight: 800;
        line-height: 1.15;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        text-shadow: 0 1px 10px rgba(0, 0, 0, 0.5);
      }
      .winpill {
        width: 24px;
        height: 24px;
        border-radius: 50%;
        flex-shrink: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        background: color-mix(in srgb, var(--aeris-warn) 22%, transparent);
        border: 1px solid color-mix(in srgb, var(--aeris-warn) 50%, transparent);
      }
      .winpill ha-icon {
        --mdc-icon-size: 14px;
        color: var(--aeris-warn);
      }
      .winpill.danger {
        background: color-mix(in srgb, var(--aeris-danger) 22%, transparent);
        border-color: color-mix(in srgb, var(--aeris-danger) 55%, transparent);
      }
      .winpill.danger ha-icon {
        color: var(--aeris-danger);
      }

      .sub {
        margin-top: 1px;
        font-size: 11.5px;
        font-weight: 500;
        color: rgba(255, 255, 255, 0.55);
        position: relative;
        text-shadow: 0 1px 8px rgba(0, 0, 0, 0.5);
      }
      .sub.warntext {
        color: var(--aeris-danger);
        font-weight: 700;
      }

      .badges {
        display: flex;
        gap: 7px;
        margin-top: 10px;
        flex-wrap: wrap;
        position: relative;
      }
      .badge {
        width: 44px;
        height: 44px;
        border-radius: var(--aeris-radius-control);
        border: 1px solid rgba(255, 255, 255, 0.1);
        background: rgba(18, 24, 32, 0.66);
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        padding: 0;
        transition:
          background var(--aeris-t-state) var(--aeris-ease),
          border-color var(--aeris-t-state) var(--aeris-ease),
          box-shadow var(--aeris-t-state) var(--aeris-ease),
          transform var(--aeris-t-press) var(--aeris-ease);
      }
      .badge:active {
        transform: scale(0.88);
      }
      .badge ha-icon {
        --mdc-icon-size: 19px;
        color: var(--aeris-idle-icon);
        transition: color var(--aeris-t-state) var(--aeris-ease);
      }
      .badge.on {
        background: var(--accent);
        border-color: var(--accent);
        box-shadow: 0 0 14px color-mix(in srgb, var(--accent) 50%, transparent);
      }
      .badge.on ha-icon {
        color: #fff;
      }
    `,
  ];
}

/* ---------- visual editor ---------- */

class AerisRoomCardEditor extends LitElement {
  static properties = {
    hass: { attribute: false },
    _config: { state: true },
  };

  hass?: unknown;
  private _config?: Record<string, unknown>;

  setConfig(config: Record<string, unknown>): void {
    this._config = config;
  }

  private _schema = [
    { name: "name", required: true, selector: { text: {} } },
    { name: "icon", selector: { icon: {} } },
    { name: "accent", selector: { text: { type: "color" } } },
    { name: "navigate", selector: { text: {} } },
    { name: "temp_entity", selector: { entity: { domain: "sensor" } } },
    { name: "humidity_entity", selector: { entity: { domain: "sensor" } } },
    { name: "devices", selector: { entity: { multiple: true } } },
    { name: "window_entities", selector: { entity: { multiple: true } } },
  ];

  private _labels = (schema: { name: string }): string =>
    ({
      name: "Raumname",
      icon: "Icon",
      accent: "Akzentfarbe",
      navigate: "Subview-Pfad (z. B. wohnzimmer)",
      temp_entity: "Temperatur-Sensor",
      humidity_entity: "Luftfeuchte-Sensor",
      devices: "Geräte (Badges + Licht-Aura)",
      window_entities: "Fenster-Sensoren",
    })[schema.name] ?? schema.name;

  private _valueChanged(e: CustomEvent): void {
    e.stopPropagation();
    this.dispatchEvent(
      new CustomEvent("config-changed", {
        detail: { config: e.detail.value },
        bubbles: true,
        composed: true,
      })
    );
  }

  protected render(): TemplateResult | typeof nothing {
    if (!this._config) return nothing;
    return html`
      <ha-form
        .hass=${this.hass}
        .data=${this._config}
        .schema=${this._schema}
        .computeLabel=${this._labels}
        @value-changed=${this._valueChanged}
      ></ha-form>
    `;
  }
}

/* ---------- registration ---------- */

customElements.define("aeris-room-card", AerisRoomCard);
customElements.define("aeris-room-card-editor", AerisRoomCardEditor);

window.customCards = window.customCards ?? [];
window.customCards.push({
  type: "aeris-room-card",
  name: "Aeris Room Card",
  description:
    "The card IS the room — real light blooms where it lives, in its real color and brightness. Window drafts shimmer cool, conflicts pulse red.",
  preview: true,
  documentationURL: "https://github.com/bkstudy2025/aeris-cards",
});
