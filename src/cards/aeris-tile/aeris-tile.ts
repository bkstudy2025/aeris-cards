import { css, html, nothing, LitElement } from "lit";
import type { TemplateResult } from "lit";
import { AerisBaseCard } from "../../shared/base-card";
import { tokens } from "../../shared/tokens";
import { localizeState } from "../../shared/i18n";
import { iconFor } from "../../shared/icons";

/**
 * aeris-tile — one tile for every device type.
 * Same anatomy everywhere (DESIGN.md §3): icon square left, state right,
 * name + plain-language sub below, optional control row.
 */

interface TileConfig {
  type: string;
  entity?: string;
  name?: string;
  icon?: string;
  accent?: string;
  modes?: string[];
}

const TOGGLEABLE = new Set(["light", "switch", "input_boolean", "fan", "media_player"]);

const MODE_META: Record<string, { icon: string; color: string }> = {
  off: { icon: "mdi:power", color: "rgba(255,255,255,.35)" },
  heat: { icon: "mdi:fire", color: "var(--aeris-heat)" },
  cool: { icon: "mdi:snowflake", color: "var(--aeris-cool)" },
  dry: { icon: "mdi:water-percent", color: "var(--aeris-dry)" },
  fan_only: { icon: "mdi:fan", color: "var(--aeris-fan)" },
  auto: { icon: "mdi:thermostat-auto", color: "var(--aeris-ok)" },
  heat_cool: { icon: "mdi:sun-snowflake-variant", color: "var(--aeris-ok)" },
};

const CLIMATE_STATE_COLOR: Record<string, string> = {
  heat: "var(--aeris-heat)",
  cool: "var(--aeris-cool)",
  dry: "var(--aeris-dry)",
  fan_only: "var(--aeris-fan)",
  auto: "var(--aeris-ok)",
  heat_cool: "var(--aeris-ok)",
};

export class AerisTile extends AerisBaseCard {
  static properties = {
    ...AerisBaseCard.properties,
    _shake: { state: true },
    _pendingTemp: { state: true },
  };

  declare _config?: TileConfig & Record<string, unknown>;
  private _shake = false;
  private _pendingTemp?: { value: number; timer: number };

  constructor() {
    super();
    this.addEventListener("aeris-optimism-failed", () => {
      this._shake = true;
      this.haptic(15);
      window.setTimeout(() => (this._shake = false), 600);
    });
    this.addEventListener("aeris-longpress", () => this.moreInfo(this._entityId));
  }

  /* ---------- config / lovelace ---------- */

  setConfig(config: Record<string, unknown>): void {
    if (!config.entity) throw new Error("aeris-tile: 'entity' is required");
    super.setConfig(config);
  }

  getCardSize(): number {
    return this._domain === "climate" || this._domain === "cover" ? 3 : 2;
  }

  getGridOptions(): Record<string, unknown> {
    const tall = this._domain === "climate" || this._domain === "cover";
    return { columns: 6, rows: tall ? 4 : 2, min_columns: 4, min_rows: 2 };
  }

  static getConfigElement(): HTMLElement {
    return document.createElement("aeris-tile-editor");
  }

  static getStubConfig(
    _hass: unknown,
    entities: string[]
  ): Record<string, unknown> {
    const light = entities.find((e) => e.startsWith("light."));
    return { entity: light ?? entities[0] ?? "" };
  }

  /* ---------- helpers ---------- */

  private get _entityId(): string | undefined {
    return this._config?.entity;
  }

  private get _domain(): string {
    return this._entityId?.split(".")[0] ?? "";
  }

  private get _accent(): string {
    if (this._domain === "climate") {
      const s = this.displayState(this._entityId);
      const fc = CLIMATE_STATE_COLOR[s];
      if (fc) return fc;
    }
    return this._config?.accent || "var(--aeris-room-living)";
  }

  private get _attrs(): Record<string, unknown> {
    return this.entity(this._entityId)?.attributes ?? {};
  }

  private get _name(): string {
    return (
      this._config?.name ||
      (this._attrs.friendly_name as string) ||
      this._entityId ||
      ""
    );
  }

