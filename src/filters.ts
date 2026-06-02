import { validateTone, type FilterValue } from "./validation.js";
import { formatDate, type DateInput } from "./helpers.js";

export type { FilterValue };

export const VALID_TIMESPAN_UNITS = [
  "min",
  "h",
  "hours",
  "d",
  "days",
  "w",
  "weeks",
  "m",
  "months",
] as const;

export type TimespanUnit = (typeof VALID_TIMESPAN_UNITS)[number];

export type BooleanMethod = "AND" | "OR";

/**
 * Build the filter to find articles containing words that occur within `n`
 * words of each other.
 *
 *     near(5, "airline", "climate")
 *     // 'near5:"airline climate" '
 */
export function near(n: number, ...words: string[]): string {
  if (words.length < 2) {
    throw new Error("At least two words must be provided");
  }
  return `near${n}:"${words.join(" ")}" `;
}

export type NearTuple = [number, string, string, ...string[]];

/**
 * Build the filter to find articles containing multiple sets of near terms.
 */
export function multiNear(
  nears: NearTuple[],
  method: BooleanMethod = "OR",
): string {
  if (method !== "AND" && method !== "OR") {
    throw new Error(`method must be one of AND or OR, not ${method}`);
  }

  const formatted = nears.map(([n, ...words]) => near(n, ...words));
  const parenFlag = formatted.length !== 1 && method === "OR";
  const lPad = parenFlag ? "(" : "";
  const rPad = parenFlag ? ") " : "";

  return lPad + formatted.join(`${method} `) + rPad;
}

/**
 * Build the filter to find articles containing `keyword` at least `n` times.
 * Only single word repetitions are allowed.
 */
export function repeat(n: number, keyword: string): string {
  if (keyword.includes(" ")) {
    throw new Error("Only single words can be repeated");
  }
  return `repeat${n}:"${keyword}" `;
}

export type RepeatTuple = [number, string];

/**
 * Build the filter to find articles containing multiple repeated words.
 */
export function multiRepeat(
  repeats: RepeatTuple[],
  method: BooleanMethod,
): string {
  if (method !== "AND" && method !== "OR") {
    throw new Error(`method must be one of AND or OR, not ${method}`);
  }

  const parts = repeats.map(([n, keyword]) => repeat(n, keyword));

  if (method === "AND") {
    return parts.join("AND ");
  }
  return "(" + parts.join("OR ") + ")";
}

export interface FiltersOptions {
  startDate?: DateInput;
  endDate?: DateInput;
  timespan?: string;
  numRecords?: number;
  keyword?: FilterValue;
  domain?: FilterValue;
  domainExact?: FilterValue;
  near?: string;
  repeat?: string;
  country?: FilterValue;
  language?: FilterValue;
  theme?: FilterValue;
  tone?: FilterValue;
  toneAbsolute?: FilterValue;
}

const ASCII_LOWERCASE = /[a-z]+$/;

export class Filters {
  readonly queryParams: string[] = [];

  constructor(options: FiltersOptions) {
    const {
      startDate,
      endDate,
      timespan,
      numRecords = 250,
      keyword,
      domain,
      domainExact,
      near,
      repeat,
      country,
      language,
      theme,
      tone,
      toneAbsolute,
    } = options;

    if (!startDate && !endDate && !timespan) {
      throw new Error(
        "Must provide either startDate and endDate, or timespan",
      );
    }
    if (startDate && endDate && timespan) {
      throw new Error(
        "Can only provide either startDate and endDate, or timespan",
      );
    }

    if (keyword !== undefined) {
      this.queryParams.push(Filters.keywordToString(keyword));
    }
    if (domain !== undefined) {
      this.queryParams.push(Filters.filterToString("domain", domain));
    }
    if (domainExact !== undefined) {
      this.queryParams.push(Filters.filterToString("domainis", domainExact));
    }
    if (country !== undefined) {
      this.queryParams.push(Filters.filterToString("sourcecountry", country));
    }
    if (language !== undefined) {
      this.queryParams.push(Filters.filterToString("sourcelang", language));
    }
    if (theme !== undefined) {
      this.queryParams.push(Filters.filterToString("theme", theme));
    }
    if (tone !== undefined) {
      validateTone(tone);
      this.queryParams.push(Filters.toneToString("tone", tone));
    }
    if (toneAbsolute !== undefined) {
      validateTone(toneAbsolute);
      this.queryParams.push(Filters.toneToString("toneabs", toneAbsolute));
    }
    if (near !== undefined) {
      this.queryParams.push(near);
    }
    if (repeat !== undefined) {
      this.queryParams.push(repeat);
    }

    if (startDate) {
      if (!endDate) {
        throw new Error("Must provide both startDate and endDate");
      }
      this.queryParams.push(`&startdatetime=${formatDate(startDate)}`);
      this.queryParams.push(`&enddatetime=${formatDate(endDate)}`);
    } else if (timespan) {
      Filters.validateTimespan(timespan);
      this.queryParams.push(`&timespan=${timespan}`);
    }

    if (numRecords > 250) {
      throw new Error(`numRecords must be 250 or less, not ${numRecords}`);
    }

    this.queryParams.push(`&maxrecords=${numRecords}`);
  }

  get queryString(): string {
    return this.queryParams.join("");
  }

  static filterToString(name: string, f: FilterValue): string {
    if (typeof f === "string") {
      return `${name}:${f} `;
    }
    return "(" + f.map((clause) => `${name}:${clause}`).join(" OR ") + ") ";
  }

  static keywordToString(keywords: FilterValue): string {
    if (typeof keywords === "string") {
      return `"${keywords}" `;
    }
    return (
      "(" +
      keywords.map((w) => (w.includes(" ") ? `"${w}"` : w)).join(" OR ") +
      ") "
    );
  }

  static toneToString(name: string, tone: FilterValue): string {
    if (typeof tone === "string") {
      return `${name}${tone} `;
    }
    throw new Error("Multiple tone values are not supported yet.");
  }

  static validateTimespan(timespan: string): void {
    const match = timespan.match(ASCII_LOWERCASE);
    const unit = match ? match[0] : "";
    const value = unit ? timespan.slice(0, timespan.length - unit.length) : timespan;

    if (!(VALID_TIMESPAN_UNITS as readonly string[]).includes(unit)) {
      throw new Error(
        `Timespan ${timespan} is invalid. ${unit} is not a supported unit, must be one of ${VALID_TIMESPAN_UNITS.join(" ")}`,
      );
    }

    if (!/^\d+$/.test(value)) {
      throw new Error(
        `Timespan ${timespan} is invalid. ${value} could not be converted into an integer`,
      );
    }

    if (unit === "min" && parseInt(value, 10) < 60) {
      throw new Error(
        `Timespan ${timespan} is invalid. Period must be at least 60 minutes`,
      );
    }
  }
}
