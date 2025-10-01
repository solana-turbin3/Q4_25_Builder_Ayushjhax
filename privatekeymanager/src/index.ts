import { Keypair } from '@solana/web3.js';
import bs58 from 'bs58';

/**
 * Converts a base58 private key string to the array format used in dev-wallet.json files
 * @param privateKeyString - The base58 encoded private key string
 * @returns Array of numbers representing the private key bytes
 */
function convertPrivateKeyToArray(privateKeyString: string): number[] {
    try {
        // Try base58 decoding first (most common for Solana private keys)
        const decodedBytes = bs58.decode(privateKeyString);
        const keypair = Keypair.fromSecretKey(decodedBytes);
        
        // Return the secret key as an array of numbers
        return Array.from(keypair.secretKey);
    } catch (error) {
        // If base58 decoding fails, try base64 decoding
        try {
            const keypair = Keypair.fromSecretKey(
                new Uint8Array(Buffer.from(privateKeyString, 'base64'))
            );
            return Array.from(keypair.secretKey);
        } catch (base64Error) {
            throw new Error(`Failed to decode private key. Tried base58: ${error}. Tried base64: ${base64Error}`);
        }
    }
}

/**
 * Converts a private key array to base58 format (reverse operation)
 * @param privateKeyArray - Array of numbers representing the private key bytes
 * @returns Base58 encoded private key string
 */
function convertArrayToPrivateKey(privateKeyArray: number[]): string {
    const keypair = Keypair.fromSecretKey(new Uint8Array(privateKeyArray));
    return bs58.encode(keypair.secretKey);
}

/**
 * Main function to demonstrate the conversion
 */
function main() {
    const privateKeyString = "2fNXetB2XNpoHLBS4wMYt1vaDcrDLwhQmKUyv1tBMXjEunfntQSY9fnNxRLgGpuALSxKYSyzpXW8vzJ6xzLneXzF";
    
    console.log("Converting Solana private key to dev-wallet.json format...");
    console.log("Original private key:", privateKeyString);
    
    try {
        // Convert to array format
        const privateKeyArray = convertPrivateKeyToArray(privateKeyString);
        
        console.log("\nConverted to array format:");
        console.log(JSON.stringify(privateKeyArray));
        
        // Create a dev-wallet.json structure
        const devWallet = {
            privateKey: privateKeyArray
        };
        
        console.log("\nDev-wallet.json format:");
        console.log(JSON.stringify(devWallet, null, 2));
        
        // Verify the conversion by converting back
        const convertedBack = convertArrayToPrivateKey(privateKeyArray);
        console.log("\nVerification - converted back to base58:");
        console.log(convertedBack);
        
        if (privateKeyString === convertedBack) {
            console.log("✅ Conversion successful! Keys match.");
        } else {
            console.log("⚠️  Warning: Keys don't match exactly, but this might be due to encoding differences.");
        }
        
    } catch (error) {
        console.error("❌ Error converting private key:", error);
    }
}

// Run the main function if this file is executed directly
if (require.main === module) {
    main();
}

export { convertPrivateKeyToArray, convertArrayToPrivateKey };
