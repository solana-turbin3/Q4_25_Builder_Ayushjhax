use crate::{
    error::CustomError, Collateral, Config, GOLD_FEED_ID, SOL_FEED_ID, MAXIMUM_AGE, PRICE_FEED_DECIMAL_ADJUSTMENT,
};
use anchor_lang::{prelude::*, solana_program::native_token::LAMPORTS_PER_SOL};
use pyth_solana_receiver_sdk::price_update::{get_feed_id_from_hex, PriceUpdateV2};

// Check health factor for Collateral account is greater than minimum required health factor
pub fn check_health_factor(
    collateral: &Account<Collateral>,
    config: &Account<Config>,
    gold_price_feed: &Account<PriceUpdateV2>,
    sol_price_feed: &Account<PriceUpdateV2>,
) -> Result<()> {
    let health_factor = calculate_health_factor(collateral, config, gold_price_feed, sol_price_feed)?;
    require!(
        health_factor >= config.min_health_factor,
        CustomError::BelowMinimumHealthFactor
    );
    Ok(())
}

// Calcuate health factor for a given Collateral account
pub fn calculate_health_factor(
    collateral: &Account<Collateral>,
    config: &Account<Config>,
    gold_price_feed: &Account<PriceUpdateV2>,
    sol_price_feed: &Account<PriceUpdateV2>,
) -> Result<u64> {
    // Get the SOL value in USD first
    let sol_value_in_usd = get_sol_usd_value(&collateral.lamport_balance, sol_price_feed)?;
    
    // Convert SOL USD value to GOLD value using GOLD/USD price
    let collateral_value_in_gold = get_gold_value_from_usd(&sol_value_in_usd, gold_price_feed, sol_price_feed)?;

    msg!(
        "Minted Amount : {:.9}",
        collateral.amount_minted as f64 / 1e9
    );

    if collateral.amount_minted == 0 {
        msg!("Health Factor Max");
        return Ok(u64::MAX);
    }

    // Calculate the health factor: collateral_value / amount_minted
    // This represents how much collateral value exists per unit of minted tokens
    let health_factor = collateral_value_in_gold / collateral.amount_minted;

    msg!("Health Factor : {}", health_factor);
    Ok(health_factor)
}

// Get SOL value in USD using SOL/USD price feed
fn get_sol_usd_value(amount_in_lamports: &u64, sol_price_feed: &Account<PriceUpdateV2>) -> Result<u64> {
    let sol_feed_id = get_feed_id_from_hex(SOL_FEED_ID)
        .map_err(|e| {
            msg!("Error parsing SOL feed ID: {:?}", e);
            anchor_lang::error::Error::from(ProgramError::InvalidArgument)
        })?;

    let sol_price = sol_price_feed
        .get_price_no_older_than(&Clock::get()?, MAXIMUM_AGE, &sol_feed_id)
        .map_err(|e| {
            msg!("Error getting SOL price: {:?}", e);
            anchor_lang::error::Error::from(ProgramError::InvalidArgument)
        })?;

    // Check price is positive
    require!(sol_price.price > 0, CustomError::InvalidPrice);

    // Calculate actual SOL price using Pyth's price * 10^exponent format
    let _actual_sol_price = (sol_price.price as f64) * (10.0_f64.powi(sol_price.exponent as i32));

    // Maintain 1e9 precision by scaling Pyth's 1e8 price by 10
    let sol_price_in_usd = (sol_price.price as i128 * PRICE_FEED_DECIMAL_ADJUSTMENT as i128) as u128;

    // Calculate USD value of SOL
    let sol_value_in_usd = (*amount_in_lamports as u128 * sol_price_in_usd) / (LAMPORTS_PER_SOL as u128);

    Ok(sol_value_in_usd as u64)
}

