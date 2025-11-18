
import db from "@repo/db/client";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../lib/auth";
import { TransactionRow } from "../../components/TransactionRow";

async function getTransactions() {
    const session = await getServerSession(authOptions);
    const userId = Number((session?.user as any)?.id);
    
    // Get OnRamp transactions
    const onRampTxns = await db.onRampTransaction.findMany({
        where: {
            userId: userId
        },
        orderBy: {
            createdAt: "desc"
        }
    });
    
    // Get P2P transfer transactions
    const p2pTxns = await db.transaction.findMany({
        where: {
            OR: [
                { fromUserId: userId },
                { toUserId: userId }
            ]
        },
        orderBy: {
            createdAt: "desc"
        }
    });
    
    // Combine and sort all transactions
    const allTransactions = [
        ...onRampTxns.map(t => ({
            id: `onramp_${t.id}`,
            type: 'ONRAMP',
            amount: t.amount,
            status: t.status,
            provider: t.provider,
            description: `OnRamp via ${t.provider}`,
            createdAt: t.createdAt
        })),
        ...p2pTxns.map(t => {
            // Create different descriptions for sender vs receiver
            let description = t.description || 'P2P Transfer';
            if (t.fromUserId === userId) {
                // User is the sender
                description = `Sent to ${(t.description || '').split(' to ')[1] || 'Unknown'}`;
            } else if (t.toUserId === userId) {
                // User is the receiver
                description = `Received from ${(t.description || '').split(' from ')[1]?.split(' to ')[0] || 'Unknown'}`;
            }
            
            return {
                id: `p2p_${t.id}`,
                type: 'P2P',
                amount: t.amount,
                status: t.status,
                provider: 'P2P Transfer',
                description: description,
                createdAt: t.createdAt
            };
        })
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    return allTransactions;
}


export default async function TransactionsPage() {
    const txns = await getTransactions();
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-slate-900">Gold Transaction History</h1>
                <p className="text-slate-600">Track your gold purchases, transfers, and transaction statuses.</p>
            </div>
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white/90 backdrop-blur shadow-sm">
                <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50/80">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Date</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Type</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Description</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Amount (₹ & Gold)</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {txns.map((t) => (
                            <TransactionRow key={t.id} transaction={t} />
                        ))}
                        {txns.length === 0 && (
                            <tr>
                                <td colSpan={5} className="px-6 py-10 text-center text-slate-500">No transactions yet.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}