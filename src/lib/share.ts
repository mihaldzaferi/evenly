import { parseGroup } from './validate'
import type { Group } from './types'

/**
 * Share links carry the whole group inside the URL — no server involved.
 * The group is JSON-encoded, deflated, and base64url-encoded, prefixed with a
 * format version so the encoding can change later without breaking old links.
 */
const VERSION = '1'

export async function encodeGroup(group: Group): Promise<string> {
  // "Who am I" and "archived" are personal to this device, so they don't travel.
  const { meId, archived, ...shared } = group
  const bytes = new TextEncoder().encode(JSON.stringify(shared))
  const compressed = await pipe(bytes, new CompressionStream('deflate-raw'))
  return `${VERSION}.${toBase64Url(compressed)}`
}

export async function decodeGroup(code: string): Promise<Group> {
  const [version, data] = code.trim().split('.', 2)
  if (version !== VERSION || !data) throw new Error('This link was made by a different version of Evenly.')
  let json: unknown
  try {
    const bytes = await pipe(fromBase64Url(data), new DecompressionStream('deflate-raw'))
    json = JSON.parse(new TextDecoder().decode(bytes))
  } catch {
    throw new Error('This link is incomplete or damaged. Ask for it to be sent again.')
  }
  return parseGroup(json)
}

export function shareUrl(code: string, base = `${location.origin}${location.pathname}`): string {
  return `${base}#/import?g=${code}`
}

async function pipe(bytes: Uint8Array, stream: CompressionStream | DecompressionStream): Promise<Uint8Array> {
  const out = new Blob([bytes as BlobPart]).stream().pipeThrough(stream)
  return new Uint8Array(await new Response(out).arrayBuffer())
}

function toBase64Url(bytes: Uint8Array): string {
  let bin = ''
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64Url(s: string): Uint8Array {
  const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(bin, (c) => c.charCodeAt(0))
}
