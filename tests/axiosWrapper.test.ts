/**
 * Tests for axios wrapper
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import type { AxiosInstance, AxiosRequestConfig } from "axios";
import { addX402Interceptor, createX402Axios } from "../src/axiosWrapper";
import type { PaymentChallenge } from "../src/types";

describe("axiosWrapper", () => {
  let mockAxios: AxiosInstance;
  let handleX402: ReturnType<typeof vi.fn>;
  
  beforeEach(() => {
    handleX402 = vi.fn();
    
    // Create mock axios instance
    mockAxios = {
      interceptors: {
        response: {
          use: vi.fn(),
        },
      },
      request: vi.fn(),
    } as any;
  });
  
  it("should add interceptor to axios instance", () => {
    addX402Interceptor(mockAxios, handleX402);
    
    expect(mockAxios.interceptors.response.use).toHaveBeenCalled();
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
      data: {
        error: "Payment Required",
        challenge,
      },
      config: {
        method: "GET",
        url: "https://api.example.com/protected",
        headers: {},
      },
    };
    
    const mockSuccessResponse = {
      status: 200,
      data: { msg: "success" },
    };
    
    handleX402.mockResolvedValue("signed_payment_header");
    
    // Set up interceptor
    let interceptorFn: any;
    (mockAxios.interceptors.response.use as any).mockImplementation((onFulfilled: any) => {
      interceptorFn = onFulfilled;
    });
    
    // Mock request to return success on retry
    (mockAxios.request as any).mockResolvedValue(mockSuccessResponse);
    
    addX402Interceptor(mockAxios, handleX402);
    
    // Call interceptor
    const result = await interceptorFn(mock402Response);
    
    expect(handleX402).toHaveBeenCalledWith(challenge);
    expect(mockAxios.request).toHaveBeenCalled();
    
    const retryConfig = (mockAxios.request as any).mock.calls[0][0] as AxiosRequestConfig;
    expect(retryConfig.headers?.["X-PAYMENT"]).toBe("signed_payment_header");
    expect(result.data.msg).toBe("success");
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
      data: { challenge },
      config: {
        method: "GET",
        url: "https://api.example.com/protected",
        headers: {
          Authorization: "Bearer token123",
        },
      },
    };
    
    handleX402.mockResolvedValue("signed_payment_header");
    
    let interceptorFn: any;
    (mockAxios.interceptors.response.use as any).mockImplementation((onFulfilled: any) => {
      interceptorFn = onFulfilled;
    });
    
    (mockAxios.request as any).mockResolvedValue({ status: 200, data: {} });
    
    addX402Interceptor(mockAxios, handleX402);
    await interceptorFn(mock402Response);
    
    const retryConfig = (mockAxios.request as any).mock.calls[0][0] as AxiosRequestConfig;
    expect(retryConfig.headers?.Authorization).toBe("Bearer token123");
    expect(retryConfig.headers?.["X-PAYMENT"]).toBe("signed_payment_header");
  });
  
  it("should pass through non-402 responses", async () => {
    const mockSuccessResponse = {
      status: 200,
      data: { msg: "success" },
    };
    
    let interceptorFn: any;
    (mockAxios.interceptors.response.use as any).mockImplementation((onFulfilled: any) => {
      interceptorFn = onFulfilled;
    });
    
    addX402Interceptor(mockAxios, handleX402);
    
    const result = await interceptorFn(mockSuccessResponse);
    
    expect(handleX402).not.toHaveBeenCalled();
    expect(mockAxios.request).not.toHaveBeenCalled();
    expect(result.data.msg).toBe("success");
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
      data: { challenge },
      config: {
        method: "GET",
        url: "https://api.example.com/protected",
        headers: {},
      },
    };
    
    handleX402.mockResolvedValue(null);
    
    let interceptorFn: any;
    (mockAxios.interceptors.response.use as any).mockImplementation((onFulfilled: any) => {
      interceptorFn = onFulfilled;
    });
    
    addX402Interceptor(mockAxios, handleX402);
    
    const result = await interceptorFn(mock402Response);
    
    expect(handleX402).toHaveBeenCalled();
    expect(mockAxios.request).not.toHaveBeenCalled();
    expect(result.status).toBe(402);
  });
});

