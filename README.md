# gdeltdoc (TypeScript)

A TypeScript port of [`gdelt-doc-api`](https://github.com/alex9smith/gdelt-doc-api) — a client for the GDELT 2.0 Doc API.

## Install

```bash
npm install gdeltdoc
```

Requires Node.js 18+ (uses the built-in `fetch`). In other environments pass your own `fetch` via the constructor.

## Usage

```ts
import { GdeltDoc, Filters } from "gdeltdoc";

const filters = new Filters({
  keyword: "climate change",
  startDate: "2020-05-10",
  endDate: "2020-05-11",
});

const gd = new GdeltDoc();

// Article list
const articles = await gd.articleSearch(filters);

// Timeline
const timeline = await gd.timelineSearch("timelinevol", filters);
```

### Modes

`articleSearch` returns an array of articles with keys `url`, `url_mobile`, `title`, `seendate`, `socialimage`, `domain`, `language`, `sourcecountry`.

`timelineSearch` supports `timelinevol`, `timelinevolraw`, `timelinetone`, `timelinelang`, `timelinesourcecountry`. It returns one row per timestamp with `datetime` plus one column per series. `timelinevolraw` adds an `"All Articles"` column.

### Filter helpers

```ts
import { near, multiNear, repeat, multiRepeat, Filters } from "gdeltdoc";

new Filters({
  near: near(5, "airline", "climate"),
  repeat: multiRepeat([[2, "airline"], [3, "airport"]], "AND"),
  timespan: "1h",
});
```

### Errors

Non-2xx responses throw a typed subclass of `HTTPError`: `BadRequestError`, `NotFoundError`, `RateLimitError`, `ClientRequestError`, `ServerError`.

## Scripts

- `npm run build` — emit `dist/`
- `npm run typecheck` — typecheck without emitting
- `npm test` — run the vitest suite