  private get _icon(): string {
    return (
      this._config?.icon ||
      (this._attrs.icon as string) ||
      iconFor(this._entityId ?? "", this.isActive(this._entityId))
    );
  }

  private get _supportsBrightness(): boolean {
    if (this._domain !== "light") return false;
    const modes = (this._attrs.supported_color_modes as string[]) ?? [];
    return modes.some((m) =>
      ["brightness", "color_temp", "hs", "rgb", "rgbw", "rgbww", "xy"].includes(m)
    );
  }

  private _sub(): string {
    const id = this._entityId;
    if (!this.isAvailable(id)) return localizeState("unavailable", this.hass?.language);
    const state = this.displayState(id);
    const base = localizeState(state, this.hass?.language);
    if (this._domain === "climate") {
      const action = this._attrs.hvac_action as string | undefined;
      return action ? localizeState(action, this.hass?.language) : base;
    }
    if (this._domain === "light" && state === "on" && this._supportsBrightness) {
      const bri = this._attrs.brightness as number | undefined;
      if (bri != null) return `${base} · ${Math.max(1, Math.round(bri / 2.55))} %`;
    }
    return base;
  }

  /* ---------- interactions ---------- */

  private _onTileClick(): void {
    if (this.consumeLongPress()) return;
    const id = this._entityId;
    if (TOGGLEABLE.has(this._domain)) this.toggleEntity(id);
    else this.moreInfo(id);
  }

  private _stop(e: Event): void {
    e.stopPropagation();
  }

  private _setBrightness(e: Event): void {
    e.stopPropagation();
    const value = Number((e.target as HTMLInputElement).value);
    this.haptic(8);
    this.callService("light", "turn_on", {
      entity_id: this._entityId,
      brightness_pct: value,
    });
  }

  private _setPosition(e: Event): void {
    e.stopPropagation();
    const value = Number((e.target as HTMLInputElement).value);
    this.haptic(8);
    this.callService("cover", "set_cover_position", {
      entity_id: this._entityId,
      position: value,
    });
  }

  private _setMode(mode: string, e: Event): void {
    e.stopPropagation();
    if (!this._entityId) return;
    this.haptic(10);
    this.callService("climate", "set_hvac_mode", {
      entity_id: this._entityId,
      hvac_mode: mode,
    });
  }

  private _stepTemp(dir: 1 | -1, e: Event): void {
    e.stopPropagation();
    const a = this._attrs;
    const step = (a.target_temp_step as number) || 0.5;
    const min = (a.min_temp as number) ?? 5;
    const max = (a.max_temp as number) ?? 35;
    const base =
      this._pendingTemp?.value ?? ((a.temperature as number) || min);
    const value = Math.min(max, Math.max(min, base + dir * step));
    if (this._pendingTemp?.timer) window.clearTimeout(this._pendingTemp.timer);
    this.haptic(8);
    const timer = window.setTimeout(() => {
      this.callService("climate", "set_temperature", {
        entity_id: this._entityId,
        temperature: value,
      });
      this._pendingTemp = undefined;
    }, 600);
    this._pendingTemp = { value, timer };
  }

  /* ---------- render ---------- */

  protected render(): TemplateResult | typeof nothing {
    if (!this._config || !this.hass) return nothing;
    const id = this._entityId;
    const on = this.isActive(id);
    const avail = this.isAvailable(id);
    const lang = this.hass.language;

    const classes = [
      "tile",
      on && avail ? "on" : "",
      !avail ? "unavail" : "",
      this._shake ? "shake" : "",
    ].join(" ");

    return html`
      <div
        class=${classes}
        style="--accent:${this._accent}"
        role="button"
        tabindex="0"
        aria-label=${this._name}
        @click=${this._onTileClick}
        @pointerdown=${this.pressStart}
        @pointerup=${this.pressEnd}
        @pointerleave=${this.pressEnd}
      >
        <div class="head">
          <div class="iconbox" aria-hidden="true">
            <ha-icon .icon=${this._icon}></ha-icon>
          </div>
          ${this._renderHeadRight(on, avail)}
        </div>
        <div class="name">${this._name}</div>
        <div class="sub">${this._sub()}</div>
        ${this._renderControls(on, avail, lang)}
      </div>
    `;
  }

