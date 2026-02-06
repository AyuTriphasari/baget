const hre = require("hardhat");

async function main() {
    const [deployer] = await hre.ethers.getSigners();
    const networkName = hre.network.name;

    console.log("Deploying contracts with the account:", deployer.address);
    console.log("Network:", networkName);

    // Use deployer as initial trusted signer
    // IMPORTANT: For production, consider using a separate key for trustedSigner
    const trustedSigner = process.env.TRUSTED_SIGNER_ADDRESS || deployer.address;
    console.log("Setting trusted signer to:", trustedSigner);

    const BaseKaget = await hre.ethers.getContractFactory("BaseKaget");
    const contract = await BaseKaget.deploy(trustedSigner);

    await contract.waitForDeployment();
    const address = await contract.getAddress();

    console.log("BaseKaget deployed to:", address);
    console.log("Verify with:");
    console.log(`npx hardhat verify --network ${networkName} ${address} ${trustedSigner}`);

    const fs = require("fs");
    fs.writeFileSync("deployed_addresses.json", JSON.stringify({
        address: address,
        network: networkName,
        trustedSigner: trustedSigner,
        deployedAt: new Date().toISOString()
    }, null, 2));
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
