import { test as base, expect } from "@playwright/test";

/**
 * Every spec imports `test` from here. The app makes no request outside its
 * own origin (contract section 4, SEC); an auto fixture records every request
 * and fails the test when one leaves the origin of the base URL.
 */
export const test = base.extend<{ originGuard: void }>({
  originGuard: [
    async ({ page, baseURL }, use) => {
      const origin = new URL(baseURL ?? "http://localhost:4173/").origin;
      const foreign: string[] = [];
      page.on("request", (request) => {
        const url = request.url();
        if (/^(data|blob|about):/.test(url)) return;
        if (new URL(url).origin !== origin) foreign.push(url);
      });
      await use();
      expect(foreign, "requests outside the app origin").toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };
