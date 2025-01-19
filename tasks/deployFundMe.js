const { task } = require("hardhat/config");

task("deploy-fundme", "deploy and verify fundme contract").setAction(
  async (taskArgs, hre) => {
    // create factory
    const fundMeFactory = await ethers.getContractFactory("FundMe");
    console.log("contract deploying");
    const fundMe = await fundMeFactory.deploy(300); // 发起部署请求，拉起metamask 弹窗
    await fundMe.waitForDeployment(); // 等待用户确认，并且等待区块验证后入链
    console.log(
      `contract has been deployed successfully, contract address is ${fundMe.target}`
    );

    if (
      hre.network.config.chainId === 11155111 &&
      process.env.ETHERSCAN_API_KEY
    ) {
      console.log("waiting for 5 confirmations");
      // 因为 etherscan 浏览器的数据会有延迟，区块更新了，但是浏览器的数据库还没有更新，所以我们可以等几个区块过后在调用合约验证方法，规避延迟问题
      await fundMe.deploymentTransaction().wait(5);
      await verifyFundMe(fundMe.target, [300]);
    } else {
      console.log("verification skipped.");
    }
  }
);

async function verifyFundMe(fundMeAddr, args) {
  await hre.run("verify:verify", {
    address: fundMeAddr,
    constructorArguments: args,
  });
}

module.exports = {};
