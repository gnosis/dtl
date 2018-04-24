pragma solidity ^0.4.19;

import "@gnosis.pm/gnosis-core-contracts/contracts/Tokens/StandardToken.sol";

contract DX {

    uint num = 2;

	function getPriceInPastAuction(
		address sellToken,
		address buyToken,
		uint auctionIndex
	)
        public
        view
        returns (uint, uint)
    {
    	return (num, 1);
    }

    function changeMarketPrice(uint a)
        public
    {
        num = a;
    }

	function getAuctionIndex(
		address token1,
		address token2
	)
        public
        view
        returns (uint)
    {
    	return 1;
    }

    function depositAndSell(
        address sellToken,
        address buyToken,
        uint amount
    )
        external
        returns (uint newBal, uint auctionIndex, uint newSellerBal)
    {
        
    }

    function claimAndWithdraw(
        address sellToken,
        address buyToken,
        address user,
        uint auctionIndex,
        uint amount
    )
        external
        returns (uint returned, uint frtsIssued, uint newBal)
    {
        uint bal = StandardToken(buyToken).balanceOf(this);
        require(StandardToken(buyToken).transfer(user, bal));
    }
}