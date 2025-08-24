export interface ExtensionState {
  enabled: boolean;
  maxKeys: number;
  hiddenDelay: number;
}

export const DEFAULT_STATE: ExtensionState = {
  enabled: true,
  maxKeys: 5,
  hiddenDelay: 5000,
};
