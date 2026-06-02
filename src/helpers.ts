export type DateInput = string | Date;

/**
 * Tries to parse a JSON string, removing offending characters at the position
 * reported in the parse error message until parsing succeeds or recursion
 * depth is exceeded.
 */
export function loadJson(
  jsonMessage: string,
  maxRecursionDepth: number = 100,
  recursionDepth: number = 0,
): unknown {
  try {
    return JSON.parse(jsonMessage);
  } catch (e) {
    if (recursionDepth >= maxRecursionDepth) {
      throw new Error("Max recursion depth is reached.");
    }
    if (!(e instanceof SyntaxError)) throw e;

    const match = e.message.match(/position\s+(\d+)/i);
    if (!match) {
      throw e;
    }
    const idx = parseInt(match[1], 10);
    const cleaned =
      jsonMessage.slice(0, idx) + " " + jsonMessage.slice(idx + 1);
    return loadJson(cleaned, maxRecursionDepth, recursionDepth + 1);
  }
}

/**
 * Takes a date as a string in YYYY-MM-DD format or as a Date and returns it
 * as a string formatted for the API (YYYYMMDDHHMMSS).
 */
export function formatDate(date: DateInput): string {
  if (typeof date === "string") {
    return `${date.replace(/-/g, "")}000000`;
  }
  if (date instanceof Date) {
    const pad = (n: number, w = 2) => String(n).padStart(w, "0");
    return (
      pad(date.getFullYear(), 4) +
      pad(date.getMonth() + 1) +
      pad(date.getDate()) +
      pad(date.getHours()) +
      pad(date.getMinutes()) +
      pad(date.getSeconds())
    );
  }
  throw new Error(`Unsupported type for date: ${typeof date}`);
}
