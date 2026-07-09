import { config } from "dotenv";
import { resolve } from "path";
import { runSeed } from "./seed";

config({ path: resolve(process.cwd(), ".env.local") });
config({ path: resolve(process.cwd(), ".env") });

const force = process.argv.includes("--force");

runSeed({ force })
  .then((result) => {
    if (result.status === "success") {
      console.log(`[seed] ✅ ${result.message}`);
      console.log(`[seed] Login: ${result.email}`);
      console.log(`[seed] Password: ${result.password}`);
      return;
    }
    if (result.status === "skipped") {
      console.log(`[seed] ⏭️  ${result.message}`);
      return;
    }
    console.error(`[seed] ❌ ${result.message}`);
    process.exit(1);
  })
  .catch((err) => {
    console.error("[seed] Failed:", err);
    process.exit(1);
  });
