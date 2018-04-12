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
        
    }
}