require("dotenv").config();
require("@nomiclabs/hardhat-waffle");

// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task("accounts", "Prints the list of accounts", async (taskArgs, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  solidity: "0.8.9",
  networks: {
    rinkeby: {
      chainId: 4,
      timeout: 20000,
      gasPrice: 8000000000,
      gas: "auto",
      name: "Rinkeby",
      url: process.env.RINKEBY_URL,
      from: process.env.RINKEBY_ACCOUNT,
      accounts: [process.env.RINKEBY_PRIVATE_KEY],
    },
    ganache: {
      chainId: 1337,
      timeout: 20000,
      gasPrice: 8000000000,
      gas: "auto",
      name: "Ganache",
      url: process.env.GANACHE_URL,
      from: process.env.GANACHE_ACCOUNT,
      accounts: [process.env.GANACHE_PRIVATE_KEY],
    },
    hardhat: {
      chainId: 31337,
      name: "hardhat",
      gas: "auto",
      gasPrice: "auto",
    },
  },
};
