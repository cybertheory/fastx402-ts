# fastx402 (TypeScript)

TypeScript/Express integration for [x402](https://x402.io) HTTP-native payments using stablecoins.

## Installation

```bash
npm install fastx402
# or
yarn add fastx402
# or
pnpm add fastx402
```

## Quick Start

### 1. Environment Setup

Create a `.env` file:

```env
X402_RECEIVER_ADDRESS=0xYourMerchantAddress
X402_CHAIN_ID=8453
X402_CURRENCY=USDC
X402_MODE=instant
```

### 2. Basic Server Usage

```typescript
import express from "express";
import { paymentRequired, configureX402 } from "fastx402";

// Configure (optional, will load from env if not provided)
configureX402();

const app = express();
app.use(express.json());

app.get("/free", (req, res) => {
  res.json({ msg: "no charge" });
});

app.get("/paid", paymentRequired({
  price: "0.01",
  currency: "USDC",
  chainId: 8453,
  description: "Example paid endpoint"
}), (req, res) => {
  res.json({ msg: "you paid!" });
});

app.listen(3000, () => {
  console.log("Server running on port 3000");
});
```

### 3. Client Usage

#### X402Client

```typescript
import { X402Client } from "fastx402/client";

const client = new X402Client({
  baseUrl: "https://api.example.com",
  rpcHandler: async (challenge) => {
    // Emit challenge to frontend for signing
    return signedPayment;
  }
});

// Make request - automatically handles 402 challenges
const response = await client.get("/paid-endpoint");
const data = await response.json();
```

#### Fetch Wrapper

Wrap `fetch` to automatically handle 402 challenges:

```typescript
import { initX402Fetch } from "fastx402";

initX402Fetch({
  handleX402: async (challenge) => {
    // Sign challenge and return X-PAYMENT header value
    return await signWithWallet(challenge);
  }
});

// Now all fetch calls automatically handle 402s
const response = await fetch("https://api.example.com/protected");
const data = await response.json();
```

Or create a wrapped fetch function:

```typescript
import { createX402Fetch } from "fastx402";

const x402Fetch = createX402Fetch(async (challenge) => {
  return await signWithWallet(challenge);
});

const response = await x402Fetch("https://api.example.com/protected");
```

#### Axios Wrapper

Add x402 interceptor to axios:

```typescript
import axios from "axios";
import { addX402Interceptor } from "fastx402";

addX402Interceptor(axios, async (challenge) => {
  return await wallet.sign(challenge);
});

// Now all axios requests automatically handle 402s
const response = await axios.get("https://api.example.com/protected");
```

Or create a new axios instance:

```typescript
import { createX402Axios } from "fastx402";

const axiosInstance = createX402Axios(async (challenge) => {
  return await signWithWallet(challenge);
});

const response = await axiosInstance.get("https://api.example.com/protected");
```

## Features

### Server

- ✅ Express middleware for x402-protected routes
- ✅ Automatic 402 challenge generation
- ✅ Payment signature verification
- ✅ WAAS provider support (Privy)
- ✅ Environment-based configuration
- ✅ Per-route payment configuration

### Client

- ✅ Automatic 402 challenge detection
- ✅ RPC handler integration for frontend signing
- ✅ Automatic request retry with payment headers
- ✅ Works in Node.js, Edge functions, and browsers

## Configuration

### Environment Variables

- `X402_RECEIVER_ADDRESS` or `X402_MERCHANT_ADDRESS`: Your merchant wallet address (required)
- `X402_CHAIN_ID`: Default chain ID (e.g., `8453` for Base)
- `X402_CURRENCY`: Default currency (e.g., `USDC`)
- `X402_MODE`: Payment mode - `instant` (frontend RPC) or `embedded` (WAAS)
- `X402_WAAS_PROVIDER`: WAAS provider name (e.g., `privy`)

### Runtime Configuration

```typescript
import { configureX402 } from "fastx402";
import { PrivyWalletProvider } from "fastx402/waas";

const privy = new PrivyWalletProvider({
  appId: "your-privy-app-id",
  appSecret: "your-privy-app-secret"
});

configureX402({
  merchantAddress: "0x...",
  chainId: 8453,
  currency: "USDC",
  mode: "embedded"
}, privy);
```

## Payment Modes

### Instant Mode (Default)

Frontend handles wallet signing via RPC. The server verifies signatures locally.

### Embedded Mode

Uses Wallet-as-a-Service (WAAS) providers like Privy for embedded wallet signing and verification.

## WAAS Integration

### Privy Setup

```typescript
import { PrivyWalletProvider } from "fastx402/waas";
import { configureX402 } from "fastx402";

const privy = new PrivyWalletProvider({
  appId: "your-privy-app-id",
  appSecret: "your-privy-app-secret"
});

configureX402(undefined, privy);
```

## Advanced Usage

### Custom Middleware

```typescript
import { x402Middleware } from "fastx402/server";

app.get("/custom", 
  x402Middleware({
    price: "0.05",
    currency: "USDC",
    chainId: 8453
  }),
  (req, res) => {
    res.json({ data: "premium content" });
  }
);
```

### Client with Custom RPC Handler

```typescript
import { X402Client } from "fastx402/client";
import type { PaymentChallenge, PaymentSignature } from "fastx402";

const client = new X402Client({
  baseUrl: "https://api.example.com"
});

// Set RPC handler that communicates with frontend
client.setRpcHandler(async (challenge: PaymentChallenge) => {
  // Send challenge to frontend via WebSocket, IPC, or other mechanism
  // Wait for signed payment response
  // Return PaymentSignature
  return {
    signature: "...",
    signer: "0x...",
    challenge
  };
});
```

## API Reference

### Server

- `paymentRequired(config)` - Express middleware for payment protection
- `x402Middleware(config)` - Same as paymentRequired (alias)
- `configureX402(config?, walletProvider?)` - Configure global settings
- `createChallenge(routeConfig)` - Create payment challenge
- `verifyPaymentHeader(req)` - Verify X-PAYMENT header

### Client

- `X402Client` - Client class for handling 402 challenges
  - `request(url, options)` - Make HTTP request
  - `get(url, options)` - GET request
  - `post(url, body, options)` - POST request
  - `put(url, body, options)` - PUT request
  - `delete(url, options)` - DELETE request
  - `setRpcHandler(handler)` - Set payment signing handler

### Fetch Wrapper

- `initX402Fetch(config)` - Initialize global fetch wrapper
- `x402Fetch(input, init, baseFetch?, handleX402?)` - x402-enabled fetch
- `createX402Fetch(handleX402, baseFetch?)` - Create wrapped fetch function

### Axios Wrapper

- `addX402Interceptor(axiosInstance, handleX402)` - Add interceptor to axios
- `createX402Axios(handleX402, axiosInstance?)` - Create axios instance with x402 support

## Testing

```bash
npm test
```

## License

MIT

# fastx402-ts
# fastx402
