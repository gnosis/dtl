pragma solidity ^0.4.19;

import "@gnosis.pm/gnosis-core-contracts/contracts/Tokens/StandardToken.sol";
import "./DX.sol";

contract LendingAgreement {

    uint constant MINIMUM_COLLATERAL = 2;

    address masterCopy;

    address public dx;

    address public Pb;
    address public Pc;
    address public Tc;
    address public Tb;
    uint public Ac;
    uint public Ab;
    uint public returnTime;
    uint public incentivization;

    // auctionIndex in DX that holds funds
    uint public auctionIndex;

    address public RR;

    // > setupLendingAgreement
    function setupLendingAgreement(
        address _dx,
        address _Pb,
        address _Pc,
        address _Tc,
        address _Tb,
        uint _Ac,
        uint _Ab,
        uint _returnTime,
        uint _incentivization
    )
        public
    {
        // R1: fn cannot be called twice
        require(dx == 0x0);
        // R2: 
        require(_dx != 0x0);

        dx = _dx;

        Pb = _Pb;
        Pc = _Pc;
        Tc = _Tc;
        Tb = _Tb;
        Ac = _Ac;
        Ab = _Ab;
        returnTime = _returnTime;
        incentivization = _incentivization;

        RR = msg.sender;
    }

    function changePb(
        address _Pb
    )
        public
    {
        require(msg.sender == Pb);
        Pb = _Pb;
    }

    function changePc(
        address _Pc
    )
        public
    {
        require(msg.sender == Pc);
        Pc = _Pc;
    }

    function changeAc(
        uint _Ac
    )
        public
    {
        require(msg.sender == Pc);

        if (_Ac <= Ac) {
            // Ac is intended to be decreased
            if (Ab == 0) {
                require(StandardToken(Tc).transfer(msg.sender, Ac));
                selfdestruct(0x0);
            } else {
                // get ratio of prices from DutchX
                uint num; uint den;
                (num, den) = getRatioOfPricesFromDX(Tb, Tc);

                // new collateral amount will be:
                uint newAc = max(Ab * MINIMUM_COLLATERAL * num / den, _Ac);

                if (newAc < Ac) {
                    require(StandardToken(Tc).transfer(msg.sender, Ac - newAc));
                    Ac = newAc;
                }
            }
        } else if (_Ac > Ac) {
            // Ac is increased
            require(StandardToken(Tc).transferFrom(msg.sender, this, _Ac - Ac));
            Ac = _Ac;
        }
    }

    function returnTb(uint amount)
        public
    {
        require(msg.sender == Pc);

        // Never return more than was borrowed
        amount = min(amount, Ab);
        require(StandardToken(Tb).transferFrom(Pc, Pb, amount));
        Ab -= amount;
    }

    function returnTbAndChangeAc(
        uint amountToReturn,
        uint Ac
    )
        public
    {
        returnTb(amountToReturn);
        changeAc(Ac);
    }

    function liquidate()
        public
    {
        if (now >= returnTime) {
            require(msg.sender == Pb);
            // liquidate by auctioning off on DutchX
            (,auctionIndex,) = DX(dx).depositAndSell(Tc, Tb, Ac);
            // require(StandardToken(Tc).transfer(Pb, Ac));
        } else {
            // get price of Tc in Tb
            uint num; uint den;
            (num, den) = getRatioOfPricesFromDX(Tb, Tc);

            // if value of collateral amount is less than twice of amount borrowed
            require(Ac < Ab * MINIMUM_COLLATERAL * num / den); 
            // {
                // liquidate

                if (msg.sender == Pb) {
                    (,auctionIndex,) = DX(dx).depositAndSell(Tc, Tb, Ac);
                } else {
                    require(StandardToken(Tc).transfer(msg.sender, incentivization));
                    (,auctionIndex,) = DX(dx).depositAndSell(Tc, Tb, Ac - incentivization);
                }
            // }
        }
    }

    function claimFunds()
        public
    {
        // passing in uint(-1) will mean all balances will be claimed
        DX(dx).claimAndWithdraw(Tc, Tb, this, auctionIndex, uint(-1));
        uint bal = StandardToken(Tb).balanceOf(this);
        require(StandardToken(Tb).transfer(Pb, bal));
        if (bal > 0) {
            // The only time this contract holds Tb is when Tc has been liquidated
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
        uint lAI = DX(dx).getAuctionIndex(token1, token2);
        (num, den) = DX(dx).getPriceInPastAuction(token1, token2, lAI);
    }

    function max(uint a, uint b)
        public
        pure
        returns (uint)
    {
        return (a < b) ? b : a;
    }

    function min(uint a, uint b)
        public
        pure
        returns (uint)
    {
        return (a > b) ? b : a;
    }

    event Log(string l, uint n);
    event LogAddress(string l, address a);
}