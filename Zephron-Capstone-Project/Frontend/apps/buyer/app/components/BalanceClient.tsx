"use client";

import { Card } from "@repo/ui/card";
import { useGoldPrice } from "../hooks/useGoldPrice";

export const BalanceCard = ({amount, locked}: {
    amount: number;
    locked: number;
}) => {
    const { goldPrice, loading, error } = useGoldPrice();
    
    const totalRupees = (locked + amount) / 100;
    const unlockedRupees = amount / 100;
    const lockedRupees = locked / 100;
    
    // Use dynamic gold price or fallback to default
    const currentGoldPrice = goldPrice || 12000;
    
    const totalGold = totalRupees / currentGoldPrice;
    const unlockedGold = unlockedRupees / currentGoldPrice;
    const lockedGold = lockedRupees / currentGoldPrice;

    return <Card title={"Gold Holdings"}>
        <div className="space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200/70">
                <div className="text-sm text-slate-600">Available Gold</div>
                <div className="text-base font-semibold text-slate-900">
                    {unlockedGold.toFixed(4)}g
                    <span className="text-xs text-slate-500 ml-2">(₹{unlockedRupees.toLocaleString("en-IN")})</span>
                </div>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-slate-200/70">
                <div className="text-sm text-slate-600">Pending Gold</div>
                <div className="text-base font-semibold text-slate-900">
                    {lockedGold.toFixed(4)}g
                    <span className="text-xs text-slate-500 ml-2">(₹{lockedRupees.toLocaleString("en-IN")})</span>
                </div>
            </div>
            <div className="flex items-center justify-between py-2">
                <div className="text-sm text-slate-600">Total Gold Holdings</div>
                <div className="text-lg font-bold tracking-tight text-slate-900">
                    {totalGold.toFixed(4)}g
                    <span className="text-sm text-slate-500 ml-2">(₹{totalRupees.toLocaleString("en-IN")})</span>
                </div>
            </div>
            <div className="pt-2 text-xs text-slate-500">
                {loading ? (
                    <span>Loading gold price...</span>
                ) : error ? (
                    <span className="text-red-500">Price update failed</span>
                ) : (
                    <span>Live Gold Price: ₹{currentGoldPrice.toLocaleString("en-IN")}/gram</span>
                )}
            </div>
        </div>
    </Card>
}