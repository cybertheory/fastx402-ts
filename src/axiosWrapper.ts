/**
 * Axios wrapper for x402 payment challenges
 */

import type { AxiosInstance, AxiosRequestConfig, AxiosResponse } from "axios";
import type { PaymentChallenge } from "./types";

export interface X402AxiosConfig {
  handleX402: (challenge: PaymentChallenge) => Promise<string>;
}

/**
 * Add x402 interceptor to axios instance
 */
export function addX402Interceptor(
  axiosInstance: AxiosInstance,
  handleX402: (challenge: PaymentChallenge) => Promise<string>
): void {
  // Response interceptor to handle 402
  axiosInstance.interceptors.response.use(
    async (response: AxiosResponse) => {
      // If status is 402, handle payment challenge
      if (response.status === 402) {
        try {
          const data = response.data;
          const challenge = data?.challenge as PaymentChallenge;
          
          if (!challenge) {
            return response;
          }
          
          // Get signed payment from handler
          const paymentHeader = await handleX402(challenge);
          
          if (!paymentHeader) {
            return response;
          }
          
          // Retry the original request with X-PAYMENT header
          const originalRequest = response.config;
          
          // Add X-PAYMENT header
          const headers = {
            ...originalRequest.headers,
            "X-PAYMENT": paymentHeader,
          };
          
          // Retry request
          const retryConfig: AxiosRequestConfig = {
            ...originalRequest,
            headers,
          };
          
          return await axiosInstance.request(retryConfig);
        } catch (error) {
          console.error("Failed to handle 402 challenge:", error);
          return response;
        }
      }
      
      return response;
    },
    (error) => {
      // Handle errors normally
      return Promise.reject(error);
    }
  );
}

/**
 * Create axios instance with x402 support
 */
export function createX402Axios(
  handleX402: (challenge: PaymentChallenge) => Promise<string>,
  axiosInstance?: AxiosInstance
): AxiosInstance {
  const axios = axiosInstance || require("axios").default;
  
  if (!axios) {
    throw new Error("axios is required. Install it with: npm install axios");
  }
  
  const instance = axiosInstance || axios.create();
  addX402Interceptor(instance, handleX402);
  
  return instance;
}

