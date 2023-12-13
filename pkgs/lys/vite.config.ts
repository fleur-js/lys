import type {} from "vitest/config";

import { defineConfig } from "vite";
import dts from "vite-plugin-dts";

export default defineConfig({
  define: {
    "import.meta.vitest": false,
  },
  build: {
    minify: false,
    emptyOutDir: false,
    lib: {
      entry: "src/index.ts",
      name: "Lys",
      formats: ["es", "umd"],
      fileName: "index",
    },
    rollupOptions: {
      output: {
        exports: "auto",
      },
    },
  },
  plugins: [
    dts({
      rollupTypes: false,
    }),
  ],
  test: {
    globals: true,
    includeSource: ["src/**/*{.spec.ts,.ts}"],
    environment: "happy-dom",
    environmentOptions: {
      happyDOM: {
        url: "http://localhost/",
      },
    },
  },
});
