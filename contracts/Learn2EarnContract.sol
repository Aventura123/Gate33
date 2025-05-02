// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title Learn2Earn Contract
 * @dev Contract to manage token rewards where users complete learning tasks and claim rewards
 */
contract Learn2EarnContract is Ownable, ReentrancyGuard {
    struct Learn2Earn {
        string id;           // Firebase document ID
        address tokenAddress; // ERC20 token address
        uint256 tokenAmount; // Total amount of tokens to distribute
        uint256 startTime;   // Start timestamp
        uint256 endTime;     // End timestamp
        uint256 maxParticipants; // Maximum number of participants (0 for unlimited)
        uint256 participantCount; // Current participant count
        bool active;         // Whether the learn2earn is active
    }

    // Mapping from learn2earn ID to Learn2Earn struct
    mapping(uint256 => Learn2Earn) public learn2earns;
    uint256 public learn2earnCount;

    // Separate mapping to track who has claimed
    mapping(uint256 => mapping(address => bool)) public hasClaimed;

    // Fee configuration
    address public feeCollector;
    uint256 public feePercent; // Fee percentage (e.g., 5 for 5%)

    // Events
    event Learn2EarnCreated(uint256 indexed learn2earnId, address indexed creator, address tokenAddress, uint256 tokenAmount);
    event Learn2EarnClaimed(uint256 indexed learn2earnId, address indexed user, uint256 amount);
    event Learn2EarnEnded(uint256 indexed learn2earnId);
    event Learn2EarnReactivated(uint256 indexed learn2earnId);
    event FeeUpdated(address indexed feeCollector, uint256 feePercent);

    /**
     * @dev Constructor that sets the initial owner of the contract
     */
    constructor(address initialOwner) Ownable(initialOwner) {}

    /**
     * @dev Updates the fee collector and fee percentage
     * @param _feeCollector The address to collect fees
     * @param _feePercent The percentage of fees to collect (0-100)
     */
    function updateFeeConfig(address _feeCollector, uint256 _feePercent) external onlyOwner {
        require(_feeCollector != address(0), "Invalid fee collector address");
        require(_feePercent <= 100, "Fee percent must be between 0 and 100");

        feeCollector = _feeCollector;
        feePercent = _feePercent;

        emit FeeUpdated(_feeCollector, _feePercent);
    }

    /**
     * @dev Creates a new learn2earn opportunity
     * @param _firebaseId The Firebase document ID for reference
     * @param _tokenAddress The ERC20 token to distribute
     * @param _tokenAmount The total amount of tokens to distribute
     * @param _startTime Start timestamp of the learn2earn
     * @param _endTime End timestamp of the learn2earn
     * @param _maxParticipants Maximum number of participants (0 for unlimited)
     */
    function createLearn2Earn(
        string memory _firebaseId,
        address _tokenAddress,
        uint256 _tokenAmount,
        uint256 _startTime,
        uint256 _endTime,
        uint256 _maxParticipants
    ) external nonReentrant {
        require(_tokenAddress != address(0), "Invalid token address");
        require(_tokenAmount > 0, "Token amount must be greater than 0");
        require(_endTime > _startTime, "End time must be after start time");
        require(_startTime >= block.timestamp, "Start time must be in the future");

        IERC20 token = IERC20(_tokenAddress);

        // Calculate fee and remaining amount
        uint256 feeAmount = (_tokenAmount * feePercent) / 100;
        uint256 remainingAmount = _tokenAmount - feeAmount;

        require(token.transferFrom(msg.sender, feeCollector, feeAmount), "Fee transfer failed");
        require(token.transferFrom(msg.sender, address(this), remainingAmount), "Token transfer failed");

        uint256 learn2earnId = learn2earnCount;
        Learn2Earn storage newLearn2Earn = learn2earns[learn2earnId];

        newLearn2Earn.id = _firebaseId;
        newLearn2Earn.tokenAddress = _tokenAddress;
        newLearn2Earn.tokenAmount = remainingAmount;
        newLearn2Earn.startTime = _startTime;
        newLearn2Earn.endTime = _endTime;
        newLearn2Earn.maxParticipants = _maxParticipants;
        newLearn2Earn.participantCount = 0;
        newLearn2Earn.active = true;

        learn2earnCount++;
        emit Learn2EarnCreated(learn2earnId, msg.sender, _tokenAddress, remainingAmount);
    }

    /**
     * @dev Allows a user to claim tokens from a learn2earn after task validation
     * @param _learn2earnId The ID of the learn2earn to claim from
     * @param _amount The amount of tokens to claim
     * @param _signature The signature from the backend validating the task completion
     */
    function claimLearn2Earn(uint256 _learn2earnId, uint256 _amount, bytes memory _signature) external nonReentrant {
        Learn2Earn storage learn2earn = learn2earns[_learn2earnId];

        require(learn2earn.tokenAddress != address(0), "Learn2Earn does not exist");
        require(learn2earn.active, "Learn2Earn is not active");
        require(block.timestamp >= learn2earn.startTime, "Learn2Earn has not started yet");
        require(block.timestamp <= learn2earn.endTime, "Learn2Earn has ended");
        require(!hasClaimed[_learn2earnId][msg.sender], "Already claimed");
        require(verifySignature(msg.sender, _learn2earnId, _amount, _signature), "Invalid signature");

        hasClaimed[_learn2earnId][msg.sender] = true;
        learn2earn.participantCount++;

        IERC20 token = IERC20(learn2earn.tokenAddress);
        require(token.transfer(msg.sender, _amount), "Token transfer failed");

        emit Learn2EarnClaimed(_learn2earnId, msg.sender, _amount);
    }

    /**
     * @dev Verifies the signature from the backend
     * @param _user The address of the user claiming the learn2earn
     * @param _learn2earnId The ID of the learn2earn
     * @param _amount The amount of tokens to claim
     * @param _signature The signature to verify
     * @return bool Whether the signature is valid
     */
    function verifySignature(
        address _user,
        uint256 _learn2earnId,
        uint256 _amount,
        bytes memory _signature
    ) internal view returns (bool) {
        bytes32 messageHash = keccak256(abi.encodePacked(_user, _learn2earnId, _amount));
        bytes32 ethSignedMessageHash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash));

        // Recover the signer address from the signature
        (bytes32 r, bytes32 s, uint8 v) = splitSignature(_signature);
        address signer = ecrecover(ethSignedMessageHash, v, r, s);

        // Replace `owner()` with the backend's address that signs the messages
        return signer == owner();
    }

    /**
     * @dev Splits a signature into r, s, and v components
     * @param _signature The signature to split
     * @return r The r component of the signature
     * @return s The s component of the signature
     * @return v The v component of the signature
     */
    function splitSignature(bytes memory _signature)
        internal
        pure
        returns (bytes32 r, bytes32 s, uint8 v)
    {
        require(_signature.length == 65, "Invalid signature length");
        assembly {
            r := mload(add(_signature, 32))
            s := mload(add(_signature, 64))
            v := byte(0, mload(add(_signature, 96)))
        }
    }

    /**
     * @dev Ends a learn2earn and returns unclaimed tokens to the owner
     * @param _learn2earnId The ID of the learn2earn to end
     */
    function endLearn2Earn(uint256 _learn2earnId) external onlyOwner {
        Learn2Earn storage learn2earn = learn2earns[_learn2earnId];
        
        require(learn2earn.tokenAddress != address(0), "Learn2Earn does not exist");
        require(learn2earn.active, "Learn2Earn is already inactive");
        
        learn2earn.active = false;
        
        // Calculate tokens distributed
        uint256 tokensDistributed = learn2earn.participantCount * (
            learn2earn.maxParticipants > 0
                ? learn2earn.tokenAmount / learn2earn.maxParticipants
                : learn2earn.tokenAmount / (learn2earn.participantCount > 0 ? learn2earn.participantCount : 1)
        );
        
        uint256 tokensRemaining = learn2earn.tokenAmount > tokensDistributed
            ? learn2earn.tokenAmount - tokensDistributed
            : 0;
        
        if (tokensRemaining > 0) {
            IERC20 token = IERC20(learn2earn.tokenAddress);
            require(token.transfer(owner(), tokensRemaining), "Token transfer failed");
        }
        
        emit Learn2EarnEnded(_learn2earnId);
    }

    /**
     * @dev Reactivates an ended learn2earn
     * @param _learn2earnId The ID of the learn2earn to reactivate
     */
    function reactivateLearn2Earn(uint256 _learn2earnId) external onlyOwner {
        Learn2Earn storage learn2earn = learn2earns[_learn2earnId];
        
        require(learn2earn.tokenAddress != address(0), "Learn2Earn does not exist");
        require(!learn2earn.active, "Learn2Earn is already active");
        
        learn2earn.active = true;
        
        emit Learn2EarnReactivated(_learn2earnId);
    }

    /**
     * @dev Gets the token per participant amount
     * @param _learn2earnId The ID of the learn2earn
     * @return uint256 The amount of tokens per participant
     */
    function getTokenPerParticipant(uint256 _learn2earnId) external view returns (uint256) {
        Learn2Earn storage learn2earn = learn2earns[_learn2earnId];
        
        if (learn2earn.maxParticipants > 0) {
            return learn2earn.tokenAmount / learn2earn.maxParticipants;
        } else {
            return learn2earn.tokenAmount / (learn2earn.participantCount > 0 ? learn2earn.participantCount : 1);
        }
    }
}