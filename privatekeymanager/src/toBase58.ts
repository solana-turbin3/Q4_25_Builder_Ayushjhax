import fs from 'fs';
import path from 'path';
import { convertArrayToPrivateKey } from './index';

function isNumericArray(value: unknown): value is number[] {
  return Array.isArray(value) && value.every((v) => typeof v === 'number');
}

function parseInputArg(arg: string): number[] | null {
  // If arg is a path to a json file
  const potentialPath = path.isAbsolute(arg) ? arg : path.resolve(process.cwd(), arg);
  if (fs.existsSync(potentialPath) && potentialPath.toLowerCase().endsWith('.json')) {
    const content = fs.readFileSync(potentialPath, 'utf-8');
    const parsed = JSON.parse(content);
    if (parsed && isNumericArray(parsed)) return parsed;
    if (parsed && parsed.privateKey && isNumericArray(parsed.privateKey)) return parsed.privateKey;
    throw new Error('JSON file does not contain a number array or { privateKey: number[] }');
  }

  // Try to parse as JSON inline (array or { privateKey })
  try {
    const parsed = JSON.parse(arg);
    if (isNumericArray(parsed)) return parsed;
    if (parsed && parsed.privateKey && isNumericArray(parsed.privateKey)) return parsed.privateKey;
  } catch (_) {
    // Not JSON, fall through
  }

  // Try comma-separated numbers
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

function readDefaultDevWalletArray(): number[] {
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
  let secretKeyArray: number[] | null = null;

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

  const base58 = convertArrayToPrivateKey(secretKeyArray);
  console.log(base58);
}

main();


