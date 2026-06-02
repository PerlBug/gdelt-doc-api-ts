import { describe, expect, it } from "vitest";
import {
  raiseResponseError,
  BadRequestError,
  NotFoundError,
  RateLimitError,
  ClientRequestError,
  ServerError,
  HTTPError,
} from "../src/index.js";

const init = (status: number) => ({ status, body: "text" });

describe("raiseResponseError", () => {
  it("does not throw on 200", () => {
    expect(() => raiseResponseError(init(200))).not.toThrow();
  });

  it("throws BadRequestError on 400", () => {
    expect(() => raiseResponseError(init(400))).toThrow(BadRequestError);
  });

  it("throws NotFoundError on 404", () => {
    expect(() => raiseResponseError(init(404))).toThrow(NotFoundError);
  });

  it("throws RateLimitError on 429", () => {
    expect(() => raiseResponseError(init(429))).toThrow(RateLimitError);
  });

  it("throws ServerError on 5xx", () => {
    expect(() => raiseResponseError(init(503))).toThrow(ServerError);
  });

  it("throws ClientRequestError on other 4xx", () => {
    expect(() => raiseResponseError(init(403))).toThrow(ClientRequestError);
  });

  it("throws plain HTTPError on unhandled status", () => {
    expect(() => raiseResponseError(init(600))).toThrow(HTTPError);
  });
});
