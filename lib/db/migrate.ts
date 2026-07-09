import { readdir, readFile } from "fs/promises";
import { join } from "path";
import postgres from "postgres";
import { getDatabaseUrl, getMissingDbEnvMessage } from "./connection";

const MIGRATIONS_DIR = join(process.cwd(), "supabase", "migrations");
const MIGRATIONS_TABLE = "_schema_migrations";

export type MigrateResult =
  | { status: "skipped"; reason: string }
  | { status: "success"; applied: string[] }
  | { status: "noop"; message: string };

async function ensureMigrationsTable(sql: postgres.Sql) {
  await sql.unsafe(`
    CREATE TABLE IF NOT EXISTS public.${MIGRATIONS_TABLE} (
      id TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
}

async function getAppliedMigrations(sql: postgres.Sql): Promise<Set<string>> {
  const rows = await sql.unsafe<{ id: string }[]>(
    `SELECT id FROM public.${MIGRATIONS_TABLE}`
  );
  return new Set(rows.map((r) => r.id));
}

async function listMigrationFiles(): Promise<string[]> {
  const files = await readdir(MIGRATIONS_DIR);
  return files.filter((f) => f.endsWith(".sql")).sort();
}

export async function runMigrations(options?: {
  exitOnError?: boolean;
  exitOnMissingEnv?: boolean;
}): Promise<MigrateResult> {
  const url = getDatabaseUrl();

  if (!url) {
    const msg = getMissingDbEnvMessage();
    if (options?.exitOnMissingEnv) {
      console.error(msg);
      process.exit(1);
    }
    console.warn("[migrate] Skipped — missing SUPABASE_DB_PASSWORD or DATABASE_URL");
    return { status: "skipped", reason: "missing_env" };
  }

  const sql = postgres(url, {
    max: 1,
    idle_timeout: 20,
    connect_timeout: 30,
    ssl: url.includes("supabase.co") ? "require" : undefined,
  });

  const applied: string[] = [];

  try {
    await ensureMigrationsTable(sql);
    const alreadyApplied = await getAppliedMigrations(sql);
    const files = await listMigrationFiles();

    if (files.length === 0) {
      return { status: "noop", message: "No migration files found" };
    }

    for (const file of files) {
      if (alreadyApplied.has(file)) {
        console.log(`[migrate] ✓ ${file} (already applied)`);
        continue;
      }

      const content = await readFile(join(MIGRATIONS_DIR, file), "utf8");

      console.log(`[migrate] Applying ${file}...`);

      await sql.begin(async (tx) => {
        await tx.unsafe(content);
        await tx.unsafe(
          `INSERT INTO public.${MIGRATIONS_TABLE} (id) VALUES ($1)`,
          [file]
        );
      });

      console.log(`[migrate] ✅ ${file}`);
      applied.push(file);
    }

    if (applied.length === 0) {
      return { status: "noop", message: "Database is up to date" };
    }

    return { status: "success", applied };
  } catch (error) {
    console.error("[migrate] Failed:", error);
    if (options?.exitOnError) {
      process.exit(1);
    }
    throw error;
  } finally {
    await sql.end();
  }
}
