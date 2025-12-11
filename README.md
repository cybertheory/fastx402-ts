# fastx402 (TypeScript)

TypeScript/Express integration for [x402](https://x402.io) HTTP-native payments using stablecoins. This library enables Node.js/TypeScript backend servers to protect API endpoints with payment requirements using HTTP 402 responses and EIP-712 signature verification.

## Related Packages

- **[fastx402](https://github.com/cybertheory/fastx402)** - Python/FastAPI version for Python backends
- **[x402instant](https://github.com/cybertheory/x402instant)** - Frontend SDK for browser-based wallet integration

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

## Core Architecture

### Server-Side Components

**`x402Middleware` / `paymentRequired`** - Express middleware for payment protection:
- Checks for `X-PAYMENT` header on incoming requests
- If missing, returns HTTP 402 with payment challenge
- If present, verifies signature before calling next middleware
- Supports per-route configuration (price, currency, chain ID, description)

**`createChallenge`** - Challenge creation function:
- Creates payment challenges with price, currency, chain ID, merchant address, and nonce
- Uses global or route-specific configuration
- Generates unique nonces for replay protection

**`verifyPaymentHeader`** - Payment verification function:
- Verifies payment signatures from `X-PAYMENT` headers
- Supports two payment modes: instant (local verification) and embedded (WAAS)
- Returns verification result with signer address

**`configureX402`** - Global configuration:
- Sets global payment configuration
- Configures WAAS providers for embedded mode
- Loads from environment variables if not provided

### Client-Side Components

**`X402Client`** - Client class for handling 402 challenges:
- Automatically detects 402 responses
- Triggers payment signing via RPC handler
- Retries requests with signed `X-PAYMENT` headers
- Supports all HTTP methods (GET, POST, PUT, DELETE)

**Fetch Wrapper** - Global fetch wrapper:
- `initX402Fetch` - Initialize global fetch wrapper
- `x402Fetch` - x402-enabled fetch function
- `createX402Fetch` - Create wrapped fetch function
- Automatic 402 handling and retry logic

**Axios Wrapper** - Axios interceptor:
- `addX402Interceptor` - Add interceptor to existing axios instance
- `createX402Axios` - Create axios instance with x402 support
- Seamless integration with axios-based applications

## Payment Flow

The x402 payment flow follows these steps:

1. **Client Request**: Client makes HTTP request to protected endpoint
2. **402 Response**: Server responds with HTTP 402 and payment challenge JSON
3. **Challenge Display**: Client displays payment details (price, currency, merchant)
4. **User Signing**: User signs challenge using EIP-712 with their wallet
5. **Retry with Payment**: Client retries request with `X-PAYMENT` header containing signature
6. **Verification**: Server verifies signature and grants access
7. **Content Delivery**: Server returns protected content

## Features

### 1. EIP-712 Signature Support

- Uses EIP-712 structured data signing for secure payment verification
- Includes domain separator, type definitions, and message encoding
- Signature verification using `ethers.js` library
- Supports checksum address validation

### 2. Payment Modes

**Instant Mode** (default):
- Frontend handles wallet signing via RPC (MetaMask, WalletConnect, etc.)
- Server verifies signatures locally using cryptographic verification
- No external dependencies for verification

**Embedded Mode**:
- Uses Wallet-as-a-Service (WAAS) providers like Privy
- Server-side wallet management and signing
- Provider-based signature verification

### 3. Configuration Options

**Environment Variables**:
- `X402_RECEIVER_ADDRESS` or `X402_MERCHANT_ADDRESS`: Merchant wallet address (required)
- `X402_CHAIN_ID`: Default chain ID (e.g., `8453` for Base)
- `X402_CURRENCY`: Default currency (e.g., `USDC`)
- `X402_MODE`: Payment mode - `instant` (frontend RPC) or `embedded` (WAAS)
- `X402_WAAS_PROVIDER`: WAAS provider name (e.g., `privy`)

**Runtime Configuration**:
- Override defaults on individual routes
- Custom prices, currencies, chain IDs, and descriptions
- Flexible payment requirements per endpoint

### 4. Multiple HTTP Client Support

- **fetch**: Global wrapper and factory functions
- **axios**: Interceptor and instance factory
- **X402Client**: Dedicated client class
- Automatic 402 detection and retry logic
- Works in Node.js, Edge functions, and browsers

### 5. WAAS Integration

- Abstract `WalletProvider` interface for extensibility
- Privy provider implementation included
- Easy to add support for other WAAS providers
- Server-side wallet management

### 6. Security Features

- **Nonce Generation**: Random nonces for replay protection
- **EIP-712 Signing**: Structured data signing prevents signature replay
- **Signature Verification**: Cryptographic verification before access
- **Address Validation**: Checksum address validation and normalization
- **Error Handling**: Comprehensive error messages and validation

## Configuration

### Environment Variables

```env
X402_RECEIVER_ADDRESS=0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb
X402_CHAIN_ID=8453
X402_CURRENCY=USDC
X402_MODE=instant
```

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

### Per-Route Configuration

```typescript
app.get("/expensive", paymentRequired({
  price: "0.05",
  currency: "USDC",
  chainId: 8453,
  description: "Premium content access"
}), (req, res) => {
  res.json({ content: "premium data" });
});
```

## Payment Modes

### Instant Mode (Default)

Frontend handles wallet signing via RPC. The server verifies signatures locally.

**Use Cases**:
- Web applications with browser wallets
- Mobile apps with wallet integrations
- Desktop applications with wallet connections

### Embedded Mode

Uses Wallet-as-a-Service (WAAS) providers like Privy for embedded wallet signing and verification.

**Use Cases**:
- Applications requiring server-side wallet management
- Embedded wallet solutions
- Applications without direct wallet access

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

## Client Usage

### X402Client

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

### Fetch Wrapper

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

### Axios Wrapper

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

## Type System

The library uses TypeScript interfaces for type safety:

- **`PaymentChallenge`**: Payment challenge structure with price, currency, chain_id, merchant, timestamp, description, and nonce
- **`PaymentConfig`**: Global payment configuration
- **`PaymentVerificationResult`**: Result of payment signature verification
- **`PaymentSignature`**: Signed payment payload with signature, signer, and challenge
- **`RoutePaymentConfig`**: Per-route payment configuration
- **`WalletProvider`**: Interface for WAAS providers

## API Reference

### Server Functions

- `paymentRequired(config)` - Express middleware for payment protection
- `x402Middleware(config)` - Same as paymentRequired (alias)
- `configureX402(config?, walletProvider?)` - Configure global settings
- `createChallenge(routeConfig)` - Create payment challenge
- `verifyPaymentHeader(req)` - Verify X-PAYMENT header
- `issue402Response(res, challenge)` - Issue HTTP 402 response

### Client Classes

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

## Frontend Integration

For frontend applications, use **[x402instant](https://github.com/cybertheory/x402instant)** to handle wallet connections and payment signing:

```typescript
// Backend (fastx402-ts)
app.get("/paid", paymentRequired({
  price: "0.01",
  currency: "USDC",
  chainId: 8453
}), (req, res) => {
  res.json({ msg: "you paid!" });
});
```

```typescript
// Frontend (x402instant)
import { x402Fetch } from "x402instant";

const response = await x402Fetch("http://api.example.com/paid");
const data = await response.json();
```

## Dependencies

- `express` - Web framework
- `ethers` - Ethereum library for signing and verification
- `dotenv` - Environment variable management (optional)

## Testing

```bash
npm test
```

## Examples

See the `example/` directory for complete working examples:
- Express server with multiple payment-protected endpoints
- Vite frontend with wallet integration
- Integration examples with different payment scenarios

## License

MIT
