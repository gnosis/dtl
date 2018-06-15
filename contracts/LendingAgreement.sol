pragma solidity ^0.4.19;

import "@gnosis.pm/util-contracts/contracts/StandardToken.sol";
import "@gnosis.pm/util-contracts/contracts/Proxy.sol";
import "@gnosis.pm/dx-contracts/contracts/DutchExchange.sol";
import "./MathSimple.sol";

contract LendingAgreement is Proxied, MathSimple {

    uint constant MINIMUM_COLLATERAL = 2;

    address public dx;

    address public lender;
    address public borrower;
    address public collateralToken;
    address public token;
    uint public collateralAmount;
    uint public borrowedAmount;
    uint public returnTime;
    uint public incentivization;

    // auctionIndex in DX that holds funds
    uint public auctionIndex;

    event Log(string l, uint n);
    event LogAddress(string l, address a);

    // > setupLendingAgreement
    function setupLendingAgreement(
        address _dx,
        address _lender,
        address _borrower,
        address _collateralToken,
        address _token,
        uint _collateralAmount,
        uint _borrowedAmount,
        uint _returnTime,
        uint _incentivization
    )
        public
    {
        // R1: fn cannot be called twice
        require(dx == 0x0);

        dx = _dx;

        lender = _lender;
        borrower = _borrower;
        collateralToken = _collateralToken;
        token = _token;
        collateralAmount = _collateralAmount;
        borrowedAmount = _borrowedAmount;
        returnTime = _returnTime;
        incentivization = _incentivization;
    }

    function changeLender(
        address _lender
    )
        public
    {
        require(msg.sender == lender);
        lender = _lender;
    }

    function changeBorrower(
        address _borrower
    )
        public
    {
        require(msg.sender == borrower);
        borrower = _borrower;
    }

    function changeCollateralAmount(
        uint _collateralAmount
    )
        public
    {
        require(msg.sender == borrower);

        if (_collateralAmount <= collateralAmount) {
            // collateralAmount is intended to be decreased
            if (borrowedAmount == 0) {
                // Return collateral to borrower and destroy contract
                require(StandardToken(collateralToken).transfer(msg.sender, collateralAmount));
                selfdestruct(0x0);
            } else {
                // get ratio of prices from DutchX
                uint num; uint den;
                (num, den) = getRatioOfPricesFromDX(token, collateralToken);

                // new collateral amount will be:
                uint minimum = mul(mul(borrowedAmount, MINIMUM_COLLATERAL), num) / den;
                uint newCollateralAmount = max(minimum, _collateralAmount);

                if (newCollateralAmount < collateralAmount) {
                    // Cannot underflow because of above assumption
                    require(StandardToken(collateralToken).transfer(
                        msg.sender, collateralAmount - newCollateralAmount
                    ));
                    collateralAmount = newCollateralAmount;
                }
            }
        } else if (_collateralAmount > collateralAmount) {
            // collateralAmount is increased
            // Cannot underflow because of above assumption
            require(StandardToken(collateralToken).transferFrom(
                msg.sender, this, _collateralAmount - collateralAmount
            ));
            collateralAmount = _collateralAmount;
        }
    }

    function returnTokens(uint amount)
        public
    {
        require(msg.sender == borrower);

        // Never return more than was borrowed
        amount = min(amount, borrowedAmount);
        require(StandardToken(token).transferFrom(borrower, lender, amount));

        // Cannot underflow because of above assignment
        borrowedAmount -= amount;
    }

    function returnTokensAndChangeCollateralAmount(
        uint amountToReturn,
        uint collateralAmount
    )
        public
    {
        returnTokens(amountToReturn);
        changeCollateralAmount(collateralAmount);
    }

    function liquidate()
        public
    {
        if (now >= returnTime) {
            require(msg.sender == lender);
            // liquidate by auctioning off on DutchX
            (,auctionIndex,) = DutchExchange(dx).depositAndSell(collateralToken, token, collateralAmount);
            // require(StandardToken(collateralToken).transfer(lender, collateralAmount));
        } else {
            // get price of collateralToken in borrowed token
            uint num; uint den;
            (num, den) = getRatioOfPricesFromDX(token, collateralToken);

            // if value of collateral amount is less than twice of amount borrowed
            if (collateralAmount < mul(mul(borrowedAmount, MINIMUM_COLLATERAL), num) / den) {
                // liquidate

                if (msg.sender == lender) {
                    (,auctionIndex,) = DutchExchange(dx).depositAndSell(
                        collateralToken, token, collateralAmount
                    );
                } else {
                    uint incentive = incentivization == 0 ? incentive : collateralAmount / incentivization;
                    require(StandardToken(collateralToken).transfer(msg.sender, incentive));
                    // Cannot underflow because in by line above, collateralAmount > incentive
                    (,auctionIndex,) = DutchExchange(dx).depositAndSell(
                        collateralToken, token, collateralAmount - incentive
                    );
                }
            }
        }
    }

    function claimFunds()
        public
    {
        // passing in uint(-1) will mean all balances will be claimed
        DutchExchange(dx).claimAndWithdraw(collateralToken, token, this, auctionIndex, uint(-1));
        uint bal = StandardToken(token).balanceOf(this);
        require(StandardToken(token).transfer(lender, bal));
        if (bal > 0) {
            // The only time this contract holds borrowed tokens is when collateralToken has been liquidated
            // After funds have been claimed, contract can be destroyed:
            selfdestruct(0x0);
        }
    }

    // @dev outputs a price in units [token2]/[token1]
    function getRatioOfPricesFromDX(
        address token1,
        address token2
    )
        public
        view
        returns (uint num, uint den)
    {
        uint lAI = DutchExchange(dx).getAuctionIndex(token1, token2);
        (num, den) = DutchExchange(dx).getPriceInPastAuction(token1, token2, lAI);
    }
}