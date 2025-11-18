"use client";

import { useGoldPrice } from "../hooks/useGoldPrice";

interface Transaction {
    id: string;
    type: string;
    amount: number;
    status: string;
    provider: string;
    description: string;
    createdAt: Date;
}

interface StatusPillProps {
    status: string;
}

function StatusPill({ status }: StatusPillProps) {
    const styles = status === "Success"
        ? "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200"
        : status === "Processing"
        ? "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200"
        : "bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-200";
    return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${styles}`}>{status}</span>
}

interface TransactionRowProps {
    transaction: Transaction;
}

export function TransactionRow({ transaction }: TransactionRowProps) {
    const { goldPrice } = useGoldPrice();
    const currentGoldPrice = goldPrice || 12000;

    return (
        <tr className="hover:bg-slate-50/60">
            <td className="px-6 py-4 text-sm text-slate-700">{new Date(transaction.createdAt).toLocaleDateString()}</td>
            <td className="px-6 py-4 text-sm text-slate-700">
                <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                    transaction.type === 'ONRAMP' 
                        ? 'bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-200'
                        : 'bg-green-50 text-green-700 ring-1 ring-inset ring-green-200'
                }`}>
                    {transaction.type}
                </span>
            </td>
            <td className="px-6 py-4 text-sm text-slate-700">{transaction.description}</td>
            <td className="px-6 py-4 text-sm font-medium text-slate-900">
                <div>₹{(transaction.amount / 100).toLocaleString("en-IN")}</div>
                <div className="text-xs text-yellow-600">
                    {(transaction.amount / 100 / currentGoldPrice).toFixed(4)}g
                </div>
            </td>
            <td className="px-6 py-4 text-sm"><StatusPill status={transaction.status} /></td>
        </tr>
    );
}
