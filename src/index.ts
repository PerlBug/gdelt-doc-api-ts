export { GdeltDoc } from "./apiClient.js";
export type {
  ApiMode,
  TimelineMode,
  Article,
  ArticleListResponse,
  TimelineResponse,
  TimelineRow,
  GdeltDocOptions,
} from "./apiClient.js";

export {
  Filters,
  near,
  multiNear,
  repeat,
  multiRepeat,
  VALID_TIMESPAN_UNITS,
} from "./filters.js";
export type {
  FiltersOptions,
  FilterValue,
  BooleanMethod,
  NearTuple,
  RepeatTuple,
  TimespanUnit,
} from "./filters.js";

export { formatDate, loadJson } from "./helpers.js";
export type { DateInput } from "./helpers.js";

export { validateTone } from "./validation.js";

export {
  HTTPError,
  BadRequestError,
  NotFoundError,
  RateLimitError,
  ClientRequestError,
  ServerError,
  HttpResponseCodes,
  raiseResponseError,
} from "./errors.js";

export { version } from "./version.js";
