const ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyz'

/** Short random id. Uses getRandomValues, which (unlike randomUUID) also works over plain http. */
export function newId(length = 10): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length))
  let id = ''
  for (const b of bytes) id += ALPHABET[b % ALPHABET.length]
  return id
}
