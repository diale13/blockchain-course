const { expect, use } = require("chai");
const { waffle } = require("hardhat");
const { deployContract, provider, solidity } = waffle;
const TokenContract = require("../artifacts/contracts/TokenContract.sol/TokenContract.json");

let tokenContract;
const [wallet, walletTo, thirdWallet] = provider.getWallets();
let name = "Token";
let symbol = "Symbol";

describe("TokenContract", () => {
  beforeEach(async () => {
    tokenContract = await deployContract(wallet, TokenContract, [name, symbol]);
  });

  describe("Constructor", () => {
    it("Should deploy the contract with name", async () => {
      // Assert
      expect(await tokenContract.name()).to.equal(name);
    });

    it("Should deploy the contract with symbol", async () => {
      // Assert
      expect(await tokenContract.symbol()).to.equal(symbol);
    });

    it("Should deploy the contract with owner", async () => {
      // Assert
      expect(await tokenContract.owner()).to.equal(wallet.address);
    });
  });

  describe("Decimals", () => {
    it("Should return the number of decimals", async () => {
      expect(await tokenContract.decimals()).to.equal(18);
    });
  });

  describe("Set Vault", () => {
    it("Should set Vault as the owner", async () => {
      // Act
      await tokenContract.setVault(walletTo.address);
      // Assert
      expect(await tokenContract.vault()).to.equal(walletTo.address);
    });

    it("Should not set Vault as not the owner", async () => {
      // Act
      const tokenContractNotAdmin = tokenContract.connect(walletTo.address);
      // Assert
      await expect(tokenContractNotAdmin.setVault(walletTo.address)).to.be
        .reverted;
    });
  });

  describe("Mint", () => {
    it("Should be able to mint tokens as the owner", async () => {
      // Arrange
      await tokenContract.setVault(walletTo.address);
      const tokenContractFromVault = tokenContract.connect(walletTo);
      const amount = 10;
      // Act
      await tokenContractFromVault.mint(amount);
      // Assert
      expect(await tokenContract.balanceOf(walletTo.address)).to.equal(amount);
    });

    it("Should not be able to mint tokens as not the owner", async () => {
      // Arrange
      await tokenContract.setVault(walletTo.address);
      const amount = 10;
      // Assert
      await expect(tokenContract.mint(amount)).to.be.reverted;
    });
  });

  describe("Transfer", () => {
    it("Should be able to transfer tokens as the owner", async () => {
      // Arrange
      await tokenContract.setVault(walletTo.address);
      const tokenContractFromVault = tokenContract.connect(walletTo);
      const amount = 10;
      await tokenContractFromVault.mint(amount);
      // Act
      await tokenContractFromVault.transfer(walletTo.address, amount);
      // Assert
      expect(await tokenContract.balanceOf(walletTo.address)).to.equal(amount);
    });

    it("Should not be able to transfer tokens as not the owner", async () => {
      // Arrange
      await tokenContract.setVault(walletTo.address);
      const tokenContractFromVault = tokenContract.connect(walletTo);
      const amount = 10;
      await tokenContractFromVault.mint(amount);
      // Assert
      await expect(
        tokenContractFromVault.transfer(walletTo.address, amount + 1)
      ).to.be.reverted;
    });
  });

  describe("Approve", () => {
    it("Should be able to approve tokens to another address", async () => {
      // Arrange
      await tokenContract.setVault(walletTo.address);
      const tokenContractFromVault = tokenContract.connect(walletTo);
      const amount = 10;
      await tokenContractFromVault.mint(amount);
      // Act
      await tokenContractFromVault.approve(wallet.address, amount);
      // Assert
      expect(
        await tokenContract.allowance(walletTo.address, wallet.address)
      ).to.equal(amount);
    });
  });

  describe("TransferFrom", () => {
    it("Should be able to transfer tokens from allowed account", async () => {
      // Arrange
      await tokenContract.setVault(walletTo.address);
      const tokenContractFromVault = tokenContract.connect(walletTo);
      const amount = 10;
      await tokenContractFromVault.mint(amount);
      await tokenContractFromVault.approve(thirdWallet.address, amount);
      const tokenContractFromThird = tokenContract.connect(thirdWallet);
      // Act
      await tokenContractFromThird.transferFrom(
        walletTo.address,
        wallet.address,
        amount
      );
      // Assert
      expect(await tokenContract.balanceOf(wallet.address)).to.equal(amount);
    });

    it("Should not be able to transfer tokens from not allowed account", async () => {
      // Arrange
      await tokenContract.setVault(walletTo.address);
      const tokenContractFromVault = tokenContract.connect(walletTo);
      const amount = 10;
      await tokenContractFromVault.mint(amount);
      const tokenContractFromThird = tokenContract.connect(thirdWallet);
      // Assert
      await expect(
        tokenContractFromThird.transferFrom(
          walletTo.address,
          wallet.address,
          amount
        )
      ).to.be.reverted;
    });
  });
});
