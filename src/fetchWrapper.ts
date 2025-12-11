/**
 * Fetch wrapper for x402 payment challenges
 */

import type { PaymentChallenge } from "./types";

export interface X402FetchConfig {
  fetch?: typeof fetch;
  handleX402: (challenge: PaymentChallenge) => Promise<string>;
}

let globalX402Config: X402FetchConfig | null = null;

/**
 * Initialize global fetch wrapper for x402 payments
 */
export function initX402Fetch(config: X402FetchConfig): void {
  globalX402Config = config;
  
  if (typeof globalThis !== "undefined") {
    const originalFetch = config.fetch || globalThis.fetch;
    
    // Wrap global fetch
    globalThis.fetch = async function(
      input: RequestInfo | URL,
      init?: RequestInit
    ): Promise<Response> {
      return x402Fetch(input, init, originalFetch, config.handleX402);
    };
  }
}

/**
 * x402-enabled fetch function
 */
export async function x402Fetch(
  input: RequestInfo | URL,
  init?: RequestInit,
  baseFetch?: typeof fetch,
  handleX402?: (challenge: PaymentChallenge) => Promise<string>
): Promise<Response> {
  const fetchFn = baseFetch || (typeof globalThis !== "undefined" ? globalThis.fetch : fetch);
  const handler = handleX402 || globalX402Config?.handleX402;
  
  if (!handler) {
    throw new Error("handleX402 must be provided. Call initX402Fetch() first or pass handleX402 parameter.");
  }
  
  // Make initial request
  let response = await fetchFn(input, init);
  
  // Handle 402 Payment Required
  if (response.status === 402) {
    try {
      const data = await response.json();
      const challenge = data.challenge as PaymentChallenge;
      
      if (!challenge) {
        return response;
      }
      
      // Get signed payment from handler
      const paymentHeader = await handler(challenge);
      
      if (!paymentHeader) {
        return response;
      }
      
      // Retry request with X-PAYMENT header
      const headers = new Headers(init?.headers);
      headers.set("X-PAYMENT", paymentHeader);
      
      const retryInit: RequestInit = {
        ...init,
        headers,
      };
      
      response = await fetchFn(input, retryInit);
    } catch (error) {
      // If parsing fails, return original 402 response
      console.error("Failed to handle 402 challenge:", error);
    }
  }
  
  return response;
}

/**
 * Create a wrapped fetch function with x402 support
 */
export function createX402Fetch(
  handleX402: (challenge: PaymentChallenge) => Promise<string>,
  baseFetch?: typeof fetch
): typeof fetch {
  return async function(
    input: RequestInfo | URL,
    init?: RequestInit
  ): Promise<Response> {
    return x402Fetch(input, init, baseFetch, handleX402);
  };
}

