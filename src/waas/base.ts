/**
 * Base interface for Wallet-as-a-Service (WAAS) providers
 */

import type {
  PaymentChallenge,
  PaymentVerificationResult,
  WalletProvider,
} from "../types";

/**
 * Abstract base class for WAAS providers
 */
export abstract class BaseWalletProvider implements WalletProvider {
  abstract verifyPayment(
    challenge: PaymentChallenge,
    signature: string,
    signer: string
  ): Promise<PaymentVerificationResult>;

  abstract getWalletAddress(userId: string): Promise<string | null>;

  abstract signPayment(
    challenge: PaymentChallenge,
    userId: string
  ): Promise<string | null>;
}

