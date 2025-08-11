import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { viteSingleFile } from "vite-plugin-singlefile";

export default defineConfig(() => {
  return {
    plugins: [react(), viteSingleFile({ removeViteModuleLoader: true })],
    base: "", // mini app compatibility
    build: {
      minify: true,
    },
  };
});
