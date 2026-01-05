// app/api/risk-assessment/route.ts
import { NextResponse } from "next/server";
import { ethers } from "ethers";
import OpenAI from "openai";

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Initialize the AI Agent's Wallet (Server-side only)
if (!process.env.AI_AGENT_PRIVATE_KEY) {
  throw new Error("Missing AI_AGENT_PRIVATE_KEY in environment variables");
}
const aiWallet = new ethers.Wallet(process.env.AI_AGENT_PRIVATE_KEY);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { supplier, principal, buyer, invoiceText } = body;

    console.log(`🤖 AI Processing Invoice for Supplier: ${supplier}`);

    // --- STEP 1: AI RISK ANALYSIS ---
    let riskScore = 0;

    try {
      // Real OpenAI Call
      const completion = await openai.chat.completions.create({
        messages: [
          {
            role: "system",
            content:
              "You are a conservative automated credit risk officer for a DeFi factoring protocol. Analyze the invoice text. Output ONLY a JSON object with a single field 'score' between 0 and 100.",
          },
          {
            role: "user",
            content: `Invoice Text: "${invoiceText}". Buyer Address: ${buyer}. Principal Amount: ${principal}.`,
          },
        ],
        model: "gpt-3.5-turbo",
        response_format: { type: "json_object" },
      });

      const result = JSON.parse(completion.choices[0].message.content || "{}");
      riskScore = result.score || 85; // Fallback to 85 if parsing fails
    } catch (aiError) {
      console.error("OpenAI Error:", aiError);
      console.warn(
        "⚠️ OpenAI API failed or timed out. Using fallback scoring mechanism."
      );
      // Fallback Logic: Simple check for demo purposes
      if (principal && Number(principal) < 100000) {
        riskScore = 88; // Low amount = Low risk
      } else {
        riskScore = 72;
      }
    }

    console.log(`📊 Calculated Risk Score: ${riskScore}/100`);

    if (riskScore < 70) {
      return NextResponse.json(
        {
          approved: false,
          riskScore,
          reason: "Risk score below threshold (70).",
        },
        { status: 400 }
      );
    }

    // --- STEP 2: CRYPTOGRAPHIC SIGNING ---
    // The signature proves to the Smart Contract that THIS verified backend approved the loan.
    // Must match Solidity: keccak256(abi.encodePacked(to, principal, buyer, "APPROVED"))

    // 1. Hash the data
    const messageHash = ethers.solidityPackedKeccak256(
      ["address", "uint256", "address", "string"],
      [supplier, principal, buyer, "APPROVED"]
    );

    // 2. Sign the binary hash
    // Note: getBytes() is needed in Ethers v6 to treat the hash as raw bytes
    const signature = await aiWallet.signMessage(ethers.getBytes(messageHash));

    return NextResponse.json({
      success: true,
      approved: true,
      riskScore,
      signature, // <--- The Frontend sends this to the Smart Contract
      messageHash,
    });
  } catch (error) {
    console.error("❌ Risk Assessment Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
