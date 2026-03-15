import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

export default defineConfig({
	plugins: [tailwindcss()],
	resolve: {
		alias: {
			"@mariozechner/pi-ai": path.resolve(__dirname, "../../ai/src/index.ts"),
			"@mariozechner/pi-web-ui": path.resolve(__dirname, "../src/index.ts"),
			// Hoist transitive dependencies for source-aliased internal packages
			"@google/genai": path.resolve(__dirname, "node_modules/@google/genai"),
			"@mistralai/mistralai": path.resolve(__dirname, "node_modules/@mistralai/mistralai"),
			"partial-json": path.resolve(__dirname, "node_modules/partial-json"),
			"@anthropic-ai/sdk": path.resolve(__dirname, "node_modules/@anthropic-ai/sdk"),
			"@aws-sdk/client-bedrock-runtime": path.resolve(__dirname, "node_modules/@aws-sdk/client-bedrock-runtime"),
			"@sinclair/typebox": path.resolve(__dirname, "node_modules/@sinclair/typebox"),
			ajv: path.resolve(__dirname, "node_modules/ajv"),
			"ajv-formats": path.resolve(__dirname, "node_modules/ajv-formats"),
			chalk: path.resolve(__dirname, "node_modules/chalk"),
			openai: path.resolve(__dirname, "node_modules/openai"),
			"proxy-agent": path.resolve(__dirname, "node_modules/proxy-agent"),
			undici: path.resolve(__dirname, "node_modules/undici"),
			"zod-to-json-schema": path.resolve(__dirname, "node_modules/zod-to-json-schema"),
			"@mariozechner/mini-lit": path.resolve(__dirname, "node_modules/@mariozechner/mini-lit"),
		},
	},
});
