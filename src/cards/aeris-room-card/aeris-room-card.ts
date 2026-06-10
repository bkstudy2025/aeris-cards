import { css, html, nothing, LitElement } from "lit";
import type { TemplateResult } from "lit";
import { AerisBaseCard } from "../../shared/base-card";
import { tokens } from "../../shared/tokens";
import { localizeState } from "../../shared/i18n";
import { iconFor } from "../../shared/icons";

/**
 * aeris-room-card — the room at a glance.
 *
 * Innovations over every other room card:
 *  - Living intensity: the bright flip scales with how much is active
 *  - Built-in conflict watch: window open + heating on → the card warns itself
 *  - 1-tap device badges with optimistic flip, 24 h climate sparkline
 */

interface RoomConfig {
  type: string;
  name?: string;
  icon?: string;
  accent?: string;
  navigate?: string;
  temp_entity?: string;
  humidity_entity?: string;
  devices?: string[];
  window_entities?: string[];
  graph_hours?: number;
}

const TOGGLE_BADGE = new Set(["light", "switch", "input_boolean", "fan", "cover"]);
const HISTORY_TTL = 10 * 60 * 1000;

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
      if (first) this.moreInfo(first);
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

  private get _devices(): string[] {
    return this._config?.devices ?? [];
  }

  private get _windows(): string[] {
    return this._config?.window_entities ?? [];
  }

  private get _accent(): string {
    return this._config?.accent || "var(--aeris-room-neutral)";
  }

  private get _activeDevices(): string[] {
    return this._devices.filter((d) => this.isActive(d) && this.isAvailable(d));
  }

  private get _windowOpen(): boolean {
    return this._windows.some((w) => this.isActive(w) && this.isAvailable(w));
  }

  /** Window open while a climate device is running — the card thinks. */
  private get _conflict(): boolean {
    if (!this._windowOpen) return false;
    return this._devices.some((d) => {
      if (!d.startsWith("climate.") || !this.isAvailable(d)) return false;
      const action = this.entity(d)?.attributes?.hvac_action as string | undefined;
      if (action) return action === "heating" || action === "cooling";
      return this.isActive(d);
    });
  }

  private _sensorValue(id?: string, digits = 0): string | undefined {
    if (!id || !this.isAvailable(id)) return undefined;
    const n = Number(this.entity(id)?.state);
    if (!Number.isFinite(n)) return undefined;
    return n.toFixed(digits);
  }

  private _sub(lang?: string): string {
    if (this._conflict)
      return lang?.startsWith("de")
        ? "Fenster offen, Heizung läuft!"
        : "Window open while heating!";
    const n = this._activeDevices.length;
    if (this._windowOpen)
      return lang?.startsWith("de") ? "Fenster offen" : "Window open";
    if (n === 0) return lang?.startsWith("de") ? "Alles aus" : "All off";
    if (n === 1) return lang?.startsWith("de") ? "1 Gerät an" : "1 device on";
    return lang?.startsWith("de") ? `${n} Geräte an` : `${n} devices on`;
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
        /* sparkline is decoration — fail silently */
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
    const cardEl = this.renderRoot.querySelector(".card");
    const style = cardEl ? getComputedStyle(cardEl) : getComputedStyle(this);
    const accent =
      style.getPropertyValue("--aeris-spark").trim() || "#59b8ff";
    ctx.strokeStyle = accent;
    ctx.globalAlpha = 0.4;
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
    const active = this._activeDevices.length;
    const total = this._devices.length || 1;
    const on = active > 0;
    const conflict = this._conflict;

    /* Living intensity: flip strength follows activity (innovation #1) */
    const ratio = Math.min(1, active / total);
    const mixA = Math.round(10 + 14 * ratio);
    const mixB = Math.round(4 + 8 * ratio);

    const temp = this._sensorValue(this._config.temp_entity, 1);
    const hum = this._sensorValue(this._config.humidity_entity, 0);

    const accent = this._accent;
    const spark = on ? "rgba(16,21,28,.8)" : accent;

    return html`
      <div
        class="card ${on ? "on" : ""} ${conflict ? "conflict" : ""}"
        style="--accent:${accent};--mix-a:${mixA}%;--mix-b:${mixB}%;--aeris-spark:${spark}"
        role="button"
        tabindex="0"
        aria-label=${this._config.name ?? ""}
        @click=${this._onCardClick}
        @pointerdown=${this.pressStart}
        @pointerup=${this.pressEnd}
        @pointerleave=${this.pressEnd}
      >
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
                const a = this.isActive(d) && this.isAvailable(d);
                return html`
                  <button
                    class="badge ${a ? "on" : ""}"
                    aria-label=${(this.entity(d)?.attributes?.friendly_name as string) ?? d}
                    title=${localizeState(this.displayState(d), lang)}
                    @click=${(e: Event) => this._onBadge(d, e)}
                  >
                    <ha-icon .icon=${iconFor(d, a)}></ha-icon>
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
        background: var(--aeris-surface);
        border: 1px solid var(--aeris-surface-border);
        box-shadow: var(--aeris-shadow);
        color: var(--aeris-text);
        cursor: pointer;
        overflow: hidden;
        -webkit-tap-highlight-color: transparent;
        transition:
          background var(--aeris-t-state) var(--aeris-ease),
          border-color var(--aeris-t-state) var(--aeris-ease),
          box-shadow var(--aeris-t-state) var(--aeris-ease),
          color var(--aeris-t-state) var(--aeris-ease),
          transform var(--aeris-t-press) var(--aeris-ease);
      }
      .card:active {
        transform: scale(0.97);
      }
      /* Living flip — intensity follows activity via --mix-a/--mix-b */
      .card.on {
        background: linear-gradient(
          155deg,
          color-mix(in srgb, var(--accent) var(--mix-a, 18%), #f4f6f9),
          color-mix(in srgb, var(--accent) var(--mix-b, 8%), #e8ecf2)
        );
        border-color: color-mix(in srgb, var(--accent) 45%, transparent);
        box-shadow: 0 6px 24px color-mix(in srgb, var(--accent) 30%, rgba(0, 0, 0, 0.2));
        color: var(--aeris-text-on-light);
      }
      /* Conflict watch — the card warns itself */
      .card.conflict {
        border-color: var(--aeris-danger);
        box-shadow: 0 0 0 1px var(--aeris-danger),
          0 6px 24px color-mix(in srgb, var(--aeris-danger) 35%, rgba(0, 0, 0, 0.2));
      }

      .spark {
        position: absolute;
        left: 0;
        right: 0;
        bottom: 0;
        width: 100%;
        height: 38%;
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
        background: rgba(255, 255, 255, 0.92);
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
        flex-shrink: 0;
        transition:
          background var(--aeris-t-state) var(--aeris-ease),
          box-shadow var(--aeris-t-state) var(--aeris-ease);
      }
      .iconbox ha-icon {
        --mdc-icon-size: 23px;
        color: #2b3440;
        transition: color var(--aeris-t-state) var(--aeris-ease);
      }
      .card.on .iconbox {
        background: var(--accent);
        box-shadow: 0 0 20px color-mix(in srgb, var(--accent) 55%, transparent);
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
        color: var(--aeris-text-sub);
        font-variant-numeric: tabular-nums;
        transition: color var(--aeris-t-state) var(--aeris-ease);
      }
      .card.on .hum {
        color: var(--aeris-text-sub-on-light);
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
        color: var(--aeris-text-sub);
        position: relative;
        transition: color var(--aeris-t-state) var(--aeris-ease);
      }
      .card.on .sub {
        color: var(--aeris-text-sub-on-light);
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
        border: 1px solid rgba(255, 255, 255, 0.09);
        background: rgba(22, 28, 36, 0.78);
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
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
      .card.on .badge {
        background: rgba(248, 250, 252, 0.82);
        border-color: rgba(16, 21, 28, 0.12);
      }
      .card.on .badge ha-icon {
        color: rgba(16, 21, 28, 0.45);
      }
      .badge.on {
        background: var(--accent);
        border-color: var(--accent);
        box-shadow: 0 0 14px color-mix(in srgb, var(--accent) 50%, transparent);
      }
      .badge.on ha-icon {
        color: #fff;
      }
      .card.on .badge.on ha-icon {
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
      devices: "Geräte (Badges)",
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
    "The room at a glance — living flip intensity, built-in window/heating conflict watch, 1-tap device badges, climate sparkline.",
  preview: true,
  documentationURL: "https://github.com/bkstudy2025/aeris-cards",
});
