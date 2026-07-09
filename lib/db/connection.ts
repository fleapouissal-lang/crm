/**
 * Builds the Supabase PostgreSQL connection URL from env vars.
 * Priority: DATABASE_URL > SUPABASE_DB_PASSWORD + project ref
 */
export function getDatabaseUrl(): string | null {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  const password = process.env.SUPABASE_DB_PASSWORD;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!password || !supabaseUrl) return null;

  const ref = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
  if (!ref) return null;

  const host = process.env.SUPABASE_DB_HOST ?? `db.${ref}.supabase.co`;
  const port = process.env.SUPABASE_DB_PORT ?? "5432";
  const user = process.env.SUPABASE_DB_USER ?? "postgres";
  const database = process.env.SUPABASE_DB_NAME ?? "postgres";

  return `postgresql://${user}:${encodeURIComponent(password)}@${host}:${port}/${database}`;
}

export function getMissingDbEnvMessage(): string {
  return `
❌ Configuration base de données manquante

Ajoutez dans .env.local (Supabase → Settings → Database → Database password) :

SUPABASE_DB_PASSWORD=votre_mot_de_passe

Ou directement :

DATABASE_URL=postgresql://postgres:[MOT_DE_PASSE]@db.abxgsuuyqplvcqescwbb.supabase.co:5432/postgres
`.trim();
}
