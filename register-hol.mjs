import { HCS26 } from '@hashgraphonline/standards-sdk';

const skill = {
  name: "WalletMind",
  version: "1.0.0",
  description: "Verifiable AI DeFi copilot for Hedera wallets. Analyzes real on-chain holdings, generates personalized trading, staking, yield and risk strategies, and logs every interaction to Hedera Consensus Service.",
  capabilities: [
    "fetch_wallet_info",
    "get_hbar_price",
    "get_defi_opportunities",
    "submit_hcs_message",
    "create_scheduled_transaction"
  ],
  author: "WalletMind",
  url: "https://walletmind-frontend.vercel.app",
  network: "testnet"
};

const client = await HCS26.createClient({
  accountId: "0.0.8307413",
  privateKey: process.env.HEDERA_PRIVATE_KEY,
  network: "testnet"
});

const result = await HCS26.publishSkill(client, skill);
console.log("UAID:", result.topicId);
console.log("HashScan:", `https://hashscan.io/testnet/topic/${result.topicId}`);
