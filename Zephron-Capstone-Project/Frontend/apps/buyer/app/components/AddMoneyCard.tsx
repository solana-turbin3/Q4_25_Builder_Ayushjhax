"use client";

import { Button } from "@repo/ui/button";
import { Card } from "@repo/ui/card";
import { Select } from "@repo/ui/select";
import { useState } from "react";
import { TextInput } from "@repo/ui/textinput";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  CardElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { createOnRampTransaction } from "../../lib/actions/OnRamp";
import { useGoldPrice } from "../hooks/useGoldPrice";

declare global {
  interface Window {
    Razorpay: any;
  }
}

// Initialize Stripe
const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY as string
);

// Unified methods (providers + banks)
const METHODS = [
  { key: "razorpay", label: "Razorpay" },
  { key: "stripe", label: "Stripe" },
  { key: "kast", label: "KAST", redirectUrl: "https://kast.com", bankName: "KAST" },
  { key: "hdfc", label: "HDFC Bank", redirectUrl: "https://netbanking.hdfcbank.com", bankName: "HDFC Bank" },
] as const;

const PaymentForm = () => {
  const [provider, setProvider] = useState<string>(METHODS[0]?.key || "");
  const [value, setValue] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const stripe = useStripe(); 
  const elements = useElements();
  const { goldPrice, loading: priceLoading, error: priceError } = useGoldPrice();

  const handleRazorpayPayment = async (amount: number) => {
    try {
      const orderResponse = await fetch("/api/razorpay/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, currency: "INR" }),
      });

      const orderData = await orderResponse.json();
      console.log("Razorpay order data:", orderData);
      if (!orderData.success) {
        throw new Error("Failed to create order");
      }

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID as string,
        amount: orderData.amount,
        currency: orderData.currency,
        name: "Your App Name",
        description: "Buy Tokenized Gold",
        order_id: orderData.order_id,
        handler: async function (response: any) {
          try {
            const verifyResponse = await fetch("/api/razorpay/verify-payment", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                amount: orderData.amount,
                provider: "razorpay",
              }),
            });

            const verifyData = await verifyResponse.json();

            if (verifyData.success) {
              alert("Payment successful! Gold purchased and added to your holdings.");
              setValue(0);
            } else {
              alert("Payment verification failed");
            }
          } catch (error) {
            console.error("Payment verification error:", error);
            alert("Payment verification failed");
          }
        },
        prefill: {
          name: "Ammar",
          email: "customer@example.com",
          contact: "9810977535",
        },
        theme: {
          color: "#3399cc",
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", function (response: any) {
        alert("Payment failed: " + response.error.description);
      });
      rzp.open();
    } catch (error) {
      console.error("Razorpay payment error:", error);
      alert("Payment initialization failed");
    }
  };

  const handleStripePayment = async (amount: number) => {
    try {
      if (!stripe || !elements) {
        throw new Error("Stripe failed to load");
      }

      const response = await fetch("/api/stripe/create-payment-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, currency: "inr" }),
      });

      const {
        client_secret,
        payment_intent_id,
      }: { client_secret: string; payment_intent_id: string } =
        await response.json();

      if (!client_secret) {
        throw new Error("Failed to create payment intent");
      }

      const { error, paymentIntent } = await stripe.confirmCardPayment(
        client_secret,
        {
          payment_method: {
            card: elements.getElement(CardElement) as any,
          },
        }
      );

      if (error) {
        alert("Payment failed: " + error.message);
      } else if (paymentIntent && paymentIntent.status === "succeeded") {
        const confirmResponse = await fetch("/api/stripe/confirm-payment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            payment_intent_id: paymentIntent.id,
            amount: amount,
            provider: "stripe",
          }),
        });

        const confirmData = await confirmResponse.json();

        if (confirmData.success) {
          alert("Payment successful! Gold purchased and added to your holdings.");
          setValue(0);
        } else {
          alert("Payment confirmation failed");
        }
      }
    } catch (error) {
      console.error("Stripe payment error:", error);
      alert("Payment failed");
    }
  };

  const handleBankRedirect = async (amount: number, key: string) => {
    const bank = METHODS.find((m) => m.key === key && (m as any).redirectUrl);
    if (!bank || !("redirectUrl" in bank) || !("bankName" in bank)) {
      alert("Invalid bank selected");
      return;
    }
    await createOnRampTransaction((bank as any).bankName, amount);
    window.location.href = (bank as any).redirectUrl as string;
  };

  const handlePayment = async () => {
    if (value <= 0) {
      alert("Please enter a valid amount");
      return;
    }

    if (!provider) {
      alert("Please select a payment provider");
      return;
    }

    setLoading(true);

    try {
      if (provider === "razorpay") {
        await handleRazorpayPayment(value);
      } else if (provider === "stripe") {
        await handleStripePayment(value);
      } else if (provider === "kast" || provider === "hdfc") {
        await handleBankRedirect(value, provider);
      }
    } catch (error) {
      console.error("Payment error:", error);
      alert("Payment failed");
    } finally {
      setLoading(false);
    }
  };

  // Calculate gold equivalent using dynamic price
  const currentGoldPrice = goldPrice || 12000;
  const goldEquivalent = value / currentGoldPrice;

  return (
    <Card title="Buy Gold">
      <div className="w-full space-y-4">
        <TextInput
          label="Amount (₹)"
          placeholder="Enter amount in rupees"
          onChange={(val: string) => setValue(Number(val) || 0)}
        />
        {value > 0 && (
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
            <div className="text-sm text-yellow-800">
              <strong>Gold Equivalent:</strong> {goldEquivalent.toFixed(4)}g
            </div>
            <div className="text-xs text-yellow-600 mt-1">
              {priceLoading ? (
                "Loading current gold price..."
              ) : priceError ? (
                "Using fallback price: ₹12,000/gram"
              ) : (
                `Live Gold Price: ₹${currentGoldPrice.toLocaleString("en-IN")}/gram`
              )}
            </div>
          </div>
        )}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-900">Payment Method</label>
          <Select
            onSelect={(value: string) => setProvider(value)}
            options={METHODS.map((m) => ({ key: m.key, value: m.label }))}
          />
        </div>

        {provider === "stripe" && (
          <div className="p-3 border rounded-md">
            <CardElement options={{ hidePostalCode: true }} />
          </div>
        )}

        <div className="flex justify-center pt-4">
          <Button onClick={handlePayment}>
            {loading ? "Processing..." : "Buy Gold"}
          </Button>
        </div>
      </div>
    </Card>
  );
};

export const AddMoney = () => {
  return (
    <>
      <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
      <Elements stripe={stripePromise}>
        <PaymentForm />
      </Elements>
    </>
  );
};