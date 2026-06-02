import { Filters } from "./filters.js";
import { loadJson } from "./helpers.js";
import { raiseResponseError } from "./errors.js";
import { version } from "./version.js";

export type TimelineMode =
  | "timelinevol"
  | "timelinevolraw"
  | "timelinetone"
  | "timelinelang"
  | "timelinesourcecountry";

export type ApiMode = "artlist" | TimelineMode;

const SUPPORTED_MODES: readonly ApiMode[] = [
  "artlist",
  "timelinevol",
  "timelinevolraw",
  "timelinetone",
  "timelinelang",
  "timelinesourcecountry",
];

export interface Article {
  url: string;
  url_mobile: string;
  title: string;
  seendate: string;
  socialimage: string;
  domain: string;
  language: string;
  sourcecountry: string;
}

export interface ArticleListResponse {
  articles?: Article[];
}

interface TimelineEntry {
  date: string;
  value: number;
  norm?: number;
}

interface TimelineSeries {
  series: string;
  data: TimelineEntry[];
}

export interface TimelineResponse {
  timeline?: TimelineSeries[];
}

/**
 * A row in a timeline result. Always has `datetime`; the remaining keys depend
 * on the timeline mode. `timelinevolraw` adds `"All Articles"`.
 */
export type TimelineRow = { datetime: Date } & Record<
  string,
  Date | number | string
>;

export interface GdeltDocOptions {
  /**
   * Maximum number of characters the JSON parser will strip from the response
   * body when working around invalid characters before giving up.
   */
  jsonParsingMaxDepth?: number;
  /**
   * Override the fetch implementation. Defaults to the global `fetch`.
   */
  fetch?: typeof fetch;
}

/**
 * Client for the GDELT 2.0 Doc API.
 */
export class GdeltDoc {
  private readonly maxDepthJsonParsing: number;
  private readonly fetchImpl: typeof fetch;

  constructor(options: GdeltDocOptions = {}) {
    this.maxDepthJsonParsing = options.jsonParsingMaxDepth ?? 100;
    this.fetchImpl = options.fetch ?? globalThis.fetch;
    if (!this.fetchImpl) {
      throw new Error(
        "No fetch implementation available. Pass one via options.fetch or use Node 18+.",
      );
    }
  }

  /**
   * Run a query against the `ArtList` mode and return the parsed list of
   * articles. Returns an empty array if no articles matched.
   */
  async articleSearch(filters: Filters): Promise<Article[]> {
    const result = (await this.query(
      "artlist",
      filters.queryString,
    )) as ArticleListResponse;
    return result.articles ?? [];
  }

  /**
   * Run a timeline-mode query. Returns one row per timestamp; each series
   * becomes a column. For `timelinevolraw` an `"All Articles"` column is also
   * included.
   */
  async timelineSearch(
    mode: TimelineMode,
    filters: Filters,
  ): Promise<TimelineRow[]> {
    const result = (await this.query(
      mode,
      filters.queryString,
    )) as TimelineResponse;

    if (
      !result ||
      !result.timeline ||
      result.timeline.length === 0 ||
      result.timeline[0].data.length === 0
    ) {
      return [];
    }

    const firstSeriesData = result.timeline[0].data;
    const rows: TimelineRow[] = firstSeriesData.map((entry) => ({
      datetime: new Date(entry.date),
    }));

    for (const series of result.timeline) {
      series.data.forEach((entry, i) => {
        rows[i][series.series] = entry.value;
      });
    }

    if (mode === "timelinevolraw") {
      firstSeriesData.forEach((entry, i) => {
        rows[i]["All Articles"] = entry.norm ?? 0;
      });
    }

    return rows;
  }

  /**
   * Submit a query to the GDELT API and return the parsed JSON response.
   * Exposed (rather than private) to mirror the Python client and make it
   * possible to inspect raw responses or stub for testing.
   */
  async query(mode: ApiMode, queryString: string): Promise<unknown> {
    if (!SUPPORTED_MODES.includes(mode)) {
      throw new Error(`Mode ${mode} not in supported API modes`);
    }

    const url = `https://api.gdeltproject.org/api/v2/doc/doc?query=${queryString}&mode=${mode}&format=json`;

    const response = await this.fetchImpl(url, {
      headers: {
        "User-Agent": `GDELT DOC TypeScript API client ${version} - https://github.com/alex9smith/gdelt-doc-api`,
      },
    });

    const text = await response.text();

    raiseResponseError({
      status: response.status,
      statusText: response.statusText,
      body: text,
      url,
    });

    // Sometimes the API responds to an invalid request with 200 + text/html.
    const contentType = response.headers.get("content-type") ?? "";
    if (contentType.includes("text/html")) {
      throw new Error(
        `The query was not valid. The API error message was: ${text.trim()}`,
      );
    }

    return loadJson(text, this.maxDepthJsonParsing);
  }
}
