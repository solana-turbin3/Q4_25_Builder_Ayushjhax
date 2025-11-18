use anchor_lang::prelude::*;

pub const SEED_CONFIG_ACCOUNT: &[u8] = b"config";
pub const SEED_COLLATERAL_ACCOUNT: &[u8] = b"collateral";
pub const SEED_SOL_ACCOUNT: &[u8] = b"sol";
pub const SEED_MINT_ACCOUNT: &[u8] = b"mint";
pub const SEED_LENDING_POOL: &[u8] = b"lending_pool";
pub const SEED_LENDER_POSITION: &[u8] = b"lender_position";
pub const SEED_BORROWER_POSITION: &[u8] = b"borrower_position";

#[constant]
pub const GOLD_FEED_ID: &str = "0x765d2ba906dbc32ca17cc11f5310a89e9ee1f6420508c63861f2f8ba4ee34bb2";
pub const SOL_FEED_ID: &str = "0xef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d";
pub const MAXIMUM_AGE: u64 = 7200; // allow pricefeed 2 hours old to avoid stale price errors in tests
pub const PRICE_FEED_DECIMAL_ADJUSTMENT: u128 = 10; // price feed returns 1e8, multiple by 10 to match lamports 10e9

// Constants for configuration values
pub const LIQUIDATION_THRESHOLD: u64 = 50; // 200% over-collateralized
pub const LIQUIDATION_BONUS: u64 = 10; // 10% bonus lamports when liquidating
pub const MIN_HEALTH_FACTOR: u64 = 1;
pub const MINT_DECIMALS: u8 = 9;


// GOLD Feed Id (PYTH): 0x765d2ba906dbc32ca17cc11f5310a89e9ee1f6420508c63861f2f8ba4ee34bb2

// Lending protocol constants
pub const SLOTS_PER_YEAR: u64 = 630_720_000; // Approximate slots per year (assuming ~400ms per slot)
pub const BASIS_POINTS: u64 = 10_000; // 100% in basis points
pub const MAX_UTILIZATION_RATE: u64 = 9_000; // 90% max utilization
pub const COLLATERAL_FACTOR: u64 = 7_500; // 75% collateral factor (can borrow up to 75% of supplied)