const { ethers } = require("ethers");
const address = "0xF9d192131F1d19842f1b4c3e8A072E2788e0f6C4";
try {
    const lower = address.toLowerCase();
    console.log("Checksum:", ethers.getAddress(lower));
} catch (e) {
    console.error("Invalid:", e.message);
}
