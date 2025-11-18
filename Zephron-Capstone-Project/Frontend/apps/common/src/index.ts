import express from "express";
import db from "@repo/db/client";
const app = express();

app.use(express.json())

app.post("/kast", async (req, res) => {

    const paymentInformation: {
        token: string;
        userId: string;
        amount: string
    } = {
        token: req.body.token,
        userId: req.body.user_identifier,
        amount: req.body.amount
    };

    try {
        await db.$transaction(async (tx) => {
            // Update OnRampTransaction status first
            await tx.onRampTransaction.updateMany({
                where: {
                    token: paymentInformation.token
                },
                data: {
                    status: "Success",
                }
            });

            // Calculate total unlocked balance from all successful OnRampTransaction records
            const successfulTransactions = await tx.onRampTransaction.findMany({
                where: {
                    userId: Number(paymentInformation.userId),
                    status: 'Success'
                }
            });
            
            const totalUnlockedBalance = successfulTransactions.reduce((sum, t) => sum + t.amount, 0);

            // Calculate locked balance from pending OnRampTransaction records
            const pendingTransactions = await tx.onRampTransaction.findMany({
                where: {
                    userId: Number(paymentInformation.userId),
                    status: 'Pending'
                }
            });
            
            const totalLockedBalance = pendingTransactions.reduce((sum, t) => sum + t.amount, 0);

            // Create or update Balance record with correct totals
            await tx.balance.upsert({
                where: {
                    userId: Number(paymentInformation.userId)
                },
                update: {
                    amount: totalUnlockedBalance,
                    locked: totalLockedBalance
                },
                create: {
                    userId: Number(paymentInformation.userId),
                    amount: totalUnlockedBalance,
                    locked: totalLockedBalance
                }
            });
        });

        res.json({
            message: "Captured"
        })
    } catch(e) {
        console.error(e);
        res.status(411).json({
            message: "Error while processing webhook"
        })
    }

})

app.listen(3003);