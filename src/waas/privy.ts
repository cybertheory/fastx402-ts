/**
 * Privy WAAS provider implementation
 */

import type {
  PaymentChallenge,
  PaymentVerificationResult,
} from "../types";
import { BaseWalletProvider } from "./base";
import { encodePaymentMessage, verifySignature } from "../utils";

interface PrivyConfig {
  appId: string;
  appSecret: string;
  baseUrl?: string;
}

/**
 * Privy wallet-as-a-service provider
 */
export class PrivyWalletProvider extends BaseWalletProvider {
  private appId: string;
  private appSecret: string;
  private baseUrl: string;

  constructor(config: PrivyConfig) {
    super();
    this.appId = config.appId;
    this.appSecret = config.appSecret;
    this.baseUrl = config.baseUrl || "https://auth.privy.io";
  }

  async verifyPayment(
    challenge: PaymentChallenge,
    signature: string,
    signer: string
  ): Promise<PaymentVerificationResult> {
    try {
      // Encode the message
      const messageHash = encodePaymentMessage(challenge);

      // Verify signature locally
      const isValid = verifySignature(signature, messageHash, signer);

      if (!isValid) {
        return {
          valid: false,
          error: "Invalid signature",
        };
      }

      // Optionally verify with Privy API
      // For now, we rely on local verification
      return {
        valid: true,
        signer,
      };
    } catch (error: any) {
      return {
        valid: false,
        error: error.message || "Verification failed",
      };
    }
  }

  async getWalletAddress(userId: string): Promise<string | null> {
    try {
      const response = await fetch(
        `${this.baseUrl}/api/v1/users/${userId}`,
        {
          headers: {
            Authorization: `Bearer ${this.appSecret}`,
            "privy-app-id": this.appId,
          },
        }
      );

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      const wallets = data.wallets || [];
      if (wallets.length > 0) {
        return wallets[0].address;
      }
      return null;
    } catch (error) {
      console.error("Failed to get Privy wallet address:", error);
      return null;
    }
  }

  async signPayment(
    challenge: PaymentChallenge,
    userId: string
  ): Promise<string | null> {
    // This would typically use Privy's embedded wallet signing API
    // For now, return null as this requires Privy SDK integration
    return null;
  }
}

