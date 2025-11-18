"use client"
import { Button } from "@repo/ui/button";
import { Card } from "@repo/ui/card";
import { Center } from "@repo/ui/center";
import { TextInput } from "@repo/ui/textinput";
import { useState } from "react";
import { p2pTransfer } from "../../lib/actions/p2pTransfer";
import { useGoldPrice } from "../hooks/useGoldPrice";

export function SendCard() {
    const [number, setNumber] = useState("");
    const [amount, setAmount] = useState("");
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");

    // Use dynamic gold price
    const { goldPrice, loading: priceLoading, error: priceError } = useGoldPrice();
    const currentGoldPrice = goldPrice || 12000;
    const goldEquivalent = Number(amount) / currentGoldPrice;

    const handleSend = async () => {
        if (!number || !amount) {
            setMessage("Please enter both phone number and amount");
            return;
        }

        setLoading(true);
        setMessage("");
        
        try {
            const result = await p2pTransfer(number, Number(amount) * 100);
            setMessage(result.message);
            
            if (result.message === "Transfer successful") {
                setNumber("");
                setAmount("");
            }
        } catch (error) {
            setMessage("Transfer failed. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return <div className="w-full">
        <Center>
            <Card title="Send Gold">
                <div className="min-w-72 pt-2">
                    <TextInput 
                        placeholder={"Phone Number"} 
                        label="Recipient Phone Number" 
                        onChange={(value) => {
                            setNumber(value)
                        }} 
                    />
                    <TextInput 
                        placeholder={"Amount in ₹"} 
                        label="Amount (₹)" 
                        onChange={(value) => {
                            setAmount(value)
                        }} 
                    />
                    
                    {Number(amount) > 0 && (
                        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                            <div className="text-sm text-yellow-800">
                                <strong>Gold to Transfer:</strong> {goldEquivalent.toFixed(4)}g
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
                    
                    {message && (
                        <div className={`mt-3 p-3 rounded-md text-sm ${
                            message.includes("successful") 
                                ? "bg-green-50 text-green-700 border border-green-200" 
                                : "bg-red-50 text-red-700 border border-red-200"
                        }`}>
                            {message}
                        </div>
                    )}
                    
                    <div className="pt-4 flex justify-center">
                        <Button 
                            onClick={handleSend}
                        >
                            {loading ? "Sending..." : "Send Gold"}
                        </Button>
                    </div>
                </div>
            </Card>
        </Center>
    </div>
}