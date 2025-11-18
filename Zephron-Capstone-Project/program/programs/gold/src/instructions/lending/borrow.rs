use crate::{
    BorrowerPosition, Config, LendingPool, SEED_BORROWER_POSITION, SEED_CONFIG_ACCOUNT,
    SEED_LENDING_POOL,
};
use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token_interface::{mint_to, Mint, MintTo, Token2022, TokenAccount},
};

#[derive(Accounts)]
pub struct BorrowTokens<'info> {
    #[account(mut)]
    pub borrower: Signer<'info>,

    #[account(
        seeds = [SEED_CONFIG_ACCOUNT],
        bump = config_account.bump,
        has_one = mint_account
    )]
    pub config_account: Box<Account<'info, Config>>,

    #[account(
        init_if_needed,
        payer = borrower,
        space = 8 + LendingPool::INIT_SPACE,
        seeds = [SEED_LENDING_POOL],
        bump,
    )]
    pub lending_pool: Account<'info, LendingPool>,

    #[account(
        init_if_needed,
        payer = borrower,
        space = 8 + BorrowerPosition::INIT_SPACE,
        seeds = [SEED_BORROWER_POSITION, borrower.key().as_ref()],
        bump,
    )]
    pub borrower_position: Account<'info, BorrowerPosition>,

    #[account(mut)]
    pub mint_account: InterfaceAccount<'info, Mint>,

    #[account(
        init_if_needed,
        payer = borrower,
        associated_token::mint = mint_account,
        associated_token::authority = borrower,
        associated_token::token_program = token_program
    )]
    pub borrower_token_account: InterfaceAccount<'info, TokenAccount>,

    pub token_program: Program<'info, Token2022>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

pub fn process_borrow_tokens(ctx: Context<BorrowTokens>, amount: u64) -> Result<()> {
    msg!("Instruction: BorrowTokens");
    
    let lending_pool = &mut ctx.accounts.lending_pool;
    let borrower_position = &mut ctx.accounts.borrower_position;
    let clock = Clock::get()?;

    msg!("Borrow Amount: {:.9}", amount as f64 / 1e9);

    // Initialize lending pool if needed
    if lending_pool.last_update_slot == 0 {
        lending_pool.total_supplied = 0;
        lending_pool.total_borrowed = 0;
        lending_pool.last_update_slot = clock.slot;
        lending_pool.supply_rate = 0;
        lending_pool.borrow_rate = 0;
        lending_pool.utilization_rate = 0;
        lending_pool.bump = ctx.bumps.lending_pool;
    }

    // Initialize borrower position if needed
    if borrower_position.last_update_slot == 0 {
        borrower_position.borrower = ctx.accounts.borrower.key();
        borrower_position.amount_borrowed = 0;
        borrower_position.amount_supplied = 0;
        borrower_position.accumulated_interest = 0;
        borrower_position.last_update_slot = clock.slot;
        borrower_position.bump = ctx.bumps.borrower_position;
    }

    // Update pool interest rates
    crate::instructions::lending::utils::update_lending_pool(lending_pool)?;

    // Update borrower position interest
    let previous_interest = borrower_position.accumulated_interest;
    let interest = crate::instructions::lending::utils::calculate_borrower_interest(
        borrower_position,
        lending_pool,
    )?;
    borrower_position.accumulated_interest = interest;
    borrower_position.last_update_slot = clock.slot;
    
    msg!("Borrower Interest Accrued: {:.9} (Previous: {:.9})",
         interest as f64 / 1e9,
         previous_interest as f64 / 1e9);
    msg!("Borrower Position - Supplied: {:.9}, Borrowed: {:.9}, Interest: {:.9}",
         borrower_position.amount_supplied as f64 / 1e9,
         borrower_position.amount_borrowed as f64 / 1e9,
         borrower_position.accumulated_interest as f64 / 1e9);

    // Check borrow capacity
    let total_borrowable = (borrower_position.amount_supplied * crate::COLLATERAL_FACTOR) / crate::BASIS_POINTS;
    let total_debt = borrower_position.amount_borrowed + borrower_position.accumulated_interest;
    msg!("Borrow Capacity Check - Total Borrowable: {:.9}, Current Debt: {:.9}, Requested: {:.9}",
         total_borrowable as f64 / 1e9,
         total_debt as f64 / 1e9,
         amount as f64 / 1e9);
    
    crate::instructions::lending::utils::check_borrow_capacity(borrower_position, amount)?;

    // Check pool has enough liquidity
    let available_liquidity = lending_pool.total_supplied.saturating_sub(lending_pool.total_borrowed);
    msg!("Pool Liquidity Check - Total Supplied: {:.9}, Total Borrowed: {:.9}, Available: {:.9}",
         lending_pool.total_supplied as f64 / 1e9,
         lending_pool.total_borrowed as f64 / 1e9,
         available_liquidity as f64 / 1e9);
    
    require!(
        lending_pool.total_supplied >= lending_pool.total_borrowed + amount,
        crate::error::CustomError::InsufficientFunds
    );

    // Update amounts
    let previous_borrowed = borrower_position.amount_borrowed;
    borrower_position.amount_borrowed += amount;
    lending_pool.total_borrowed += amount;

    msg!("Borrower Position Updated - Previous Borrowed: {:.9}, New Borrowed: {:.9}",
         previous_borrowed as f64 / 1e9,
         borrower_position.amount_borrowed as f64 / 1e9);

    // Update utilization and rates
    let (supply_rate, borrow_rate) =
        crate::instructions::lending::utils::calculate_interest_rates(
            lending_pool.total_supplied,
            lending_pool.total_borrowed,
        )?;
    lending_pool.supply_rate = supply_rate;
    lending_pool.borrow_rate = borrow_rate;
    lending_pool.utilization_rate = if lending_pool.total_supplied > 0 {
        (lending_pool.total_borrowed * crate::BASIS_POINTS) / lending_pool.total_supplied
    } else {
        0
    };
    
    msg!("Updated Pool Rates - Supply: {} bp, Borrow: {} bp, Utilization: {} bp",
         lending_pool.supply_rate,
         lending_pool.borrow_rate,
         lending_pool.utilization_rate);

    // Mint tokens to borrower
    msg!("Minting tokens to borrower...");
    let signer_seeds: &[&[&[u8]]] = &[&[
        crate::SEED_MINT_ACCOUNT,
        &[ctx.accounts.config_account.bump_mint_account],
    ]];

    mint_to(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            MintTo {
                mint: ctx.accounts.mint_account.to_account_info(),
                to: ctx.accounts.borrower_token_account.to_account_info(),
                authority: ctx.accounts.mint_account.to_account_info(),
            },
            signer_seeds,
        ),
        amount,
    )?;

    msg!("=== BORROW COMPLETE ===");
    msg!("Borrowed: {:.9} tokens", amount as f64 / 1e9);
    msg!("Total Pool Borrowed: {:.9}", lending_pool.total_borrowed as f64 / 1e9);
    msg!("Borrower Total Borrowed: {:.9}", borrower_position.amount_borrowed as f64 / 1e9);
    msg!("Borrower Total Debt (Principal + Interest): {:.9}",
         (borrower_position.amount_borrowed + borrower_position.accumulated_interest) as f64 / 1e9);

    Ok(())
}

