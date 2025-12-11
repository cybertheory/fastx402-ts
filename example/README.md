# fastx402 TypeScript Example

Full-featured example demonstrating x402 payment-protected API endpoints with a Vite frontend.

## Features

- **Server**: Express server with multiple payment-protected endpoints
- **Client**: Simple Vite frontend with HTML/buttons for testing payment flows

## Setup

### 1. Install Dependencies

```bash
cd fastx402-ts
npm install

cd example
npm install
```

### 2. Configure Environment (Optional)

Create a `.env` file or set environment variables:

```bash
export X402_MERCHANT_ADDRESS="0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
export X402_CHAIN_ID="8453"
export X402_CURRENCY="USDC"
```

## Running the Server

```bash
npm run server
```

The server will start on `http://localhost:3000`

### Available Endpoints

- `GET /` - Root endpoint (free)
- `GET /free` - Free endpoint
- `GET /paid` - Paid endpoint (0.01 USDC)
- `GET /premium` - Premium endpoint (0.05 USDC)
- `GET /api/data` - API data endpoint (0.02 USDC)
- `GET /download/:fileId` - Download endpoint (0.03 USDC)
- `POST /api/submit` - Submit endpoint (0.01 USDC)

## Running the Frontend Client

```bash
npm run frontend
```

The frontend will start on `http://localhost:5173` (Vite default port)

### Frontend Features

- **Wallet Connection**: Connect MetaMask or other EIP-1193 compatible wallets
- **Free Endpoint Testing**: Test free endpoints without payment
- **Paid Endpoint Testing**: Test payment-protected endpoints
- **Challenge Display**: View payment challenge details
- **Signature Flow**: Sign challenges and retry requests automatically

## Usage Flow

1. **Start the server**:
   ```bash
   npm run server
   ```

2. **Start the frontend** (in another terminal):
   ```bash
   npm run frontend
   ```

3. **Open the browser** to `http://localhost:5173`

4. **Connect your wallet**:
   - Click "Connect Wallet"
   - Approve the connection in MetaMask

5. **Test endpoints**:
   - Click "GET /free" to test a free endpoint
   - Click "GET /paid" to test a paid endpoint
   - When a 402 is received, the challenge will be displayed
   - Click "Sign Challenge" to sign and retry the request

## Example Session

1. **Connect Wallet**: Click "Connect Wallet" button
   - Status: `Connected (0x1234...5678)`

2. **Test Free Endpoint**: Click "GET /free"
   - Response: `{ "message": "This endpoint is free!", ... }`

3. **Test Paid Endpoint**: Click "GET /paid (0.01 USDC)"
   - Status: `Payment required. Please sign the challenge.`
   - Challenge displayed with price, chain ID, merchant address
   - Click "Sign Challenge"
   - MetaMask popup appears for signature
   - After signing: `Payment verified! Request successful!`
   - Response: `{ "message": "You paid! Here's your content.", ... }`

## How It Works

1. **Client makes request** to a payment-protected endpoint
2. **Server responds with 402** Payment Required and a challenge
3. **Frontend displays challenge** with payment details
4. **User signs challenge** using their wallet (EIP-712)
5. **Frontend retries request** with `X-PAYMENT` header containing signature
6. **Server verifies signature** and returns protected content

## Project Structure

```
example/
├── server.ts          # Express server with payment-protected endpoints
├── client.ts          # Frontend TypeScript (Vite entry point)
├── index.html         # HTML entry point
├── vite.config.ts     # Vite configuration
├── package.json       # Dependencies
└── README.md          # This file
```

## Testing with curl

You can also test the server directly:

```bash
# Free endpoint (no payment)
curl http://localhost:3000/free

# Paid endpoint (will get 402)
curl http://localhost:3000/paid

# With payment header (after signing)
curl -H "X-PAYMENT: {...}" http://localhost:3000/paid
```

## Development

### Watch Mode

Run server in watch mode for development:

```bash
npm run dev
```

### Build Frontend

Build the frontend for production:

```bash
npm run build
```

Preview production build:

```bash
npm run preview
```

## Security Notes

- This example uses browser wallet integration (MetaMask, etc.)
- In production, implement proper error handling and user feedback
- Consider using x402instant package for more robust wallet integration
- Never expose private keys in client-side code
- Use environment variables for sensitive configuration

## Next Steps

- Integrate with x402instant package for better wallet support
- Add payment verification on-chain
- Implement payment caching/nonce tracking
- Add rate limiting and abuse prevention
- Style improvements and better UX
