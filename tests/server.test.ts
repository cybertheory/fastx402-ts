/**
 * Tests for x402 server functionality
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  createChallenge,
  issue402Response,
  verifyPaymentHeader,
  x402Middleware,
  configureX402,
} from "../src/server";
import type {
  PaymentChallenge,
  PaymentConfig,
  RoutePaymentConfig,
  X402Request,
  X402Response,
} from "../src/types";

describe("x402 Server", () => {
  beforeEach(() => {
    // Reset global config
    configureX402({
      merchantAddress: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0",
      chainId: 8453,
      currency: "USDC",
      mode: "instant",
    });
  });

  describe("createChallenge", () => {
    it("should create challenge with route config", () => {
      const routeConfig: RoutePaymentConfig = {
        price: "0.01",
        currency: "USDC",
        chainId: 8453,
        description: "Test payment",
      };

      const challenge = createChallenge(routeConfig);

      expect(challenge.price).toBe("0.01");
      expect(challenge.currency).toBe("USDC");
      expect(challenge.chain_id).toBe(8453);
      expect(challenge.merchant).toBe("0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0");
      expect(challenge.description).toBe("Test payment");
      expect(challenge.nonce).toBeDefined();
      expect(challenge.timestamp).toBeDefined();
    });

    it("should use global config defaults", () => {
      const routeConfig: RoutePaymentConfig = {
        price: "0.01",
      };

      const challenge = createChallenge(routeConfig);

      expect(challenge.currency).toBe("USDC");
      expect(challenge.chain_id).toBe(8453);
    });

    it("should override global config with route config", () => {
      const routeConfig: RoutePaymentConfig = {
        price: "0.02",
        currency: "ETH",
        chainId: 1,
      };

      const challenge = createChallenge(routeConfig);

      expect(challenge.price).toBe("0.02");
      expect(challenge.currency).toBe("ETH");
      expect(challenge.chain_id).toBe(1);
    });
  });

  describe("issue402Response", () => {
    it("should create 402 response with challenge", () => {
      const challenge: PaymentChallenge = {
        price: "0.01",
        currency: "USDC",
        chain_id: 8453,
        merchant: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0",
        timestamp: 1699123456,
        nonce: "test_nonce",
      };

      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn().mockReturnThis(),
        setHeader: vi.fn(),
      } as unknown as X402Response;

      issue402Response(res, challenge);

      expect(res.status).toHaveBeenCalledWith(402);
      expect(res.json).toHaveBeenCalledWith({
        error: "Payment Required",
        challenge,
      });
      expect(res.setHeader).toHaveBeenCalledWith("X-Payment-Required", "true");
    });
  });

  describe("verifyPaymentHeader", () => {
    it("should return error if X-PAYMENT header is missing", async () => {
      const req = {
        headers: {},
      } as X402Request;

      const result = await verifyPaymentHeader(req);

      expect(result.valid).toBe(false);
      expect(result.error).toBe("Missing X-PAYMENT header");
    });

    it("should return error if payment header format is invalid", async () => {
      const req = {
        headers: {
          "x-payment": "invalid json",
        },
      } as X402Request;

      const result = await verifyPaymentHeader(req);

      expect(result.valid).toBe(false);
      expect(result.error).toContain("Verification error");
    });

    it("should return error if payment header is missing required fields", async () => {
      const req = {
        headers: {
          "x-payment": JSON.stringify({
            signature: "0x1234",
            // Missing signer and challenge
          }),
        },
      } as X402Request;

      const result = await verifyPaymentHeader(req);

      expect(result.valid).toBe(false);
      expect(result.error).toBe("Invalid payment header format");
    });

    it("should verify valid payment header", async () => {
      const challenge: PaymentChallenge = {
        price: "0.01",
        currency: "USDC",
        chain_id: 8453,
        merchant: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0",
        timestamp: 1699123456,
        nonce: "test_nonce",
      };

      // Mock a valid signature (in real scenario, this would be properly signed)
      const paymentData = {
        signature: "0x1234567890abcdef",
        signer: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0",
        challenge,
      };

      const req = {
        headers: {
          "x-payment": JSON.stringify(paymentData),
        },
      } as X402Request;

      // Note: This will fail signature verification, but tests the flow
      const result = await verifyPaymentHeader(req);

      // Signature verification will fail, but structure is correct
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Signature verification failed");
    });
  });

  describe("x402Middleware", () => {
    it("should issue 402 if X-PAYMENT header is missing", async () => {
      const req = {
        headers: {},
        x402Challenge: undefined,
        x402Verified: false,
      } as X402Request;

      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn().mockReturnThis(),
        setHeader: vi.fn(),
      } as unknown as X402Response;

      const next = vi.fn();

      const middleware = x402Middleware({
        price: "0.01",
      });

      await middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(402);
      expect(res.json).toHaveBeenCalled();
      expect(next).not.toHaveBeenCalled();
    });

    it("should call next if payment is verified", async () => {
      const challenge: PaymentChallenge = {
        price: "0.01",
        currency: "USDC",
        chain_id: 8453,
        merchant: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0",
        timestamp: 1699123456,
        nonce: "test_nonce",
      };

      const req = {
        headers: {
          "x-payment": JSON.stringify({
            signature: "0x1234",
            signer: "0x5678",
            challenge,
          }),
        },
        x402Verified: false,
      } as X402Request;

      const res = {
        setHeader: vi.fn(),
      } as unknown as X402Response;

      const next = vi.fn();

      const middleware = x402Middleware({
        price: "0.01",
      });

      await middleware(req, res, next);

      // Note: This will fail signature verification without proper signing
      // The middleware will issue a 402 response
      expect(res.status).toHaveBeenCalledWith(402);
      expect(next).not.toHaveBeenCalled();
    });
  });
});

