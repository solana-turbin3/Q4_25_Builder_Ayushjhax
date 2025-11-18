"use server";

import db from "@repo/db/client";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth";

export async function createOnRampTransaction(provider: string, amount: number) {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).id) {   
        return {
            message: "Unauthenticated request"
        }
    }
    const token = (Math.random() * 1000).toString();
    await db.onRampTransaction.create({
        data: {
            provider,
            status: "Pending",
            createdAt: new Date(),
            token: token,
            userId: Number((session.user as any).id),   
            amount: amount * 100
        }
    });

    return {
        message: "Done"
    }
}