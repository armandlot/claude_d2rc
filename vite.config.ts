import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Cloudflare sert le site à la racine ; GitHub Pages passe BASE_PATH=/<dépôt>/.
export default defineConfig({
  base: process.env.BASE_PATH ?? "/",
  plugins: [react()],
  server: {
    // `npm run dev` + `wrangler dev` : l'API locale du Worker répond sur le port 8787.
    proxy: { "/api": "http://localhost:8787" },
  },
});
