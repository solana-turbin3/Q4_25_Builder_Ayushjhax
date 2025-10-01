# Solana Private Key Converter

A TypeScript program to convert Solana private keys to the array format used in dev-wallet.json files.

## Features

- Convert base58/base64 private key strings to number arrays
- Generate dev-wallet.json format output
- Verify conversions by converting back
- Full TypeScript support with type safety

## Installation

```bash
npm install
```

## Usage

### Run the program
```bash
npm run dev
```

### Build and run
```bash
npm run build
npm start
```

## API

### `convertPrivateKeyToArray(privateKeyString: string): number[]`
Converts a base58/base64 private key string to an array of numbers.

### `convertArrayToPrivateKey(privateKeyArray: number[]): string`
Converts an array of numbers back to a base58 private key string.

## Example Output

The program will output the private key in the dev-wallet.json format:

```json
{
  "privateKey": [32, 23, 45, ...]
}
```

## Security Note

⚠️ **Important**: This tool is for development purposes only. Never commit private keys to version control or share them publicly.

# Turbine3
