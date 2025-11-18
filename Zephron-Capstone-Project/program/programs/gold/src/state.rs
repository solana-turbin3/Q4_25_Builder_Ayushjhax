use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace, Debug)]
pub struct Collateral {
    pub depositor: Pubkey,     // depositor wallet address
    pub sol_account: Pubkey,   // depositor pda collateral account (deposit SOL to this account)
    pub token_account: Pubkey, // depositor ata token account (mint stablecoins to this account)
    pub lamport_balance: u64, // current lamport balance of depositor sol_account (for health check calculation)
    pub amount_minted: u64, // current amount stablecoins minted, base unit adjusted for decimal precision (for health check calculation)
    pub bump: u8,           // store bump seed for this collateral account PDA
    pub bump_sol_account: u8, // store bump seed for the  sol_account PDA
    pub is_initialized: bool, // indicate if account data has already been initialized (for check to prevent overriding certain fields)
}

#[account]
#[derive(InitSpace, Debug)]
pub struct Config {
    pub authority: Pubkey,          // authority of the this program config account
    pub mint_account: Pubkey,       // the stablecoin mint address, which is a PDA
    pub liquidation_threshold: u64, // determines how much extra collateral is required
    pub liquidation_bonus: u64,     // % bonus lamports to liquidator for liquidating an account
    pub min_health_factor: u64, // minimum health factor, if below min then Collateral account can be liquidated
    pub bump: u8,               // store bump seed for this config account
    pub bump_mint_account: u8,  // store bump seed for the stablecoin mint account PDA
}

#[account]
#[derive(InitSpace, Debug)]
pub struct LendingPool {
    pub total_supplied: u64,        // total amount of tokens supplied to the pool
    pub total_borrowed: u64,        // total amount of tokens borrowed from the pool
    pub last_update_slot: u64,      // last slot when interest was calculated
    pub supply_rate: u64,           // annual supply interest rate (basis points, e.g., 500 = 5%)
    pub borrow_rate: u64,           // annual borrow interest rate (basis points, e.g., 1000 = 10%)
    pub utilization_rate: u64,     // current utilization rate (basis points)
    pub bump: u8,                   // bump seed for the lending pool PDA
}

#[account]
#[derive(InitSpace, Debug)]
pub struct LenderPosition {
    pub lender: Pubkey,             // lender's wallet address
    pub amount_supplied: u64,       // amount of tokens supplied by this lender
    pub accumulated_interest: u64,  // accumulated interest earned
    pub last_update_slot: u64,      // last slot when interest was calculated
    pub bump: u8,                   // bump seed for the lender position PDA
}

#[account]
#[derive(InitSpace, Debug)]
pub struct BorrowerPosition {
    pub borrower: Pubkey,           // borrower's wallet address
    pub amount_borrowed: u64,       // amount of tokens borrowed
    pub amount_supplied: u64,       // amount of tokens supplied as collateral
    pub accumulated_interest: u64,  // accumulated interest owed
    pub last_update_slot: u64,      // last slot when interest was calculated
    pub bump: u8,                   // bump seed for the borrower position PDA
}
