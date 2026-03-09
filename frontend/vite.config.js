import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    port: 3000,
    proxy: {
      "/api": {
        // Docker'da API_TARGET env set edilir, lokalde localhost kullanılır
        target: process.env.API_TARGET || "http://localhost:5000",
        changeOrigin: true,
      },
    },
  },
});
