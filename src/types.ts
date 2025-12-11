/**
 * Type definitions for fastx402
 */

import { Request, Response, NextFunction } from "express";

export interface PaymentChallenge {
  price: string;
  currency: string;
  chain_id: number;
  merchant: string;
  timestamp: number;
  description?: string;
  nonce?: string;
}

export interface PaymentSignature {
  signature: string;
  signer: string;
  challenge: PaymentChallenge;
  messageHash?: string;
}

export interface PaymentConfig {
  merchantAddress: string;
  chainId?: number;
  currency?: string;
  mode?: "instant" | "embedded";
  waasProvider?: string;
  waasConfig?: Record<string, any>;
}

export interface PaymentVerificationResult {
  valid: boolean;
  signer?: string;
  error?: string;
  txHash?: string;
}

export interface RoutePaymentConfig {
  price: string;
  currency?: string;
  chainId?: number;
  description?: string;
}

export type X402Request = Request & {
  x402Challenge?: PaymentChallenge;
  x402Verified?: boolean;
};

export type X402Response = Response;

export type X402Next = NextFunction;

export interface WalletProvider {
  verifyPayment(
    challenge: PaymentChallenge,
    signature: string,
    signer: string
  ): Promise<PaymentVerificationResult>;
  getWalletAddress(userId: string): Promise<string | null>;
  signPayment(challenge: PaymentChallenge, userId: string): Promise<string | null>;
}

