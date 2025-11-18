import Stripe from "stripe";
import { NextResponse } from "next/server";
import { createOnRampTransaction } from "../../../../lib/actions/OnRamp";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
if (!stripeSecretKey) {
  throw new Error("STRIPE_SECRET_KEY is not defined in environment variables");
}
const stripe = new Stripe(stripeSecretKey);

export async function POST(request: Request) {
  try {
    const { payment_intent_id, amount, provider } = await request.json();
    console.log("Confirming payment with data:", {
      payment_intent_id,
      amount,
      provider,
    });

    // Retrieve the payment intent to check its status
    const paymentIntent =
      await stripe.paymentIntents.retrieve(payment_intent_id);

    if (paymentIntent.status === "succeeded") {
   
      await createOnRampTransaction(provider, amount); // Convert cents back to dollars/rupees

      return NextResponse.json({
        success: true,
        message: "Payment confirmed and transaction created successfully",
      });
    } else {
      return NextResponse.json(
        { success: false, error: "Payment not completed" },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Error confirming payment:", error);
    return NextResponse.json(
      { success: false, error: "Payment confirmation failed" },
      { status: 500 }
    );
  }
}