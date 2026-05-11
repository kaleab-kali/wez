import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import { TanStackRouterVite } from "@tanstack/router-vite-plugin";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

const PWA_THEME_COLOR = "#164e63";
const PWA_BACKGROUND_COLOR = "#f7f5ef";
const PWA_NAVIGATION_DENYLIST = [/^\/api\//, /^\/uploads\//, /^\/socket\.io\//];
const PWA_GLOB_PATTERNS = ["**/*.{js,css,html,svg,png,woff2}"];
const API_PROXY_TARGET = "http://localhost:3005";
const API_PROXY_CONFIG = {
	"/api": {
		target: API_PROXY_TARGET,
		changeOrigin: true,
	},
	"/uploads": {
		target: API_PROXY_TARGET,
		changeOrigin: true,
	},
	"/socket.io": {
		target: API_PROXY_TARGET,
		changeOrigin: true,
		ws: true,
	},
};

export default defineConfig(({ mode }) => ({
	plugins: [
		react(),
		tailwindcss(),
		TanStackRouterVite(),
		VitePWA({
			registerType: "prompt",
			manifest: {
				id: "/",
				name: "Wez Worker Placement",
				short_name: "Wez",
				description: "Worker placement platform for Ethiopian workers, employers, and Wez staff.",
				lang: "en",
				dir: "ltr",
				start_url: "/launch?source=pwa",
				scope: "/",
				display: "standalone",
				orientation: "portrait-primary",
				background_color: PWA_BACKGROUND_COLOR,
				theme_color: PWA_THEME_COLOR,
				categories: ["business", "productivity"],
				icons: [
					{
						src: "/wez-pwa-192.png",
						sizes: "192x192",
						type: "image/png",
						purpose: "any",
					},
					{
						src: "/wez-pwa-512.png",
						sizes: "512x512",
						type: "image/png",
						purpose: "any",
					},
					{
						src: "/wez-maskable-512.png",
						sizes: "512x512",
						type: "image/png",
						purpose: "maskable",
					},
				],
				shortcuts: [
					{
						name: "Customer dashboard",
						short_name: "Dashboard",
						description: "Open the Wez customer workspace.",
						url: "/app/dashboard",
						icons: [{ src: "/wez-pwa-192.png", sizes: "192x192" }],
					},
					{
						name: "Staff workspace",
						short_name: "Staff",
						description: "Open the Wez staff workspace.",
						url: "/staff/dashboard",
						icons: [{ src: "/wez-pwa-192.png", sizes: "192x192" }],
					},
				],
			},
			workbox: {
				cleanupOutdatedCaches: true,
				clientsClaim: true,
				globPatterns: PWA_GLOB_PATTERNS,
				navigateFallback: "index.html",
				navigateFallbackDenylist: PWA_NAVIGATION_DENYLIST,
			},
		}),
	],
	resolve: {
		alias: {
			// Keep shadcn's @ alias working for its own components
			"@": path.resolve(__dirname, "./src"),
			"#features": path.resolve(__dirname, "./src/features"),
			"#shared": path.resolve(__dirname, "./src/shared"),
			"#routes": path.resolve(__dirname, "./src/routes"),
			"#components": path.resolve(__dirname, "./src/components"),
		},
	},
	server: {
		port: 5180,
		proxy: API_PROXY_CONFIG,
	},
	preview: {
		proxy: API_PROXY_CONFIG,
	},
	build: {
		outDir: "dist",
		sourcemap: mode !== "production",
	},
}));
