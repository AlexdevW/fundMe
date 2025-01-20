const { ethers, deployments, getNamedAccounts } = require("hardhat");
const { expect } = require("chai");
const { developmentChains } = require("../../helper-hardhat-config");

developmentChains.includes(network.name)
  ? describe.skip
  : describe("test fundme contract", async function () {
      let fundMe;
      let firstAccount;

      beforeEach(async function () {
        await deployments.fixture(["all"]);
        firstAccount = (await getNamedAccounts()).firstAccount;
        const fundMeDeployment = await deployments.get("FundMe");
        fundMe = await ethers.getContractAt("FundMe", fundMeDeployment.address);
      });

      // test fund and getFund successfully
      it("fund and getFund successfully", async function () {
        // make sure target reached
        await fundMe.fund({ value: ethers.parseEther("1") });
        // make sure window closed
        await new Promise((resolve) => setTimeout(resolve, 181 * 1000));
        // make sure we can receipt (交易入快后的回执)
        const getFundTx = await fundMe.getFund();
        const getFundReceipt = await getFundTx.wait();
        expect(getFundReceipt)
          .to.emit(fundMe, "FundWIthdrawByOwner")
          .withArgs(ethers.parseEther("1"));
      });

      // test fund and refund successfully
      it("fund and getFund successfully", async function () {
        // make sure target reached
        await fundMe.fund({ value: ethers.parseEther("0.0004") });
        // make sure window closed
        await new Promise((resolve) => setTimeout(resolve, 181 * 1000));
        // make sure we can receipt (交易入快后的回执)
        const refundTx = await fundMe.refund();
        const refundReceipt = await refundTx.wait();
        expect(refundReceipt)
          .to.emit(fundMe, "ReFundByFunder")
          .withArgs(firstAccount, ethers.parseEther("0.0004"));
      });
    });
