import IntlMessageFormat from "intl-messageformat";
import { MessageType } from "../core/game/Game";
import { LangSelector } from "./LangSelector";

export function renderTroops(troops: number): string {
  return renderNumber(troops / 10);
}

export function renderNumber(
  num: number | bigint,
  fixedPoints?: number,
): string {
  num = Number(num);
  num = Math.max(num, 0);

  if (num >= 10_000_000) {
    const value = Math.floor(num / 100000) / 10;
    return value.toFixed(fixedPoints ?? 1) + "M";
  } else if (num >= 1_000_000) {
    const value = Math.floor(num / 10000) / 100;
    return value.toFixed(fixedPoints ?? 2) + "M";
  } else if (num >= 100000) {
    return Math.floor(num / 1000) + "K";
  } else if (num >= 10000) {
    const value = Math.floor(num / 100) / 10;
    return value.toFixed(fixedPoints ?? 1) + "K";
  } else if (num >= 1000) {
    const value = Math.floor(num / 10) / 100;
    return value.toFixed(fixedPoints ?? 2) + "K";
  } else {
    return Math.floor(num).toString();
  }
}

export function createCanvas(): HTMLCanvasElement {
  const canvas = document.createElement("canvas");

  // Set canvas style to fill the screen
  canvas.style.position = "fixed";
  canvas.style.left = "0";
  canvas.style.top = "0";
  canvas.style.width = "100%";
  canvas.style.height = "100%";
  canvas.style.touchAction = "none";

  return canvas;
}
/**
 * A polyfill for crypto.randomUUID that provides fallback implementations
 * for older browsers, particularly Safari versions < 15.4
 */
export function generateCryptoRandomUUID(): string {
  // Type guard to check if randomUUID is available
  if (crypto !== undefined && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  // Fallback using crypto.getRandomValues
  if (crypto !== undefined && "getRandomValues" in crypto) {
    return (([1e7] as any) + -1e3 + -4e3 + -8e3 + -1e11).replace(
      /[018]/g,
      (c: number): string =>
        (
          c ^
          (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))
        ).toString(16),
    );
  }

  // Last resort fallback using Math.random
  // Note: This is less cryptographically secure but ensures functionality
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(
    /[xy]/g,
    (c: string): string => {
      const r: number = (Math.random() * 16) | 0;
      const v: number = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    },
  );
}

export const translateText = (
  key: string,
  params: Record<string, string | number> = {},
): string => {
  const self = translateText as any;
  self.formatterCache ??= new Map();
  self.lastLang ??= null;

  const langSelector = document.querySelector("lang-selector") as LangSelector;
  if (!langSelector) {
    console.warn("LangSelector not found in DOM");
    return key;
  }

  if (
    !langSelector.translations ||
    Object.keys(langSelector.translations).length === 0
  ) {
    return key;
  }

  if (self.lastLang !== langSelector.currentLang) {
    self.formatterCache.clear();
    self.lastLang = langSelector.currentLang;
  }

  let message = langSelector.translations[key];

  if (!message && langSelector.defaultTranslations) {
    const defaultTranslations = langSelector.defaultTranslations;
    if (defaultTranslations && defaultTranslations[key]) {
      message = defaultTranslations[key];
    }
  }

  if (!message) return key;

  try {
    const locale =
      !langSelector.translations[key] && langSelector.currentLang !== "en"
        ? "en"
        : langSelector.currentLang;
    const cacheKey = `${key}:${locale}:${message}`;
    let formatter = self.formatterCache.get(cacheKey);

    if (!formatter) {
      formatter = new IntlMessageFormat(message, locale);
      self.formatterCache.set(cacheKey, formatter);
    }

    return formatter.format(params) as string;
  } catch (e) {
    console.warn("ICU format error", e);
    return message;
  }
};

/**
 * Severity colors mapping for message types
 */
export const severityColors: Record<string, string> = {
  fail: "text-red-400",
  warn: "text-yellow-400",
  success: "text-green-400",
  info: "text-gray-200",
  blue: "text-blue-400",
  white: "text-white",
};

/**
 * Gets the CSS classes for styling message types based on their severity
 * @param type The message type to get styling for
 * @returns CSS class string for the message type
 */
export function getMessageTypeClasses(type: MessageType): string {
  switch (type) {
    case "SAM_HIT":
    case "CAPTURED_ENEMY_UNIT":
    case "RECEIVED_GOLD_FROM_TRADE":
    case "CONQUERED_PLAYER":
      return severityColors["success"];
    case "ATTACK_FAILED":
    case "ALLIANCE_REJECTED":
    case "ALLIANCE_BROKEN":
    case "UNIT_CAPTURED_BY_ENEMY":
    case "UNIT_DESTROYED":
      return severityColors["fail"];
    case "ATTACK_CANCELLED":
    case "ATTACK_REQUEST":
    case "ALLIANCE_ACCEPTED":
    case "SENT_GOLD_TO_PLAYER":
    case "SENT_TROOPS_TO_PLAYER":
    case "RECEIVED_GOLD_FROM_PLAYER":
    case "RECEIVED_TROOPS_FROM_PLAYER":
      return severityColors["blue"];
    case "MIRV_INBOUND":
    case "NUKE_INBOUND":
    case "HYDROGEN_BOMB_INBOUND":
    case "SAM_MISS":
    case "ALLIANCE_EXPIRED":
    case "NAVAL_INVASION_INBOUND":
    case "RENEW_ALLIANCE":
      return severityColors["warn"];
    case "CHAT":
    case "ALLIANCE_REQUEST":
      return severityColors["info"];
    default:
      console.warn(`Message type ${type} has no explicit color`);
      return severityColors["white"];
  }
}

export function getModifierKey(): string {
  const isMac = /Mac/.test(navigator.userAgent);
  if (isMac) {
    return "⌘"; // Command key
  } else {
    return "Ctrl";
  }
}

export function getAltKey(): string {
  const isMac = /Mac/.test(navigator.userAgent);
  if (isMac) {
    return "⌥"; // Option key
  } else {
    return "Alt";
  }
}

export function getGamesPlayed(): number {
  try {
    return parseInt(localStorage.getItem("gamesPlayed") ?? "0", 10) || 0;
  } catch (error) {
    console.warn("Failed to read games played from localStorage:", error);
    return 0;
  }
}

export function incrementGamesPlayed(): void {
  try {
    localStorage.setItem("gamesPlayed", (getGamesPlayed() + 1).toString());
  } catch (error) {
    console.warn("Failed to increment games played in localStorage:", error);
  }
}
