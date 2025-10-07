import { createKeyPairSignerFromBytes } from "@solana/kit";

async function generateKeypair() {
    const keypair = await crypto.subtle.generateKey(
        // This is the built in Web Crypto API
        { name: "Ed25519" },
        true,
        ["sign", "verify"]
        )
        const privateKeyJwk = await crypto.subtle.exportKey('jwk', keypair.privateKey);

        //"kty" → Key Type ("OKP" = Octet Key Pair)

        // "crv" → Curve name (Ed25519)

        // "x" → The public key encoded in base64url

        // "d" → The private key encoded in base64url

        const privateKeyBase64 = privateKeyJwk.d;
        if (!privateKeyBase64) throw new Error('Failed to get private key bytes')
        const privateKeyBytes = new Uint8Array(Buffer.from(privateKeyBase64, 'base64'));
        const publicKeyBytes = new Uint8Array(await crypto.subtle.exportKey('raw', keypair.publicKey))
        const keypairBytes = new Uint8Array([...privateKeyBytes, ...publicKeyBytes]);
        const signer = await createKeyPairSignerFromBytes(keypairBytes);
        
        console.log(`You have generated a new Solana wallet: ${signer.address}`);
        console.log(`To save your wallet, copy and paste the following into a JSON file: [${keypairBytes}]`);
}

generateKeypair().catch(console.error);