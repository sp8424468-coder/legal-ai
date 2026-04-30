import Razorpay from "razorpay";

export async function POST() {
  try {
    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID!,
      key_secret: process.env.RAZORPAY_KEY_SECRET!,
    });

    const order = await razorpay.orders.create({
      amount: 5000, // ₹50 (in paise)
      currency: "INR",
      receipt: "receipt_legal_ai",
    });

    return Response.json(order);
  } catch (err) {
    console.error("Order error:", err);
    return Response.json({ error: "Failed to create order" }, { status: 500 });
  }
}