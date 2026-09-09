import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  fullyParallel: false,
  projects: [
    {
      name: "Mobile Safari emulation",
      use: { ...devices["iPhone 15"], browserName: "chromium" },
    },
  ],
  reporter: "line",
  retries: 0,
  testDir: "./tests/browser",
  use: {
    baseURL: "http://127.0.0.1:4173",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "vp preview --host 127.0.0.1 --port 4173",
    reuseExistingServer: true,
    url: "http://127.0.0.1:4173",
  },
});
