import { defineConfig } from "vitest/config";

// Config separada solo para rlsIsolationCheck.ts: npx vitest run -c vitest.rls.config.ts
export default defineConfig({
	test: {
		include: ["src/lib/rlsIsolationCheck.ts"],
	},
});
