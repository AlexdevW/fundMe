const { ethers } = require("hardhat");

async function main() {
  // create factory
  const fundMeFactory = await ethers.getContractFactory("FundMe");
  console.log("contract deploying");
  const fundMe = await fundMeFactory.deploy(300); // 发起部署请求，拉起metamask 弹窗
  await fundMe.waitForDeployment(); // 等待用户确认，并且等待区块验证后入链
  console.log(
    `contract has been deployed successfully, contract address is ${fundMe.target}`
  );

  if (hre.network.config.chainId === 11155111 && process.env.ETHERSCAN_API_KEY) {
    console.log("waiting for 5 confirmations");
    // 因为 etherscan 浏览器的数据会有延迟，区块更新了，但是浏览器的数据库还没有更新，所以我们可以等几个区块过后在调用合约验证方法，规避延迟问题
    await fundMe.deploymentTransaction().wait(5);
    await verifyFundMe(fundMe.target, [300]);
  } else {
    console.log("verification skipped.");
  }

  // init two accounts
  const [firstAccount, secondAccount] = await ethers.getSigners();
  console.log(`first account: ${firstAccount.address}`);
  console.log(`second account: ${secondAccount.address}`);

  // fund the contract with first account
  const fundTx = await fundMe.fund({ value: ethers.parseEther("0.0004") });  //  默认connect第一个账户
  await fundTx.wait(); // 等待确认

  // check balance of the contract
  const balanceOfContract = await ethers.provider.getBalance(fundMe.target); // ethers.provider 是hardhat 提供的provider 类似与 etherscan 和 metamask 的provider
  console.log(`Balance of the contract is ${ethers.formatEther(balanceOfContract)}`);

  // fund the contract with second account
  const fundTxWithSecondAccount = await fundMe.connect(secondAccount).fund({ value: ethers.parseEther("0.0004") });
  await fundTxWithSecondAccount.wait();

  // check balance of the contract
  const balanceOfContractAfterSecondFund = await ethers.provider.getBalance(fundMe.target);
  console.log(`Balance of the contract after second fund is ${ethers.formatEther(balanceOfContractAfterSecondFund)}`);

  // check mapping
  const firstAccountBalanceInFundMe = await fundMe.fundersToAmout(firstAccount.address);
  console.log(`first account balance in fund me is ${ethers.formatEther(firstAccountBalanceInFundMe)}`);

  const secondAccountBalanceInFundMe = await fundMe.fundersToAmout(secondAccount.address);
  console.log(`second account balance in fund me is ${ethers.formatEther(secondAccountBalanceInFundMe)}`);
}

async function verifyFundMe(fundMeAddr, args) {
  await hre.run("verify:verify", {
    address: fundMeAddr,
    constructorArguments: args,
  });
} 

main()
  .then()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
