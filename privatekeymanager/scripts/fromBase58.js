/* Standalone Base58 decoder (Bitcoin alphabet), no external deps */
const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
const BASE = ALPHABET.length;

function decodeBase58(str) {
  if (typeof str !== 'string' || str.length === 0) return new Uint8Array();

  let zeros = 0;
  while (zeros < str.length && str[zeros] === '1') zeros++;

  const bytes = [];
  for (let i = zeros; i < str.length; i++) {
    const char = str[i];
    const value = ALPHABET.indexOf(char);
    if (value === -1) throw new Error(`Invalid base58 character: ${char}`);
    let carry = value;
    for (let j = 0; j < bytes.length; j++) {
      const val = bytes[j] * BASE + carry;
      bytes[j] = val & 0xff; // mod 256
      carry = val >> 8; // div 256
    }
    while (carry > 0) {
      bytes.push(carry & 0xff);
      carry >>= 8;
    }
  }

  // add leading zeros
  for (let k = 0; k < zeros; k++) {
    bytes.push(0);
  }

  return new Uint8Array(bytes.reverse());
}

function main() {
  const key = process.argv.slice(2).join(' ').trim();
  if (!key) {
    console.error('Usage: node fromBase58.js <base58-private-key>');
    process.exit(1);
  }
  const decoded = decodeBase58(key);
  // Output as plain array and dev-wallet.json structure
  console.log(JSON.stringify(Array.from(decoded)));
  console.error('\nDev-wallet.json format:\n' + JSON.stringify({ privateKey: Array.from(decoded) }, null, 2));
}

main();


