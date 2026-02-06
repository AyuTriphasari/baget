// SPDX-License-Identifier: OR
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title BaseKaget
 * @notice A Farcaster-native "Base Kaget" (Flash Gift) style giveaway contract.
 * @dev Supports ETH and ERC20 tokens with FCFS (First-Come-First-Serve) distribution.
 *      Claims are authorized via off-chain signatures to verify Farcaster FIDs.
 */
contract BaseKaget is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;
    using ECDSA for bytes32;

    struct Giveaway {
        address creator;
        address token; // address(0) for ETH, token address for ERC20
        uint256 rewardPerClaim;
        uint256 maxClaims;
        uint256 claimedCount;
        uint256 expiresAt; // Timestamp when giveaway expires
        bool isActive;
    }

    // State Variables
    // uint256 public nextGiveawayId; // Removed incremental ID
    address public trustedSigner; // Backend signer for verifying FIDs

    // Mappings
    mapping(uint256 => Giveaway) public giveaways;
    // giveawayId => fid => hasClaimed
    mapping(uint256 => mapping(uint256 => bool)) public hasClaimed;

    // Events
    event GiveawayCreated(
        uint256 indexed giveawayId,
        address indexed creator,
        address token,
        uint256 maxClaims,
        uint256 rewardPerClaim,
        uint256 expiresAt
    );
    event RewardClaimed(
        uint256 indexed giveawayId,
        uint256 indexed fid,
        address indexed claimer,
        uint256 amount
    );
    event GiveawayCancelled(uint256 indexed giveawayId, uint256 refundAmount);
    event ExpiredFundsWithdrawn(
        uint256 indexed giveawayId,
        uint256 refundAmount
    );
    event SignerUpdated(address oldSigner, address newSigner);

    // Errors
    error GiveawayNotFound();
    error GiveawayNotActive();
    error GiveawayExpired();
    error GiveawayNotExpired();
    error MaxClaimsReached();
    error AlreadyClaimed();
    error InvalidSignature();
    error Unauthorized();
    error InvalidFee();
    error TransferFailed();
    error GiveawayAlreadyExists();

    constructor(address _trustedSigner) Ownable(msg.sender) {
        require(_trustedSigner != address(0), "Invalid signer");
        trustedSigner = _trustedSigner;
    }

    function setTrustedSigner(address _newSigner) external onlyOwner {
        require(_newSigner != address(0), "Invalid signer");
        emit SignerUpdated(trustedSigner, _newSigner);
        trustedSigner = _newSigner;
    }

    /**
     * @notice Create a new giveaway with Native ETH
     * @param giveawayId External random ID (UUID converted to uint256)
     */
    function createGiveaway(
        uint256 giveawayId,
        uint256 maxClaims,
        uint256 rewardPerClaim,
        uint256 duration // in seconds
    ) external payable {
        uint256 totalRequired = maxClaims * rewardPerClaim;
        require(msg.value >= totalRequired, "Insufficient ETH");

        _createGiveaway(
            giveawayId,
            address(0),
            maxClaims,
            rewardPerClaim,
            duration
        );
    }

    /**
     * @notice Create a new giveaway with ERC20 tokens
     * @dev Does not verify allowance, assumes caller has approved contract
     * @param giveawayId External random ID (UUID converted to uint256)
     */
    function createGiveawayERC20(
        uint256 giveawayId,
        address token,
        uint256 maxClaims,
        uint256 rewardPerClaim,
        uint256 duration
    ) external {
        require(token != address(0), "Invalid token");
        uint256 totalRequired = maxClaims * rewardPerClaim;

        // Transfer tokens from creator to contract
        IERC20(token).safeTransferFrom(
            msg.sender,
            address(this),
            totalRequired
        );

        _createGiveaway(giveawayId, token, maxClaims, rewardPerClaim, duration);
    }

    function _createGiveaway(
        uint256 giveawayId,
        address token,
        uint256 maxClaims,
        uint256 rewardPerClaim,
        uint256 duration
    ) internal {
        require(maxClaims > 0, "Steps must be > 0");
        require(rewardPerClaim > 0, "Reward must be > 0");
        if (giveaways[giveawayId].creator != address(0))
            revert GiveawayAlreadyExists();

        uint256 expiresAt = duration == 0 ? 0 : block.timestamp + duration;

        giveaways[giveawayId] = Giveaway({
            creator: msg.sender,
            token: token,
            rewardPerClaim: rewardPerClaim,
            maxClaims: maxClaims,
            claimedCount: 0,
            expiresAt: expiresAt,
            isActive: true
        });

        emit GiveawayCreated(
            giveawayId,
            msg.sender,
            token,
            maxClaims,
            rewardPerClaim,
            expiresAt
        );
    }

    /**
     * @notice Claim reward with trusted backend signature verification
     * @param giveawayId ID of the giveaway
     * @param fid Farcaster ID of the claimer
     * @param signature Backend signature verifying FID ownership and claim eligibility
     */
    function claim(
        uint256 giveawayId,
        uint256 fid,
        bytes calldata signature
    ) external nonReentrant {
        Giveaway storage g = giveaways[giveawayId];

        if (!g.isActive) revert GiveawayNotActive();
        if (g.expiresAt > 0 && block.timestamp > g.expiresAt)
            revert GiveawayExpired();
        if (g.claimedCount >= g.maxClaims) revert MaxClaimsReached();
        if (hasClaimed[giveawayId][fid]) revert AlreadyClaimed();

        // Verify signature
        // Message: keccak256(giveawayId, fid, msg.sender, block.chainid)
        bytes32 messageHash = keccak256(
            abi.encodePacked(giveawayId, fid, msg.sender, block.chainid)
        );
        bytes32 ethSignedMessageHash = MessageHashUtils.toEthSignedMessageHash(
            messageHash
        );

        if (ECDSA.recover(ethSignedMessageHash, signature) != trustedSigner) {
            revert InvalidSignature();
        }

        // Update state
        g.claimedCount++;
        hasClaimed[giveawayId][fid] = true;

        // Check if fully claimed
        if (g.claimedCount == g.maxClaims) {
            g.isActive = false;
        }

        // Transfer reward
        if (g.token == address(0)) {
            (bool success, ) = msg.sender.call{value: g.rewardPerClaim}("");
            if (!success) revert TransferFailed();
        } else {
            IERC20(g.token).safeTransfer(msg.sender, g.rewardPerClaim);
        }

        emit RewardClaimed(giveawayId, fid, msg.sender, g.rewardPerClaim);
    }

    /**
     * @notice Cancel giveaway and refund remaining funds (Creator Only)
     */
    function cancelGiveaway(uint256 giveawayId) external nonReentrant {
        Giveaway storage g = giveaways[giveawayId];
        if (msg.sender != g.creator) revert Unauthorized();
        if (!g.isActive) revert GiveawayNotActive();

        g.isActive = false;
        uint256 remainingClaims = g.maxClaims - g.claimedCount;
        uint256 refundAmount = remainingClaims * g.rewardPerClaim;

        if (refundAmount > 0) {
            if (g.token == address(0)) {
                (bool success, ) = msg.sender.call{value: refundAmount}("");
                if (!success) revert TransferFailed();
            } else {
                IERC20(g.token).safeTransfer(msg.sender, refundAmount);
            }
        }

        emit GiveawayCancelled(giveawayId, refundAmount);
    }

    /**
     * @notice Withdraw funds from expired giveaway (Creator Only)
     */
    function withdrawExpired(uint256 giveawayId) external nonReentrant {
        Giveaway storage g = giveaways[giveawayId];
        if (msg.sender != g.creator) revert Unauthorized();
        if (!g.isActive) revert GiveawayNotActive(); // Already cancelled or full
        if (g.expiresAt == 0 || block.timestamp <= g.expiresAt)
            revert GiveawayNotExpired();

        g.isActive = false; // Mark as inactive so no more claims
        uint256 remainingClaims = g.maxClaims - g.claimedCount;
        uint256 refundAmount = remainingClaims * g.rewardPerClaim;

        if (refundAmount > 0) {
            if (g.token == address(0)) {
                (bool success, ) = msg.sender.call{value: refundAmount}("");
                if (!success) revert TransferFailed();
            } else {
                IERC20(g.token).safeTransfer(msg.sender, refundAmount);
            }
        }

        emit ExpiredFundsWithdrawn(giveawayId, refundAmount);
    }
}
