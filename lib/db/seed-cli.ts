import { config } from "dotenv";
import { resolve } from "path";
import { runSeed } from "./seed";

config({ path: resolve(process.cwd(), ".env.local") });
config({ path: resolve(process.cwd(), ".env") });

const force = process.argv.includes("--force");

runSeed({ force })
  .then((result) => {
    if (result.status === "success") {
      console.log(`[seed] ✅ ${result.message}\n`);
      console.log("[seed] Comptes créés :\n");
      for (const account of result.accounts) {
        console.log(
          `  • ${account.company} — ${account.role}: ${account.email} / ${account.password}`
        );
      }
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
