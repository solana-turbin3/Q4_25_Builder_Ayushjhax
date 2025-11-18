use crate::{
    BorrowerPosition, LenderPosition, LendingPool, BASIS_POINTS, COLLATERAL_FACTOR,
    MAX_UTILIZATION_RATE, SLOTS_PER_YEAR,
};
use anchor_lang::prelude::*;

/// Calculate interest rates based on utilization
pub fn calculate_interest_rates(
    total_supplied: u64,
    total_borrowed: u64,
) -> Result<(u64, u64)> {
    if total_supplied == 0 {
        return Ok((0, 0));
    }

    let utilization_rate = (total_borrowed * BASIS_POINTS) / total_supplied;

    // Simple interest rate model: supply rate = borrow rate * utilization * 0.9
    // Borrow rate increases with utilization
    let borrow_rate = if utilization_rate < MAX_UTILIZATION_RATE {
        // Base rate + utilization-based rate
        // Base: 2%, Max at 90% utilization: 20%
        let base_rate = 200; // 2%
        let utilization_multiplier = (utilization_rate * 200) / MAX_UTILIZATION_RATE; // 0-200 basis points
        base_rate + utilization_multiplier
    } else {
        2000 // 20% max borrow rate
    };

    // Supply rate is 90% of borrow rate * utilization
    let supply_rate = (borrow_rate * utilization_rate * 90) / (BASIS_POINTS * 100);

    Ok((supply_rate, borrow_rate))
}

/// Update lending pool with current interest rates
pub fn update_lending_pool(pool: &mut Account<LendingPool>) -> Result<()> {
    let clock = Clock::get()?;
    let current_slot = clock.slot;

    if pool.last_update_slot < current_slot {
        let (supply_rate, borrow_rate) = calculate_interest_rates(pool.total_supplied, pool.total_borrowed)?;
        pool.supply_rate = supply_rate;
        pool.borrow_rate = borrow_rate;
        pool.utilization_rate = if pool.total_supplied > 0 {
            (pool.total_borrowed * BASIS_POINTS) / pool.total_supplied
        } else {
            0
        };
        pool.last_update_slot = current_slot;
    }

    Ok(())
}

/// Calculate accumulated interest for a lender
pub fn calculate_lender_interest(
    lender_position: &Account<LenderPosition>,
    pool: &Account<LendingPool>,
) -> Result<u64> {
    if lender_position.amount_supplied == 0 {
        return Ok(0);
    }

    let clock = Clock::get()?;
    let slots_elapsed = clock.slot.saturating_sub(lender_position.last_update_slot);

    if slots_elapsed == 0 {
        return Ok(lender_position.accumulated_interest);
    }

    // Calculate interest: principal * rate * time / slots_per_year
    let interest = (lender_position.amount_supplied as u128
        * pool.supply_rate as u128
        * slots_elapsed as u128)
        / (BASIS_POINTS as u128 * SLOTS_PER_YEAR as u128);

    Ok(lender_position.accumulated_interest + interest as u64)
}

/// Calculate accumulated interest for a borrower
pub fn calculate_borrower_interest(
    borrower_position: &Account<BorrowerPosition>,
    pool: &Account<LendingPool>,
) -> Result<u64> {
    if borrower_position.amount_borrowed == 0 {
        return Ok(0);
    }

    let clock = Clock::get()?;
    let slots_elapsed = clock.slot.saturating_sub(borrower_position.last_update_slot);

    if slots_elapsed == 0 {
        return Ok(borrower_position.accumulated_interest);
    }

    // Calculate interest: principal * rate * time / slots_per_year
    let interest = (borrower_position.amount_borrowed as u128
        * pool.borrow_rate as u128
        * slots_elapsed as u128)
        / (BASIS_POINTS as u128 * SLOTS_PER_YEAR as u128);

    Ok(borrower_position.accumulated_interest + interest as u64)
}

/// Check if borrower can borrow the requested amount
pub fn check_borrow_capacity(
    borrower_position: &Account<BorrowerPosition>,
    requested_amount: u64,
) -> Result<()> {
    let total_borrowable = (borrower_position.amount_supplied * COLLATERAL_FACTOR) / BASIS_POINTS;
    let total_debt = borrower_position.amount_borrowed + borrower_position.accumulated_interest;

    require!(
        total_debt + requested_amount <= total_borrowable,
        crate::error::CustomError::InsufficientBorrowCapacity
    );

    Ok(())
}

