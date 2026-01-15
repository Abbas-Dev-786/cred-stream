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
    console.log(`📄 Invoice received for supplier: ${supplier}`);

    // --- STEP 1: AI RISK ANALYSIS ---
    let riskScore = 85; // Default to approval
    let usedFallback = false;

    // Only run AI analysis if we have a valid Groq API key
    if (process.env.GROQ_API_KEY) {
      try {
        const completion = await groq.chat.completions.create({
          messages: [
            {
              role: "system",
              content: `You are an invoice validator. Analyze the invoice and return a risk score.
              
IMPORTANT RULES:
- Score range: 60 to 95 only
- Default score for any readable invoice: 85
- Score 90-95: Perfect invoice with all details
- Score 80-89: Good invoice, minor info missing
- Score 70-79: Acceptable invoice
- Score 60-69: Questionable but processable

Return ONLY: {"score": <number between 60-95>}`,
            },
            {
              role: "user",
              content: `Invoice for ${principal} wei. Text: "${(
                invoiceText || "Invoice document"
              ).substring(0, 500)}"`,
            },
          ],
          model: "llama-3.3-70b-versatile",
          response_format: { type: "json_object" },
          temperature: 0.1,
          max_tokens: 50,
        });

        const result = JSON.parse(
          completion.choices[0].message.content || "{}"
        );
        console.log(`🤖 AI returned score: ${result.score}`);

        // Clamp score between 60-95 to ensure reasonable results
        if (typeof result.score === "number") {
          riskScore = Math.max(60, Math.min(95, result.score));
        }
      } catch (aiError) {
        console.error("⚠️ Groq API error:", aiError);
        usedFallback = true;
        riskScore = 85; // Default approval on AI failure
      }
    } else {
      console.log("⚠️ No GROQ_API_KEY, using default approval");
      usedFallback = true;
      riskScore = 85;
    }

    console.log(`📊 Final Risk Score: ${riskScore}/100`);

    // Very lenient threshold for demo - almost all invoices pass
    const riskThreshold = parseInt(process.env.RISK_THRESHOLD || "50", 10);

    if (riskScore < riskThreshold) {
      return NextResponse.json(
        {
          approved: false,
          riskScore,
          threshold: riskThreshold,
          reason: `Risk score ${riskScore} is below threshold of ${riskThreshold}.`,
        },
        { status: 400 }
      );
    }

    // --- STEP 2: CRYPTOGRAPHIC SIGNING ---
    const messageHash = ethers.solidityPackedKeccak256(
      ["address", "uint256", "address", "string"],
      [supplier, principal, buyer, "APPROVED"]
    );

    const signature = await aiWallet.signMessage(ethers.getBytes(messageHash));

    return NextResponse.json({
      success: true,
      approved: true,
      riskScore,
      usedFallback,
      signature,
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
