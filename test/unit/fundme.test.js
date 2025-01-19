const { ethers, deployments, getNamedAccounts } = require("hardhat");
const { assert, expect } = require("chai");
const helpers = require("@nomicfoundation/hardhat-network-helpers");

describe("test fundme contract", async function () {
  let fundMe;
  let firstAccount;
  let mockV3Aggregator;

  beforeEach(async function () {
    await deployments.fixture(["all"]);
    firstAccount = (await getNamedAccounts()).firstAccount;
    const fundMeDeployment = await deployments.get("FundMe");
    mockV3Aggregator = await deployments.get("MockV3Aggregator");
    fundMe = await ethers.getContractAt("FundMe", fundMeDeployment.address);
  });

  it("test if the owner is mag.sender", async function () {
    await fundMe.waitForDeployment();
    console.log(firstAccount, "firstAccountfirstAccount", await fundMe.owner());
    assert.equal(await fundMe.owner(), firstAccount);
  });

  it("test if the dataFeed is assigned correctly", async function () {
    await fundMe.waitForDeployment();
    assert.equal(await fundMe.dataFeed(), mockV3Aggregator.address);
  });

  it("window closed, value grater than minimum, fund failed", async function () {
    // make sure the window is closed
    await helpers.time.increase(200);
    await helpers.mine(); // 模拟挖矿, 本地测试网不会自己挖矿

    expect(
      fundMe.fund({ value: ethers.parseEther("0.0004") })
    ).to.be.revertedWith("Window is close");
  });
});
