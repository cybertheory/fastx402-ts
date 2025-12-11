/**
 * Client for handling x402 payment challenges and retrying requests
 */

import type { PaymentChallenge, PaymentSignature } from "../types";

export interface X402ClientOptions {
  baseUrl?: string;
  rpcHandler?: (challenge: PaymentChallenge) => Promise<PaymentSignature | null>;
  timeout?: number;
}

/**
 * Client for making requests to x402-protected endpoints
 * 
 * Handles 402 responses, triggers payment signing via rpcHandler,
 * and retries requests with X-PAYMENT headers.
 */
export class X402Client {
  private baseUrl: string;
  private rpcHandler?: (challenge: PaymentChallenge) => Promise<PaymentSignature | null>;
  private timeout: number;

  constructor(options: X402ClientOptions = {}) {
    this.baseUrl = options.baseUrl || "";
    this.rpcHandler = options.rpcHandler;
    this.timeout = options.timeout || 30000;
  }

  /**
   * Set RPC handler for payment signing
   */
  setRpcHandler(handler: (challenge: PaymentChallenge) => Promise<PaymentSignature | null>): void {
    this.rpcHandler = handler;
  }

  /**
   * Handle 402 challenge by triggering payment signing
   */
  private async handle402(
    challenge: PaymentChallenge,
    originalUrl: string
  ): Promise<PaymentSignature | null> {
    if (!this.rpcHandler) {
      throw new Error("No RPC handler configured. Use setRpcHandler() or provide rpcHandler in constructor.");
    }

    return await this.rpcHandler(challenge);
  }

  /**
   * Create X-PAYMENT header from signature
   */
  private createPaymentHeader(signature: PaymentSignature): string {
    return JSON.stringify({
      signature: signature.signature,
      signer: signature.signer,
      challenge: signature.challenge,
    });
  }

  /**
   * Make HTTP request with x402 payment handling
   */
  async request(
    url: string,
    options: RequestInit = {}
  ): Promise<Response> {
    const fullUrl = url.startsWith("http") ? url : `${this.baseUrl}${url}`;

    // Make initial request
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    let response: Response;
    try {
      response = await fetch(fullUrl, {
        ...options,
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }

    // Handle 402 Payment Required
    if (response.status === 402) {
      try {
        const data = await response.json();
        const challenge = data.challenge as PaymentChallenge;

        if (!challenge) {
          throw new Error("Invalid 402 challenge format");
        }

        // Get payment signature (from frontend via RPC)
        const paymentData = await this.handle402(challenge, fullUrl);

        if (!paymentData) {
          throw new Error("Failed to obtain payment signature");
        }

        // Retry request with X-PAYMENT header
        const paymentHeader = this.createPaymentHeader(paymentData);
        const headers = new Headers(options.headers);
        headers.set("X-PAYMENT", paymentHeader);

        const retryController = new AbortController();
        const retryTimeoutId = setTimeout(() => retryController.abort(), this.timeout);

        try {
          response = await fetch(fullUrl, {
            ...options,
            headers,
            signal: retryController.signal,
          });
        } finally {
          clearTimeout(retryTimeoutId);
        }
      } catch (error: any) {
        throw new Error(`Failed to handle 402 challenge: ${error.message}`);
      }
    }

    return response;
  }

  /**
   * GET request with x402 handling
   */
  async get(url: string, options?: RequestInit): Promise<Response> {
    return this.request(url, { ...options, method: "GET" });
  }

  /**
   * POST request with x402 handling
   */
  async post(url: string, body?: any, options?: RequestInit): Promise<Response> {
    const headers = new Headers(options?.headers);
    if (body && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }

    return this.request(url, {
      ...options,
      method: "POST",
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  /**
   * PUT request with x402 handling
   */
  async put(url: string, body?: any, options?: RequestInit): Promise<Response> {
    const headers = new Headers(options?.headers);
    if (body && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }

    return this.request(url, {
      ...options,
      method: "PUT",
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  /**
   * DELETE request with x402 handling
   */
  async delete(url: string, options?: RequestInit): Promise<Response> {
    return this.request(url, { ...options, method: "DELETE" });
  }
}

