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
pub struct WithdrawTokens<'info> {
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
        mut,
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

pub fn process_withdraw_tokens(ctx: Context<WithdrawTokens>, amount: u64) -> Result<()> {
    msg!("Instruction: WithdrawTokens");
    
    let clock = Clock::get()?;
    msg!("Withdraw Amount: {:.9}", amount as f64 / 1e9);

    // Store values needed for transfer before creating mutable borrows
    let pool_bump = ctx.accounts.lending_pool.bump;
    let lending_pool_info = ctx.accounts.lending_pool.to_account_info();
    
    let lending_pool = &mut ctx.accounts.lending_pool;
    let lender_position = &mut ctx.accounts.lender_position;
    let borrower_position = &mut ctx.accounts.borrower_position;

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

    // Initialize lender position if needed
    if lender_position.last_update_slot == 0 {
        lender_position.lender = ctx.accounts.lender.key();
        lender_position.amount_supplied = 0;
        lender_position.accumulated_interest = 0;
        lender_position.last_update_slot = clock.slot;
        lender_position.bump = ctx.bumps.lender_position;
    }

    // Initialize borrower position if needed
    if borrower_position.last_update_slot == 0 {
        borrower_position.borrower = ctx.accounts.lender.key();
        borrower_position.amount_borrowed = 0;
        borrower_position.amount_supplied = 0;
        borrower_position.accumulated_interest = 0;
        borrower_position.last_update_slot = clock.slot;
        borrower_position.bump = ctx.bumps.borrower_position;
    }
    
    // Update pool interest rates (this mutates lending_pool)
    crate::instructions::lending::utils::update_lending_pool(lending_pool)?;

    // Update lender position interest
    let interest = crate::instructions::lending::utils::calculate_lender_interest(
        lender_position,
        lending_pool,
    )?;
    lender_position.accumulated_interest = interest;
    lender_position.last_update_slot = clock.slot;

    // Update borrower position interest
    let borrower_interest = crate::instructions::lending::utils::calculate_borrower_interest(
        borrower_position,
        lending_pool,
    )?;
    borrower_position.accumulated_interest = borrower_interest;
    borrower_position.last_update_slot = clock.slot;

    // Calculate available balance (supplied + interest - borrowed debt)
    let total_debt = borrower_position.amount_borrowed + borrower_position.accumulated_interest;
    let available_balance = lender_position.amount_supplied
        + lender_position.accumulated_interest
        - total_debt;

    msg!("Lender Position - Supplied: {:.9}, Interest: {:.9}, Total: {:.9}",
         lender_position.amount_supplied as f64 / 1e9,
         lender_position.accumulated_interest as f64 / 1e9,
         (lender_position.amount_supplied + lender_position.accumulated_interest) as f64 / 1e9);
    msg!("Borrower Debt - Principal: {:.9}, Interest: {:.9}, Total: {:.9}",
         borrower_position.amount_borrowed as f64 / 1e9,
         borrower_position.accumulated_interest as f64 / 1e9,
         total_debt as f64 / 1e9);
    msg!("Available Balance: {:.9}", available_balance as f64 / 1e9);

    require!(
        amount <= available_balance,
        crate::error::CustomError::InsufficientFunds
    );

    // Check pool has enough liquidity
    msg!("Pool Liquidity Check - Total Supplied: {:.9}, Requested: {:.9}",
         lending_pool.total_supplied as f64 / 1e9,
         amount as f64 / 1e9);
    
    require!(
        lending_pool.total_supplied >= amount,
        crate::error::CustomError::InsufficientFunds
    );
    
    // Update amounts - first reduce from interest, then from principal
    let interest_withdrawal = if amount > lender_position.accumulated_interest {
        lender_position.accumulated_interest
    } else {
        amount
    };
    let principal_withdrawal = amount - interest_withdrawal;

    let previous_supplied = lender_position.amount_supplied;
    let previous_interest = lender_position.accumulated_interest;
    
    lender_position.accumulated_interest -= interest_withdrawal;
    lender_position.amount_supplied -= principal_withdrawal;
    borrower_position.amount_supplied -= principal_withdrawal;
    lending_pool.total_supplied -= amount;

    msg!("Withdrawal Breakdown - Interest: {:.9}, Principal: {:.9}",
         interest_withdrawal as f64 / 1e9,
         principal_withdrawal as f64 / 1e9);
    msg!("Lender Position Updated - Previous Supplied: {:.9}, New Supplied: {:.9}",
         previous_supplied as f64 / 1e9,
         lender_position.amount_supplied as f64 / 1e9);
    msg!("Lender Interest Updated - Previous: {:.9}, New: {:.9}",
         previous_interest as f64 / 1e9,
         lender_position.accumulated_interest as f64 / 1e9);

    // Transfer tokens from pool vault to lender
    msg!("Transferring tokens from pool vault to lender...");
    let signer_seeds: &[&[&[u8]]] = &[&[SEED_LENDING_POOL, &[pool_bump]]];

    transfer_checked(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            TransferChecked {
                from: ctx.accounts.lending_pool_vault.to_account_info(),
                mint: ctx.accounts.mint_account.to_account_info(),
                to: ctx.accounts.lender_token_account.to_account_info(),
                authority: lending_pool_info,
            },
            signer_seeds,
        ),
        amount,
        ctx.accounts.mint_account.decimals,
    )?;

    msg!("=== WITHDRAW COMPLETE ===");
    msg!("Withdrew: {:.9} tokens", amount as f64 / 1e9);
    msg!("Lender Remaining Supplied: {:.9}", lender_position.amount_supplied as f64 / 1e9);
    msg!("Lender Remaining Interest: {:.9}", lender_position.accumulated_interest as f64 / 1e9);
    msg!("Total Pool Supplied: {:.9}", lending_pool.total_supplied as f64 / 1e9);
    msg!("Remaining Available Balance: {:.9}",
         (lender_position.amount_supplied + lender_position.accumulated_interest - 
          (borrower_position.amount_borrowed + borrower_position.accumulated_interest)) as f64 / 1e9);

    Ok(())
}

