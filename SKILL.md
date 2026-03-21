---
name: WalletMind
version: 1.0.0
description: Personalized AI-powered DeFi advisor for Hedera wallets. Paste any Hedera wallet address to get a real-time portfolio analysis and personalized DeFi strategy, with every interaction logged immutably on Hedera Consensus Service.
author: WalletMind Team
license: MIT
hedera_account: 0.0.8307413
hcs_topic: 0.0.8315989
network: testnet
tags:
  - defi
  - wallet-analysis
  - hedera
  - ai-agent
  - hcs
  - mirror-node
capabilities:
  - name: analyze_wallet
    description: Analyze any Hedera wallet address and return personalized DeFi strategy
    endpoint: POST /analyze
    parameters:
      wallet_address: string (required) — Hedera account ID in format 0.0.xxxxxx
      question: string (optional) — specific question about the portfolio
    returns:
      analysis: string — personalized AI-generated DeFi strategy
      wallet_data: object — real on-chain holdings from Hedera Mirror Node
      tx_hash: string — HCS transaction ID proving interaction was logged on-chain
      timestamp: string — ISO timestamp of analysis
  - name: get_wallet
    description: Fetch raw wallet data for any Hedera address
    endpoint: GET /wallet/{address}
    parameters:
      address: string — Hedera account ID
    returns:
      hbar_balance: number
      tokens: array
      recent_transactions: array
      nfts: array
integrations:
  - name: Hedera Mirror Node
    type: REST API
    url: https://testnet.mirrornode.hedera.com
    purpose: Fetch real-time wallet data including HBAR balance, HTS tokens, transactions, NFTs
  - name: Hedera Consensus Service
    type: gRPC via @hashgraph/sdk
    topic: 0.0.8315989
    purpose: Log every AI interaction immutably on-chain
  - name: SaucerSwap
    type: DEX reference
    url: https://app.saucerswap.finance
    purpose: DeFi yield context for HBAR liquidity pools
  - name: Bonzo Finance
    type: Lending protocol reference
    url: https://bonzo.finance
    purpose: Lending pool yield context
communication:
  protocols:
    - HCS-10
    - REST
  inbox_topic: 0.0.8315989
  language: English
example_queries:
  - "Analyze wallet 0.0.8307413"
  - "What is the best yield strategy for my HBAR holdings?"
  - "What are my risk exposures?"
  - "Should I rebalance my portfolio?"
  - "Top DeFi opportunities on Hedera right now?"
---

# WalletMind — Hedera DeFi Intelligence Agent

WalletMind is an AI-powered DeFi advisor that reads your real Hedera wallet holdings and generates personalized financial strategies. Every analysis is logged permanently on the Hedera Consensus Service, creating a verifiable, tamper-proof audit trail.

## What makes WalletMind different

Unlike generic DeFi chatbots that give the same advice to everyone, WalletMind reads your actual on-chain holdings — your exact HBAR balance, every HTS token you hold, your recent transaction history — and generates advice specific to your portfolio.

## How to interact with WalletMind

Send a POST request to the `/analyze` endpoint with a Hedera wallet address:

```json
{
  "wallet_address": "0.0.8307413",
  "question": "What is the best yield strategy for my holdings?"
}
```

Or visit the live UI at the deployed Vercel URL.

## On-chain verification

Every WalletMind interaction is logged to HCS topic `0.0.8315989` on Hedera testnet. You can verify any interaction at:
`https://hashscan.io/testnet/topic/0.0.8315989`

## Built for

Hedera Hello Future Apex Hackathon 2026 — AI & Agents Track
