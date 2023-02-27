const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

const NAME = "ORT Token";
const SYMBOL = "ORT";

// Contracts to deploy
const contractsToDeploy = ["TokenContract", "Vault", "Farm"];

async function main() {
  // Get provider
  const provider = ethers.provider;

  // Get signer
  const [signer] = await ethers.getSigners();

  // Get Contracts to deploy
  // TokenContract
  let contractToDeploy = contractsToDeploy[0];
  let contractPath =
    "contracts/" + contractToDeploy + ".sol:" + contractToDeploy;
  let contractFactory = await ethers.getContractFactory(contractPath, signer);
  const tokenDeployedContract = await contractFactory.deploy(NAME, SYMBOL);
  // Vault
  contractToDeploy = contractsToDeploy[1];
  contractPath = "contracts/" + contractToDeploy + ".sol:" + contractToDeploy;
  contractFactory = await ethers.getContractFactory(contractPath, signer);
  const vaultDeployedContract = await contractFactory.deploy(
    2,
    1000000000000000,
    100000000000000,
    20
  );
  // Farm
  contractToDeploy = contractsToDeploy[2];
  contractPath = "contracts/" + contractToDeploy + ".sol:" + contractToDeploy;
  contractFactory = await ethers.getContractFactory(contractPath, signer);
  const farmDeployedContract = await contractFactory.deploy(
    tokenDeployedContract.address,
    vaultDeployedContract.address,
    10
  );

  const deployedContracts = [
    tokenDeployedContract,
    vaultDeployedContract,
    farmDeployedContract,
  ];
  for (let i = 0; i < deployedContracts.length; i++) {
    // Check transaction result. 1 it is the number of transaction to wait
    const deployedContract = deployedContracts[i];
    tx_hash = deployedContract.deployTransaction.hash;
    const confirmations_number = 1;
    tx_result = await provider.waitForTransaction(
      tx_hash,
      confirmations_number
    );
    if (tx_result.confirmations < 0 || tx_result === undefined) {
      throw new Error(
        contractToDeploy ||
          "Contract ERROR: Deploy transaction is undefined or has 0 confirmations."
      );
    }

    // Get contract read only instance
    contractToDeploy = contractsToDeploy[i];
    const contractABIPath =
      path.resolve(process.cwd(), "artifacts/contracts/", contractToDeploy) +
      ".sol/" +
      contractToDeploy +
      ".json";
    const contractArtifact = JSON.parse(
      fs.readFileSync(contractABIPath, "utf8")
    );
    const deployedContractInstance = new ethers.Contract(
      deployedContract.address,
      contractArtifact.abi,
      provider
    );

    // Check getVersion function
    const contractVersion = await deployedContractInstance.VERSION();
    if (contractVersion != 100) {
      throw new Error(
        `-- ${contractToDeploy} contract ERROR: Version check fail.`
      );
    } else {
      console.log("");
      console.log(
        "---------------------------------------------------------------------------------------"
      );
      console.log("-- Deployed contract:\t", contractToDeploy);
      console.log("-- Contract address:\t", deployedContractInstance.address);
      console.log("-- Signer address:\t", signer.address);
      console.log("-- Deploy successfully");
      console.log(
        "---------------------------------------------------------------------------------------"
      );
      console.log("");
    }
  }
  const signerBalance = ethers.utils.formatEther(await signer.getBalance());
  console.log("");
  console.log(
    "---------------------------------------------------------------------------------------"
  );
  console.log("-- Signer address:\t", signer.address);
  console.log("-- Signer balance:\t", signerBalance);
  console.log(
    "---------------------------------------------------------------------------------------"
  );
  console.log("");
  console.log("");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
