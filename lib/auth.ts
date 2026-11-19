// Single-user passcode auth. The cookie holds an HMAC of the passcode, so
// changing APP_PASSCODE signs you out everywhere. Works on the Edge runtime.
export const COOKIE = "h3_session";

export async function sessionToken(): Promise<string> {
  const secret = process.env.APP_PASSCODE ?? "";
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode("human-3.0-session"));
  return Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, "0")).join("");
}
