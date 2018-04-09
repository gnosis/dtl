pragma solidity ^0.4.19;

contract DX {

	function getPriceInPastAuction(
		address sellToken,
		address buyToken,
		uint auctionIndex
	)
        public
        view
        returns (uint, uint)
    {
    	return (2, 1);
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
}