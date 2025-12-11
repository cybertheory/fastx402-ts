/**
 * fastx402 - TypeScript/Express integration for x402 HTTP-native payments
 */

// Server exports
export {
  x402Middleware,
  paymentRequired,
  createChallenge,
  issue402Response,
  verifyPaymentHeader,
  configureX402,
} from "./server";

// Client exports
export { X402Client } from "./client";
export type { X402ClientOptions } from "./client";

// Fetch wrapper exports
export {
  initX402Fetch,
  x402Fetch,
  createX402Fetch,
} from "./fetchWrapper";
export type { X402FetchConfig } from "./fetchWrapper";

// Axios wrapper exports
export {
  addX402Interceptor,
  createX402Axios,
} from "./axiosWrapper";

// WAAS exports
export { BaseWalletProvider, PrivyWalletProvider } from "./waas";

// Type exports
export type {
  PaymentChallenge,
  PaymentSignature,
  PaymentConfig,
  PaymentVerificationResult,
  RoutePaymentConfig,
  X402Request,
  X402Response,
  X402Next,
} from "./types";

// Re-export WalletProvider type
export type { WalletProvider } from "./types";

// Utils (for advanced usage)
export {
  getEIP712Domain,
  getEIP712Types,
  createPaymentMessage,
  encodePaymentMessage,
  verifySignature,
  generateNonce,
  validateAddress,
  loadConfigFromEnv,
} from "./utils";

