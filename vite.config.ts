import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const tokenRouterKey = env.TOKENROUTER_API_KEY || "";
  return {
    plugins: [react()],
    base: "./",
    build: { outDir: "dist", emptyOutDir: true },
    server: {
      proxy: {
        "/api": "http://127.0.0.1:8787",
        "/kimi-chat": {
          target: "https://api.tokenrouter.com",
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/kimi-chat/, "/v1/chat/completions"),
          configure: (proxy) => {
            proxy.on("proxyReq", (request) => {
              if (tokenRouterKey) request.setHeader("Authorization", `Bearer ${tokenRouterKey}`);
            });
          },
        },
      },
    },
  };
});
