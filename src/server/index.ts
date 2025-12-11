/**
 * Server-side x402 payment middleware and utilities
 */

import type {
  X402Request,
  X402Response,
  X402Next,
  PaymentChallenge,
  PaymentConfig,
  PaymentVerificationResult,
  RoutePaymentConfig,
  WalletProvider,
} from "../types";
import { generateNonce, encodePaymentMessage, verifySignature, loadConfigFromEnv } from "../utils";

let globalConfig: PaymentConfig | null = null;
let globalWalletProvider: WalletProvider | null = null;

/**
 * Configure global x402 server settings
 */
export function configureX402(
  config?: PaymentConfig,
  walletProvider?: WalletProvider
): void {
  if (config) {
    globalConfig = config;
  } else {
    globalConfig = loadConfigFromEnv();
  }
  globalWalletProvider = walletProvider || null;
}

/**
 * Get or create global config
 */
function getConfig(): PaymentConfig {
  if (!globalConfig) {
    globalConfig = loadConfigFromEnv();
  }
  return globalConfig;
}

/**
 * Create a payment challenge
 */
export function createChallenge(
  routeConfig: RoutePaymentConfig,
  config?: PaymentConfig
): PaymentChallenge {
  const serverConfig = config || getConfig();

  return {
    price: routeConfig.price,
    currency: routeConfig.currency || serverConfig.currency || "USDC",
    chain_id: routeConfig.chainId || serverConfig.chainId || 8453,
    merchant: serverConfig.merchantAddress,
    timestamp: Math.floor(Date.now() / 1000),
    description: routeConfig.description,
    nonce: generateNonce(),
  };
}

/**
 * Issue 402 Payment Required response
 */
export function issue402Response(
  res: X402Response,
  challenge: PaymentChallenge
): void {
  res.status(402).json({
    error: "Payment Required",
    challenge,
  });
  res.setHeader("X-Payment-Required", "true");
}

/**
 * Verify X-PAYMENT header from request
 */
export async function verifyPaymentHeader(
  req: X402Request
): Promise<PaymentVerificationResult> {
  const paymentHeader = req.headers["x-payment"] as string;
  if (!paymentHeader) {
    return {
      valid: false,
      error: "Missing X-PAYMENT header",
    };
  }

  try {
    const paymentData = JSON.parse(paymentHeader);
    const { signature, signer, challenge: challengeDict } = paymentData;

    if (!signature || !signer || !challengeDict) {
      return {
        valid: false,
        error: "Invalid payment header format",
      };
    }

    const challenge: PaymentChallenge = challengeDict;
    const config = getConfig();

    // Verify signature
    if (config.mode === "embedded" && globalWalletProvider) {
      return await globalWalletProvider.verifyPayment(
        challenge,
        signature,
        signer
      );
    } else {
      // Instant mode: verify locally
      const messageHash = encodePaymentMessage(challenge);
      const isValid = verifySignature(signature, messageHash, signer);

      if (!isValid) {
        return {
          valid: false,
          error: "Signature verification failed",
        };
      }

      return {
        valid: true,
        signer,
      };
    }
  } catch (error: any) {
    return {
      valid: false,
      error: `Verification error: ${error.message}`,
    };
  }
}

/**
 * Express middleware for x402 payment protection
 */
export function x402Middleware(
  routeConfig: RoutePaymentConfig
) {
  return async (req: X402Request, res: X402Response, next: X402Next) => {
    try {
      // Check for X-PAYMENT header
      const paymentHeader = req.headers["x-payment"];

      if (!paymentHeader) {
        // Issue 402 challenge
        const challenge = createChallenge(routeConfig);
        req.x402Challenge = challenge;
        return issue402Response(res, challenge);
      }

      // Verify payment
      const verification = await verifyPaymentHeader(req);

      if (!verification.valid) {
        const challenge = createChallenge(routeConfig);
        req.x402Challenge = challenge;
        res.status(402).json({
          error: "Payment Required",
          challenge,
          verificationError: verification.error,
        });
        res.setHeader("X-Payment-Required", "true");
        return;
      }

      // Payment verified
      req.x402Verified = true;
      res.setHeader("X-Payment-Response", "verified");
      next();
    } catch (error: any) {
      res.status(500).json({
        error: "Internal server error",
        message: error.message,
      });
    }
  };
}

/**
 * Route decorator helper (for Express route definitions)
 */
export function paymentRequired(
  routeConfig: RoutePaymentConfig
) {
  return x402Middleware(routeConfig);
}

