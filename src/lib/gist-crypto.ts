const encoder = new TextEncoder();

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function fromBase64(value: string): Uint8Array {
  const binary = atob(value);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

async function deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey("raw", encoder.encode(passphrase), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: salt as BufferSource, iterations: 150_000, hash: "SHA-256" },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

export async function encryptSecret(secret: string, passphrase: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(passphrase, salt);
  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv: iv as BufferSource }, key, encoder.encode(secret));
  return `v1.${toBase64(salt)}.${toBase64(iv)}.${toBase64(new Uint8Array(encrypted))}`;
}

export async function decryptSecret(payload: string, passphrase: string): Promise<string> {
  const [version, saltPart, ivPart, dataPart] = payload.split(".");
  if (version !== "v1" || !saltPart || !ivPart || !dataPart) throw new Error("Invalid encrypted token");
  const key = await deriveKey(passphrase, fromBase64(saltPart));
  const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv: fromBase64(ivPart) as BufferSource }, key, fromBase64(dataPart) as BufferSource);
  return new TextDecoder().decode(decrypted);
}
