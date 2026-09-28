import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// GitHub Pages sert le site sous /<nom-du-dépôt>/
export default defineConfig({
  base: process.env.BASE_PATH ?? "/claude_d2rc/",
  plugins: [react()],
});
