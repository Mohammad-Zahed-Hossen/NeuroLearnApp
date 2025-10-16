// Cross-platform base64 helper for React Native / Node / Browser
import { Buffer } from 'buffer';

export function base64Encode(input: string): string {
  return Buffer.from(input, 'utf8').toString('base64');
}

export function base64Decode(input: string): string {
  return Buffer.from(input, 'base64').toString('utf8');
}

// Ensure global btoa is available (some RN environments may not provide it)
export function ensureGlobalBtoa(): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const g = global as any;
  if (!g.btoa) {
    g.btoa = (str: string) => base64Encode(str);
  }
  if (!g.atob) {
    g.atob = (str: string) => base64Decode(str);
  }
}

// Eagerly ensure global functions when the module is imported
ensureGlobalBtoa();

export default base64Encode;
