export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.SKIP_DB_MIGRATE === "true") return;

  const { runMigrations } = await import("./lib/db/migrate");
  await runMigrations().catch((err) => {
    console.error("[migrate] Auto-migration on startup failed:", err);
  });
}