// Convert USD value to GOLD value using GOLD/USD price feed
fn get_gold_value_from_usd(usd_amount: &u64, gold_price_feed: &Account<PriceUpdateV2>, sol_price_feed: &Account<PriceUpdateV2>) -> Result<u64> {
    let gold_feed_id = get_feed_id_from_hex(GOLD_FEED_ID)
        .map_err(|e| {
            msg!("Error parsing GOLD feed ID: {:?}", e);
            anchor_lang::error::Error::from(ProgramError::InvalidArgument)
        })?;

    let gold_price = gold_price_feed
        .get_price_no_older_than(&Clock::get()?, MAXIMUM_AGE, &gold_feed_id)
        .map_err(|e| {
            msg!("Error getting GOLD price: {:?}", e);
            anchor_lang::error::Error::from(ProgramError::InvalidArgument)
        })?;

    // Check price is positive
    require!(gold_price.price > 0, CustomError::InvalidPrice);

    // Calculate actual GOLD price using Pyth's price * 10^exponent format
    let actual_gold_price = (gold_price.price as f64) * (10.0_f64.powi(gold_price.exponent as i32));

    // Maintain 1e9 precision by scaling Pyth's 1e8 price by 10
    let _gold_price_in_usd = (gold_price.price as i128 * PRICE_FEED_DECIMAL_ADJUSTMENT as i128) as u128;

    // Calculate GOLD value from USD amount
    // usd_amount is in 1e9 units (USD * 1e9)
    // gold_price_in_usd is in 1e9 units (price * 1e9)
    // We want: (USD / price) in 1e9 units
    // Formula: (USD * 1e9) / (price * 1e9) = USD / price
    // Result should be in 1e9 units: (USD * 1e9) / price
    // Calculate GOLD value: (USD * 1e9) / (GOLD_price_in_USD)
    // Since both are in 1e9 units, result is in 1e9 units
    // Formula: (USD * 1e9) / (GOLD_price * 1e9) = USD / GOLD_price
    // Result should be in 1e9 units: (USD * 1e9) / GOLD_price
    // Calculate GOLD value: USD / GOLD_price in 1e9 units
    // Both usd_amount and gold_price_in_usd are in 1e9 units
    // Result: (USD * 1e9) / (GOLD_price * 1e9) = USD / GOLD_price in 1e9 units
    // Calculate GOLD value using floating point for precision, then convert back
    // This avoids division by zero issues and handles small prices correctly
    let usd_amount_f64 = *usd_amount as f64 / 1e9;
    let gold_price_f64 = gold_price.price as f64 * (10.0_f64.powi(gold_price.exponent as i32));
    let gold_value_f64 = usd_amount_f64 / gold_price_f64;
    let gold_value = (gold_value_f64 * 1e9) as u64;

    // Convert USD amount to SOL equivalent for logging
    // Get SOL price and calculate SOL equivalent of USD amount
    let sol_feed_id = get_feed_id_from_hex(SOL_FEED_ID)
        .map_err(|e| {
            msg!("Error parsing SOL feed ID: {:?}", e);
            anchor_lang::error::Error::from(ProgramError::InvalidArgument)
        })?;

    let sol_price = sol_price_feed
        .get_price_no_older_than(&Clock::get()?, MAXIMUM_AGE, &sol_feed_id)
        .map_err(|e| {
            msg!("Error getting SOL price: {:?}", e);
            anchor_lang::error::Error::from(ProgramError::InvalidArgument)
        })?;

    require!(sol_price.price > 0, CustomError::InvalidPrice);
    let sol_price_f64 = (sol_price.price as f64) * (10.0_f64.powi(sol_price.exponent as i32));
    let usd_amount_f64 = *usd_amount as f64 / 1e9;
    let usd_in_sol = usd_amount_f64 / sol_price_f64;
    
    // Convert GOLD value to SOL equivalent for logging
    let gold_to_sol_lamports = get_lamports_from_gold(&(gold_value as u64), gold_price_feed, sol_price_feed)?;

    msg!("*** USD TO GOLD CONVERSION ***");
    msg!("GOLD/USD Price : {:.2}", actual_gold_price);
    msg!("SOL/USD Price  : {:.2}", sol_price_f64);
    msg!("USD Amount     : {:.2}", *usd_amount as f64 / 1e9);
    msg!("USD in SOL     : {:.9}", usd_in_sol);
    msg!("GOLD Value     : {:.6}", gold_value as f64 / 1e9);
    msg!("GOLD in SOL    : {:.9}", gold_to_sol_lamports as f64 / 1e9);

    Ok(gold_value as u64)
}

// Given GOLD amount, return lamports based on GOLD/USD and SOL/USD feeds
pub fn get_lamports_from_gold(
    amount_in_gold: &u64,
    gold_price_feed: &Account<PriceUpdateV2>,
    sol_price_feed: &Account<PriceUpdateV2>,
) -> Result<u64> {
    // Convert GOLD to USD first
    let gold_feed_id = get_feed_id_from_hex(GOLD_FEED_ID)
        .map_err(|_| anchor_lang::error::Error::from(ProgramError::InvalidArgument))?;

    let gold_price = gold_price_feed
        .get_price_no_older_than(&Clock::get()?, MAXIMUM_AGE, &gold_feed_id)
        .map_err(|_| anchor_lang::error::Error::from(ProgramError::InvalidArgument))?;

    require!(gold_price.price > 0, CustomError::InvalidPrice);

    let actual_gold_price = (gold_price.price as f64) * (10.0_f64.powi(gold_price.exponent as i32));
    let gold_price_in_usd = (gold_price.price as i128 * PRICE_FEED_DECIMAL_ADJUSTMENT as i128) as u128;

    // Convert GOLD to USD
    let usd_value = (*amount_in_gold as u128 * gold_price_in_usd) / (LAMPORTS_PER_SOL as u128);

    // Convert USD to SOL lamports
    let sol_feed_id = get_feed_id_from_hex(SOL_FEED_ID)
        .map_err(|_| anchor_lang::error::Error::from(ProgramError::InvalidArgument))?;

    let sol_price = sol_price_feed
        .get_price_no_older_than(&Clock::get()?, MAXIMUM_AGE, &sol_feed_id)
        .map_err(|_| anchor_lang::error::Error::from(ProgramError::InvalidArgument))?;

    require!(sol_price.price > 0, CustomError::InvalidPrice);

    let actual_sol_price = (sol_price.price as f64) * (10.0_f64.powi(sol_price.exponent as i32));
    let sol_price_in_usd = (sol_price.price as i128 * PRICE_FEED_DECIMAL_ADJUSTMENT as i128) as u128;

    // Convert USD to SOL lamports
    let amount_in_lamports = (usd_value * (LAMPORTS_PER_SOL as u128)) / sol_price_in_usd;

    // Removed logging to clean up output

    Ok(amount_in_lamports as u64)
}
