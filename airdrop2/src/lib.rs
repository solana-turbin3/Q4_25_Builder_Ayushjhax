mod keygen;
mod wallet_to_base58;
mod read_keypair_file;
mod submit;

pub use submit::submit_transaction;

#[cfg(test)]
mod tests {
#[test]
fn keygen() {}
#[test]
fn claim_airdrop() {}
#[test]
fn transfer_sol() {}
#[test]
fn submit_transaction() {
    use super::submit_transaction;
    submit_transaction();
}
}
