export const HttpResponseCodes = {
  OK: 200,
  BAD_REQUEST: 400,
  NOT_FOUND: 404,
  RATE_LIMIT: 429,
} as const;

export interface HttpErrorInit {
  status: number;
  statusText?: string;
  body?: string;
  url?: string;
}

export class HTTPError extends Error {
  readonly status: number;
  readonly statusText: string;
  readonly body: string;
  readonly url: string;

  constructor(init: HttpErrorInit, name: string = "HTTPError") {
    super(
      `${init.status} ${init.statusText ?? ""}`.trim() +
        (init.url ? ` for ${init.url}` : ""),
    );
    this.name = name;
    this.status = init.status;
    this.statusText = init.statusText ?? "";
    this.body = init.body ?? "";
    this.url = init.url ?? "";
  }
}

export class BadRequestError extends HTTPError {
  constructor(init: HttpErrorInit) {
    super(init, "BadRequestError");
  }
}

export class NotFoundError extends HTTPError {
  constructor(init: HttpErrorInit) {
    super(init, "NotFoundError");
  }
}

export class RateLimitError extends HTTPError {
  constructor(init: HttpErrorInit) {
    super(init, "RateLimitError");
  }
}

export class ClientRequestError extends HTTPError {
  constructor(init: HttpErrorInit) {
    super(init, "ClientRequestError");
  }
}

export class ServerError extends HTTPError {
  constructor(init: HttpErrorInit) {
    super(init, "ServerError");
  }
}

export function raiseResponseError(init: HttpErrorInit): void {
  const code = init.status;
  if (code === HttpResponseCodes.OK) return;

  if (code === HttpResponseCodes.BAD_REQUEST) throw new BadRequestError(init);
  if (code === HttpResponseCodes.NOT_FOUND) throw new NotFoundError(init);
  if (code === HttpResponseCodes.RATE_LIMIT) throw new RateLimitError(init);
  if (code >= 400 && code < 500) throw new ClientRequestError(init);
  if (code >= 500 && code < 600) throw new ServerError(init);

  throw new HTTPError(init);
}
