import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, "src/index.ts"),
      name: "NiceguyHttpClient",
      formats: ["es", "cjs"],
      fileName: (format) => (format === "es" ? "index.js" : "index.cjs"),
    },
    rollupOptions: {
      external: ["axios", "vue"],
      output: {
        globals: {
          axios: "axios",
          vue: "Vue",
        },
      },
    },
  },
});
