import { LitElement } from "lit";
import type { HomeAssistant, HassEntity } from "./types";

const OFF_STATES = new Set([
  "off",
  "unavailable",
  "unknown",
  "none",
  "closed",
  "locked",
  "idle",
  "standby",
  "docked",
  "paused",
  "",
]);

const OPTIMISM_TIMEOUT = 4000;
const LONGPRESS_MS = 500;

interface OptimisticEntry {
  state: string;
  until: number;
}

/**
 * Shared base for every Aeris card.
 * Provides: hass plumbing, haptics, long-press detection,
 * optimistic state handling (manifesto rule 4) and service helpers.
 */
export class AerisBaseCard extends LitElement {
  static properties = {
    hass: { attribute: false },
    _config: { state: true },
  };

  hass?: HomeAssistant;
  protected _config?: Record<string, unknown>;

  private _optimistic = new Map<string, OptimisticEntry>();
  private _holdTimer?: number;
  private _heldFired = false;

  /* ---------- entities ---------- */

  protected entity(entityId?: string): HassEntity | undefined {
    if (!entityId || !this.hass) return undefined;
    return this.hass.states[entityId];
  }

  /** Real state overlaid with optimistic state (instant flip on tap). */
  protected displayState(entityId?: string): string {
    const real = this.entity(entityId)?.state ?? "unavailable";
    if (!entityId) return real;
    const opt = this._optimistic.get(entityId);
    if (!opt) return real;
    if (real === opt.state) {
      this._optimistic.delete(entityId);
      return real;
    }
    if (Date.now() > opt.until) {
      this._optimistic.delete(entityId);
      this.dispatchEvent(
        new CustomEvent("aeris-optimism-failed", {
          detail: { entityId },
          bubbles: true,
          composed: true,
        })
      );
      return real;
    }
    return opt.state;
  }

  protected isActive(entityId?: string): boolean {
    return !OFF_STATES.has(this.displayState(entityId).toLowerCase());
  }

  protected isAvailable(entityId?: string): boolean {
    const s = this.entity(entityId)?.state?.toLowerCase();
    return s !== undefined && s !== "unavailable" && s !== "unknown";
  }

  /* ---------- actions ---------- */

  protected haptic(ms = 10): void {
    try {
      navigator.vibrate?.(ms);
    } catch {
      /* not supported */
    }
  }

  protected callService(
    domain: string,
    service: string,
    data?: Record<string, unknown>
  ): void {
    this.hass?.callService(domain, service, data);
  }

  /** Toggle with optimistic flip — the tile reacts before HA confirms. */
  protected toggleEntity(entityId?: string): void {
    if (!entityId || !this.isAvailable(entityId)) return;
    const next = this.isActive(entityId) ? "off" : "on";
    this._optimistic.set(entityId, {
      state: next,
      until: Date.now() + OPTIMISM_TIMEOUT,
    });
    this.haptic(10);
    this.callService("homeassistant", "toggle", { entity_id: entityId });
    this.requestUpdate();
  }

  protected moreInfo(entityId?: string): void {
    if (!entityId) return;
    this.dispatchEvent(
      new CustomEvent("hass-more-info", {
        detail: { entityId },
        bubbles: true,
        composed: true,
      })
    );
  }

  protected navigate(path: string): void {
    const target = path.startsWith("/")
      ? path
      : location.pathname.replace(/\/[^/]*$/, "/") + path;
    history.pushState(null, "", target);
    window.dispatchEvent(new CustomEvent("location-changed"));
    this.haptic(10);
  }

  /* ---------- long-press (layer 2 of the three-layer model) ---------- */

  protected pressStart = (): void => {
    this._heldFired = false;
    this._holdTimer = window.setTimeout(() => {
      this._heldFired = true;
      this.haptic(15);
      this.dispatchEvent(
        new CustomEvent("aeris-longpress", { bubbles: true, composed: true })
      );
    }, LONGPRESS_MS);
  };

  protected pressEnd = (): void => {
    if (this._holdTimer) window.clearTimeout(this._holdTimer);
  };

  /** True when the click following pointerup belongs to a long-press. */
  protected consumeLongPress(): boolean {
    const held = this._heldFired;
    this._heldFired = false;
    return held;
  }

  /* ---------- lovelace plumbing ---------- */

  setConfig(config: Record<string, unknown>): void {
    this._config = config;
  }

  getCardSize(): number {
    return 2;
  }
}
