const hre = require("hardhat");

async function main() {
    const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "0xE9f8F46208d24e032Ce75E4e16858A1a0F89911F";
    const newSigner = process.argv[2];

    if (!newSigner) {
        console.error("❌ Error: Please provide new signer address");
        console.log("Usage: node update-signer.js <NEW_SIGNER_ADDRESS>");
        process.exit(1);
    }

    // Validate address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(newSigner)) {
        console.error("❌ Error: Invalid Ethereum address format");
        process.exit(1);
    }

    console.log("📝 Updating trusted signer...");
    console.log("Contract:", contractAddress);
    console.log("New Signer:", newSigner);
    console.log("Network:", hre.network.name);

    const contract = await hre.ethers.getContractAt("BaseKaget", contractAddress);

    // Get current signer
    const currentSigner = await contract.trustedSigner();
    console.log("Current Signer:", currentSigner);

    if (currentSigner.toLowerCase() === newSigner.toLowerCase()) {
        console.log("⚠️  New signer is the same as current signer. No update needed.");
        return;
    }

    // Update signer
    console.log("\n🔄 Sending transaction...");
    const tx = await contract.setTrustedSigner(newSigner);
    console.log("Transaction hash:", tx.hash);

    console.log("⏳ Waiting for confirmation...");
    await tx.wait();

    // Verify update
    const updatedSigner = await contract.trustedSigner();

    if (updatedSigner.toLowerCase() === newSigner.toLowerCase()) {
        console.log("\n✅ Successfully updated trusted signer!");
        console.log("Old:", currentSigner);
        console.log("New:", updatedSigner);
    } else {
        console.error("\n❌ Error: Signer update verification failed");
        process.exit(1);
    }
}

main().catch((error) => {
    console.error("❌ Error:", error);
    process.exitCode = 1;
});
