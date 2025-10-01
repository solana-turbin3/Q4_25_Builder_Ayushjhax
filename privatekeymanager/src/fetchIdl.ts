import { AnchorProvider, Program, Idl, Wallet } from '@coral-xyz/anchor';
import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js';

async function main() {
  const programIdStr = process.env.PROGRAM_ID || 'TRBZyQHB3m68FGeVsqTK39Wm4xejadjVhP5MAZaKWDM';
  const programId = new PublicKey(programIdStr);

  const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');

  // AnchorProvider requires a wallet; for readonly calls, a dummy wallet suffices
  const dummyWallet: Wallet = {
    publicKey: PublicKey.default,
    signAllTransactions: async (txs) => txs,
    signTransaction: async (tx) => tx,
  } as Wallet;

  const provider = new AnchorProvider(connection, dummyWallet, {});
  AnchorProvider.env = () => provider;

  const idl = (await Program.fetchIdl(programId, provider)) as Idl | null;
  if (!idl) {
    throw new Error('IDL not found or program does not expose a public IDL');
  }

  // Write to file next to project root
  const fs = await import('fs');
  const path = await import('path');
  const outPath = path.resolve(process.cwd(), 'turbin3_idl.json');
  fs.writeFileSync(outPath, JSON.stringify(idl, null, 2), { encoding: 'utf-8' });
  console.log(`Wrote IDL to ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});