  private _renderHeadRight(on: boolean, avail: boolean): TemplateResult | typeof nothing {
    if (TOGGLEABLE.has(this._domain)) {
      return html`
        <div
          class="toggle ${on ? "on" : ""}"
          role="switch"
          aria-checked=${on}
          aria-label="Schalten"
        >
          <div class="knob"></div>
        </div>
      `;
    }
    if (this._domain === "climate") {
      const cur = this._attrs.current_temperature as number | undefined;
      if (cur == null || !avail) return nothing;
      return html`<div class="value">${Math.round(cur)}<span class="unit">°</span></div>`;
    }
    if (this._domain === "cover") {
      const pos = this._attrs.current_position as number | undefined;
      if (pos == null || !avail) return nothing;
      return html`<div class="value">${Math.round(pos)}<span class="unit">%</span></div>`;
    }
    return nothing;
  }

  private _renderControls(
    on: boolean,
    avail: boolean,
    lang?: string
  ): TemplateResult | typeof nothing {
    if (!avail) return nothing;

    if (this._domain === "light" && this._supportsBrightness) {
      const bri = this._attrs.brightness as number | undefined;
      const pct = on && bri != null ? Math.max(1, Math.round(bri / 2.55)) : 0;
      return this._slider(pct, this._setBrightness, "Helligkeit");
    }

    if (this._domain === "cover") {
      const pos = this._attrs.current_position as number | undefined;
      return html`
        <div class="row" @click=${this._stop}>
          <button class="ctl" aria-label="Öffnen" @click=${(e: Event) => { this._stop(e); this.haptic(10); this.callService("cover", "open_cover", { entity_id: this._entityId }); }}>
            <ha-icon icon="mdi:arrow-up"></ha-icon>
          </button>
          <button class="ctl" aria-label="Stopp" @click=${(e: Event) => { this._stop(e); this.haptic(10); this.callService("cover", "stop_cover", { entity_id: this._entityId }); }}>
            <ha-icon icon="mdi:stop"></ha-icon>
          </button>
          <button class="ctl" aria-label="Schließen" @click=${(e: Event) => { this._stop(e); this.haptic(10); this.callService("cover", "close_cover", { entity_id: this._entityId }); }}>
            <ha-icon icon="mdi:arrow-down"></ha-icon>
          </button>
        </div>
        ${pos != null ? this._slider(Math.round(pos), this._setPosition, "Position") : nothing}
      `;
    }

    if (this._domain === "climate") {
      const modes =
        this._config?.modes ??
        ((this._attrs.hvac_modes as string[]) || []);
      const target =
        this._pendingTemp?.value ?? (this._attrs.temperature as number | undefined);
      const state = this.displayState(this._entityId);
      return html`
        <div class="row modes" @click=${this._stop}>
          ${modes.map((m) => {
            const meta = MODE_META[m] ?? { icon: "mdi:circle-outline", color: "var(--aeris-ok)" };
            return html`
              <button
                class="ctl mode ${state === m ? "act" : ""}"
                style="--mc:${meta.color}"
                aria-label=${localizeState(m, lang)}
                title=${localizeState(m, lang)}
                @click=${(e: Event) => this._setMode(m, e)}
              >
                <ha-icon .icon=${meta.icon}></ha-icon>
              </button>
            `;
          })}
        </div>
        <div class="row stepper" @click=${this._stop}>
          <button class="ctl" aria-label="Kälter" @click=${(e: Event) => this._stepTemp(-1, e)}>
            <ha-icon icon="mdi:minus"></ha-icon>
          </button>
          <div class="stepval ${this._pendingTemp ? "pending" : ""}">
            ${target != null
              ? `${target.toLocaleString(lang?.startsWith("de") ? "de-DE" : "en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} °C`
              : "—"}
          </div>
          <button class="ctl" aria-label="Wärmer" @click=${(e: Event) => this._stepTemp(1, e)}>
            <ha-icon icon="mdi:plus"></ha-icon>
          </button>
        </div>
      `;
    }

    return nothing;
  }

  private _slider(
    pct: number,
    onChange: (e: Event) => void,
    label: string
  ): TemplateResult {
    return html`
      <div class="row" @click=${this._stop}>
        <input
          class="range"
          type="range"
          min="1"
          max="100"
          step="1"
          .value=${String(pct)}
          style="--fill:${pct}%"
          aria-label=${label}
          aria-valuenow=${pct}
          @input=${(e: Event) => {
            const v = (e.target as HTMLInputElement).value;
            (e.target as HTMLInputElement).style.setProperty("--fill", `${v}%`);
          }}
          @change=${onChange}
        />
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
      .tile {
        box-sizing: border-box;
        height: 100%;
        min-height: 100px;
        display: flex;
        flex-direction: column;
        padding: var(--aeris-pad-card);
        border-radius: var(--aeris-radius-card);
        background: var(--aeris-surface);
        border: 1px solid var(--aeris-surface-border);
        box-shadow: var(--aeris-shadow);
        color: var(--aeris-text);
        cursor: pointer;
        -webkit-tap-highlight-color: transparent;
        transition:
          background var(--aeris-t-state) var(--aeris-ease),
          border-color var(--aeris-t-state) var(--aeris-ease),
          box-shadow var(--aeris-t-state) var(--aeris-ease),
          color var(--aeris-t-state) var(--aeris-ease),
          transform var(--aeris-t-press) var(--aeris-ease);
      }
      .tile:active {
        transform: scale(0.97);
      }
      /* THE FLIP — active tiles turn bright (DESIGN.md §1.2) */
      .tile.on {
        background: linear-gradient(
          155deg,
          color-mix(in srgb, var(--accent) 18%, #f4f6f9),
          color-mix(in srgb, var(--accent) 8%, #e8ecf2)
        );
        border-color: color-mix(in srgb, var(--accent) 45%, transparent);
        box-shadow: 0 6px 24px color-mix(in srgb, var(--accent) 30%, rgba(0, 0, 0, 0.2));
        color: var(--aeris-text-on-light);
      }
      .tile.unavail {
        opacity: 0.45;
        cursor: default;
      }
      .tile.shake {
        animation: aeris-shake 0.25s linear 2;
        border-color: var(--aeris-warn);
      }
      @keyframes aeris-shake {
        25% { transform: translateX(-3px); }
        75% { transform: translateX(3px); }
      }

      .head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
      }
      .iconbox {
        width: 40px;
        height: 40px;
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
        --mdc-icon-size: 22px;
        color: #2b3440;
        transition: color var(--aeris-t-state) var(--aeris-ease);
      }
      .tile.on .iconbox {
        background: var(--accent);
        box-shadow: 0 0 20px color-mix(in srgb, var(--accent) 55%, transparent);
      }
      .tile.on .iconbox ha-icon {
        color: #ffffff;
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

      .toggle {
        width: 44px;
        height: 26px;
        border-radius: var(--aeris-radius-pill);
        background: rgba(255, 255, 255, 0.16);
        border: 1px solid rgba(255, 255, 255, 0.12);
        position: relative;
        flex-shrink: 0;
        transition: background var(--aeris-t-state) var(--aeris-ease);
      }
      .toggle .knob {
        position: absolute;
        top: 2px;
        left: 2px;
        width: 21px;
        height: 21px;
        border-radius: 50%;
        background: #fff;
        box-shadow: 0 1px 4px rgba(0, 0, 0, 0.35);
        transition: transform 280ms var(--aeris-ease-knob);
      }
      .toggle.on {
        background: var(--accent);
      }
      .toggle.on .knob {
        transform: translateX(18px);
      }

      .name {
        margin-top: 10px;
        font-size: 14.5px;
        font-weight: 800;
        line-height: 1.15;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .sub {
        margin-top: 1px;
        font-size: 11.5px;
        font-weight: 500;
        color: var(--aeris-text-sub);
        transition: color var(--aeris-t-state) var(--aeris-ease);
      }
      .tile.on .sub {
        color: var(--aeris-text-sub-on-light);
      }

      .row {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-top: 11px;
        min-width: 0;
      }
      .ctl {
        flex: 1;
        height: 44px;
        border-radius: var(--aeris-radius-control);
        border: 1px solid rgba(255, 255, 255, 0.07);
        background: rgba(255, 255, 255, 0.06);
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        padding: 0;
        color: inherit;
        transition:
          background var(--aeris-t-state) var(--aeris-ease),
          border-color var(--aeris-t-state) var(--aeris-ease),
          transform var(--aeris-t-press) var(--aeris-ease);
      }
      .tile.on .ctl {
        background: rgba(16, 21, 28, 0.06);
        border-color: rgba(16, 21, 28, 0.1);
      }
      .ctl:active {
        transform: scale(0.92);
      }
      .ctl ha-icon {
        --mdc-icon-size: 18px;
      }
      .mode.act {
        background: color-mix(in srgb, var(--mc) 30%, transparent);
        border-color: color-mix(in srgb, var(--mc) 55%, transparent);
        box-shadow: 0 0 14px color-mix(in srgb, var(--mc) 30%, transparent);
      }
      .stepper {
        background: rgba(255, 255, 255, 0.06);
        border: 1px solid rgba(255, 255, 255, 0.07);
        border-radius: var(--aeris-radius-control);
        gap: 0;
      }
      .tile.on .stepper {
        background: rgba(16, 21, 28, 0.06);
        border-color: rgba(16, 21, 28, 0.1);
      }
      .stepper .ctl {
        flex: 0 0 48px;
        height: 44px;
        border: none;
        background: transparent;
      }
      .stepval {
        flex: 1;
        text-align: center;
        font-size: 15px;
        font-weight: 700;
        font-variant-numeric: tabular-nums;
      }
      .stepval.pending {
        opacity: 0.6;
      }

      .range {
        appearance: none;
        -webkit-appearance: none;
        width: 100%;
        min-width: 0;
        height: 44px;
        background: transparent;
        cursor: pointer;
        margin: 0;
      }
      .range::-webkit-slider-runnable-track {
        height: 8px;
        border-radius: 6px;
        background: linear-gradient(
          90deg,
          var(--accent) var(--fill, 0%),
          rgba(255, 255, 255, 0.14) var(--fill, 0%)
        );
      }
      .tile.on .range::-webkit-slider-runnable-track {
        background: linear-gradient(
          90deg,
          var(--accent) var(--fill, 0%),
          rgba(16, 21, 28, 0.14) var(--fill, 0%)
        );
      }
      .range::-webkit-slider-thumb {
        -webkit-appearance: none;
        width: 18px;
        height: 18px;
        margin-top: -5px;
        border-radius: 50%;
        background: #fff;
        box-shadow: 0 1px 5px rgba(0, 0, 0, 0.4);
      }
      .range::-moz-range-track {
        height: 8px;
        border-radius: 6px;
        background: rgba(255, 255, 255, 0.14);
      }
      .range::-moz-range-progress {
        height: 8px;
        border-radius: 6px;
        background: var(--accent);
      }
      .range::-moz-range-thumb {
        width: 18px;
        height: 18px;
        border: none;
        border-radius: 50%;
        background: #fff;
        box-shadow: 0 1px 5px rgba(0, 0, 0, 0.4);
      }
    `,
  ];
}

/* ---------- visual editor ---------- */

class AerisTileEditor extends LitElement {
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
    { name: "entity", required: true, selector: { entity: {} } },
    { name: "name", selector: { text: {} } },
    { name: "icon", selector: { icon: {} } },
    { name: "accent", selector: { text: { type: "color" } } },
  ];

  private _labels = (schema: { name: string }): string =>
    ({
      entity: "Entität",
      name: "Name",
      icon: "Icon",
      accent: "Akzentfarbe",
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

declare global {
  interface Window {
    customCards?: Array<Record<string, unknown>>;
  }
}

customElements.define("aeris-tile", AerisTile);
customElements.define("aeris-tile-editor", AerisTileEditor);

window.customCards = window.customCards ?? [];
window.customCards.push({
  type: "aeris-tile",
  name: "Aeris Tile",
  description:
    "One tile for every device — light, switch, climate, cover, fan. Flips bright when active.",
  preview: true,
  documentationURL: "https://github.com/bkstudy2025/aeris-cards",
});
