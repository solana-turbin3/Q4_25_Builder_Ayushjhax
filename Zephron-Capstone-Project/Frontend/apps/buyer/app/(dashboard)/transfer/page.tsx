import db from "@repo/db/client";
import { AddMoney } from "../../components/AddMoneyCard";
import { BalanceCard } from "../../components/BalanceClient";
import { OnRampTransactions } from "../../components/OnRampTransaction";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../lib/auth";

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

async function getOnRampTransactions() {
    const session = await getServerSession(authOptions);
    const txns = await db.onRampTransaction.findMany({
        where: {
            userId: Number((session?.user as any)?.id)
        }
    });
    return txns.map(t => ({
        time: t.createdAt,
        amount: t.amount,
        status: t.status,
        provider: t.provider
    }))
}

export default async function() {
    const balance = await getBalance();
    const transactions = await getOnRampTransactions();

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-slate-900">Buy Gold</h1>
                <p className="text-slate-600">Purchase tokenized gold using various payment methods and track your gold purchases.</p>
            </div>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div>
                    <AddMoney />
                </div>
                <div className="space-y-6">
                    <BalanceCard amount={balance.amount} locked={balance.locked} />
                    <OnRampTransactions transactions={transactions} />
                </div>
            </div>
        </div>
    )
}