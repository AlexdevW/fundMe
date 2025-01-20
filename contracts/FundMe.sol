// SPDX-License-Identifier: MIT

pragma solidity ^0.8.20;

import {AggregatorV3Interface} from "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";

// 1. 收款函数
// 2. 记录投资人，并且查看
// 3. 在锁定期内，达到目标值，生产商可以提款
// 4. 在锁定期内，没有达到目标值，投资人可以在锁定期结束之后可以退款
// 时间锁

/**
 * payable 表示这个函数可以接受主网上的原生通证 ETH
 */

/*
 * 预言机
 *    背景：在区块链的世界里一直有一个问题，链上的智能合约没有办法主动获取链下的任何数据 （真正世界资产价格）
 *    需要一个第三方的服务把线下的数据，移动到链上
 */
contract FundMe {
    AggregatorV3Interface public dataFeed;
    mapping(address => uint256) public fundersToAmount;
    uint256 MINIMUM_VALUE = 1 * 10**18; // USD  （在 Solidity 中，所有金额都要用 wei 单位表示， 将金额放大到 18 位小数，确保不会丢失精度）

    uint256 constant TARGET = 2 * 10**18; // USD

    address public owner;

    uint256 deploymentTimestamp;

    uint256 lockTime;

    address erc20Addr;

    bool public getFundSuccess;

    event FundWithdrawByOwner(uint256);

    event RefundByFunder(address, uint256);

    constructor(uint256 _lockTime, address dataFeedAddr) {
        // Sepolia  测试网
        dataFeed = AggregatorV3Interface(dataFeedAddr);
        owner = msg.sender;

        deploymentTimestamp = block.timestamp;
        lockTime = _lockTime;
    }

    function fund() external payable {
        require(convertEthToUsd(msg.value) >= MINIMUM_VALUE, "Send more ETH");
        require(
            block.timestamp < deploymentTimestamp + lockTime,
            "Window is close"
        );
        fundersToAmount[msg.sender] = msg.value;
    }

    function getChainlinkDataFeedLatestAnswer() public view returns (int256) {
        // prettier-ignore
        (
            /* uint80 roundID */,
            int answer,
            /*uint startedAt*/,
            /*uint timeStamp*/,
            /*uint80 answeredInRound*/
        ) = dataFeed.latestRoundData();
        return answer;
    }

    function convertEthToUsd(uint256 ethAmount)
        internal
        view
        returns (uint256)
    {
        // ETH amount * Eth price = Eth Value
        uint256 ethPrice = uint256(getChainlinkDataFeedLatestAnswer());
        return (ethAmount * ethPrice) / (10**8); // / 10 ** 8 这是因为 Chainlink 使用 "固定小数点" 表示法， 会在价格基础上 * 10 ** 8，确保在 Solidity 中处理时避免精度问题。
        //  precision,  ethAmount （wei） Eth    1ETH = 2000USD 10 ** 18
    }

    function transferOwnership(address newOwner) public onlyOwner {
        // require(
        //     msg.sender == owner,
        //     "this function can only be called by owner"
        // );
        owner = newOwner;
    }

    /**************** 转账 ****************/
    // 存转账
    // transfer: transfer ETH and revert if tx failed （revert 只会损失gas费用）
    // send: transfer ETH and return false if failed

    // 非存转账，可以执行一些逻辑， 可以调用payable 函数，把payable 函数需要的入参传进去 (以太坊官方推荐)
    // call: transfer ETH with data return value of function and bool;

    function getFund() external windowClose onlyOwner {
        require(
            convertEthToUsd(address(this).balance) >= TARGET,
            "TARGET is not reacted"
        );
        // require(
        //     msg.sender == owner,
        //     "this function can only be called by owner"
        // );
        // require(
        //     block.timestamp < deploymentTimestamp + lockTime,
        //     "the window is not close"
        // );

        // payable(msg.sender).transfer(address(this).balance); // 默认所有的地址不是 payable 的，所以需要进行类型转换

        // bool success = payable(msg.sender).send(address(this).balance);
        // require(success, "tx failed");
        uint256 balance = address(this).balance;
        bool success;
        (success, ) = payable(msg.sender).call{value: balance}(
            ""
        );
        require(success, "transfer tx failed");
        fundersToAmount[msg.sender] = 0;
        getFundSuccess = true; // flag;

        // emit event
        emit FundWithdrawByOwner(balance);
    }

    function refund() external windowClose {
        require(
            convertEthToUsd(address(this).balance) < TARGET,
            "TARGET is reached"
        );

        require(fundersToAmount[msg.sender] != 0, "there is no fund for you");
        // require(
        //     block.timestamp < deploymentTimestamp + lockTime,
        //     "the window is not close"
        // );

        uint256 balance = fundersToAmount[msg.sender];
        bool success;
        (success, ) = payable(msg.sender).call{
            value: balance
        }("");
        require(success, "transfer tx failed");
        fundersToAmount[msg.sender] = 0;

        emit RefundByFunder(msg.sender, balance);
    }

    function setFunderToAmount(address funder, uint256 amountToUpdate)
        external
    {
        require(
            msg.sender == erc20Addr,
            "you do not have permission to call this"
        );
        fundersToAmount[funder] = amountToUpdate;
    }

    function setErc20Addr(address _erc20Addr) public onlyOwner {
        erc20Addr = _erc20Addr;
    }

    /************************ modifier *****************/
    //  修饰符 提取公共的 rquire 校验方法
    modifier windowClose() {
        // 如果 _; 放在require 上面，代表先执行函数里的逻辑，最后再执行require逻辑
        require(
            block.timestamp >= deploymentTimestamp + lockTime,
            "the window is not close"
        );
        _; // 当合约用了 windowClose , 如果下划线是在require 下面，那就是先执行 require 的判断，再执行函数里面剩下的逻辑
        // 一般会放在下面，因为如果失败就不再继续执行后面的逻辑，节省gas费
    }

    modifier onlyOwner() {
        require(
            msg.sender == owner,
            "this function can only be called by owner"
        );
        _;
    }
}
