import { describe, expect, it, vi } from "vitest";
import { GdeltDoc, Filters, RateLimitError } from "../src/index.js";

function makeResponse(opts: {
  status?: number;
  body?: string;
  contentType?: string;
}): Response {
  const headers = new Headers();
  if (opts.contentType) headers.set("content-type", opts.contentType);
  return new Response(opts.body ?? "", {
    status: opts.status ?? 200,
    headers,
  });
}

describe("GdeltDoc.query (mocked)", () => {
  it("throws RateLimitError when API returns 429", async () => {
    const fakeFetch = vi.fn(async () => makeResponse({ status: 429 }));
    const gd = new GdeltDoc({ fetch: fakeFetch as unknown as typeof fetch });
    await expect(gd.query("artlist", "")).rejects.toBeInstanceOf(
      RateLimitError,
    );
  });

  it("throws on text/html responses with the API error text", async () => {
    const fakeFetch = vi.fn(async () =>
      makeResponse({
        status: 200,
        contentType: "text/html",
        body: "bad query",
      }),
    );
    const gd = new GdeltDoc({ fetch: fakeFetch as unknown as typeof fetch });
    await expect(gd.query("artlist", "x")).rejects.toThrow(
      /The query was not valid/,
    );
  });

  it("rejects unsupported modes", async () => {
    const gd = new GdeltDoc({ fetch: vi.fn() as unknown as typeof fetch });
    // @ts-expect-error -- testing runtime guard
    await expect(gd.query("unsupported", "")).rejects.toThrow(
      /not in supported API modes/,
    );
  });
});

describe("GdeltDoc.articleSearch (mocked)", () => {
  it("returns the articles array", async () => {
    const articles = [
      {
        url: "https://example.com/a",
        url_mobile: "",
        title: "T",
        seendate: "20240101T000000Z",
        socialimage: "",
        domain: "example.com",
        language: "English",
        sourcecountry: "United States",
      },
    ];
    const fakeFetch = vi.fn(async () =>
      makeResponse({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ articles }),
      }),
    );
    const gd = new GdeltDoc({ fetch: fakeFetch as unknown as typeof fetch });
    const result = await gd.articleSearch(
      new Filters({
        keyword: "x",
        startDate: "2024-01-01",
        endDate: "2024-01-02",
      }),
    );
    expect(result).toEqual(articles);
  });

  it("returns an empty array when API returns no articles", async () => {
    const fakeFetch = vi.fn(async () =>
      makeResponse({
        status: 200,
        contentType: "application/json",
        body: "{}",
      }),
    );
    const gd = new GdeltDoc({ fetch: fakeFetch as unknown as typeof fetch });
    const result = await gd.articleSearch(
      new Filters({ keyword: "x", timespan: "1h" }),
    );
    expect(result).toEqual([]);
  });
});

describe("GdeltDoc.timelineSearch (mocked)", () => {
  it("returns rows keyed by series name", async () => {
    const body = {
      timeline: [
        {
          series: "Volume Intensity",
          data: [
            { date: "20240101T000000Z", value: 1.5 },
            { date: "20240101T010000Z", value: 2.5 },
          ],
        },
      ],
    };
    const fakeFetch = vi.fn(async () =>
      makeResponse({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(body),
      }),
    );
    const gd = new GdeltDoc({ fetch: fakeFetch as unknown as typeof fetch });
    const rows = await gd.timelineSearch(
      "timelinevol",
      new Filters({ keyword: "x", timespan: "1h" }),
    );
    expect(rows).toHaveLength(2);
    expect(rows[0]["Volume Intensity"]).toBe(1.5);
    expect(rows[0].datetime).toBeInstanceOf(Date);
  });

  it("adds 'All Articles' column for timelinevolraw", async () => {
    const body = {
      timeline: [
        {
          series: "Article Count",
          data: [{ date: "20240101T000000Z", value: 3, norm: 100 }],
        },
      ],
    };
    const fakeFetch = vi.fn(async () =>
      makeResponse({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(body),
      }),
    );
    const gd = new GdeltDoc({ fetch: fakeFetch as unknown as typeof fetch });
    const rows = await gd.timelineSearch(
      "timelinevolraw",
      new Filters({ keyword: "x", timespan: "1h" }),
    );
    expect(rows[0]["All Articles"]).toBe(100);
    expect(rows[0]["Article Count"]).toBe(3);
  });

  it("returns empty array on empty API response", async () => {
    const fakeFetch = vi.fn(async () =>
      makeResponse({
        status: 200,
        contentType: "application/json",
        body: "{}",
      }),
    );
    const gd = new GdeltDoc({ fetch: fakeFetch as unknown as typeof fetch });
    const result = await gd.timelineSearch(
      "timelinetone",
      new Filters({ keyword: "x", timespan: "1h" }),
    );
    expect(result).toEqual([]);
  });
});
