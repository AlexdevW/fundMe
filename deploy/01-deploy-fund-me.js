const { network } = require("hardhat");
const {
  developmentChains,
  networkConfig,
  LOCK_TIME,
  CONFIRMATIONS,
} = require("../helper-hardhat-config");

module.exports = async ({ getNamedAccounts, deployments }) => {
  const { firstAccount } = await getNamedAccounts();
  const { deploy } = deployments;

  let dataFeedAddr;
  let confirmations;
  if (developmentChains.includes(network.name)) {
    const MockV3Aggregator = await deployments.get("MockV3Aggregator");
    dataFeedAddr = MockV3Aggregator.address;
    confirmations = 0;
  } else {
    dataFeedAddr = networkConfig[network.name].ethUsdDataFeed;
    confirmations = CONFIRMATIONS;
  }

  const fundMe = await deploy("FundMe", {
    from: firstAccount,
    args: [LOCK_TIME, dataFeedAddr],
    log: true,
    waitConfirmations: confirmations,
  });

  // remove deployments directory or add --reset flag if you redeploy contract

  if (
    hre.network.config.chainId === 11155111 &&
    process.env.ETHERSCAN_API_KEY
  ) {
    console.log("waiting for 5 confirmations");
    // 因为 etherscan 浏览器的数据会有延迟，区块更新了，但是浏览器的数据库还没有更新，所以我们可以等几个区块过后在调用合约验证方法，规避延迟问题
    // await fundMe.deploymentTransaction().wait(5);
    await hre.run("verify:verify", {
      address: fundMe.address,
      constructorArguments: [LOCK_TIME, dataFeedAddr],
    });
  } else {
    console.log("Network is not sepolia, verification skipped");
  }
};

module.exports.tags = ["all", "fundMe"];
