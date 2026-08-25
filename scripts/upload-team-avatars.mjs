import "dotenv/config";
import fs from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const avatars = [
  { userId: "e0ae9c33-6037-43a2-a5c1-3ffc2d96093d", file: process.argv[2] },
  { userId: "920cd449-7e1e-4578-add1-90f849ee6ae7", file: process.argv[3] },
];
for (const item of avatars) {
  const bytes = await fs.readFile(item.file);
  const path = `${item.userId}/avatar.png`;
  await supabase.storage.from("avatars").remove([path]);
  const { error: uploadError } = await supabase.storage.from("avatars").upload(path, bytes, { upsert: true, contentType: "image/png", cacheControl: "3600" });
  if (uploadError) throw uploadError;
  const { error: profileError } = await supabase.from("profiles").update({ avatar_url: `/api/avatars/${item.userId}?v=${Date.now()}` }).eq("id", item.userId);
  if (profileError) throw profileError;
}
console.log("Team avatars uploaded");
