import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import { TanStackRouterVite } from "@tanstack/router-vite-plugin";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig(({ mode }) => ({
	plugins: [react(), tailwindcss(), TanStackRouterVite()],
	resolve: {
		alias: {
			// Keep shadcn's @ alias working for its own components
			"@": path.resolve(__dirname, "./src"),
			"#features": path.resolve(__dirname, "./src/features"),
			"#shared": path.resolve(__dirname, "./src/shared"),
			"#routes": path.resolve(__dirname, "./src/routes"),
		},
	},
	server: {
		port: 5180,
		proxy: {
			"/api": {
				target: "http://localhost:3005",
				changeOrigin: true,
			},
		},
	},
	build: {
		outDir: "dist",
		sourcemap: mode !== "production",
	},
}));
