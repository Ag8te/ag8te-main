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
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes("node_modules")) {
              return undefined;
            }

            if (id.includes("@mui/") || id.includes("@emotion/")) {
              return "vendor-mui";
            }

            if (id.includes("@radix-ui/")) {
              return "vendor-radix";
            }

            if (id.includes("@react-google-maps/")) {
              return "vendor-maps";
            }

            if (id.includes("recharts")) {
              return "vendor-charts";
            }

            if (id.includes("framer-motion")) {
              return "vendor-motion";
            }

            if (
              id.includes("react-router") ||
              id.includes("@tanstack/react-query")
            ) {
              return "vendor-routing";
            }

            const packagePath = id.split("node_modules/")[1];
            const packageName = packagePath.startsWith("@")
              ? packagePath.split("/").slice(0, 2).join("-")
              : packagePath.split("/")[0];

            return `vendor-${packageName.replace("@", "")}`;
          },
        },
      },
    },
    server: {
      host: "::",
      port: 8080,
      allowedHosts: ["localhost", "ag8te.com", "www.ag8te.com", "ag8te.co.za", "www.ag8te.co.za"],
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
