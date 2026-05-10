import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";


// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    // componentTagger() was removed because it can mis-inject assets as <script type="module" src="...jpg|png">,
    // leading to: “Expected a JavaScript-or-Wasm module script but the server responded with a MIME type of "image/jpeg"”.
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
