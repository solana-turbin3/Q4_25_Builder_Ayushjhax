"use server"
import { getServerSession } from "next-auth";
import { authOptions } from "../auth";
import prisma from "@repo/db/client";

export async function p2pTransfer(to: string, amount: number) {
    const session = await getServerSession(authOptions);
    const from = (session?.user as any)?.id;
    if (!from) {
        return {
            message: "Error while sending"
        }
    }
    
    const toUser = await prisma.user.findFirst({
        where: {
            phone: to
        }
    });

    if (!toUser) {
        return {
            message: "User not found"
        }
    }

    try {
        // Calculate sender's current balance properly
        const fromOnRampTxns = await prisma.onRampTransaction.findMany({
            where: {
                userId: Number(from),
                status: 'Success'
            }
        });
        
        const fromP2PSent = await prisma.transaction.findMany({
            where: {
                fromUserId: Number(from),
                type: 'TRANSFER'
            }
        });
        
        const fromP2PReceived = await prisma.transaction.findMany({
            where: {
                toUserId: Number(from),
                type: 'TRANSFER'
            }
        });
        
        const fromOnRampTotal = fromOnRampTxns.reduce((sum, t) => sum + t.amount, 0);
        const fromP2PSentTotal = fromP2PSent.reduce((sum, t) => sum + t.amount, 0);
        const fromP2PReceivedTotal = fromP2PReceived.reduce((sum, t) => sum + t.amount, 0);
        const fromCurrentBalance = fromOnRampTotal - fromP2PSentTotal + fromP2PReceivedTotal;
        
        console.log(`Sender balance calculation: OnRamp=${fromOnRampTotal}, P2PSent=${fromP2PSentTotal}, P2PReceived=${fromP2PReceivedTotal}, Current=${fromCurrentBalance}`);
        
        if (fromCurrentBalance < amount) {
            return {
                message: "Insufficient funds"
            }
        }

        // Add delay as requested
        await new Promise(r => setTimeout(r, 4000));

        // Calculate receiver's current balance
        const toOnRampTxns = await prisma.onRampTransaction.findMany({
            where: {
                userId: toUser.id,
                status: 'Success'
            }
        });
        
        const toP2PSent = await prisma.transaction.findMany({
            where: {
                fromUserId: toUser.id,
                type: 'TRANSFER'
            }
        });
        
        const toP2PReceived = await prisma.transaction.findMany({
            where: {
                toUserId: toUser.id,
                type: 'TRANSFER'
            }
        });
        
        const toOnRampTotal = toOnRampTxns.reduce((sum, t) => sum + t.amount, 0);
        const toP2PSentTotal = toP2PSent.reduce((sum, t) => sum + t.amount, 0);
        const toP2PReceivedTotal = toP2PReceived.reduce((sum, t) => sum + t.amount, 0);
        const toCurrentBalance = toOnRampTotal - toP2PSentTotal + toP2PReceivedTotal;
        
        console.log(`Receiver balance calculation: OnRamp=${toOnRampTotal}, P2PSent=${toP2PSentTotal}, P2PReceived=${toP2PReceivedTotal}, Current=${toCurrentBalance}`);

        // Use Prisma transaction for balance updates only
        await prisma.$transaction(async (tx) => {
            // Update sender's Balance record with correct amount
            await tx.balance.upsert({
                where: { userId: Number(from) },
                update: { 
                    amount: fromCurrentBalance - amount,
                    updatedAt: new Date()
                },
                create: { 
                    userId: Number(from), 
                    amount: fromCurrentBalance - amount, 
                    locked: 0 
                }
            });

            // Update receiver's Balance record with correct amount
            await tx.balance.upsert({
                where: { userId: toUser.id },
                update: { 
                    amount: toCurrentBalance + amount,
                    updatedAt: new Date()
                },
                create: { 
                    userId: toUser.id, 
                    amount: toCurrentBalance + amount, 
                    locked: 0 
                }
            });
        });

        // Create single transaction record for the transfer
        const transactionId = `p2p_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        await prisma.transaction.create({
            data: {
                transactionId: transactionId,
                amount: amount,
                type: 'TRANSFER',
                status: 'COMPLETED',
                description: `P2P transfer from ${(session?.user as any)?.phone || 'Unknown'} to ${to}`,
                fromUserId: Number(from),
                toUserId: toUser.id,
                processedAt: new Date()
            }
        });
        
        return {
            message: "Transfer successful"
        }
    } catch (error) {
        console.error("Transfer error:", error);
        return {
            message: error instanceof Error ? error.message : "Transfer failed"
        }
    }
}