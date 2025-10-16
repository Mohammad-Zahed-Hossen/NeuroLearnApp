// compression utilities using pako when available; falls back to identity
let pako: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  pako = require('pako');
} catch (e) {
  // pako not available in some environments; we'll use identity
}

export async function compressString(input: string): Promise<Uint8Array | string> {
  if (pako && typeof pako.gzip === 'function') {
    try {
      return pako.gzip(input);
    } catch (e) {
      console.warn('Compression failed, returning original string', e);
      return input;
    }
  }
  return input;
}

export async function decompressToString(input: Uint8Array | string): Promise<string> {
  if (pako && typeof pako.ungzip === 'function' && input instanceof Uint8Array) {
    try {
      const out = pako.ungzip(input, { to: 'string' });
      return out as string;
    } catch (e) {
      console.warn('Decompression failed, attempting fallback', e);
      return String(input as any);
    }
  }
  return String(input as any);
}
