//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.9;

import "hardhat/console.sol";

contract Vault {
    uint256 public constant VERSION = 100;

    uint256 public adminsThatHaveWithdrawnCount = 1;
    uint256 public mintingNumber = 1;
    uint256 public withdrawId = 1;
    uint256 public adminCount = 1;
    uint256 public ethersToBeWithdrawn = 0;
    uint256 public maxPercentageToWithdraw;
    uint256 public sellPrice;
    uint256 public buyPrice;
    address public tokenContract;
    address public farmContract;
    uint256 private adminsNeededForMultiSignature;
    uint256 private maxAmountToTransfer;

    mapping(address => bool) public admins;
    mapping(uint256 => mapping(address => bool)) public adminsThatHaveWithdrawn;
    mapping(uint256 => mapping(uint256 => Votes)) private mintingVotes;
    mapping(uint256 => mapping(uint256 => Votes)) private withdrawVotes;

    struct Votes {
        uint256 count;
        mapping(address => bool) accounts;
    }

    constructor(
        uint256 _adminsNeededForMultiSignature,
        uint256 _sellPrice,
        uint256 _buyPrice,
        uint256 _maxPercentageToWithdraw
    ) payable {
        admins[msg.sender] = true;
        adminsNeededForMultiSignature = _adminsNeededForMultiSignature;
        sellPrice = _sellPrice;
        buyPrice = _buyPrice;
        maxPercentageToWithdraw = _maxPercentageToWithdraw;
    }

    modifier onlyAdmin() {
        require(admins[msg.sender], "The sender address is not an admin.");
        _;
    }

    modifier notLastAdmin() {
        require(adminCount > 1, "The last admin cannot be removed.");
        _;
    }

    modifier numberValid(uint256 _number) {
        require(_number > 0, "The number must be greater than 0.");
        require(
            _number < 2**256 - 1,
            "The number must be less than 2**256 - 1."
        );
        _;
    }

    modifier onlyFarm() {
        require(
            msg.sender == farmContract,
            "The sender address is not the Farm contract."
        );
        _;
    }

    function addAdmin(address _newAdmin) external onlyAdmin returns (bool) {
        admins[_newAdmin] = true;
        adminCount++;
        adminsThatHaveWithdrawn[withdrawId][_newAdmin] = false;
        adminsThatHaveWithdrawnCount++;
        return true;
    }

    function removeAdmin(address _admin)
        external
        onlyAdmin
        notLastAdmin
        returns (bool)
    {
        require(admins[_admin], "The address to remove is not an admin.");
        delete admins[_admin];
        adminCount--;
        return true;
    }

    function setSellPrice(uint256 _price)
        external
        onlyAdmin
        numberValid(_price)
    {
        require(
            _price > buyPrice,
            "The sell price must be greater than the buy price."
        );
        sellPrice = _price;
    }

    function setBuyPrice(uint256 _price)
        external
        onlyAdmin
        numberValid(_price)
    {
        require(
            _price < sellPrice,
            "The buy price must be less than the sell price."
        );
        buyPrice = _price;
    }

    function setMaxPercentage(uint256 _maxPercentage) external onlyAdmin {
        require(
            _maxPercentage > 0,
            "The maximum percentage must be greater than 0."
        );
        require(
            _maxPercentage <= 50,
            "The maximum percentage must be less or equal than 50."
        );
        maxPercentageToWithdraw = _maxPercentage;
    }

    function requestWithdraw(uint256 _amount) external onlyAdmin {
        require(
            adminsThatHaveWithdrawnCount == adminCount,
            "You can't start two simultaneous withdraw operations."
        );
        require(
            _amount < ((maxPercentageToWithdraw * address(this).balance) / 100),
            "You can't exceed the maximum to withdraw."
        );
        require(
            !withdrawVotes[withdrawId][_amount].accounts[msg.sender],
            "You have already requested this withdraw."
        );

        if (withdrawVotes[withdrawId][_amount].count == 0) {
            Votes storage newVote = withdrawVotes[withdrawId][_amount];
            newVote.accounts[msg.sender] = true;
            newVote.count = 1;
        } else {
            withdrawVotes[withdrawId][_amount].accounts[msg.sender] = true;
            withdrawVotes[withdrawId][_amount].count += 1;
            if (
                withdrawVotes[withdrawId][_amount].count ==
                adminsNeededForMultiSignature
            ) {
                adminsThatHaveWithdrawnCount = 0;
                withdrawId++;
                uint256 floatCorrection = _amount / adminCount;
                ethersToBeWithdrawn = floatCorrection * adminCount;
            }
        }
    }

    function withdraw() external onlyAdmin {
        require(
            adminsThatHaveWithdrawnCount != adminCount,
            "There is nothing to withdraw."
        );
        require(
            !adminsThatHaveWithdrawn[withdrawId][msg.sender],
            "You have already withdrawn."
        );
        uint256 transferEthers = ethersToBeWithdrawn / adminCount;
        payable(msg.sender).transfer(transferEthers);
        adminsThatHaveWithdrawnCount++;
        adminsThatHaveWithdrawn[withdrawId][msg.sender] = true;
    }

    function mint(uint256 _amount) external onlyAdmin returns (bool) {
        if (mintingVotes[mintingNumber][_amount].count == 0) {
            Votes storage newVote = mintingVotes[mintingNumber][_amount];
            newVote.accounts[msg.sender] = true;
            newVote.count = 1;
        } else if (!mintingVotes[mintingNumber][_amount].accounts[msg.sender]) {
            mintingVotes[mintingNumber][_amount].accounts[msg.sender] = true;
            mintingVotes[mintingNumber][_amount].count += 1;

            if (
                mintingVotes[mintingNumber][_amount].count ==
                adminsNeededForMultiSignature
            ) {
                mintingNumber++;
                bytes memory mintCall = abi.encodeWithSignature(
                    "mint(uint256)",
                    _amount
                );
                (bool _success, ) = tokenContract.call(mintCall);
                require(_success, "TokenContract::mint call has failed.");
            }
        }
        return true;
    }

    function burn(uint256 _amount) external returns (bool) {
        address owner = msg.sender;
        bytes memory burnCall = abi.encodeWithSignature(
            "burn(uint256, address)",
            _amount,
            owner
        );
        (bool _success, ) = tokenContract.call(burnCall);
        require(_success, "TokenContract::burn call has failed.");
        payable(owner).transfer(_amount * (buyPrice / 2));
        return true;
    }

    function getVote(uint256 _amount) external view returns (bool) {
        return mintingVotes[mintingNumber][_amount].accounts[msg.sender];
    }

    function setTokenContract(address _address) external onlyAdmin {
        tokenContract = _address;
    }

    function bytesToUint(bytes memory b) public pure returns (uint256) {
        uint256 number;
        for (uint256 i = 0; i < b.length; i++) {
            number =
                number +
                uint256(uint8(b[i])) *
                (2**(8 * (b.length - (i + 1))));
        }
        return number;
    }

    function setMaxAmountToTransfer(uint256 _maxAmount) external onlyAdmin {
        require(_maxAmount > 0, "The maximum amount must be greater than 0.");
        maxAmountToTransfer = _maxAmount;
    }

    receive() external payable {
        require(msg.value >= sellPrice, "You must buy at least one token");
        bytes memory balanceCall = abi.encodeWithSignature(
            "balanceOf(address)",
            address(this)
        );
        (bool _balanceSuccess, bytes memory balance) = tokenContract.staticcall(
            balanceCall
        );
        require(_balanceSuccess, "TokenContract::balance call has failed.");
        uint256 vaultBalance = bytesToUint(balance);
        require(
            (vaultBalance > 0),
            "Vault does not have any tokens available at the moment, please wait until the next mint!"
        );

        uint256 tokens = (msg.value / sellPrice);

        if (vaultBalance < tokens) {
            uint256 tokenDiff = tokens - vaultBalance;
            payable(msg.sender).transfer(tokenDiff * sellPrice);
            tokens = tokens - tokenDiff;
        }

        (bool _transferSuccess, ) = tokenContract.call(
            abi.encodeWithSignature(
                "transfer(address,uint256)",
                msg.sender,
                tokens
            )
        );
        require(_transferSuccess, "TokenContract::transfer call has failed.");
    }

    function exchangeEther(uint256 _tokensAmount) external returns (bool) {
        bytes memory balanceCall = abi.encodeWithSignature(
            "balanceOf(address)",
            msg.sender
        );
        (bool _balanceSuccess, bytes memory balance) = tokenContract.staticcall(
            balanceCall
        );
        require(_balanceSuccess, "TokenContract::balance call has failed.");
        uint256 userBalance = bytesToUint(balance);
        require(userBalance >= _tokensAmount, "You dont have enough tokens");
        uint256 ethersToPay = _tokensAmount * buyPrice;
        require(
            ethersToPay < maxAmountToTransfer,
            "Vault can`t pay more than max amount"
        );
        require(
            address(this).balance >= ethersToPay,
            "We dont have enough money to pay you. Reverting transaction..."
        );

        (bool _transferSuccess, ) = tokenContract.call(
            abi.encodeWithSignature(
                "transferFrom(address,address,uint256)",
                msg.sender,
                address(this),
                _tokensAmount
            )
        );

        require(
            _transferSuccess,
            "TokenContract::transferFrom call has failed. Have you authorized vault to use your tokens?"
        );
        payable(msg.sender).transfer(ethersToPay);

        return true;
    }

    function setFarmContract(address _address) external onlyAdmin {
        farmContract = _address;
    }

    function withdrawYield(address _receiver, uint256 _amount)
        external
        onlyFarm
        returns (bool)
    {
        bytes memory transferCall = abi.encodeWithSignature(
            "transfer(address, uint256)",
            _receiver,
            _amount
        );
        (bool _couldTransfer, ) = tokenContract.call(transferCall);
        if (!_couldTransfer) {
            bytes memory mintCall = abi.encodeWithSignature(
                "mint(uint256)",
                _amount
            );
            (bool _couldMint, ) = tokenContract.call(mintCall);
            require(_couldMint, "TokenContract::mint call has failed.");
            (bool _transferSuccess, ) = tokenContract.call(transferCall);
            require(
                _transferSuccess,
                "TokenContract::transfer call has failed."
            );
        }
        return true;
    }

    function setAPR(uint256 _newAPR) external onlyAdmin returns (bool) {
        bytes memory setAPRCall = abi.encodeWithSignature(
            "setAPR(uint256)",
            _newAPR
        );
        (bool _success, ) = farmContract.call(setAPRCall);
        require(_success, "Vault::setAPR call has failed.");
        return true;
    }
}
