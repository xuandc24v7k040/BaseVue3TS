import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearCsrfToken,
  configureCsrfTokenFetcher,
  getCachedCsrfTokenForTest,
  getCsrfToken,
} from "./csrf-manager";

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((next) => {
    resolve = next;
  });
  return { promise, resolve };
}

describe("CSRF token lifecycle", () => {
  beforeEach(() => {
    clearCsrfToken();
  });

  it("invalidates the cached token idempotently and fetches a fresh token", async () => {
    const fetcher = vi
      .fn<() => Promise<string>>()
      .mockResolvedValueOnce("old-token")
      .mockResolvedValueOnce("fresh-token");
    configureCsrfTokenFetcher(fetcher);

    await expect(getCsrfToken()).resolves.toBe("old-token");
    clearCsrfToken();
    clearCsrfToken();

    await expect(getCsrfToken()).resolves.toBe("fresh-token");
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("does not let a request started before invalidation overwrite the fresh cache", async () => {
    const oldRequest = deferred<string>();
    const fetcher = vi
      .fn<() => Promise<string>>()
      .mockReturnValueOnce(oldRequest.promise)
      .mockResolvedValueOnce("fresh-token");
    configureCsrfTokenFetcher(fetcher);

    const staleCaller = getCsrfToken();
    clearCsrfToken();
    const freshCaller = getCsrfToken();

    await expect(freshCaller).resolves.toBe("fresh-token");
    oldRequest.resolve("stale-token");
    await expect(staleCaller).resolves.toBe("stale-token");

    expect(getCachedCsrfTokenForTest()).toBe("fresh-token");
    await expect(getCsrfToken()).resolves.toBe("fresh-token");
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("deduplicates concurrent callers in the new generation", async () => {
    const request = deferred<string>();
    const fetcher = vi.fn<() => Promise<string>>(() => request.promise);
    configureCsrfTokenFetcher(fetcher);

    clearCsrfToken();
    const first = getCsrfToken();
    const second = getCsrfToken();
    request.resolve("shared-token");

    await expect(Promise.all([first, second])).resolves.toEqual([
      "shared-token",
      "shared-token",
    ]);
    expect(fetcher).toHaveBeenCalledOnce();
  });
});
