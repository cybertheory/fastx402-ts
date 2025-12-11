/**
 * Full-featured Express server example using fastx402
 * Demonstrates real-world payment-protected endpoints
 */

import express from "express";
import { paymentRequired, configureX402 } from "../src";
import type { PaymentConfig } from "../src/types";

// Configure x402 (loads from env if not provided)
configureX402(
  {
    merchantAddress: process.env.X402_MERCHANT_ADDRESS || "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    chainId: parseInt(process.env.X402_CHAIN_ID || "8453"),
    currency: process.env.X402_CURRENCY || "USDC",
    mode: "instant",
  } as PaymentConfig
);

const app = express();
app.use(express.json());

// CORS middleware for frontend access
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, X-PAYMENT");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

// Root endpoint
app.get("/", (req, res) => {
  res.json({
    message: "Welcome to fastx402 Example API",
    endpoints: {
      free: "GET /free - Free endpoint",
      paid: "GET /paid - Paid endpoint (0.01 USDC)",
      premium: "GET /premium - Premium endpoint (0.05 USDC)",
      api: "GET /api/data - API data endpoint (0.02 USDC)",
      download: "GET /download/:fileId - Download endpoint (0.03 USDC)",
    },
  });
});

// Free endpoint
app.get("/free", (req, res) => {
  res.json({
    message: "This endpoint is free!",
    data: "Public information available to everyone",
  });
});

// Paid endpoint
app.get("/paid", paymentRequired({
  price: "0.01",
  currency: "USDC",
  chainId: 8453,
  description: "Basic paid endpoint access"
}), (req, res) => {
  res.json({
    message: "You paid! Here's your content.",
    data: "Premium content here",
    access_level: "basic",
    features: ["feature1", "feature2"],
  });
});

// Premium endpoint
app.get("/premium", paymentRequired({
  price: "0.05",
  currency: "USDC",
  chainId: 8453,
  description: "Premium tier access"
}), (req, res) => {
  res.json({
    message: "You paid for premium!",
    tier: "premium",
    features: ["feature1", "feature2", "feature3", "feature4"],
    unlimited_access: true,
  });
});

// API data endpoint
app.get("/api/data", paymentRequired({
  price: "0.02",
  currency: "USDC",
  chainId: 8453,
  description: "API data access"
}), (req, res) => {
  res.json({
    message: "API data retrieved successfully",
    data: {
      users: 1000,
      transactions: 5000,
      revenue: "10000 USDC",
    },
    timestamp: new Date().toISOString(),
  });
});

// Download endpoint
app.get("/download/:fileId", paymentRequired({
  price: "0.03",
  currency: "USDC",
  chainId: 8453,
  description: "File download access"
}), (req, res) => {
  res.json({
    message: "Download authorized",
    file_id: req.params.fileId,
    download_url: `https://example.com/files/${req.params.fileId}`,
    expires_in: 3600,
  });
});

// POST endpoint
app.post("/api/submit", paymentRequired({
  price: "0.01",
  currency: "USDC",
  chainId: 8453,
  description: "Form submission fee"
}), (req, res) => {
  res.json({
    message: "Submission received and processed",
    submitted_data: req.body,
    status: "success",
  });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("\n" + "=".repeat(60));
  console.log("fastx402 Example Server");
  console.log("=".repeat(60));
  console.log(`\nServer running on http://localhost:${PORT}`);
  console.log("\nAvailable endpoints:");
  console.log("  GET  /              - Root (free)");
  console.log("  GET  /free          - Free endpoint");
  console.log("  GET  /paid          - Paid endpoint (0.01 USDC)");
  console.log("  GET  /premium       - Premium endpoint (0.05 USDC)");
  console.log("  GET  /api/data      - API data (0.02 USDC)");
  console.log("  GET  /download/:id  - Download (0.03 USDC)");
  console.log("  POST /api/submit    - Submit (0.01 USDC)");
  console.log("\n" + "=".repeat(60) + "\n");
});
