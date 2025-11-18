
import db from "@repo/db/client";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../lib/auth";
import { BalanceCard } from "../../components/BalanceClient";
import { AddMoney } from "../../components/AddMoneyCard";

async function getBalance() {
    const session = await getServerSession(authOptions);
    const userId = Number((session?.user as any)?.id);
    
    // Get OnRampTransaction records
    const onRampTxns = await db.onRampTransaction.findMany({
        where: {
            userId: userId
        }
    });
    
    // Get P2P transfer transactions
    const p2pSent = await db.transaction.findMany({
        where: {
            fromUserId: userId,
            type: 'TRANSFER'
        }
    });
    
    const p2pReceived = await db.transaction.findMany({
        where: {
            toUserId: userId,
            type: 'TRANSFER'
        }
    });
    
    // Calculate balances
    const onRampTotal = onRampTxns
        .filter(t => t.status === 'Success')
        .reduce((sum, t) => sum + t.amount, 0);
    
    const p2pSentTotal = p2pSent.reduce((sum, t) => sum + t.amount, 0);
    const p2pReceivedTotal = p2pReceived.reduce((sum, t) => sum + t.amount, 0);
    const unlockedBalance = onRampTotal - p2pSentTotal + p2pReceivedTotal;
    
    // Calculate locked balance (Pending status)
    const lockedBalance = onRampTxns
        .filter(t => t.status === 'Pending')
        .reduce((sum, t) => sum + t.amount, 0);
    
    return {
        amount: unlockedBalance,
        locked: lockedBalance
    }
}

export default async function DashboardPage() {
    const balance = await getBalance();

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-slate-900">Gold Portfolio</h1>
                <p className="text-slate-600">Manage your tokenized gold holdings, buy more gold, and track your investments.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <BalanceCard amount={balance.amount} locked={balance.locked} />
                <AddMoney />
            </div>
        </div>
    );
}