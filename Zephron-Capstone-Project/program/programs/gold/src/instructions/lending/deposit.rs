use crate::{
    BorrowerPosition, LenderPosition, LendingPool, SEED_BORROWER_POSITION,
    SEED_LENDER_POSITION, SEED_LENDING_POOL,
};
use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token_interface::{transfer_checked, Mint, Token2022, TokenAccount, TransferChecked},
};

#[derive(Accounts)]
pub struct DepositTokens<'info> {
    #[account(mut)]
    pub lender: Signer<'info>,

    #[account(
        init_if_needed,
        payer = lender,
        space = 8 + LendingPool::INIT_SPACE,
        seeds = [SEED_LENDING_POOL],
        bump,
    )]
    pub lending_pool: Account<'info, LendingPool>,

    #[account(
        init_if_needed,
        payer = lender,
        space = 8 + LenderPosition::INIT_SPACE,
        seeds = [SEED_LENDER_POSITION, lender.key().as_ref()],
        bump,
    )]
    pub lender_position: Account<'info, LenderPosition>,

    #[account(
        init_if_needed,
        payer = lender,
        space = 8 + BorrowerPosition::INIT_SPACE,
        seeds = [SEED_BORROWER_POSITION, lender.key().as_ref()],
        bump,
    )]
    pub borrower_position: Account<'info, BorrowerPosition>,

    #[account(mut)]
    pub mint_account: InterfaceAccount<'info, Mint>,

    #[account(mut)]
    pub lender_token_account: InterfaceAccount<'info, TokenAccount>,

    #[account(
        init_if_needed,
        payer = lender,
        seeds = [SEED_LENDING_POOL, mint_account.key().as_ref()],
        bump,
        token::mint = mint_account,
        token::authority = lending_pool,
    )]
    pub lending_pool_vault: InterfaceAccount<'info, TokenAccount>,

    pub token_program: Program<'info, Token2022>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

pub fn process_deposit_tokens(ctx: Context<DepositTokens>, amount: u64) -> Result<()> {
    msg!("Instruction: DepositTokens");
    
    let lending_pool = &mut ctx.accounts.lending_pool;
    let lender_position = &mut ctx.accounts.lender_position;
    let borrower_position = &mut ctx.accounts.borrower_position;
    let clock = Clock::get()?;

    msg!("Deposit Amount: {:.9}", amount as f64 / 1e9);

    // Initialize lending pool if needed
    if lending_pool.last_update_slot == 0 {
        msg!("Initializing lending pool...");
        lending_pool.total_supplied = 0;
        lending_pool.total_borrowed = 0;
        lending_pool.last_update_slot = clock.slot;
        lending_pool.supply_rate = 0;
        lending_pool.borrow_rate = 0;
        lending_pool.utilization_rate = 0;
        lending_pool.bump = ctx.bumps.lending_pool;
    }

    // Update pool interest rates
    crate::instructions::lending::utils::update_lending_pool(lending_pool)?;
    
    msg!("Pool State - Total Supplied: {:.9}, Total Borrowed: {:.9}", 
         lending_pool.total_supplied as f64 / 1e9,
         lending_pool.total_borrowed as f64 / 1e9);
    msg!("Pool Rates - Supply: {} bp, Borrow: {} bp, Utilization: {} bp",
         lending_pool.supply_rate,
         lending_pool.borrow_rate,
         lending_pool.utilization_rate);

    // Initialize lender position if needed
    if lender_position.last_update_slot == 0 {
        msg!("Initializing lender position...");
        lender_position.lender = ctx.accounts.lender.key();
        lender_position.amount_supplied = 0;
        lender_position.accumulated_interest = 0;
        lender_position.last_update_slot = clock.slot;
        lender_position.bump = ctx.bumps.lender_position;
    } else {
        // Calculate and add accumulated interest
        let previous_interest = lender_position.accumulated_interest;
        let interest = crate::instructions::lending::utils::calculate_lender_interest(
            lender_position,
            lending_pool,
        )?;
        lender_position.accumulated_interest = interest;
        lender_position.last_update_slot = clock.slot;
        msg!("Lender Interest Accrued: {:.9} (Previous: {:.9})",
             interest as f64 / 1e9,
             previous_interest as f64 / 1e9);
    }

    // Initialize borrower position if needed (for potential borrowing)
    if borrower_position.last_update_slot == 0 {
        borrower_position.borrower = ctx.accounts.lender.key();
        borrower_position.amount_borrowed = 0;
        borrower_position.amount_supplied = 0;
        borrower_position.accumulated_interest = 0;
        borrower_position.last_update_slot = clock.slot;
        borrower_position.bump = ctx.bumps.borrower_position;
    } else {
        // Update borrower position interest
        let interest = crate::instructions::lending::utils::calculate_borrower_interest(
            borrower_position,
            lending_pool,
        )?;
        borrower_position.accumulated_interest = interest;
        borrower_position.last_update_slot = clock.slot;
    }

    // Update amounts
    let previous_supplied = lender_position.amount_supplied;
    lender_position.amount_supplied += amount;
    borrower_position.amount_supplied += amount;
    lending_pool.total_supplied += amount;

    msg!("Lender Position - Previous Supplied: {:.9}, New Supplied: {:.9}",
         previous_supplied as f64 / 1e9,
         lender_position.amount_supplied as f64 / 1e9);

    // Transfer tokens from lender to pool vault
    msg!("Transferring tokens to pool vault...");
    transfer_checked(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            TransferChecked {
                from: ctx.accounts.lender_token_account.to_account_info(),
                mint: ctx.accounts.mint_account.to_account_info(),
                to: ctx.accounts.lending_pool_vault.to_account_info(),
                authority: ctx.accounts.lender.to_account_info(),
            },
        ),
        amount,
        ctx.accounts.mint_account.decimals,
    )?;

    msg!("=== DEPOSIT COMPLETE ===");
    msg!("Deposited: {:.9} tokens", amount as f64 / 1e9);
    msg!("Total Pool Supplied: {:.9}", lending_pool.total_supplied as f64 / 1e9);
    msg!("Lender Total Supplied: {:.9}", lender_position.amount_supplied as f64 / 1e9);
    msg!("Lender Accumulated Interest: {:.9}", lender_position.accumulated_interest as f64 / 1e9);

    Ok(())
}

