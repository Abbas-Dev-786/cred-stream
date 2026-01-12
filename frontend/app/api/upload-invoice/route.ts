// app/api/upload-invoice/route.ts
import { NextResponse } from "next/server";
import axios from "axios";
import FormData from "form-data";
import PDFParser from "pdf2json";

async function extractPdfText(buffer: Buffer): Promise<string> {
  return new Promise((resolve, reject) => {
    const pdfParser = new PDFParser();

    pdfParser.on("pdfParser_dataError", (errData: any) => {
      reject(new Error(errData.parserError));
    });

    pdfParser.on("pdfParser_dataReady", (pdfData: any) => {
      try {
        let text = "";
        pdfData.Pages.forEach((page: any) => {
          page.Texts.forEach((textItem: any) => {
            textItem.R.forEach((textRun: any) => {
              try {
                // Try to decode URI component, if it fails, use the raw text
                text += decodeURIComponent(textRun.T) + " ";
              } catch (e) {
                // If decoding fails, use the raw text as fallback
                text += textRun.T + " ";
              }
            });
          });
        });
        resolve(text);
      } catch (err) {
        reject(err);
      }
    });

    pdfParser.parseBuffer(buffer);
  });
}

export async function POST(req: Request) {
  try {
    // 1. Parse the incoming form data
    const reqFormData = await req.formData();
    const file = reqFormData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    // 2. Validate file type (PDF only)
    const allowedTypes = ["application/pdf"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Only PDF files are accepted." },
        { status: 400 }
      );
    }

    // 3. Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB in bytes
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 5MB." },
        { status: 400 }
      );
    }

    console.log(
      `📦 Uploading ${file.name} (${(file.size / 1024).toFixed(
        1
      )}KB) to IPFS via Pinata...`
    );

    // 2. Prepare data for Pinata
    const buffer = Buffer.from(await file.arrayBuffer());

    // --- Extract PDF Text ---
    let extractedText = "";
    try {
      const fullText = await extractPdfText(buffer);
      extractedText = fullText.slice(0, 3000);
      console.log(`📄 Extracted ${extractedText.length} chars from PDF`);
    } catch (parseError) {
      console.error("⚠️ PDF Parse Error:", parseError);
      extractedText = "Error extracting text from invoice PDF.";
    }
    // ----------------------------------------

    const data = new FormData();
    data.append("file", buffer, {
      filename: file.name,
    });

    // Optional: Add metadata
    const metadata = JSON.stringify({
      name: `CredStream Invoice - ${file.name}`,
      keyvalues: {
        env: "mantle-hackathon",
      },
    });
    data.append("pinataMetadata", metadata);

    // Optional: Pinning options
    const options = JSON.stringify({
      cidVersion: 1,
    });
    data.append("pinataOptions", options);

    // 3. Send to Pinata
    const res = await axios.post(
      "https://api.pinata.cloud/pinning/pinFileToIPFS",
      data,
      {
        headers: {
          Authorization: `Bearer ${process.env.PINATA_JWT}`,
          ...data.getHeaders(),
        },
        maxBodyLength: Infinity,
      }
    );

    const ipfsHash = res.data.IpfsHash;
    const ipfsUri = `ipfs://${ipfsHash}`;

    console.log(`✅ IPFS Upload Success! CID: ${ipfsHash}`);

    return NextResponse.json({
      success: true,
      daUri: ipfsUri,
      gatewayUrl: `https://gateway.pinata.cloud/ipfs/${ipfsHash}`,
      cid: ipfsHash,
      text: extractedText,
    });
  } catch (error) {
    console.error("❌ IPFS Upload Error:", error);
    return NextResponse.json(
      { error: "Failed to upload to IPFS" },
      { status: 500 }
    );
  }
}
