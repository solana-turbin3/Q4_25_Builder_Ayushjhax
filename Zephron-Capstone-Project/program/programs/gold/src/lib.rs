use anchor_lang::prelude::*;
use constants::*;
use instructions::*;
use state::*;
mod constants;
mod error;
mod instructions;
mod state;

declare_id!("Hkb3K3f9FWtosSZwk9KRbV8izZ2hFEF9LgxSwVxvDFjL");

#[program]
pub mod gold {
    use super::*;

    pub fn initialize_config(ctx: Context<InitializeConfig>) -> Result<()> {
        process_initialize_config(ctx)
    }

    pub fn update_config(ctx: Context<UpdateConfig>, min_health_factor: u64) -> Result<()> {
        process_update_config(ctx, min_health_factor)
    }

    pub fn deposit_collateral_and_mint(
        ctx: Context<DepositCollateralAndMintTokens>,
        amount_collateral: u64,
        amount_to_mint: u64,
    ) -> Result<()> {
        process_deposit_collateral_and_mint_tokens(ctx, amount_collateral, amount_to_mint)
    }

    pub fn redeem_collateral_and_burn_tokens(
        ctx: Context<RedeemCollateralAndBurnTokens>,
        amount_collateral: u64,
        amount_to_burn: u64,
    ) -> Result<()> {
        process_redeem_collateral_and_burn_tokens(ctx, amount_collateral, amount_to_burn)
    }

    pub fn liquidate(ctx: Context<Liquidate>, amount_to_burn: u64) -> Result<()> {
        process_liquidate(ctx, amount_to_burn)
    }

    // Lending protocol functions
    pub fn deposit_tokens(ctx: Context<DepositTokens>, amount: u64) -> Result<()> {
        process_deposit_tokens(ctx, amount)
    }

    pub fn borrow_tokens(ctx: Context<BorrowTokens>, amount: u64) -> Result<()> {
        process_borrow_tokens(ctx, amount)
    }

    pub fn repay_tokens(ctx: Context<RepayTokens>, amount: u64) -> Result<()> {
        process_repay_tokens(ctx, amount)
    }

    pub fn withdraw_tokens(ctx: Context<WithdrawTokens>, amount: u64) -> Result<()> {
        process_withdraw_tokens(ctx, amount)
    }
}
