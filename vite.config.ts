import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "0.0.0.0", // ✅ Expose to LAN (IPv4)
    port: 8080,
    proxy: {
      '/api': {
        target: 'https://prod-ready-frontend-fbd-ee55.onrender.com',
        changeOrigin: true,
      },
    },
    fs: {
      allow: ["./client", "./shared"],
      deny: [
        ".env",
        ".env.*",
        "*.{crt,pem}",
        "**/.git/**",
        "server/**"
      ],
    },
  },
  build: {
    outDir: "dist/spa",
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./client"),
      "@shared": path.resolve(__dirname, "./shared"),
    },
  },
}));