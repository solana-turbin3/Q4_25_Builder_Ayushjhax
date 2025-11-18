"use client";
import { Card } from "@repo/ui/card";
import { useGoldPrice } from "../hooks/useGoldPrice";

export const OnRampTransactions = ({
    transactions
}: {
    transactions: {
        time: Date,
        amount: number,
        status: string,
        provider: string
    }[]
}) => {
    const { goldPrice } = useGoldPrice();
    const currentGoldPrice = goldPrice || 12000;
    if (!transactions.length) {
        return <Card title="Recent Gold Purchases">
            <div className="text-center pb-8 pt-8 text-slate-600">
                No Recent gold purchases
            </div>
        </Card>
    }
    return <Card title="Recent Gold Purchases">
        <div className="pt-2 divide-y divide-slate-100">
            {transactions.map((t, idx) => (
                <div key={idx} className="flex items-center justify-between py-3">
                    <div>
                        <div className="text-sm font-medium text-slate-900">Gold Purchase</div>
                        <div className="text-slate-600 text-xs">{t.time.toDateString()}</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">{t.provider}</div>
                    </div>
                    <div className="flex flex-col items-end">
                        <div className="text-sm font-semibold text-emerald-600">+ ₹{(t.amount / 100).toLocaleString("en-IN")}</div>
                        <div className="text-xs text-yellow-600">+ {(t.amount / 100 / currentGoldPrice).toFixed(4)}g</div>
                        <span className={`mt-1 inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${
                            t.status === "Success"
                                ? "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200"
                                : t.status === "Pending"
                                ? "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200"
                                : "bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-200"
                        }`}>{t.status}</span>
                    </div>
                </div>
            ))}
        </div>
    </Card>
}