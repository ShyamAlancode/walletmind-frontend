
const { Client, TopicCreateTransaction, AccountId, PrivateKey } = require("@hashgraph/sdk");
const fs = require("fs");

async function createTopic(name) {
    const client = Client.forTestnet();
    client.setOperator(
        AccountId.fromString(process.env.HEDERA_ACCOUNT_ID),
        PrivateKey.fromString(process.env.HEDERA_PRIVATE_KEY)
    );
    try {
        fs.appendFileSync("debug_hcs.txt", `Creating topic: ${name}...\n`);
        const receipt = await new TopicCreateTransaction()
            .execute(client)
            .then(r => r.getReceipt(client));
        fs.appendFileSync("debug_hcs.txt", `${name}: ${receipt.topicId.toString()}\n`);
        console.log(`${name}: ${receipt.topicId.toString()}`);
    } catch (e) {
        fs.appendFileSync("debug_hcs.txt", `Error creating topic ${name}: ${e.message}\n`);
        throw e;
    } finally {
        client.close();
    }
}

async function main() {
    fs.writeFileSync("debug_hcs.txt", "Starting individualized HCS topic creation...\n");
    const names = ["Market Scout", "Strategy Advisor", "Risk Auditor"];
    for (const name of names) {
        await createTopic(name);
        await new Promise(r => setTimeout(r, 2000)); // Gap between creations
    }
}
main().catch(err => {
    fs.appendFileSync("debug_hcs.txt", `FATAL: ${err.message}\n`);
    process.exit(1);
});
