import * as anchor from "@coral-xyz/anchor";
import { Program, AnchorProvider, web3, BN } from "@coral-xyz/anchor";
import { LendingProtocol } from "../target/types/lending_protocol";
import {
  TOKEN_PROGRAM_ID,
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  getAccount,
} from "@solana/spl-token";
import { PublicKey, Keypair, Connection, SystemProgram } from "@solana/web3.js";
import { assert } from "chai";

describe("Lending Protocol - On-Chain Tests (Devnet)", () => {
  // Configure the client to use devnet
  const provider = AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.LendingProtocol as Program<LendingProtocol>;
  const connection = provider.connection;
  const payer = provider.wallet as anchor.Wallet;

  let usdcMint: PublicKey;
  let solMint: PublicKey;
  let usdcBankAccount: PublicKey;
  let solBankAccount: PublicKey;
  let usdcTreasuryAccount: PublicKey;
  let solTreasuryAccount: PublicKey;
  let userAccount: PublicKey;
  let userUsdcTokenAccount: any;
  let userSolTokenAccount: any;

  // Pyth oracle addresses (Devnet)
  const SOL_USD_PRICE_FEED = new PublicKey(
    "7UVimffxr9ow1uXYxsr4LHAcV58mLzhmwaeKvJ1pjLiE"
  );

  console.log("\n🚀 Starting On-Chain Tests on Devnet");
  console.log("📍 Program ID:", program.programId.toBase58());
  console.log("💰 Payer:", payer.publicKey.toBase58());
  console.log("🌐 RPC Endpoint:", connection.rpcEndpoint);
  console.log("🔗 Cluster:", connection.rpcEndpoint.includes("devnet") ? "Devnet" : "Other");

  it("Initialize User Account", async () => {
    console.log("\n=== Test 1: Initialize User Account ===");

    // Create USDC mint (we'll use this as the usdc_address parameter)
    console.log("📦 Creating USDC mint...");
    usdcMint = await createMint(
      connection,
      payer.payer,
      payer.publicKey,
      null,
      6 // USDC decimals
    );
    console.log("✅ USDC Mint:", usdcMint.toBase58());

    // Derive user account PDA
    [userAccount] = PublicKey.findProgramAddressSync(
      [payer.publicKey.toBuffer()],
      program.programId
    );
    console.log("👤 User Account PDA:", userAccount.toBase58());

    try {
      // Check if user account already exists
      const userAccountInfo = await connection.getAccountInfo(userAccount);
      
      if (userAccountInfo) {
        console.log("ℹ️  User account already exists, skipping initialization");
        const userAccountData = await program.account.user.fetch(userAccount);
        console.log("📊 Existing User Account Data:", {
          owner: userAccountData.owner.toBase58(),
          usdcAddress: userAccountData.usdcAddress.toBase58(),
          depositedUsdc: userAccountData.depositedUsdc.toString(),
          depositedSol: userAccountData.depositedSol.toString(),
        });
        return;
      }

      const tx = await program.methods
        .initUser(usdcMint)
        .accounts({
          signer: payer.publicKey,
          userAccount: userAccount,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      console.log("✅ User initialized!");
      console.log("🔗 Transaction:", tx);
      console.log(
        "🌐 Explorer:",
        `https://explorer.solana.com/tx/${tx}?cluster=devnet`
      );

      // Wait for confirmation
      await connection.confirmTransaction(tx, "confirmed");

      // Fetch and display account data
      const userAccountData = await program.account.user.fetch(userAccount);
      console.log("📊 User Account Data:", {
        owner: userAccountData.owner.toBase58(),
        usdcAddress: userAccountData.usdcAddress.toBase58(),
        depositedUsdc: userAccountData.depositedUsdc.toString(),
        depositedSol: userAccountData.depositedSol.toString(),
      });
    } catch (error) {
      console.error("❌ Error:", error);
      throw error;
    }
  });

  it("Initialize USDC Bank", async () => {
    console.log("\n=== Test 2: Initialize USDC Bank ===");

    // Derive bank account PDA
    [usdcBankAccount] = PublicKey.findProgramAddressSync(
      [usdcMint.toBuffer()],
      program.programId
    );
    console.log("🏦 USDC Bank Account PDA:", usdcBankAccount.toBase58());

    // Derive treasury account
    [usdcTreasuryAccount] = PublicKey.findProgramAddressSync(
      [Buffer.from("treasury"), usdcMint.toBuffer()],
      program.programId
    );
    console.log("💰 USDC Treasury Account:", usdcTreasuryAccount.toBase58());

    try {
      const liquidationThreshold = new BN(80); // 80%
      const maxLtv = new BN(75); // 75%

      const tx = await program.methods
        .initBank(liquidationThreshold, maxLtv)
        .accounts({
          signer: payer.publicKey,
          mint: usdcMint,
          bank: usdcBankAccount,
          bankTokenAccount: usdcTreasuryAccount,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      console.log("✅ USDC Bank initialized!");
      console.log("🔗 Transaction:", tx);
      console.log(
        "🌐 Explorer:",
        `https://explorer.solana.com/tx/${tx}?cluster=devnet`
      );

      await connection.confirmTransaction(tx, "confirmed");

      const bankData = await program.account.bank.fetch(usdcBankAccount);
      console.log("📊 Bank Data:", {
        authority: bankData.authority.toBase58(),
        mintAddress: bankData.mintAddress.toBase58(),
        liquidationThreshold: bankData.liquidationThreshold.toString(),
        maxLtv: bankData.maxLtv.toString(),
        totalDeposits: bankData.totalDeposits.toString(),
      });
    } catch (error) {
      console.error("❌ Error:", error);
      throw error;
    }
  });

  it("Initialize SOL Bank", async () => {
    console.log("\n=== Test 3: Initialize SOL Bank ===");

    // Create wrapped SOL mint
    console.log("📦 Creating wrapped SOL mint...");
    solMint = await createMint(
      connection,
      payer.payer,
      payer.publicKey,
      null,
      9 // SOL decimals
    );
    console.log("✅ SOL Mint:", solMint.toBase58());

    [solBankAccount] = PublicKey.findProgramAddressSync(
      [solMint.toBuffer()],
      program.programId
    );
    console.log("🏦 SOL Bank Account PDA:", solBankAccount.toBase58());

    [solTreasuryAccount] = PublicKey.findProgramAddressSync(
      [Buffer.from("treasury"), solMint.toBuffer()],
      program.programId
    );
    console.log("💰 SOL Treasury Account:", solTreasuryAccount.toBase58());

    try {
      const liquidationThreshold = new BN(80);
      const maxLtv = new BN(75);

      const tx = await program.methods
        .initBank(liquidationThreshold, maxLtv)
        .accounts({
          signer: payer.publicKey,
          mint: solMint,
          bank: solBankAccount,
          bankTokenAccount: solTreasuryAccount,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      console.log("✅ SOL Bank initialized!");
      console.log("🔗 Transaction:", tx);
      console.log(
        "🌐 Explorer:",
        `https://explorer.solana.com/tx/${tx}?cluster=devnet`
      );

      await connection.confirmTransaction(tx, "confirmed");
    } catch (error) {
      console.error("❌ Error:", error);
      throw error;
    }
  });

  it("Fund User Token Accounts and Deposit USDC", async () => {
    console.log("\n=== Test 4: Fund User and Deposit USDC ===");

    // Create user's USDC token account
    console.log("📦 Creating user USDC token account...");
    userUsdcTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      payer.payer,
      usdcMint,
      payer.publicKey
    );
    console.log("✅ User USDC Token Account:", userUsdcTokenAccount.address.toBase58());

    // Mint USDC to user
    const mintAmount = 100_000_000_000; // 100,000 USDC (6 decimals)
    console.log("💵 Minting USDC to user...");
    await mintTo(
      connection,
      payer.payer,
      usdcMint,
      userUsdcTokenAccount.address,
      payer.publicKey,
      mintAmount
    );
    console.log("✅ Minted 100,000 USDC to user");

    // Deposit USDC
    const depositAmount = new BN(10_000_000_000); // 10,000 USDC
    console.log("📥 Depositing 10,000 USDC...");

    try {
      const tx = await program.methods
        .deposit(depositAmount)
        .accounts({
          signer: payer.publicKey,
          mint: usdcMint,
          bank: usdcBankAccount,
          bankTokenAccount: usdcTreasuryAccount,
          userAccount: userAccount,
          userTokenAccount: userUsdcTokenAccount.address,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      console.log("✅ USDC deposited!");
      console.log("🔗 Transaction:", tx);
      console.log(
        "🌐 Explorer:",
        `https://explorer.solana.com/tx/${tx}?cluster=devnet`
      );

      await connection.confirmTransaction(tx, "confirmed");

      const userData = await program.account.user.fetch(userAccount);
      console.log("📊 User Deposited USDC:", userData.depositedUsdc.toString());
    } catch (error) {
      console.error("❌ Error:", error);
      throw error;
    }
  });

  it("Deposit SOL", async () => {
    console.log("\n=== Test 5: Deposit SOL ===");

    // Create user's SOL token account
    console.log("📦 Creating user SOL token account...");
    userSolTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      payer.payer,
      solMint,
      payer.publicKey
    );
    console.log("✅ User SOL Token Account:", userSolTokenAccount.address.toBase58());

    // Mint wrapped SOL to user
    const mintAmount = 100_000_000_000; // 100 SOL (9 decimals)
    console.log("💵 Minting wrapped SOL to user...");
    await mintTo(
      connection,
      payer.payer,
      solMint,
      userSolTokenAccount.address,
      payer.publicKey,
      mintAmount
    );
    console.log("✅ Minted 100 SOL to user");

    // Deposit SOL
    const depositAmount = new BN(5_000_000_000); // 5 SOL
    console.log("📥 Depositing 5 SOL...");

    try {
      const tx = await program.methods
        .deposit(depositAmount)
        .accounts({
          signer: payer.publicKey,
          mint: solMint,
          bank: solBankAccount,
          bankTokenAccount: solTreasuryAccount,
          userAccount: userAccount,
          userTokenAccount: userSolTokenAccount.address,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      console.log("✅ SOL deposited!");
      console.log("🔗 Transaction:", tx);
      console.log(
        "🌐 Explorer:",
        `https://explorer.solana.com/tx/${tx}?cluster=devnet`
      );

      await connection.confirmTransaction(tx, "confirmed");

      const userData = await program.account.user.fetch(userAccount);
      console.log("📊 User Deposited SOL:", userData.depositedSol.toString());
    } catch (error) {
      console.error("❌ Error:", error);
      throw error;
    }
  });

  it("Withdraw USDC", async () => {
    console.log("\n=== Test 6: Withdraw USDC ===");

    const withdrawAmount = new BN(1_000_000_000); // 1,000 USDC
    console.log("📤 Withdrawing 1,000 USDC...");

    try {
      const tx = await program.methods
        .withdraw(withdrawAmount)
        .accounts({
          signer: payer.publicKey,
          mint: usdcMint,
          bank: usdcBankAccount,
          bankTokenAccount: usdcTreasuryAccount,
          userAccount: userAccount,
          userTokenAccount: userUsdcTokenAccount.address,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      console.log("✅ USDC withdrawn!");
      console.log("🔗 Transaction:", tx);
      console.log(
        "🌐 Explorer:",
        `https://explorer.solana.com/tx/${tx}?cluster=devnet`
      );

      await connection.confirmTransaction(tx, "confirmed");

      const userData = await program.account.user.fetch(userAccount);
      console.log("📊 User Deposited USDC after withdrawal:", userData.depositedUsdc.toString());
    } catch (error) {
      console.error("❌ Error:", error);
      throw error;
    }
  });

  it("Final State Summary", async () => {
    console.log("\n=== Final State Summary ===");

    const userData = await program.account.user.fetch(userAccount);
    const usdcBankData = await program.account.bank.fetch(usdcBankAccount);
    const solBankData = await program.account.bank.fetch(solBankAccount);

    console.log("\n👤 User Account:");
    console.log("  - Address:", userAccount.toBase58());
    console.log("  - Deposited USDC:", userData.depositedUsdc.toString());
    console.log("  - Deposited SOL:", userData.depositedSol.toString());
    console.log("  - Borrowed USDC:", userData.borrowedUsdc.toString());
    console.log("  - Borrowed SOL:", userData.borrowedSol.toString());

    console.log("\n🏦 USDC Bank:");
    console.log("  - Address:", usdcBankAccount.toBase58());
    console.log("  - Total Deposits:", usdcBankData.totalDeposits.toString());
    console.log("  - Total Borrowed:", usdcBankData.totalBorrowed.toString());

    console.log("\n🏦 SOL Bank:");
    console.log("  - Address:", solBankAccount.toBase58());
    console.log("  - Total Deposits:", solBankData.totalDeposits.toString());
    console.log("  - Total Borrowed:", solBankData.totalBorrowed.toString());

    console.log("\n🔗 Explorer Links:");
    console.log(
      `  - User: https://explorer.solana.com/address/${userAccount.toBase58()}?cluster=devnet`
    );
    console.log(
      `  - USDC Bank: https://explorer.solana.com/address/${usdcBankAccount.toBase58()}?cluster=devnet`
    );
    console.log(
      `  - SOL Bank: https://explorer.solana.com/address/${solBankAccount.toBase58()}?cluster=devnet`
    );
    console.log(
      `  - Program: https://explorer.solana.com/address/${program.programId.toBase58()}?cluster=devnet`
    );

    console.log("\n✅ All on-chain tests completed successfully!");
    console.log("🎉 Check Solana Explorer to view all transactions!\n");
  });
});

