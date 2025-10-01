use solana_client::rpc_client::RpcClient;
use solana_system_interface::instruction::transfer;
use solana_sdk::{
    hash::hash,
    message::Message,
    pubkey::Pubkey,
    signature::{Keypair, Signer, read_keypair_file},
    transaction::Transaction,
};
use std::str::FromStr;

const RPC_URL: &str = "https://api.devnet.solana.com";

#[test]
fn claim_airdrop() {
    // Import our keypair
    let keypair = read_keypair_file("dev-wallet.json")
        .expect("Couldn't find wallet file");
    
    // Establish a connection to Solana devnet
    let client = RpcClient::new(RPC_URL);
    
    // Claim 2 devnet SOL tokens (2 billion lamports)
    match client.request_airdrop(&keypair.pubkey(), 2_000_000_000u64) {
        Ok(sig) => {
            println!("Success! Check your TX here:");
            println!("https://explorer.solana.com/tx/{}?cluster=devnet", sig);
        }
        Err(err) => {
            println!("Airdrop failed: {}", err);
        }
    }
}


#[test]
fn transfer_to_turbin3() {
    // Load your devnet keypair from file
    let keypair = read_keypair_file("dev-wallet.json").expect("Couldn't find wallet file");
    
    // Generate a signature from the keypair
    let pubkey = keypair.pubkey();
    let message_bytes = b"I verify my Solana Keypair!";
    let sig = keypair.sign_message(message_bytes);
    
    // Verify the signature using the public key
    match sig.verify(pubkey.as_ref(), message_bytes) {
        true => println!("Signature verified"),
        false => println!("Verification failed"),
    }
    
    // Define the destination (Turbin3) address
    let to_pubkey = Pubkey::from_str("JCsFjtj6tem9Dv83Ks4HxsL7p8GhdLtokveqW7uWjGyi").unwrap();
    
    // Connect to devnet
    let rpc_client = RpcClient::new(RPC_URL);
    
    // Fetch recent blockhash
    let recent_blockhash = rpc_client
        .get_latest_blockhash()
        .expect("Failed to get recent blockhash");
    
    // Create and sign the transaction (transferring 0.1 SOL = 100,000,000 lamports)
    let transaction = Transaction::new_signed_with_payer(
        &[transfer(&keypair.pubkey(), &to_pubkey, 100_000_000)],
        Some(&keypair.pubkey()),
        &vec![&keypair],
        recent_blockhash,
    );
    
    // Send the transaction and print tx
    let signature = rpc_client
        .send_and_confirm_transaction(&transaction)
        .expect("Failed to send transaction");
    
    println!(
        "Success! Check out your TX here: https://explorer.solana.com/tx/{}/?cluster=devnet",
        signature
    );
}

#[test]
fn empty_devnet_wallet() {
    // Load your devnet keypair from file
    let keypair = read_keypair_file("dev-wallet.json").expect("Couldn't find wallet file");
    
    // Define the destination (Turbin3) address
    let to_pubkey = Pubkey::from_str("JCsFjtj6tem9Dv83Ks4HxsL7p8GhdLtokveqW7uWjGyi").unwrap();
    
    // Connect to devnet
    let rpc_client = RpcClient::new(RPC_URL);
    
    // Fetch recent blockhash
    let recent_blockhash = rpc_client
        .get_latest_blockhash()
        .expect("Failed to get recent blockhash");
    
    // Get current balance
    let balance = rpc_client
        .get_balance(&keypair.pubkey())
        .expect("Failed to get balance");
    
    println!("Current balance: {} lamports", balance);
    
    // Build a mock transaction to calculate fee
    let message = Message::new_with_blockhash(
        &[transfer(&keypair.pubkey(), &to_pubkey, balance)],
        Some(&keypair.pubkey()),
        &recent_blockhash,
    );
    
    // Estimate transaction fee
    let fee = rpc_client
        .get_fee_for_message(&message)
        .expect("Failed to get fee calculator");
    
    println!("Estimated fee: {} lamports", fee);
    println!("Amount to transfer: {} lamports", balance - fee);
    
    // Create final transaction with balance minus fee
    let transaction = Transaction::new_signed_with_payer(
        &[transfer(&keypair.pubkey(), &to_pubkey, balance - fee)],
        Some(&keypair.pubkey()),
        &vec![&keypair],
        recent_blockhash,
    );
    
    // Send transaction and verify
    let signature = rpc_client
        .send_and_confirm_transaction(&transaction)
        .expect("Failed to send final transaction");
    
    println!(
        "Success! Entire balance transferred: https://explorer.solana.com/tx/{}/?cluster=devnet",
        signature
    );
}