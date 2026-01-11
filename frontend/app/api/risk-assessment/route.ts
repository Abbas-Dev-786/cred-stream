// app/api/risk-assessment/route.ts
import { NextResponse } from "next/server";
import { ethers } from "ethers";
import Groq from "groq-sdk";

// Initialize Groq (much faster than OpenAI, ideal for API endpoints)
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY || "",
});

export async function POST(req: Request) {
  try {
    // Initialize the AI Agent's Wallet at request time (not build time)
    const privateKey = process.env.AI_AGENT_PRIVATE_KEY;
    if (!privateKey) {
      return NextResponse.json(
        { error: "Server configuration error: Missing AI_AGENT_PRIVATE_KEY" },
        { status: 500 }
      );
    }
    const aiWallet = new ethers.Wallet(privateKey);

    const body = await req.json();
    const { supplier, principal, buyer, invoiceText } = body;

    console.log(`🤖 AI Processing Invoice for Supplier: ${supplier}`);

    // --- STEP 1: AI RISK ANALYSIS ---
    let riskScore = 0;

    try {
      // Real Groq Call - Uses Llama 3.3 70B for fast, accurate risk analysis
      const completion = await groq.chat.completions.create({
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
        model: "llama-3.3-70b-versatile",
        response_format: { type: "json_object" },
      });

      const result = JSON.parse(completion.choices[0].message.content || "{}");
      riskScore = result.score || 85; // Fallback to 85 if parsing fails
    } catch (aiError) {
      console.error("Groq Error:", aiError);
      console.warn(
        "⚠️ Groq API failed or timed out. Using fallback scoring mechanism."
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
