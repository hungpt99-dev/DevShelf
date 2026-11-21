export const SHARE_LIMIT = 4096;

export interface SharePayload {
  v: 1;
  kind: "shelf" | "path";
  title?: string;
  items: { id: string; status?: "saved" | "reading" | "completed" }[];
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlToBytes(input: string): Uint8Array {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "="));
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

export async function encodeShare(payload: SharePayload): Promise<string> {
  const json = JSON.stringify(payload);
  if (new TextEncoder().encode(json).length > SHARE_LIMIT) throw new Error("Share payload is too large");
  const stream = new Blob([json]).stream().pipeThrough(new CompressionStream("deflate-raw"));
  return bytesToBase64Url(new Uint8Array(await new Response(stream).arrayBuffer()));
}

export async function decodeShare(hash: string): Promise<SharePayload | null> {
  try {
    const encoded = hash.replace(/^#?s=/, "");
    if (!encoded || encoded.length > SHARE_LIMIT * 2 || !/^[A-Za-z0-9_-]+$/.test(encoded)) return null;
    const stream = new Blob([base64UrlToBytes(encoded).buffer as ArrayBuffer]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
    const parsed = JSON.parse(await new Response(stream).text()) as SharePayload;
    if (parsed.v !== 1 || (parsed.kind !== "shelf" && parsed.kind !== "path") || !Array.isArray(parsed.items)) return null;
    return parsed;
  } catch {
    return null;
  }
}
