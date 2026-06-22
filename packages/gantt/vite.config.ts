import { defineConfig } from "vite";

export default defineConfig({
  build: {
    target: "es2018",
    outDir: "dist",
    emptyOutDir: true,
    sourcemap: true,
    rollupOptions: {
      output: {
        exports: "named",
      },
    },
    lib: {
      entry: "src/index.ts",
      name: "VanillaGantt",
      cssFileName: "VanillaGantt",
      formats: ["es", "cjs", "umd"],
      fileName: (format) => {
        if (format === "es") return "VanillaGantt.es.js";
        if (format === "cjs") return "VanillaGantt.cjs";
        return "VanillaGantt.umd.js";
      },
    },
  },
});
