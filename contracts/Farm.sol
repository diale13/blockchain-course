//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.9;

import "hardhat/console.sol";

contract Farm {
    uint256 public constant VERSION = 100;
    uint256 private constant INCREASE = 1;
    uint256 private constant DECREASE = 2;

    address public tokenContract;
    address public vault;

    mapping(address => FarmData) private balances;
    address[] public stakeholders;

    uint256 public totalStake = 0; // total amount of tokens staked by all users at this time
    uint256 public totalYieldPaid = 0; // total amount of yield paid out for all users
    uint256 public APR;

    struct FarmData {
        uint256 stake;
        uint256 APR;
        uint256 timestamp;
        uint256 index;
    }

    constructor(
        address _tokenContract,
        address _vault,
        uint256 _APR
    ) {
        tokenContract = _tokenContract;
        vault = _vault;
        APR = _APR;
    }

    modifier onlyVault() {
        require(
            msg.sender == vault,
            "Only Vault is able to do this operation."
        );
        _;
    }

    function stake(uint256 _amount) external returns (bool) {
        uint256 oldStake = 0;
        uint256 newStake = _amount;
        uint256 newAPR = APR;
        uint256 newTimestamp = block.timestamp;

        bytes memory transferFrom = abi.encodeWithSignature(
            "transferFrom(address, address, uint256)",
            msg.sender,
            address(this),
            _amount
        );
        (bool _success, ) = tokenContract.call(transferFrom);

        require(
            _success,
            "Farm doesn't have permissions to transfer that tokens, or you don't have enough tokens to stake"
        );

        if (
            balances[msg.sender].stake > 0 &&
            balances[msg.sender].APR > 0 &&
            balances[msg.sender].timestamp > 0
        ) {
            oldStake = balances[msg.sender].stake;
            uint256 income = (balances[msg.sender].stake + _amount) *
                balances[msg.sender].APR *
                100;
            newStake = getNewStakeForTimestamp(newTimestamp, _amount, INCREASE);
            newAPR = (income * 100) / newStake;

            balances[msg.sender].stake = newStake;
            balances[msg.sender].APR = newAPR;
        } else {
            FarmData storage newFarmData = balances[msg.sender];

            newFarmData.stake = newStake;
            newFarmData.APR = newAPR;
            newFarmData.index = stakeholders.length;

            stakeholders.push(msg.sender);
        }

        balances[msg.sender].timestamp = newTimestamp;
        totalStake += newStake - oldStake;

        return true;
    }

    function unstake(uint256 _amount) external returns (bool) {
        require(
            balances[msg.sender].stake > 0 &&
                balances[msg.sender].APR > 0 &&
                balances[msg.sender].timestamp > 0,
            "You don't have any tokens to unstake"
        );

        uint256 newTimestamp = block.timestamp;
        uint256 newStake = getNewStakeForTimestamp(
            newTimestamp,
            _amount,
            DECREASE
        );

        require(newStake >= 0, "You don't have enough tokens to unstake");

        uint256 oldStake = balances[msg.sender].stake;
        bytes memory transfer = abi.encodeWithSignature(
            "transfer(address, uint256)",
            msg.sender,
            _amount
        );
        (bool _success, ) = tokenContract.call(transfer);

        require(_success, "Something went wrong while unstaking");

        totalStake -= oldStake - newStake;
        if (newStake > 0) {
            uint256 income = (balances[msg.sender].stake - _amount) *
                balances[msg.sender].APR *
                100;
            uint256 newAPR = (income * 100) / newStake;
            balances[msg.sender].stake = newStake;
            balances[msg.sender].APR = newAPR;
            balances[msg.sender].timestamp = newTimestamp;
        } else {
            balances[msg.sender].stake = 0;
            balances[msg.sender].APR = 0;
            balances[msg.sender].timestamp = 0;
            removeFromStakeholders();
        }
        return true;
    }

    function withdrawYield() external returns (bool) {
        uint256 newTimestamp = block.timestamp;
        uint256 yield = getYieldForTimestamp(newTimestamp, msg.sender);

        bytes memory withdrawYieldVault = abi.encodeWithSignature(
            "withdrawYield(address, uint256)",
            msg.sender,
            yield
        );
        (bool _success, ) = vault.call(withdrawYieldVault);

        require(_success, "Something went wrong while withdrawing yield");

        balances[msg.sender].timestamp = newTimestamp;
        balances[msg.sender].APR = APR;
        totalYieldPaid += yield;
        return true;
    }

    function getYield() public view returns (uint256) {
        return getYieldForTimestamp(block.timestamp, msg.sender);
    }

    function getStake() external view returns (uint256) {
        return balances[msg.sender].stake;
    }

    function setAPR(uint256 _newAPR) external onlyVault returns (bool) {
        uint256 newTimestamp = block.timestamp;
        for (uint256 i = 0; i < stakeholders.length; i++) {
            address stakeholder = stakeholders[i];
            uint256 oldStake = balances[stakeholder].stake;

            uint256 accumulatedWin = oldStake +
                getYieldForTimestamp(newTimestamp, stakeholder);
            uint256 income = (oldStake * _newAPR) / 100;

            uint256 newPersonalAPR = (income * 100) / accumulatedWin;

            balances[stakeholder].stake = accumulatedWin;
            balances[stakeholder].APR = newPersonalAPR;
            balances[stakeholder].timestamp = newTimestamp;

            totalStake += accumulatedWin - oldStake;
        }
        APR = _newAPR;
        return true;
    }

    function getYieldForTimestamp(uint256 _timestamp, address _stakeholder)
        private
        view
        returns (uint256)
    {
        // An year has 31556926 seconds, and we multiply this by 100 because of the APR, that is a percentage
        uint256 yield = ((balances[_stakeholder].stake *
            balances[_stakeholder].APR *
            (_timestamp - balances[_stakeholder].timestamp)) / 3155692600);

        return yield;
    }

    function getNewStakeForTimestamp(
        uint256 _timestamp,
        uint256 _amount,
        uint256 _variation
    ) private view returns (uint256) {
        uint256 yield = getYieldForTimestamp(_timestamp, msg.sender);
        if (_variation == INCREASE) {
            return balances[msg.sender].stake + yield + _amount;
        } else if (_variation == DECREASE) {
            return balances[msg.sender].stake + yield - _amount;
        } else {
            revert("Invalid variation");
        }
    }

    function removeFromStakeholders() private {
        uint256 senderIndex = balances[msg.sender].index;
        address lastAddress = stakeholders[stakeholders.length - 1];
        stakeholders[senderIndex] = lastAddress;
        balances[lastAddress].index = senderIndex;
        balances[msg.sender].index = 0;
        stakeholders.pop();
    }
}
