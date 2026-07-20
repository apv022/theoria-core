import { defineConfig, devices } from "@playwright/test";

const productionPreview = process.env.E2E_PREVIEW === "1";
const baseURL = productionPreview ? "http://127.0.0.1:4173" : "http://127.0.0.1:5173";

export default defineConfig({
  testDir: "./tests/e2e",
  use: { baseURL },
  webServer: {
    command: productionPreview
      ? "npm run preview -- --host 127.0.0.1 --port 4173"
      : "npm run dev -- --host 127.0.0.1",
    url: baseURL,
    reuseExistingServer: true,
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
});
