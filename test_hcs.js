/* eslint-disable @typescript-eslint/no-require-imports */
const { Client, PrivateKey, TopicCreateTransaction, TopicMessageSubmitTransaction } = require("@hashgraph/sdk");

async function test() {
    console.log("Connecting to Hedera testnet...");
    const client = Client.forTestnet();
    client.setRequestTimeout(60000);
    client.setMaxAttempts(3);

    const ACCOUNT_ID = process.env.HEDERA_ACCOUNT_ID || "0.0.8307413";
    const PRIVATE_KEY = process.env.HEDERA_PRIVATE_KEY || "0x28c56312f93866c2ac28edb8abb933f4bd31ff7fdf64dfcb73114378ebbe4ba8";

    if (!PRIVATE_KEY) {
        console.error("ERROR: HEDERA_PRIVATE_KEY not set");
        process.exit(1);
    }

    const cleanKey = PRIVATE_KEY.replace("0x", "");
    const pk = PrivateKey.fromStringECDSA(cleanKey);
    client.setOperator(ACCOUNT_ID, pk);
    console.log("Operator set OK");

    console.log("Creating HCS topic...");
    const createTx = await new TopicCreateTransaction()
        .setTopicMemo("WalletMind Test")
        .execute(client);

    const receipt = await createTx.getReceipt(client);
    const topicId = receipt.topicId.toString();
    console.log("Topic created:", topicId);

    console.log("Submitting message...");
    const submitTx = await new TopicMessageSubmitTransaction()
        .setTopicId(topicId)
        .setMessage("WalletMind HCS test message")
        .execute(client);

    await submitTx.getReceipt(client);
    console.log("Message submitted! TX ID:", submitTx.transactionId.toString());
    console.log("SUCCESS - HCS is working!");
    console.log("Add this to your .env: HCS_TOPIC_ID=" + topicId);

    client.close();
    process.exit(0);
}

test().catch(e => {
    console.error("FAILED:", e.message);
    process.exit(1);
});
