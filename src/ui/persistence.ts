import type { InputSpec } from "../engine/model.ts";
import { decodeState, defaultState, encodeState, type AppState } from "./state.ts";

const STORAGE_KEY = "idlewizard-item-calc:state:v1";
const HASH_PARAM = "s";

const hashState = (): string | null => new URLSearchParams(window.location.hash.slice(1)).get(HASH_PARAM);

/** The shared link's state if the URL has one, else the last saved state, else the defaults. */
export function loadState(): AppState {
  const fromHash = hashState();
  if (fromHash) return decodeState(fromHash);
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) return decodeState(stored);
  } catch {
    // Storage can be unavailable (privacy modes); the defaults still work.
  }
  return defaultState();
}

export function shareUrl(encoded: string): string {
  const { origin, pathname, search } = window.location;
  return `${origin}${pathname}${search}#${HASH_PARAM}=${encoded}`;
}

/** Saves to localStorage and mirrors the state into the URL, so the address bar is always a shareable link. */
export function saveState(state: AppState, specs?: ReadonlyMap<string, InputSpec>): string {
  const encoded = encodeState(state, specs);
  try {
    window.localStorage.setItem(STORAGE_KEY, encoded);
  } catch {
    // See loadState.
  }
  if (hashState() !== encoded) window.history.replaceState(null, "", shareUrl(encoded));
  return encoded;
}

export const isOwnHash = (encoded: string): boolean => hashState() === encoded;
