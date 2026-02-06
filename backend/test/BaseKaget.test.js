const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { expect } = require("chai");
const { ethers } = require("hardhat");

const generateRandomId = () => {
    // Mimic UUID to BigInt logic: generate random 128-bit number
    return ethers.toBigInt(ethers.randomBytes(16));
};

describe("BaseKaget", function () {
    async function deployFixture() {
        const [owner, signer, user1, user2, user3] = await ethers.getSigners();
        const BaseKaget = await ethers.getContractFactory("BaseKaget");
        const baseKaget = await BaseKaget.deploy(signer.address);

        return { baseKaget, owner, signer, user1, user2, user3 };
    }

    describe("Deployment", function () {
        it("Should set the right owner and trusted signer", async function () {
            const { baseKaget, owner, signer } = await loadFixture(deployFixture);
            expect(await baseKaget.owner()).to.equal(owner.address);
            expect(await baseKaget.trustedSigner()).to.equal(signer.address);
        });
    });

    describe("Create Giveaway", function () {
        it("Should create ETH giveaway with correct values", async function () {
            const { baseKaget, user1 } = await loadFixture(deployFixture);
            const reward = ethers.parseEther("0.1");
            const maxClaims = 5;
            const duration = 3600;
            const id = generateRandomId();

            await expect(
                baseKaget.connect(user1).createGiveaway(id, maxClaims, reward, duration, {
                    value: ethers.parseEther("0.5"),
                })
            )
                .to.emit(baseKaget, "GiveawayCreated")
                .withArgs(id, user1.address, ethers.ZeroAddress, maxClaims, reward, (x) => x > 0);

            const giveaway = await baseKaget.giveaways(id);
            expect(giveaway.creator).to.equal(user1.address);
            expect(giveaway.isActive).to.be.true;
        });

        it("Should revert if ID already exists", async function () {
            const { baseKaget, user1 } = await loadFixture(deployFixture);
            const id = generateRandomId();
            await baseKaget.connect(user1).createGiveaway(id, 1, 100, 3600, { value: 100 });

            await expect(
                baseKaget.connect(user1).createGiveaway(id, 1, 100, 3600, { value: 100 })
            ).to.be.revertedWithCustomError(baseKaget, "GiveawayAlreadyExists");
        });
    });

    describe("Claiming", function () {
        async function createGiveawayFixture() {
            const base = await deployFixture();
            const reward = ethers.parseEther("0.1");
            const id = generateRandomId();
            await base.baseKaget.connect(base.user1).createGiveaway(id, 2, reward, 3600, {
                value: ethers.parseEther("0.2"),
            });
            return { ...base, giveawayId: id, reward };
        }

        it("Should allow claim with valid signature", async function () {
            const { baseKaget, signer, user2, giveawayId, reward } = await loadFixture(createGiveawayFixture);
            const fid = 12345n;

            const chainId = (await ethers.provider.getNetwork()).chainId;
            const messageHash = ethers.solidityPackedKeccak256(
                ["uint256", "uint256", "address", "uint256"],
                [giveawayId, fid, user2.address, chainId]
            );
            const signature = await signer.signMessage(ethers.getBytes(messageHash));

            await expect(baseKaget.connect(user2).claim(giveawayId, fid, signature))
                .to.emit(baseKaget, "RewardClaimed")
                .withArgs(giveawayId, fid, user2.address, reward);

            expect(await baseKaget.hasClaimed(giveawayId, fid)).to.be.true;
        });

        it("Should revert with invalid signature", async function () {
            const { baseKaget, user2, giveawayId } = await loadFixture(createGiveawayFixture);
            const fid = 12345n;

            const chainId = (await ethers.provider.getNetwork()).chainId;
            const messageHash = ethers.solidityPackedKeccak256(
                ["uint256", "uint256", "address", "uint256"],
                [giveawayId, fid, user2.address, chainId]
            );
            // Valid format, wrong signer (user2 signs instead of trustedSigner)
            const signature = await user2.signMessage(ethers.getBytes(messageHash));

            await expect(
                baseKaget.connect(user2).claim(giveawayId, fid, signature)
            ).to.be.revertedWithCustomError(baseKaget, "InvalidSignature");
        });
    });

    describe("Expiry & Withdrawal", function () {
        it("Should allow withdrawing expired funds", async function () {
            const { baseKaget, user1 } = await loadFixture(deployFixture);
            const id = generateRandomId();
            await baseKaget.connect(user1).createGiveaway(id, 2, ethers.parseEther("0.1"), 1, {
                value: ethers.parseEther("0.2"),
            });

            await new Promise(r => setTimeout(r, 2000));
            await ethers.provider.send("evm_increaseTime", [5]);
            await ethers.provider.send("evm_mine", []);

            await expect(baseKaget.connect(user1).withdrawExpired(id))
                .to.emit(baseKaget, "ExpiredFundsWithdrawn")
                .withArgs(id, ethers.parseEther("0.2"));
        });
    });
});
