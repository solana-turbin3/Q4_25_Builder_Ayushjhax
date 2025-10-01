use solana_sdk::signature::{Keypair, Signer};

#[cfg(test)]
mod tests {
use super::*;

#[test]
fn keygen() {
let kp = Keypair::new();
println!("You've generated a new Solana wallet: {}\n", kp.pubkey());
println!("To save your wallet, copy and paste the following into a JSON file:");
println!("{:?}", kp.to_bytes());
}

}