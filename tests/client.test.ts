/**
 * Tests for x402 client
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { X402Client } from "../src/client";
import type { PaymentChallenge, PaymentSignature } from "../src/types";

describe("X402Client", () => {
  let client: X402Client;
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn();
    global.fetch = mockFetch as any;
    client = new X402Client({
      baseUrl: "https://api.example.com",
      rpcHandler: async (challenge) => {
        return {
          signature: "0x1234",
          signer: "0x5678",
          challenge,
        };
      },
    });
  });

  it("should handle 402 and retry with payment header", async () => {
    const challenge: PaymentChallenge = {
      price: "0.01",
      currency: "USDC",
      chain_id: 8453,
      merchant: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0",
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

    const response = await client.get("/protected");

    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(response.status).toBe(200);

    // Check that X-PAYMENT header was added on retry
    const retryCall = mockFetch.mock.calls[1];
    const retryInit = retryCall[1] as RequestInit;
    const headers = retryInit.headers as Headers;
    expect(headers.get("X-PAYMENT")).toBeTruthy();
  });

  it("should preserve original headers", async () => {
    const challenge: PaymentChallenge = {
      price: "0.01",
      currency: "USDC",
      chain_id: 8453,
      merchant: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0",
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

    await client.get("/protected", {
      headers: {
        Authorization: "Bearer token123",
      },
    });

    const retryCall = mockFetch.mock.calls[1];
    const retryInit = retryCall[1] as RequestInit;
    const headers = retryInit.headers as Headers;

    expect(headers.get("Authorization")).toBe("Bearer token123");
    expect(headers.get("X-PAYMENT")).toBeTruthy();
  });

  it("should return 402 if handler returns null", async () => {
    const clientWithoutHandler = new X402Client({
      baseUrl: "https://api.example.com",
      rpcHandler: async () => null,
    });

    const challenge: PaymentChallenge = {
      price: "0.01",
      currency: "USDC",
      chain_id: 8453,
      merchant: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0",
      timestamp: 1699123456,
    };

    const mock402Response = {
      status: 402,
      json: async () => ({ challenge }),
    };

    mockFetch.mockResolvedValueOnce(mock402Response as Response);

    try {
      await clientWithoutHandler.get("/protected");
      expect.fail("Should have thrown error");
    } catch (error: any) {
      expect(error.message).toContain("Failed to obtain payment signature");
    }
  });

  it("should pass through non-402 responses", async () => {
    const mockSuccessResponse = {
      status: 200,
      json: async () => ({ msg: "success" }),
    };

    mockFetch.mockResolvedValueOnce(mockSuccessResponse as Response);

    const response = await client.get("/public");

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.msg).toBe("success");
  });

  it("should handle POST requests", async () => {
    const mockResponse = {
      status: 200,
      json: async () => ({}),
    };

    mockFetch.mockResolvedValueOnce(mockResponse as Response);

    await client.post("/endpoint", { data: "test" });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const call = mockFetch.mock.calls[0];
    expect(call[0]).toBe("https://api.example.com/endpoint");
    const init = call[1] as RequestInit;
    expect(init.method).toBe("POST");
    expect(init.headers).toBeDefined();
    const headers = init.headers as Headers;
    expect(headers.get("Content-Type")).toBe("application/json");
  });

  it("should handle PUT requests", async () => {
    const mockResponse = {
      status: 200,
      json: async () => ({}),
    };

    mockFetch.mockResolvedValueOnce(mockResponse as Response);

    await client.put("/endpoint", { data: "test" });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const call = mockFetch.mock.calls[0];
    const init = call[1] as RequestInit;
    expect(init.method).toBe("PUT");
  });

  it("should handle DELETE requests", async () => {
    const mockResponse = {
      status: 200,
      json: async () => ({}),
    };

    mockFetch.mockResolvedValueOnce(mockResponse as Response);

    await client.delete("/endpoint");

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const call = mockFetch.mock.calls[0];
    const init = call[1] as RequestInit;
    expect(init.method).toBe("DELETE");
  });

  it("should handle full URLs", async () => {
    const mockResponse = {
      status: 200,
      json: async () => ({}),
    };

    mockFetch.mockResolvedValueOnce(mockResponse as Response);

    await client.get("https://other-api.com/endpoint");

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const call = mockFetch.mock.calls[0];
    expect(call[0]).toBe("https://other-api.com/endpoint");
  });

  it("should throw error if no rpcHandler configured", async () => {
    const clientWithoutHandler = new X402Client({
      baseUrl: "https://api.example.com",
    });

    const challenge: PaymentChallenge = {
      price: "0.01",
      currency: "USDC",
      chain_id: 8453,
      merchant: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0",
      timestamp: 1699123456,
    };

    const mock402Response = {
      status: 402,
      json: async () => ({ challenge }),
    };

    mockFetch.mockResolvedValueOnce(mock402Response as Response);

    try {
      await clientWithoutHandler.get("/protected");
      expect.fail("Should have thrown error");
    } catch (error: any) {
      expect(error.message).toContain("No RPC handler configured");
    }
  });

  it("should allow setting rpcHandler after construction", async () => {
    const client = new X402Client({
      baseUrl: "https://api.example.com",
    });

    client.setRpcHandler(async (challenge) => {
      return {
        signature: "0x1234",
        signer: "0x5678",
        challenge,
      };
    });

    const challenge: PaymentChallenge = {
      price: "0.01",
      currency: "USDC",
      chain_id: 8453,
      merchant: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0",
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

    const response = await client.get("/protected");

    expect(response.status).toBe(200);
  });
});

