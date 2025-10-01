/* Standalone Base58 encoder (Bitcoin alphabet), no external deps */
const fs = require('fs');
const path = require('path');

const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
const BASE = ALPHABET.length;

function encodeBase58(buffer) {
  if (!(buffer instanceof Uint8Array)) buffer = new Uint8Array(buffer);
  if (buffer.length === 0) return '';

  let zeros = 0;
  while (zeros < buffer.length && buffer[zeros] === 0) zeros++;

  const digits = [];
  for (let i = zeros; i < buffer.length; i++) {
    let carry = buffer[i];
    for (let j = 0; j < digits.length; j++) {
      const val = digits[j] * 256 + carry;
      digits[j] = Math.floor(val / BASE);
      carry = val % BASE;
    }
    while (carry > 0) {
      digits.push(carry % BASE);
      carry = Math.floor(carry / BASE);
    }
  }

  for (let k = 0; k < zeros; k++) {
    digits.push(0);
  }

  return digits
    .reverse()
    .map((d) => ALPHABET[d])
    .join('');
}

function isNumericArray(value) {
  return Array.isArray(value) && value.every((v) => typeof v === 'number');
}

function parseInputArg(arg) {
  const potentialPath = path.isAbsolute(arg) ? arg : path.resolve(process.cwd(), arg);
  if (fs.existsSync(potentialPath) && potentialPath.toLowerCase().endsWith('.json')) {
    const content = fs.readFileSync(potentialPath, 'utf-8');
    const parsed = JSON.parse(content);
    if (isNumericArray(parsed)) return parsed;
    if (parsed && parsed.privateKey && isNumericArray(parsed.privateKey)) return parsed.privateKey;
    throw new Error('JSON file does not contain a number array or { privateKey: number[] }');
  }
  try {
    const parsed = JSON.parse(arg);
    if (isNumericArray(parsed)) return parsed;
    if (parsed && parsed.privateKey && isNumericArray(parsed.privateKey)) return parsed.privateKey;
  } catch (_) {}
  const maybeNumbers = arg
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .map((s) => Number(s));
  if (maybeNumbers.length > 0 && maybeNumbers.every((n) => Number.isFinite(n))) {
    return maybeNumbers;
  }
  return null;
}

function readDefaultDevWalletArray() {
  const defaultPath = path.resolve(__dirname, '..', 'dev-wallet.json');
  if (!fs.existsSync(defaultPath)) {
    throw new Error(`Default dev-wallet.json not found at ${defaultPath}. Provide an input argument instead.`);
  }
  const content = fs.readFileSync(defaultPath, 'utf-8');
  const parsed = JSON.parse(content);
  if (isNumericArray(parsed)) return parsed;
  if (parsed && parsed.privateKey && isNumericArray(parsed.privateKey)) return parsed.privateKey;
  throw new Error('dev-wallet.json does not contain a number array or { privateKey: number[] }');
}

function main() {
  const rawArg = process.argv.slice(2).join(' ').trim();
  let secretKeyArray = null;
  if (rawArg.length > 0) {
    secretKeyArray = parseInputArg(rawArg);
    if (!secretKeyArray) {
      throw new Error('Could not parse input. Provide a path to JSON, a JSON array, or comma-separated numbers.');
    }
  } else {
    secretKeyArray = readDefaultDevWalletArray();
  }
  if (!Array.isArray(secretKeyArray) || secretKeyArray.length === 0) {
    throw new Error('Secret key array is empty or invalid.');
  }
  const bytes = Uint8Array.from(secretKeyArray);
  const base58 = encodeBase58(bytes);
  console.log(base58);
}

main();


