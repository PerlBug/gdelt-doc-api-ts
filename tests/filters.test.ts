import { describe, expect, it } from "vitest";
import {
  Filters,
  near,
  multiNear,
  repeat,
  multiRepeat,
  VALID_TIMESPAN_UNITS,
} from "../src/index.js";

describe("Filters", () => {
  it("single keyword filter", () => {
    const f = new Filters({
      keyword: "airline",
      startDate: "2020-03-01",
      endDate: "2020-03-02",
    });
    expect(f.queryString).toBe(
      '"airline" &startdatetime=20200301000000&enddatetime=20200302000000&maxrecords=250',
    );
  });

  it("single keyphrase filter", () => {
    const f = new Filters({
      keyword: "climate change",
      startDate: "2020-03-01",
      endDate: "2020-03-02",
    });
    expect(f.queryString).toBe(
      '"climate change" &startdatetime=20200301000000&enddatetime=20200302000000&maxrecords=250',
    );
  });

  it("multiple keywords", () => {
    const f = new Filters({
      keyword: ["airline", "climate"],
      startDate: "2020-05-13",
      endDate: "2020-05-14",
    });
    expect(f.queryString).toBe(
      "(airline OR climate) &startdatetime=20200513000000&enddatetime=20200514000000&maxrecords=250",
    );
  });

  it("multiple themes", () => {
    const f = new Filters({
      theme: ["ENV_CLIMATECHANGE", "LEADER"],
      startDate: "2020-05-13",
      endDate: "2020-05-14",
    });
    expect(f.queryString).toBe(
      "(theme:ENV_CLIMATECHANGE OR theme:LEADER) &startdatetime=20200513000000&enddatetime=20200514000000&maxrecords=250",
    );
  });

  it("theme and keyword", () => {
    const f = new Filters({
      keyword: "airline",
      theme: "ENV_CLIMATECHANGE",
      startDate: "2020-05-13",
      endDate: "2020-05-14",
    });
    expect(f.queryString).toBe(
      '"airline" theme:ENV_CLIMATECHANGE &startdatetime=20200513000000&enddatetime=20200514000000&maxrecords=250',
    );
  });

  it("tone filter", () => {
    const f = new Filters({
      keyword: "airline",
      startDate: "2020-03-01",
      endDate: "2020-03-02",
      tone: ">10",
    });
    expect(f.queryString).toBe(
      '"airline" tone>10 &startdatetime=20200301000000&enddatetime=20200302000000&maxrecords=250',
    );
  });

  it("start_date as Date is formatted as expected", () => {
    const f = new Filters({
      keyword: "airline",
      startDate: new Date(2020, 2, 1),
      endDate: new Date(2020, 2, 2),
    });
    expect(f.queryString).toBe(
      '"airline" &startdatetime=20200301000000&enddatetime=20200302000000&maxrecords=250',
    );
  });

  it("requires either dates or timespan", () => {
    expect(() => new Filters({ keyword: "x" })).toThrow(/Must provide either/);
  });

  it("rejects both dates and timespan", () => {
    expect(
      () =>
        new Filters({
          keyword: "x",
          startDate: "2020-01-01",
          endDate: "2020-01-02",
          timespan: "1h",
        }),
    ).toThrow(/Can only provide either/);
  });

  it("rejects num_records above 250", () => {
    expect(
      () =>
        new Filters({
          keyword: "x",
          startDate: "2020-01-01",
          endDate: "2020-01-02",
          numRecords: 500,
        }),
    ).toThrow(/250 or less/);
  });
});

describe("near()", () => {
  it("two words", () => {
    expect(near(5, "airline", "crisis")).toBe('near5:"airline crisis" ');
  });

  it("three words", () => {
    expect(near(10, "airline", "climate", "change")).toBe(
      'near10:"airline climate change" ',
    );
  });

  it("one word throws", () => {
    expect(() => near(5, "airline")).toThrow(/At least two words/);
  });
});

describe("multiNear()", () => {
  it("single near", () => {
    expect(multiNear([[5, "airline", "crisis"]])).toBe(
      near(5, "airline", "crisis"),
    );
  });

  it("two nears default OR", () => {
    expect(
      multiNear([
        [5, "airline", "crisis"],
        [10, "airline", "climate", "change"],
      ]),
    ).toBe(
      "(" +
        near(5, "airline", "crisis") +
        "OR " +
        near(10, "airline", "climate", "change") +
        ") ",
    );
  });

  it("two nears AND", () => {
    expect(
      multiNear(
        [
          [5, "airline", "crisis"],
          [10, "airline", "climate", "change"],
        ],
        "AND",
      ),
    ).toBe(
      near(5, "airline", "crisis") +
        "AND " +
        near(10, "airline", "climate", "change"),
    );
  });
});

describe("repeat()", () => {
  it("single word", () => {
    expect(repeat(3, "environment")).toBe('repeat3:"environment" ');
  });

  it("phrase throws", () => {
    expect(() => repeat(5, "climate change   ")).toThrow(/single word/);
  });
});

describe("multiRepeat()", () => {
  it("AND", () => {
    expect(
      multiRepeat(
        [
          [2, "airline"],
          [3, "airport"],
        ],
        "AND",
      ),
    ).toBe('repeat2:"airline" AND repeat3:"airport" ');
  });

  it("OR", () => {
    expect(
      multiRepeat(
        [
          [2, "airline"],
          [3, "airport"],
        ],
        "OR",
      ),
    ).toBe('(repeat2:"airline" OR repeat3:"airport" )');
  });

  it("rejects bad method", () => {
    expect(() =>
      multiRepeat(
        [[2, "airline"]],
        // @ts-expect-error -- testing runtime validation
        "NOT_A_METHOD",
      ),
    ).toThrow(/method must be one of AND or OR/);
  });
});

describe("Filters.validateTimespan", () => {
  it("allows valid units", () => {
    for (const unit of VALID_TIMESPAN_UNITS) {
      expect(() => Filters.validateTimespan(`60${unit}`)).not.toThrow();
    }
  });

  it("forbids unknown units", () => {
    expect(() => Filters.validateTimespan("60milliseconds")).toThrow(
      /is not a supported unit/,
    );
  });

  it("forbids non-integer values", () => {
    for (const ts of ["12.5min", "40days0", "2/3weeks"]) {
      expect(() => Filters.validateTimespan(ts)).toThrow();
    }
  });

  it("forbids unit-first ordering", () => {
    expect(() => Filters.validateTimespan("min15")).toThrow(
      /is not a supported unit/,
    );
  });

  it("requires at least 60 minutes", () => {
    expect(() => Filters.validateTimespan("15min")).toThrow(
      /at least 60 minutes/,
    );
  });
});

describe("Filters.toneToString", () => {
  it("single tone", () => {
    expect(Filters.toneToString("tone", ">5")).toBe("tone>5 ");
  });

  it("rejects multiple tones", () => {
    expect(() => Filters.toneToString("tone", [">5", "<10"])).toThrow(
      /Multiple tone values are not supported/,
    );
  });
});
