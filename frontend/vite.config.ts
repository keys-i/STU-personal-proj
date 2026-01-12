import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  const proxyTarget =
    env.VITE_API_PROXY_TARGET?.trim() ||
    env.VITE_API_BASE_URL?.trim() ||
    "http://localhost:3000";

  return {
    plugins: [react()],
    test: {
      environment: "jsdom",
      setupFiles: ["./test/setup.ts"],
      globals: false,
      css: true,
      clearMocks: true,
      restoreMocks: true,
    },
    server: {
      proxy: {
        "/api": {
          target: proxyTarget,
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path.replace(/^\/api/, ""),
        },
      },
    },
  };
});
