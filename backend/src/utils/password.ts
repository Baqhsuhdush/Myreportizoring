// ---------------------------------------------------------------------------
// Хэширование паролей через Web Crypto API (PBKDF2-SHA256).
// Workers Runtime не поддерживает bcrypt/argon2 из коробки, поэтому
// используется встроенный SubtleCrypto.
// ---------------------------------------------------------------------------

const PBKDF2_ITERATIONS = 100_000;
const SALT_LENGTH_BYTES = 16;
const HASH_LENGTH_BITS = 256;

// Формат хранимого хэша: pbkdf2$<iterations>$<saltBase64>$<hashBase64>
const HASH_PREFIX = "pbkdf2";

function toBase64(bytes: ArrayBuffer | Uint8Array): string {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let binary = "";
  for (const byte of arr) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

function fromBase64(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function deriveKey(
  password: string,
  salt: Uint8Array,
  iterations: number
): Promise<ArrayBuffer> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );

  return crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt,
      iterations,
      hash: "SHA-256",
    },
    keyMaterial,
    HASH_LENGTH_BITS
  );
}

// ---------------------------------------------------------------------------
// Публичное API
// ---------------------------------------------------------------------------
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH_BYTES));
  const derived = await deriveKey(password, salt, PBKDF2_ITERATIONS);

  return [
    HASH_PREFIX,
    PBKDF2_ITERATIONS,
    toBase64(salt),
    toBase64(derived),
  ].join("$");
}

export async function verifyPassword(
  password: string,
  storedHash: string
): Promise<boolean> {
  const parts = storedHash.split("$");
  if (parts.length !== 4 || parts[0] !== HASH_PREFIX) {
    return false;
  }

  const [, iterationsRaw, saltBase64, hashBase64] = parts;
  const iterations = Number(iterationsRaw);
  if (!Number.isFinite(iterations) || iterations <= 0) {
    return false;
  }

  const salt = fromBase64(saltBase64);
  const expected = fromBase64(hashBase64);
  const derived = new Uint8Array(await deriveKey(password, salt, iterations));

  if (derived.length !== expected.length) {
    return false;
  }

  // Сравнение за постоянное время (защита от timing-атак)
  let diff = 0;
  for (let i = 0; i < derived.length; i++) {
    diff |= derived[i] ^ expected[i];
  }
  return diff === 0;
}
