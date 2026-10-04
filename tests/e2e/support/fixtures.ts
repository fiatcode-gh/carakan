import { test as base, expect, type Page } from "@playwright/test";

/**
 * Records every request that leaves `origin`. The app makes no request
 * outside its own origin (contract section 4, SEC); the returned list must
 * stay empty.
 */
export function trackForeignRequests(page: Page, origin: string): string[] {
  const foreign: string[] = [];
  page.on("request", (request) => {
    const url = request.url();
    if (/^(data|blob|about):/.test(url)) return;
    if (new URL(url).origin !== origin) foreign.push(url);
  });
  return foreign;
}

/**
 * Every spec imports `test` from here. An auto fixture fails the test when a
 * page leaves the origin of the base URL.
 */
export const test = base.extend<{ originGuard: void }>({
  originGuard: [
    async ({ page, baseURL }, use) => {
      const origin = new URL(baseURL ?? "http://localhost:4173/").origin;
      const foreign = trackForeignRequests(page, origin);
      await use();
      expect(foreign, "requests outside the app origin").toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };
