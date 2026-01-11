// app/api/upload-invoice/route.ts
import { NextResponse } from "next/server";
import axios from "axios";
import FormData from "form-data"; // Use the Node.js form-data library

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

    console.log(`📦 Uploading ${file.name} (${(file.size / 1024).toFixed(1)}KB) to IPFS via Pinata...`);

    // 2. Prepare data for Pinata
    // We must convert the Web API File to a Buffer for the Node.js environment
    const buffer = Buffer.from(await file.arrayBuffer());

    const data = new FormData();
    data.append("file", buffer, { filename: file.name });

    // Optional: Add metadata to organize files in your Pinata Dashboard
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
          ...data.getHeaders(), // Important: Sets the correct Content-Type boundary
        },
        maxBodyLength: Infinity,
      }
    );

    const ipfsHash = res.data.IpfsHash;
    const ipfsUri = `ipfs://${ipfsHash}`;

    console.log(`✅ IPFS Upload Success! CID: ${ipfsHash}`);

    return NextResponse.json({
      success: true,
      daUri: ipfsUri, // Pass this string to your Smart Contract
      gatewayUrl: `https://gateway.pinata.cloud/ipfs/${ipfsHash}`, // Use this to view the file in the browser
      cid: ipfsHash,
    });
  } catch (error) {
    console.error("❌ IPFS Upload Error:", error);
    return NextResponse.json(
      { error: "Failed to upload to IPFS" },
      { status: 500 }
    );
  }
}
