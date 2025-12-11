/**
 * Utility functions for EIP-712 encoding, hex conversion, etc.
 */

import { ethers } from "ethers";
import type { PaymentChallenge } from "./types";

/**
 * Get EIP-712 domain for x402 payments
 */
export function getEIP712Domain(chainId: number) {
  return {
    name: "x402",
    version: "1",
    chainId: chainId,
    verifyingContract: "0x0000000000000000000000000000000000000000",
  };
}

/**
 * Get EIP-712 types for payment message
 */
export function getEIP712Types() {
  return {
    EIP712Domain: [
      { name: "name", type: "string" },
      { name: "version", type: "string" },
      { name: "chainId", type: "uint256" },
      { name: "verifyingContract", type: "address" },
    ],
    Payment: [
      { name: "price", type: "string" },
      { name: "currency", type: "string" },
      { name: "chainId", type: "uint256" },
      { name: "merchant", type: "address" },
      { name: "timestamp", type: "uint256" },
      { name: "description", type: "string" },
    ],
  };
}

/**
 * Create payment message from challenge
 */
export function createPaymentMessage(challenge: PaymentChallenge) {
  return {
    price: challenge.price,
    currency: challenge.currency,
    chainId: challenge.chain_id,
    merchant: ethers.getAddress(challenge.merchant),
    timestamp: challenge.timestamp,
    description: challenge.description || "",
  };
}

/**
 * Encode payment challenge as EIP-712 message hash
 */
export function encodePaymentMessage(challenge: PaymentChallenge): string {
  const domain = getEIP712Domain(challenge.chain_id);
  const types = getEIP712Types();
  const message = createPaymentMessage(challenge);

  // Use ethers to hash the typed data
  const hash = ethers.TypedDataEncoder.hash(domain, types, message);
  return hash;
}

/**
 * Verify EIP-712 signature
 * Note: This verifies the signature against the message hash
 * For full EIP-712 verification, you should reconstruct the typed data
 */
export function verifySignature(
  signature: string,
  messageHash: string,
  signer: string
): boolean {
  try {
    // Recover address from signature and message hash
    // For EIP-712, we need to use the proper recovery method
    const recovered = ethers.recoverAddress(
      ethers.getBytes(messageHash),
      signature
    );
    return recovered.toLowerCase() === signer.toLowerCase();
  } catch (error) {
    return false;
  }
}

/**
 * Generate random nonce
 */
export function generateNonce(): string {
  return ethers.hexlify(ethers.randomBytes(16));
}

/**
 * Validate Ethereum address
 */
export function validateAddress(address: string): boolean {
  return ethers.isAddress(address);
}

/**
 * Load configuration from environment variables
 */
export function loadConfigFromEnv(): PaymentConfig {
  const merchantAddress = process.env.X402_RECEIVER_ADDRESS || process.env.X402_MERCHANT_ADDRESS;
  if (!merchantAddress) {
    throw new Error("X402_RECEIVER_ADDRESS or X402_MERCHANT_ADDRESS environment variable is required");
  }

  return {
    merchantAddress,
    chainId: parseInt(process.env.X402_CHAIN_ID || "8453", 10),
    currency: process.env.X402_CURRENCY || "USDC",
    mode: (process.env.X402_MODE as "instant" | "embedded") || "instant",
    waasProvider: process.env.X402_WAAS_PROVIDER,
  };
}

