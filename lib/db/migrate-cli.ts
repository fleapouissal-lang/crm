import { config } from "dotenv";
import { resolve } from "path";
import { runMigrations } from "./migrate";

config({ path: resolve(process.cwd(), ".env.local") });
config({ path: resolve(process.cwd(), ".env") });

const soft = process.argv.includes("--soft");

runMigrations({
  exitOnError: !soft,
  exitOnMissingEnv: !soft,
}).then((result) => {
  if (result.status === "noop") {
    console.log(`[migrate] ${result.message}`);
  }
  if (result.status === "skipped" && soft) {
    console.warn("[migrate] Skipped during build (no DB credentials)");
  }
});
