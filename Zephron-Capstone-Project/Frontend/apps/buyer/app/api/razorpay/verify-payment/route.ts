import * as crypto from "crypto";
import { NextResponse } from "next/server";
import { createOnRampTransaction } from "../../../../lib/actions/OnRamp";

export async function POST(request: Request) {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      amount,
      provider,
    } = await request.json();

    console.log("Verifying payment with data:", {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      amount,
      provider,
    });

    // Verify the payment signature
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET as string)
      .update(body.toString())
      .digest("hex");

    const isAuthentic = expectedSignature === razorpay_signature;

    if (isAuthentic) {

      const amountInRupees = Math.round(Number(amount) / 100);
      await createOnRampTransaction(provider, amountInRupees);

      return NextResponse.json({
        success: true,
        message: "Payment verified and transaction created successfully",
      });
    } else {
      return NextResponse.json(
        { success: false, error: "Payment verification failed" },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Error verifying payment:", error);
    return NextResponse.json(
      { success: false, error: "Payment verification failed" },
      { status: 500 }
    );
  }
}