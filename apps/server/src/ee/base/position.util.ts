/**
 * Lexicographic position generation compatible with the client-side
 * `fractional-indexing-jittered` library. Keys are byte-order sortable
 * (Postgres `COLLATE "C"` and JS string comparison agree on this alphabet),
 * so positions generated here interleave correctly with keys produced by the
 * client. Used only when the server must synthesize a position itself
 * (initial schema creation, appending a row when none is supplied).
 */
const BASE_62_DIGITS =
  '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
const MIN = 0;
const MAX = BASE_62_DIGITS.length - 1;

/**
 * Generate a key strictly between `a` and `b` (both excluded). Either may be
 * null, meaning "before the first" / "after the last".
 */
export function generateKeyBetween(a: string | null, b: string | null): string {
  if (a !== null && b !== null && a >= b) {
    throw new Error(`generateKeyBetween: lower "${a}" >= upper "${b}"`);
  }
  if (a === null && b === null) {
    return BASE_62_DIGITS[Math.floor((MIN + MAX) / 2)];
  }
  if (b === null) return increment(a as string);
  if (a === null) return decrement(b);
  return midpoint(a, b);
}

function increment(str: string): string {
  const last = str[str.length - 1];
  const lastDigit = BASE_62_DIGITS.indexOf(last);
  if (lastDigit < MAX) {
    return str.slice(0, -1) + BASE_62_DIGITS[lastDigit + 1];
  }
  return increment(str.slice(0, -1)) + BASE_62_DIGITS[MIN];
}

function decrement(str: string): string {
  const last = str[str.length - 1];
  const lastDigit = BASE_62_DIGITS.indexOf(last);
  if (lastDigit > MIN) {
    return str.slice(0, -1) + BASE_62_DIGITS[lastDigit - 1];
  }
  return decrement(str.slice(0, -1)) + BASE_62_DIGITS[MAX];
}

function midpoint(a: string, b: string): string {
  const finalLength = Math.max(a.length, b.length);
  let prefix = '';
  for (let i = 0; i < finalLength; i++) {
    const aChar = i < a.length ? a[i] : BASE_62_DIGITS[MIN];
    const bChar = i < b.length ? b[i] : BASE_62_DIGITS[MAX];
    const aDigit = BASE_62_DIGITS.indexOf(aChar);
    const bDigit = BASE_62_DIGITS.indexOf(bChar);
    if (aDigit === bDigit) {
      prefix += aChar;
    } else if (bDigit - aDigit === 1) {
      return prefix + aChar + BASE_62_DIGITS[MIN];
    } else {
      const midDigit = Math.floor((aDigit + bDigit) / 2);
      return prefix + BASE_62_DIGITS[midDigit];
    }
  }
  return prefix;
}

/** Append a row/property/view at the end (after the current last position). */
export function positionAfter(last: string | null): string {
  return generateKeyBetween(last, null);
}
