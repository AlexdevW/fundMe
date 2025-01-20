const { ethers, deployments, getNamedAccounts, network } = require("hardhat");
const { assert, expect } = require("chai");
const helpers = require("@nomicfoundation/hardhat-network-helpers");
const { developmentChains } = require("../../helper-hardhat-config");

/**
 * 单元测试
 *   验证合约合法操作和非法操作的执行结果是否是正确的
 *   为了保证每个开发者在改变合约后，运行不会出错
 *   可以在本地运行，验证效率高
 * 集成测试
 *   在部署正式链前会进行集成测试，主要是为了验证单元测试不能覆盖的点
 *    1. 无法模拟真实的网络环境，本地模拟的喂价合约无法模拟真实合约的网络情况
 *    2. unit test 没有考虑出块的延迟，和网络波动情况
 */

!developmentChains.includes(network.name)
  ? describe.skip
  : describe("test fundme contract", async function () {
      let fundMe;
      let fundMeSecondAccount;
      let firstAccount;
      let secondAccount;
      let mockV3Aggregator;

      beforeEach(async function () {
        await deployments.fixture(["all"]);
        firstAccount = (await getNamedAccounts()).firstAccount;
        secondAccount = (await getNamedAccounts()).secondAccount;
        const fundMeDeployment = await deployments.get("FundMe");
        mockV3Aggregator = await deployments.get("MockV3Aggregator");
        fundMe = await ethers.getContractAt("FundMe", fundMeDeployment.address); // 通过部署的合约地址去获取合约
        fundMeSecondAccount = await ethers.getContract("FundMe", secondAccount); // 第二个参数，给的是账户的地址， 由第二个账户去连接一个合约，返回一个新的合约对象
      });

      it("test if the owner is mag.sender", async function () {
        await fundMe.waitForDeployment();
        assert.equal(await fundMe.owner(), firstAccount);
      });

      it("test if the dataFeed is assigned correctly", async function () {
        await fundMe.waitForDeployment();
        assert.equal(await fundMe.dataFeed(), mockV3Aggregator.address);
      });

      // unit test for fund
      it("window closed, value grater than minimum, fund failed", async function () {
        // make sure the window is closed
        await helpers.time.increase(200);
        await helpers.mine(); // 模拟挖矿, 本地测试网不会自己挖矿

        expect(
          fundMe.fund({ value: ethers.parseEther("0.0004") })
        ).to.be.revertedWith("Window is close");
      });

      it("window open, value is less than minimum, fund failed", async function () {
        expect(
          fundMe.fund({ value: ethers.parseEther("0.1") })
        ).to.be.revertedWith("Send more ETH");
      });

      it("Window open, value is greater minimum, fund success", async function () {
        await fundMe.fund({ value: ethers.parseEther("0.1") });
        const balance = await fundMe.fundersToAmount(firstAccount);
        expect(balance).to.equal(ethers.parseEther("0.1"));
      });

      // unit test for getFund
      // onlyOwner, windowCLose, target reached
      it("not owner, window closed, target reached, getFund failed", async function () {
        // make sure the target is reached
        await fundMe.fund({ value: ethers.parseEther("1") });

        // make sure the window is close
        await helpers.time.increase(200);
        await helpers.mine(); // 模拟挖矿, 本地测试网不会自己挖矿

        await expect(fundMeSecondAccount.getFund()).to.be.revertedWith(
          "this function can only be called by owner"
        );
      });

      it("window open, target reached, getFund failed", async function () {
        await fundMe.fund({ value: ethers.parseEther("1") });
        await expect(fundMe.getFund()).to.be.revertedWith(
          "the window is not close"
        );
      });

      it("window closed, target not reached, getFund failed", async function () {
        await fundMe.fund({ value: ethers.parseEther("0.0004") });

        // make sure the window is close
        await helpers.time.increase(200);
        await helpers.mine(); // 模拟挖矿, 本地测试网不会自己挖矿

        await expect(fundMe.getFund()).to.be.revertedWith(
          "TARGET is not reacted"
        );
      });

      it("window closed, target reached, getFund success", async function () {
        await fundMe.fund({ value: ethers.parseEther("1") });

        // make sure the window is close
        await helpers.time.increase(200);
        await helpers.mine(); // 模拟挖矿, 本地测试网不会自己挖矿

        await expect(fundMe.getFund())
          .to.emit(fundMe, "FundWithdrawByOwner")
          .withArgs(ethers.parseEther("1"));
      });

      // refund
      // window closed, target not reached, funder has balance
      it("window open, target not reached, funder has balance, refund failed", async function () {
        await fundMe.fund({ value: ethers.parseEther("0.0004") });
        expect(fundMe.refund()).to.be.revertedWith("the window is not close");
      });

      it("window closed, target reached, funder has balance, refund failed", async function () {
        await fundMe.fund({ value: ethers.parseEther("1") });

        // make sure the window is close
        await helpers.time.increase(200);
        await helpers.mine(); // 模拟挖矿, 本地测试网不会自己挖矿

        expect(fundMe.refund()).to.be.revertedWith("TARGET is reached");
      });

      it("window closed, target not reached, funder has not balance, refund failed", async function () {
        await fundMe.fund({ value: ethers.parseEther("0.0004") });

        // make sure the window is close
        await helpers.time.increase(200);
        await helpers.mine(); // 模拟挖矿, 本地测试网不会自己挖矿

        expect(fundMeSecondAccount.refund()).to.be.revertedWith(
          "there is no fund for you"
        );
      });

      it("window closed, target not reached, funder has balance, refund success", async function () {
        await fundMe.fund({ value: ethers.parseEther("0.0004") });

        // make sure the window is close
        await helpers.time.increase(200);
        await helpers.mine(); // 模拟挖矿, 本地测试网不会自己挖矿

        expect(fundMe.refund())
          .to.emit("RefundByFunder")
          .withArgs(firstAccount, ethers.parseEther("0.0004"));
      });
    });
