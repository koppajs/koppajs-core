import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node", // Nutzt Node als Testumgebung
    include: ["test/**/*.test.ts"], // Nur Dateien im "test/"-Ordner mit ".test.ts" berücksichtigen
    coverage: {
      include: ["src/**/*.ts"], // Nur Code aus dem "src/"-Ordner in die Coverage einbeziehen
    },
  },
});
