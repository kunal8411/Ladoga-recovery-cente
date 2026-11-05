import { createHash, randomBytes } from "crypto";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/** 20 base32 characters (100 bits), grouped for readability: RS-XXXX-XXXX-XXXX-XXXX-XXXX */
export function generateDeviceKey() {
  const bytes = randomBytes(20);
  let raw = "";
  for (const b of bytes) raw += ALPHABET[b % 32];
  return `RS-${raw.match(/.{4}/g)!.join("-")}`;
}

export function normalizeDeviceKey(key: string) {
  return key.toUpperCase().replace(/[^A-Z0-9]/g, "").replace(/^RS/, "");
}

export function hashDeviceKey(key: string) {
  return createHash("sha256").update(normalizeDeviceKey(key)).digest("hex");
}

export function deviceKeyHint(key: string) {
  return normalizeDeviceKey(key).slice(-4);
}
