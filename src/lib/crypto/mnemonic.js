import { WORDLIST } from './wordlist'
import { randomBytes } from './bytes'

const ENTROPY_BYTES = 16
const WORD_COUNT = 12
const BITS_PER_WORD = 11
const CHECKSUM_BITS = 4

const WORD_INDEX = new Map(WORDLIST.map((word, i) => [word, i]))

function normalize(phrase) {
  return String(phrase ?? '')
    .normalize('NFKD')
    .toLowerCase()
    .trim()
    .split(/\s+/)
    .filter(Boolean)
}

async function checksumBits(entropy) {
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', entropy))
  return digest[0] >> (8 - CHECKSUM_BITS)
}

export function generateRecoveryEntropy() {
  return randomBytes(ENTROPY_BYTES)
}

export async function encodeMnemonic(entropy) {
  if (!(entropy instanceof Uint8Array) || entropy.length !== ENTROPY_BYTES) {
    throw new Error('mnemonic-entropy-invalid')
  }

  let bits = 0n
  for (const byte of entropy) bits = (bits << 8n) | BigInt(byte)
  bits = (bits << BigInt(CHECKSUM_BITS)) | BigInt(await checksumBits(entropy))

  const words = []
  for (let i = WORD_COUNT - 1; i >= 0; i--) {
    const index = Number((bits >> BigInt(i * BITS_PER_WORD)) & 0x7ffn)
    words.push(WORDLIST[index])
  }
  return words.join(' ')
}

export async function decodeMnemonic(phrase) {
  const words = normalize(phrase)
  if (words.length !== WORD_COUNT) return null

  let bits = 0n
  for (const word of words) {
    const index = WORD_INDEX.get(word)
    if (index === undefined) return null
    bits = (bits << BigInt(BITS_PER_WORD)) | BigInt(index)
  }

  const checksum = Number(bits & ((1n << BigInt(CHECKSUM_BITS)) - 1n))
  bits >>= BigInt(CHECKSUM_BITS)

  const entropy = new Uint8Array(ENTROPY_BYTES)
  for (let i = ENTROPY_BYTES - 1; i >= 0; i--) {
    entropy[i] = Number(bits & 0xffn)
    bits >>= 8n
  }

  if (await checksumBits(entropy) !== checksum) return null
  return entropy
}

export async function isValidMnemonic(phrase) {
  return (await decodeMnemonic(phrase)) !== null
}

export function normalizeMnemonic(phrase) {
  return normalize(phrase).join(' ')
}

export function isWordlistWord(word) {
  return WORD_INDEX.has(String(word ?? '').normalize('NFKD').toLowerCase().trim())
}
