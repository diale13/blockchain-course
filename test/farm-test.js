const { expect } = require("chai");
const { deployMockContract } = require("ethereum-waffle");
const { waffle } = require("hardhat");
const { deployContract, provider } = waffle;
const Farm = require("../artifacts/contracts/Farm.sol/Farm.json");
const TokenContract = require("../artifacts/contracts/TokenContract.sol/TokenContract.json");

let farm;
const [wallet, walletTo, tokenWallet, vaultWallet] = provider.getWallets();

describe("Farm", () => {
  beforeEach(async () => {
    farm = await deployContract(wallet, Farm, [
      tokenWallet.address,
      vaultWallet.address,
      10,
    ]);
  });

  describe("Constructor", () => {
    it("Should deploy the contract and set the token contract", async () => {
      expect(await farm.tokenContract()).to.equal(tokenWallet.address);
    });
    it("Should deploy the contract and set the vault contract", async () => {
      expect(await farm.vault()).to.equal(vaultWallet.address);
    });
  });

  describe("Stake & Unstake", () => {
    it("Should be able to stake if I have the amount of tokens", async () => {
      // Arrange
      const amount = 20;
      const tokenContract = await deployMockContract(wallet, TokenContract.abi);
      await tokenContract.mock.transferFrom
        .withArgs(wallet.address, farm.address, amount)
        .returns(true);
      // Act
      await farm.stake(amount);
      // Assert
      expect(await farm.getStake()).to.equal(amount);
    });

    it("Should not be able to stake if I don't have the amount of tokens", async () => {
      // Arrange
      const amount = 20;
      const tokenContract = await deployMockContract(wallet, TokenContract.abi);
      await tokenContract.mock.transferFrom.reverts();
      const mockedFarm = await deployContract(wallet, Farm, [
        tokenContract.address,
        vaultWallet.address,
        10,
      ]);
      // Assert
      await expect(mockedFarm.stake(amount)).to.be.reverted;
    });

    it("Should be able to getStake when no tokens have been staked", async () => {
      // Assert
      expect(await farm.getStake()).to.equal(0);
    });

    it("Should be able to unstake after staking", async () => {
      // Arrange
      const amount = 20;
      const tokenContract = await deployMockContract(wallet, TokenContract.abi);
      await tokenContract.mock.transferFrom
        .withArgs(wallet.address, farm.address, amount)
        .returns(true);
      await tokenContract.mock.transfer
        .withArgs(wallet.address, amount)
        .returns(true);
      await farm.stake(amount);
      // Act
      await farm.unstake(amount);
      // Assert
      expect(await farm.getStake()).to.equal(0);
    });

    it("Should not be able to unstake if nothing has been staked", async () => {
      // Arrange
      const amount = 20;
      // Assert
      await expect(farm.unstake(amount)).to.be.reverted;
    });

    it("Should be able to get total stake", async () => {
      // Arrange
      const amount = 20;
      const tokenContract = await deployMockContract(wallet, TokenContract.abi);
      await tokenContract.mock.transferFrom
        .withArgs(wallet.address, farm.address, amount)
        .returns(true);
      // Act
      await farm.stake(amount);
      // Assert
      expect(await farm.totalStake()).to.equal(amount);
    });
  });

  describe("Yield", () => {
    it("Should be able to get yield when no tokens have been staked", async () => {
      // Assert
      expect(await farm.getYield()).to.equal(0);
    });

    it("Should be able to withdraw yield after tokens have been staked", async () => {
      // Arrange
      const amount = 20;
      farm = await deployContract(wallet, Farm, [
        tokenWallet.address,
        vaultWallet.address,
        3155692600, // Set the APR high in order to wait few seconds and already have yield
      ]);
      await farm.stake(amount);
      await new Promise((resolve) => setTimeout(resolve, 3000)); // Wait to have some yield
      // Act
      await farm.withdrawYield();
      // Assert
      expect(Number(await farm.totalYieldPaid())).to.be.greaterThanOrEqual(
        Number(60)
      );
    });
  });

  describe("APR", () => {
    it("Should be able to set new APR as vault", async () => {
      // Arrange
      const newAPR = 20;
      const farmFromVaultContract = farm.connect(vaultWallet);
      // Act
      await farmFromVaultContract.setAPR(newAPR);
      // Assert
      expect(await farm.APR()).to.eq(newAPR);
    });

    it("Should not be able to set new APR as not vault", async () => {
      // Arrange
      const newAPR = 20;
      // Assert
      await expect(farm.setAPR(newAPR)).to.be.reverted;
    });

    it("Should be able to set new APR as vault and change stake values of stakeholders", async () => {
      // Arrange
      const newAPR = 31556926000;
      const amount = 20;
      farm = await deployContract(wallet, Farm, [
        tokenWallet.address,
        vaultWallet.address,
        3155692600, // Set the APR high in order to wait few seconds and already have yield
      ]);
      const farmFromVaultContract = farm.connect(vaultWallet);
      const tokenContract = await deployMockContract(wallet, TokenContract.abi);
      await tokenContract.mock.transferFrom
        .withArgs(wallet.address, farm.address, amount)
        .returns(true);
      await farm.stake(amount);
      await new Promise((resolve) => setTimeout(resolve, 3000)); // Wait to have some yield
      // Act
      await farmFromVaultContract.setAPR(newAPR);
      // Assert
      expect(await farm.getStake()).to.not.eq(amount);
    });
  });
});
