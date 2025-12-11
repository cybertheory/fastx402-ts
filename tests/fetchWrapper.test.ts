/**
 * Tests for fetch wrapper
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { initX402Fetch, x402Fetch, createX402Fetch } from "../src/fetchWrapper";
import type { PaymentChallenge } from "../src/types";

describe("fetchWrapper", () => {
  let mockFetch: ReturnType<typeof vi.fn>;
  let handleX402: ReturnType<typeof vi.fn>;
  
  beforeEach(() => {
    mockFetch = vi.fn();
    handleX402 = vi.fn();
  });
  
  it("should handle 402 and retry with payment header", async () => {
    const challenge: PaymentChallenge = {
      price: "0.01",
      currency: "USDC",
      chain_id: 8453,
      merchant: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
      timestamp: 1699123456,
    };
    
    const mock402Response = {
      status: 402,
      json: async () => ({
        error: "Payment Required",
        challenge,
      }),
    };
    
    const mockSuccessResponse = {
      status: 200,
      json: async () => ({ msg: "success" }),
    };
    
    mockFetch
      .mockResolvedValueOnce(mock402Response as Response)
      .mockResolvedValueOnce(mockSuccessResponse as Response);
    
    handleX402.mockResolvedValue("signed_payment_header");
    
    const wrappedFetch = createX402Fetch(handleX402, mockFetch as any);
    const response = await wrappedFetch("https://api.example.com/protected");
    
    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(handleX402).toHaveBeenCalledWith(challenge);
    
    // Check that X-PAYMENT header was added on retry
    const retryCall = mockFetch.mock.calls[1];
    const retryInit = retryCall[1] as RequestInit;
    const headers = retryInit.headers as Headers;
    
    expect(headers.get("X-PAYMENT")).toBe("signed_payment_header");
    expect(response.status).toBe(200);
  });
  
  it("should preserve original headers", async () => {
    const challenge: PaymentChallenge = {
      price: "0.01",
      currency: "USDC",
      chain_id: 8453,
      merchant: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
      timestamp: 1699123456,
    };
    
    const mock402Response = {
      status: 402,
      json: async () => ({ challenge }),
    };
    
    const mockSuccessResponse = {
      status: 200,
      json: async () => ({}),
    };
    
    mockFetch
      .mockResolvedValueOnce(mock402Response as Response)
      .mockResolvedValueOnce(mockSuccessResponse as Response);
    
    handleX402.mockResolvedValue("signed_payment_header");
    
    const wrappedFetch = createX402Fetch(handleX402, mockFetch as any);
    await wrappedFetch("https://api.example.com/protected", {
      headers: {
        "Authorization": "Bearer token123",
      },
    });
    
    const retryCall = mockFetch.mock.calls[1];
    const retryInit = retryCall[1] as RequestInit;
    const headers = retryInit.headers as Headers;
    
    expect(headers.get("Authorization")).toBe("Bearer token123");
    expect(headers.get("X-PAYMENT")).toBe("signed_payment_header");
  });
  
  it("should return 402 if handler returns null", async () => {
    const challenge: PaymentChallenge = {
      price: "0.01",
      currency: "USDC",
      chain_id: 8453,
      merchant: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
      timestamp: 1699123456,
    };
    
    const mock402Response = {
      status: 402,
      json: async () => ({ challenge }),
    };
    
    mockFetch.mockResolvedValueOnce(mock402Response as Response);
    handleX402.mockResolvedValue(null);
    
    const wrappedFetch = createX402Fetch(handleX402, mockFetch as any);
    const response = await wrappedFetch("https://api.example.com/protected");
    
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(response.status).toBe(402);
  });
  
  it("should pass through non-402 responses", async () => {
    const mockSuccessResponse = {
      status: 200,
      json: async () => ({ msg: "success" }),
    };
    
    mockFetch.mockResolvedValueOnce(mockSuccessResponse as Response);
    
    const wrappedFetch = createX402Fetch(handleX402, mockFetch as any);
    const response = await wrappedFetch("https://api.example.com/protected");
    
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(handleX402).not.toHaveBeenCalled();
    expect(response.status).toBe(200);
  });
});

