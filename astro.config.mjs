// @ts-check
import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";
import cloudflare from "@astrojs/cloudflare";

// https://astro.build/config
export default defineConfig({
  output: "server",
  adapter: cloudflare({
    imageService: "compile",
    prerenderEnvironment: "workerd",
  }),
  integrations: [react()],
  vite: {
  plugins: [tailwindcss()],
  ssr: {
    // Fuerza la inclusión de los módulos que están fallando
    optimizeDeps: {
      include: [
        "astro/app/manifest",
        "astro/assets/image-asset", // Añade el módulo específico de tu error
        "@astrojs/cloudflare/cache/provider",
      ],
    },
  },
  // Puedes mantener el resto de tu configuración (optimizeDeps, server, etc.)
  // pero elimina "astro" de optimizeDeps.exclude
  optimizeDeps: {
    exclude: ["@astrojs/cloudflare"], // Ya no excluyas "astro"
    include: ["react", "react-dom", "react-icons"],
  },
  server: {
    watch: {
      ignored: ["**/.wrangler/**"],
    },
  },
}
});