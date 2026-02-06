export const BaseKagetABI = [
    {
        inputs: [
            { internalType: "address", name: "_trustedSigner", type: "address" }
        ],
        stateMutability: "nonpayable",
        type: "constructor"
    },
    {
        name: "GiveawayCreated",
        type: "event",
        anonymous: false,
        inputs: [
            { indexed: true, internalType: "uint256", name: "giveawayId", type: "uint256" },
            { indexed: true, internalType: "address", name: "creator", type: "address" },
            { indexed: false, internalType: "address", name: "token", type: "address" },
            { indexed: false, internalType: "uint256", name: "maxClaims", type: "uint256" },
            { indexed: false, internalType: "uint256", name: "rewardPerClaim", type: "uint256" },
            { indexed: false, internalType: "uint256", name: "expiresAt", type: "uint256" }
        ]
    },
    {
        name: "RewardClaimed",
        type: "event",
        anonymous: false,
        inputs: [
            { indexed: true, internalType: "uint256", name: "giveawayId", type: "uint256" },
            { indexed: true, internalType: "uint256", name: "fid", type: "uint256" },
            { indexed: true, internalType: "address", name: "claimer", type: "address" },
            { indexed: false, internalType: "uint256", name: "amount", type: "uint256" }
        ]
    },
    {
        inputs: [
            { internalType: "uint256", name: "giveawayId", type: "uint256" },
            { internalType: "uint256", name: "maxClaims", type: "uint256" },
            { internalType: "uint256", name: "rewardPerClaim", type: "uint256" },
            { internalType: "uint256", name: "duration", type: "uint256" }
        ],
        name: "createGiveaway",
        outputs: [],
        stateMutability: "payable",
        type: "function"
    },
    {
        inputs: [
            { internalType: "uint256", name: "giveawayId", type: "uint256" },
            { internalType: "address", name: "token", type: "address" },
            { internalType: "uint256", name: "maxClaims", type: "uint256" },
            { internalType: "uint256", name: "rewardPerClaim", type: "uint256" },
            { internalType: "uint256", name: "duration", type: "uint256" }
        ],
        name: "createGiveawayERC20",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function"
    },
    {
        inputs: [
            { internalType: "uint256", name: "giveawayId", type: "uint256" },
            { internalType: "uint256", name: "fid", type: "uint256" },
            { internalType: "bytes", name: "signature", type: "bytes" }
        ],
        name: "claim",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function"
    },
    {
        inputs: [{ internalType: "uint256", name: "giveawayId", type: "uint256" }],
        name: "cancelGiveaway",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function"
    },
    {
        inputs: [{ internalType: "uint256", name: "giveawayId", type: "uint256" }],
        name: "withdrawExpired",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function"
    },
    {
        inputs: [{ internalType: "uint256", name: "giveawayId", type: "uint256" }],
        name: "giveaways",
        outputs: [
            { internalType: "address", name: "creator", type: "address" },
            { internalType: "address", name: "token", type: "address" },
            { internalType: "uint256", name: "rewardPerClaim", type: "uint256" },
            { internalType: "uint256", name: "maxClaims", type: "uint256" },
            { internalType: "uint256", name: "claimedCount", type: "uint256" },
            { internalType: "uint256", name: "expiresAt", type: "uint256" },
            { internalType: "bool", name: "isActive", type: "bool" }
        ],
        stateMutability: "view",
        type: "function"
    },
    {
        inputs: [
            { internalType: "uint256", name: "giveawayId", type: "uint256" },
            { internalType: "uint256", name: "fid", type: "uint256" }
        ],
        name: "hasClaimed",
        outputs: [{ internalType: "bool", name: "", type: "bool" }],
        stateMutability: "view",
        type: "function"
    }
] as const;
