export interface HassEntity {
  entity_id: string;
  state: string;
  attributes: Record<string, unknown>;
  last_changed?: string;
}

export interface HomeAssistant {
  states: Record<string, HassEntity>;
  language?: string;
  callService(
    domain: string,
    service: string,
    data?: Record<string, unknown>
  ): Promise<unknown>;
  callWS?<T>(msg: Record<string, unknown>): Promise<T>;
}

export interface AerisBaseConfig {
  type: string;
  entity?: string;
  name?: string;
  icon?: string;
  accent?: string;
}
