import { defineConfig } from "vite";
import path from "path";
// import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(async ({ mode }) => {
  const plugins = [];

  try {
    const react = (await import("@vitejs/plugin-react-swc")).default;
    plugins.push(react());
  } catch (error) {
    console.warn("Falling back to Vite without @vitejs/plugin-react-swc:", error);
  }

  return {
    server: {
      host: "::",
      port: 8080,
      allowedHosts: ["localhost","mzansiserve.co.za"],
      hmr: {
        overlay: false,
      },
    },
    plugins: [...plugins /* mode === "development" && componentTagger() */].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
