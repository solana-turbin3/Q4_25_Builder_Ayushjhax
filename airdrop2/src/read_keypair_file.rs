use solana_client::rpc_client::RpcClient;
use solana_system_interface::instruction::transfer;
use solana_sdk::{
    message::Message,
    pubkey::Pubkey,
    signature::{Signer, read_keypair_file},
    transaction::Transaction,
};
use std::str::FromStr;

const RPC_URL: &str = "https://api.devnet.solana.com";

#[test]
fn claim_airdrop() {
    let keypair = read_keypair_file("dev-wallet.json")
        .expect("Couldn't find wallet file");
    
    let client = RpcClient::new(RPC_URL);
    
    match client.request_airdrop(&keypair.pubkey(), 500_000_000u64) {
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
    let keypair = read_keypair_file("dev-wallet.json").expect("Couldn't find wallet file");
    
    let pubkey = keypair.pubkey();
    let message_bytes = b"I verify my Solana Keypair!";
    let sig = keypair.sign_message(message_bytes);
    
    match sig.verify(pubkey.as_ref(), message_bytes) {
        true => println!("Signature verified"),
        false => println!("Verification failed"),
    }
    
    let to_pubkey = Pubkey::from_str("JCsFjtj6tem9Dv83Ks4HxsL7p8GhdLtokveqW7uWjGyi").unwrap();
    
    let rpc_client = RpcClient::new(RPC_URL);
    
    let recent_blockhash = rpc_client
        .get_latest_blockhash()
        .expect("Failed to get recent blockhash");
    
    let transaction = Transaction::new_signed_with_payer(
        &[transfer(&keypair.pubkey(), &to_pubkey, 100_000_000)],
        Some(&keypair.pubkey()),
        &vec![&keypair],
        recent_blockhash,
    );
    
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
    let keypair = read_keypair_file("dev-wallet.json").expect("Couldn't find wallet file");
    
    let to_pubkey = Pubkey::from_str("JCsFjtj6tem9Dv83Ks4HxsL7p8GhdLtokveqW7uWjGyi").unwrap();
    
    let rpc_client = RpcClient::new(RPC_URL);
    
    let recent_blockhash = rpc_client
        .get_latest_blockhash()
        .expect("Failed to get recent blockhash");
    
    let balance = rpc_client
        .get_balance(&keypair.pubkey())
        .expect("Failed to get balance");
    
    println!("Current balance: {} lamports", balance);
    
    let message = Message::new_with_blockhash(
        &[transfer(&keypair.pubkey(), &to_pubkey, balance)],
        Some(&keypair.pubkey()),
        &recent_blockhash,
    );
    
    let fee = rpc_client
        .get_fee_for_message(&message)
        .expect("Failed to get fee calculator");
    
    println!("Estimated fee: {} lamports", fee);
    println!("Amount to transfer: {} lamports", balance - fee);
    
    let transaction = Transaction::new_signed_with_payer(
        &[transfer(&keypair.pubkey(), &to_pubkey, balance - fee)],
        Some(&keypair.pubkey()),
        &vec![&keypair],
        recent_blockhash,
    );
    
    let signature = rpc_client
        .send_and_confirm_transaction(&transaction)
        .expect("Failed to send final transaction");
    
    println!(
        "Success! Entire balance transferred: https://explorer.solana.com/tx/{}/?cluster=devnet",
        signature
    );
}