const { task } = require("hardhat/config");

task("interact-fundme", "interact with fundme contract")
  .addParam("addr", "the address of the fundme contract")
  .setAction(async (taskArgs, hre) => {
    const fundMeFactory = await ethers.getContractFactory("FundMe");
    const fundMe = await fundMeFactory.attach(taskArgs.addr);
    // init two accounts
    const [firstAccount, secondAccount] = await ethers.getSigners();
    console.log(`first account: ${firstAccount.address}`);
    console.log(`second account: ${secondAccount.address}`);

    // fund the contract with first account
    const fundTx = await fundMe.fund({ value: ethers.parseEther("0.0004") }); //  默认connect第一个账户
    await fundTx.wait(); // 等待确认

    // check balance of the contract
    const balanceOfContract = await ethers.provider.getBalance(fundMe.target); // ethers.provider 是hardhat 提供的provider 类似与 etherscan 和 metamask 的provider
    console.log(
      `Balance of the contract is ${ethers.formatEther(balanceOfContract)}`
    );

    // fund the contract with second account
    const fundTxWithSecondAccount = await fundMe
      .connect(secondAccount)
      .fund({ value: ethers.parseEther("0.0004") });
    await fundTxWithSecondAccount.wait();

    // check balance of the contract
    const balanceOfContractAfterSecondFund = await ethers.provider.getBalance(
      fundMe.target
    );
    console.log(
      `Balance of the contract after second fund is ${ethers.formatEther(
        balanceOfContractAfterSecondFund
      )}`
    );

    // check mapping
    const firstAccountBalanceInFundMe = await fundMe.fundersToAmout(
      firstAccount.address
    );
    console.log(
      `first account balance in fund me is ${ethers.formatEther(
        firstAccountBalanceInFundMe
      )}`
    );

    const secondAccountBalanceInFundMe = await fundMe.fundersToAmout(
      secondAccount.address
    );
    console.log(
      `second account balance in fund me is ${ethers.formatEther(
        secondAccountBalanceInFundMe
      )}`
    );
  });
