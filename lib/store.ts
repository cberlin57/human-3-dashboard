import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { promises as fs } from "fs";
import path from "path";

// A tiny key/value store. Supabase in production, a JSON file locally.
export interface Store {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T): Promise<void>;
  list<T>(prefix: string): Promise<{ key: string; value: T }[]>;
}

class SupabaseStore implements Store {
  constructor(private db: SupabaseClient) {}
  async get<T>(key: string) {
    const { data, error } = await this.db.from("kv").select("value").eq("key", key).maybeSingle();
    if (error) throw error;
    return (data?.value as T) ?? null;
  }
  async set<T>(key: string, value: T) {
    const { error } = await this.db
      .from("kv")
      .upsert({ key, value, updated_at: new Date().toISOString() });
    if (error) throw error;
  }
  async list<T>(prefix: string) {
    const { data, error } = await this.db
      .from("kv")
      .select("key,value")
      .like("key", `${prefix}%`)
      .order("key", { ascending: true });
    if (error) throw error;
    return (data ?? []).map((r) => ({ key: r.key as string, value: r.value as T }));
  }
}

class FileStore implements Store {
  private file = path.join(process.cwd(), ".data", "db.json");
  private async read(): Promise<Record<string, unknown>> {
    try {
      return JSON.parse(await fs.readFile(this.file, "utf8"));
    } catch {
      return {};
    }
  }
  private async write(db: Record<string, unknown>) {
    await fs.mkdir(path.dirname(this.file), { recursive: true });
    await fs.writeFile(this.file, JSON.stringify(db, null, 2));
  }
  async get<T>(key: string) {
    return ((await this.read())[key] as T) ?? null;
  }
  async set<T>(key: string, value: T) {
    const db = await this.read();
    db[key] = value;
    await this.write(db);
  }
  async list<T>(prefix: string) {
    const db = await this.read();
    return Object.keys(db)
      .filter((k) => k.startsWith(prefix))
      .sort()
      .map((key) => ({ key, value: db[key] as T }));
  }
}

let store: Store | null = null;
export function getStore(): Store {
  if (store) return store;
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  store = url && key
    ? new SupabaseStore(createClient(url, key, { auth: { persistSession: false } }))
    : new FileStore();
  return store;
}
