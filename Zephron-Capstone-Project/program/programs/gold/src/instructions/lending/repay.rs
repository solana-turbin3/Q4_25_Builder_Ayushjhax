use crate::{
    BorrowerPosition, Config, LendingPool, SEED_BORROWER_POSITION, SEED_CONFIG_ACCOUNT,
    SEED_LENDING_POOL,
};
use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token_interface::{burn, Burn, Mint, Token2022, TokenAccount},
};

#[derive(Accounts)]
pub struct RepayTokens<'info> {
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

    #[account(mut)]
    pub borrower_token_account: InterfaceAccount<'info, TokenAccount>,

    pub token_program: Program<'info, Token2022>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

pub fn process_repay_tokens(ctx: Context<RepayTokens>, amount: u64) -> Result<()> {
    msg!("Instruction: RepayTokens");
    
    let lending_pool = &mut ctx.accounts.lending_pool;
    let borrower_position = &mut ctx.accounts.borrower_position;
    let clock = Clock::get()?;

    msg!("Repay Amount: {:.9}", amount as f64 / 1e9);

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
    let interest = crate::instructions::lending::utils::calculate_borrower_interest(
        borrower_position,
        lending_pool,
    )?;
    borrower_position.accumulated_interest = interest;
    borrower_position.last_update_slot = clock.slot;

    // Calculate total debt
    let total_debt = borrower_position.amount_borrowed + borrower_position.accumulated_interest;
    msg!("Borrower Debt - Principal: {:.9}, Interest: {:.9}, Total: {:.9}",
         borrower_position.amount_borrowed as f64 / 1e9,
         borrower_position.accumulated_interest as f64 / 1e9,
         total_debt as f64 / 1e9);
    
    let repay_amount = if amount > total_debt {
        total_debt
    } else {
        amount
    };
    
    msg!("Repay Amount (capped at total debt): {:.9}", repay_amount as f64 / 1e9);

    // First pay accumulated interest, then principal
    let interest_payment = if repay_amount > borrower_position.accumulated_interest {
        borrower_position.accumulated_interest
    } else {
        repay_amount
    };
    let principal_payment = repay_amount - interest_payment;
    
    msg!("Repayment Breakdown - Interest: {:.9}, Principal: {:.9}",
         interest_payment as f64 / 1e9,
         principal_payment as f64 / 1e9);

    // Update amounts
    let previous_borrowed = borrower_position.amount_borrowed;
    let previous_interest = borrower_position.accumulated_interest;
    borrower_position.accumulated_interest -= interest_payment;
    borrower_position.amount_borrowed -= principal_payment;
    lending_pool.total_borrowed -= principal_payment;

    msg!("Borrower Position Updated - Previous Borrowed: {:.9}, New Borrowed: {:.9}",
         previous_borrowed as f64 / 1e9,
         borrower_position.amount_borrowed as f64 / 1e9);
    msg!("Borrower Interest Updated - Previous: {:.9}, New: {:.9}",
         previous_interest as f64 / 1e9,
         borrower_position.accumulated_interest as f64 / 1e9);

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

    // Burn tokens from borrower
    msg!("Burning tokens from borrower...");
    burn(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Burn {
                mint: ctx.accounts.mint_account.to_account_info(),
                from: ctx.accounts.borrower_token_account.to_account_info(),
                authority: ctx.accounts.borrower.to_account_info(),
            },
        ),
        repay_amount,
    )?;

    let remaining_debt = borrower_position.amount_borrowed + borrower_position.accumulated_interest;
    msg!("=== REPAY COMPLETE ===");
    msg!("Repaid: {:.9} tokens (Interest: {:.9}, Principal: {:.9})",
         repay_amount as f64 / 1e9,
         interest_payment as f64 / 1e9,
         principal_payment as f64 / 1e9);
    msg!("Remaining Debt: {:.9} (Principal: {:.9}, Interest: {:.9})",
         remaining_debt as f64 / 1e9,
         borrower_position.amount_borrowed as f64 / 1e9,
         borrower_position.accumulated_interest as f64 / 1e9);
    msg!("Total Pool Borrowed: {:.9}", lending_pool.total_borrowed as f64 / 1e9);

    Ok(())
}

