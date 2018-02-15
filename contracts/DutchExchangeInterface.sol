pragma solidity ^0.4.19;

contract DutchExchangeInterface {

	function computeRatioOfHistoricalPriceOracles(
		address sellToken,
		address buyToken,
		uint auctionIndex
	)
        public
        view
        // price < 10^35
        returns (uint, uint);

	function getAuctionIndex(
		address token1,
		address token2
	)
        public
        view
        returns (uint);
}