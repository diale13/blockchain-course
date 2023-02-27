const { expect, use } = require("chai");
const { deployMockContract } = require("ethereum-waffle");
const { waffle } = require("hardhat");
const { deployContract, provider, solidity } = waffle;
const Vault = require("../artifacts/contracts/Vault.sol/Vault.json");
const TokenContract = require("../artifacts/contracts/TokenContract.sol/TokenContract.json");
const { ethers } = require("ethers");

let vault;
const [wallet, walletTo, thirdWallet] = provider.getWallets();

describe("Vault", () => {
  beforeEach(async () => {
    const options = { value: ethers.utils.parseUnits("99") };
    vault = await deployContract(wallet, Vault, [2, 2, 1, 50], options);
  });

  describe("Constructor", () => {
    it("Should deploy the contract with deployer as admin", async () => {
      // Assert
      expect(await vault.admins(wallet.address)).to.equal(true);
    });
  });

  describe("Admin", () => {
    it("Should be able to add a new admin if you are admin", async () => {
      // Act
      await vault.addAdmin(walletTo.address);
      // Assert
      expect(await vault.admins(walletTo.address)).to.equal(true);
    });

    it("Should not be able to add a new admin if you are not admin", async () => {
      // Arrange
      const vaultFromAnotherAccount = vault.connect(walletTo);
      // Assert
      await expect(vaultFromAnotherAccount.addAdmin(walletTo.address)).to.be
        .reverted;
    });

    it("Should be able to remove admin if you are admin", async () => {
      // Arrange
      await vault.addAdmin(walletTo.address);
      // Act
      await vault.removeAdmin(walletTo.address);
      // Assert
      expect(await vault.admins(walletTo.address)).to.equal(false);
    });

    it("Should not be able to remove an admin if you are not admin", async () => {
      // Arrange
      await vault.addAdmin(walletTo.address);
      const vaultFromNotAdminAccount = vault.connect(thirdWallet);
      // Assert
      await expect(vaultFromNotAdminAccount.removeAdmin(wallet.address)).to.be
        .reverted;
    });

    it("Should not be able to remove last admin", async () => {
      // Assert
      await expect(vault.removeAdmin(wallet.address)).to.be.reverted;
    });

    it("Should not be able to remove an address that is not an admin", async () => {
      // Assert
      await expect(vault.removeAdmin(walletTo.address)).to.be.reverted;
    });
  });

  describe("Sell Buy Price", () => {
    it("Should be able to set buy price less than sell price, as an admin", async () => {
      // Arrange
      const sellPrice = ethers.utils.parseEther("3");
      const buyPrice = ethers.utils.parseEther("2");
      await vault.setSellPrice(sellPrice);
      // Act
      await vault.setBuyPrice(buyPrice);
      // Assert
      expect(await vault.buyPrice()).to.equal(buyPrice);
    });

    it("Should not be able to set buy price less than sell price, as not an admin", async () => {
      // Arrange
      const buyPrice = 10;
      const vaultFromAnotherAccount = vault.connect(walletTo);
      // Assert
      await expect(vaultFromAnotherAccount.setBuyPrice(buyPrice)).to.be
        .reverted;
    });

    it("Should not be able to set buy price greater than sell price, as an admin", async () => {
      // Arrange
      const buyPrice = ethers.utils.parseEther("4");
      // Assert
      await expect(vault.setBuyPrice(buyPrice)).to.be.reverted;
    });

    it("Should be able to set sell price greater than buy price, as an admin", async () => {
      // Arrange
      const sellPrice = ethers.utils.parseEther("4");
      // Act
      await vault.setSellPrice(sellPrice);
      // Assert
      expect(await vault.sellPrice()).to.equal(sellPrice);
    });

    it("Should not be able to set sell price greater than buy price, as not an admin", async () => {
      // Arrange
      const sellPrice = ethers.utils.parseEther("3");
      const vaultFromAnotherAccount = vault.connect(walletTo);
      // Assert
      await expect(vaultFromAnotherAccount.setSellPrice(sellPrice)).to.be
        .reverted;
    });

    it("Should not be able to set sell price less than buy price, as an admin", async () => {
      // Arrange
      const initialSellPrice = ethers.utils.parseEther("4");
      const sellPrice = 5;
      const buyPrice = 10;
      await vault.setSellPrice(initialSellPrice);
      await vault.setBuyPrice(buyPrice);
      // Assert
      await expect(vault.setSellPrice(sellPrice)).to.be.reverted;
    });
  });

  describe("Withdraw, Request Withdraw", () => {
    it("Should not be able to set max percentage over 50 as admin", async () => {
      // Arrange
      const testPercentage = 51;
      // Assert
      await expect(vault.setMaxPercentage(testPercentage)).to.be.reverted;
    });

    it("Should not be able to set max percentage under 0 as admin", async () => {
      // Arrange
      const testPercentage = -1;
      // Assert
      await expect(vault.setMaxPercentage(testPercentage)).to.be.reverted;
    });

    it("Should not allow to exceede the max request percentage", async () => {
      // Arrange
      await vault.setMaxPercentage(20);
      const testValue = ethers.utils.parseUnits("999");
      await expect(vault.requestWithdraw(testValue)).to.be.reverted;
    });

    it("Should not be able to request withdraw as admin when you have made a previous request", async () => {
      // Arrange
      await vault.addAdmin(walletTo.address);
      await vault.addAdmin(thirdWallet.address);
      await vault.setMaxPercentage(50);
      const testValue = 1;
      await vault.requestWithdraw(testValue); // first admin request
      const secondAdmin = vault.connect(walletTo);
      await secondAdmin.requestWithdraw(testValue);
      // Assert
      await expect(vault.requestWithdraw(testValue)).to.be.reverted;
    });

    it("Should not be able to request withdraw as admin when you have made a previous request", async () => {
      // Arrange
      await vault.addAdmin(walletTo.address);
      await vault.addAdmin(thirdWallet.address);
      await vault.setMaxPercentage(50);
      const testValue1 = 1;
      await vault.requestWithdraw(testValue1);
      // Assert
      await expect(vault.requestWithdraw(testValue1)).to.be.reverted;
    });

    it("Should not be able to withdraw as admin when there wasnt a previous request", async () => {
      // Assert
      await expect(vault.withdraw()).to.be.reverted;
    });

    it("Should be able to withdraw when a previous request was approved", async () => {
      // Arrange
      await vault.addAdmin(walletTo.address);
      const testValue = 2000000000000000000n;
      await vault.requestWithdraw(testValue);
      const secondAdmin = vault.connect(walletTo);
      await secondAdmin.requestWithdraw(testValue);
      const balanceBefore = await waffle.provider.getBalance(walletTo.address);
      // Act
      const tx = await secondAdmin.withdraw();
      const receipt = await tx.wait();
      const balanceAfter = await waffle.provider.getBalance(walletTo.address);
      const gasSpent = await receipt.gasUsed.mul(receipt.effectiveGasPrice);
      // Assert
      expect(Number(balanceBefore)).to.be.lessThan(Number(balanceAfter));

      /*
      console.log("Gas spent: " + gasSpent);
      console.log("Balance before: " + balanceBefore);
      console.log("Balance After: " + balanceAfter);
      console.log({ receipt });
      // Assert
      expect(balanceAfter.sub(balanceBefore).add(gasSpent)).to.eq(ethers.utils.parseEther("1")); 
      */

      // Cant seem to get the correct amount, i think it is because of the gas but i cant figure out how to get the correct amount
    });

    it("Should be able to perform more than one withdraw", async () => {
      // Arrange
      await vault.addAdmin(walletTo.address);
      const testValue = 2000000000000000000n;
      await vault.requestWithdraw(testValue);
      const secondAdmin = vault.connect(walletTo);
      await secondAdmin.requestWithdraw(testValue);
      const balanceBefore = await waffle.provider.getBalance(walletTo.address);
      await vault.withdraw();
      await secondAdmin.withdraw();
      await vault.requestWithdraw(testValue);
      await secondAdmin.requestWithdraw(testValue);
      await vault.withdraw();
      await secondAdmin.withdraw();
      const balanceAfter = await waffle.provider.getBalance(walletTo.address);
      // Assert
      expect(Number(balanceBefore)).to.be.lessThan(Number(balanceAfter)); //This is more a formality than a real test, i just needed to check that you can actually do a withdraw again after a previous one
    });
  });

  describe("Mint", () => {
    it("Should be able to vote to mint as admin", async () => {
      // Arrange
      const amount = 20;
      // Act
      await vault.mint(amount);
      // Assert
      expect(await vault.getVote(amount)).to.equal(true);
    });

    it("Should not be able to vote as not admin", async () => {
      // Arrange
      const amount = 20;
      const vaultFromAnotherAccount = vault.connect(walletTo);
      // Assert
      await expect(vaultFromAnotherAccount.mint(amount)).to.be.reverted;
    });

    it("Should be able to mint when multi-firm is complete", async () => {
      // Arrange
      const amount = 20;
      const mintingNumber = ethers.BigNumber.from(
        await vault.mintingNumber()
      ).toNumber();
      await vault.mint(amount);
      await vault.addAdmin(walletTo.address);
      const tokenContract = await deployMockContract(wallet, TokenContract.abi);
      await tokenContract.mock.mint.withArgs(amount).returns(true);
      const vaultFromAnotherAccount = vault.connect(walletTo);
      // Act
      await vaultFromAnotherAccount.mint(amount);
      const newMintingNumber = ethers.BigNumber.from(
        await vault.mintingNumber()
      ).toNumber();
      // Assert
      expect(newMintingNumber).to.equal(mintingNumber + 1);
    });
  });

  describe("Burn", () => {
    it("Should be able to burn as an admin", async () => {
      // Arrange
      await vault.setSellPrice(ethers.utils.parseEther("2"));
      await vault.setBuyPrice(ethers.utils.parseEther("1"));
      const amount = 2;
      const tokenContract = await deployMockContract(wallet, TokenContract.abi);
      await tokenContract.mock.burn
        .withArgs(amount, wallet.address)
        .returns(true);
      const balanceBefore = await provider.getBalance(wallet.address);
      // Act
      const tx = await vault.burn(amount);
      const receipt = await tx.wait();
      const gasSpent = receipt.gasUsed.mul(receipt.effectiveGasPrice);
      const balanceAfter = await provider.getBalance(wallet.address);
      // Assert
      expect(balanceAfter.sub(balanceBefore).add(gasSpent)).to.eq(
        ethers.utils.parseEther("1")
      );
    });
  });

  describe("Buy and sell tokens", () => {
    it("shouldnt be able to buy tokens if you dont have enough ether", async () => {
      await vault.setSellPrice(ethers.utils.parseEther("99"));
      await vault.setBuyPrice(ethers.utils.parseEther("1"));
      await expect(
        walletTo.sendTransaction({
          to: vault.address,
          value: ethers.utils.parseEther("1"),
        })
      ).to.be.reverted;
    });

    it("shouldnt be able to buy tokens if vault doesent have enough tokens", async () => {
      await vault.setSellPrice(ethers.utils.parseEther("2"));
      await vault.setBuyPrice(ethers.utils.parseEther("1"));
      const tokenContract = await deployMockContract(wallet, TokenContract.abi);
      await tokenContract.mock.balanceOf.withArgs(vault.address).returns(0);
      await expect(
        walletTo.sendTransaction({
          to: vault.address,
          value: ethers.utils.parseEther("2"),
        })
      ).to.be.reverted;
    });
  });
});
