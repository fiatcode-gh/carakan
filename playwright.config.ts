import { defineConfig, devices } from "@playwright/test";

const externalBase = process.env["E2E_BASE_URL"];
const baseURL = externalBase ?? "http://localhost:4173/";

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env["CI"],
  retries: process.env["CI"] ? 2 : 0,
  reporter: [["list"]],
  use: { baseURL, trace: "on-first-retry" },
  webServer: externalBase
    ? undefined
    : {
        command: "npm run build && npx vite preview --port 4173 --strictPort",
        url: baseURL,
        reuseExistingServer: false,
        timeout: 180_000,
      },
  projects: [
    {
      name: "mobile",
      use: {
        ...devices["Pixel 7"],
        viewport: { width: 360, height: 740 },
        deviceScaleFactor: 2,
        isMobile: true,
        hasTouch: true,
        locale: "id-ID",
      },
    },
    {
      name: "tablet",
      testMatch: "layout.spec.ts",
      use: {
        browserName: "chromium",
        viewport: { width: 800, height: 1280 },
        locale: "id-ID",
      },
    },
    {
      name: "desktop",
      testMatch: "layout.spec.ts",
      use: {
        browserName: "chromium",
        viewport: { width: 1280, height: 800 },
        locale: "id-ID",
      },
    },
  ],
});
