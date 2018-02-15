pragma solidity ^0.4.19;

import "./ERC20Interface.sol";
import "./DutchExchangeInterface.sol";
import "./LendingAgreement.sol";

contract RequestRegistry {

    uint constant REQUEST_COLLATERAL = 4;
    uint constant AGREEMENT_COLLATERAL = 3;

    struct borrowRequest {
        address borrower;
        address cT;
        address bT;
        uint collateralAmount;
        uint amount;
        uint paybackTime;
        uint interest;
    }

    struct fraction {
        uint num;
        uint den;
    }

    bool isInitialised;
    address dutchExchange;

    // token => index => request
    mapping (address => mapping (uint => borrowRequest)) public borrowRequests;
    // token => latestIndex
    mapping (address => uint) public latestIndices;

    function setupRequestRegistry(
        address _dutchExchange
    )
        public
    {
        require(!isInitialised);

        dutchExchange = _dutchExchange;

        isInitialised = true;
    }


    // For the purposes of this contract:
    // cT = collateral token

    /// @dev post a new borrow request
    /// @param cT - 
    function postBorrowRequest(
        address cT,
        address bT,
        uint amount,
        uint paybackTime,
        uint interest
    )
        public
    {
        // latestAuctionIndex | 10^5
        uint lAI = DutchExchangeInterface(dutchExchange).getAuctionIndex(cT, bT);
        // 10^35

        uint num;
        uint den;
        (num, den) = DutchExchangeInterface(dutchExchange).computeRatioOfHistoricalPriceOracles(bT, cT, lAI);

        // uint collateralAmount = amount * 2 * bTPrice / cTPrice;
        uint collateralAmount = amount * REQUEST_COLLATERAL * num / den;

        // Transfer collateral
        require(ERC20Interface(cT).transferFrom(msg.sender, this, collateralAmount));

        uint latestIndex = latestIndices[bT];

        // Create borrow request
        borrowRequests[bT][latestIndex + 1] = borrowRequest(
            msg.sender,
            cT,
            bT,
            collateralAmount,
            amount,
            paybackTime,
            interest
        );

        // Increment latest index
        latestIndices[bT] += 1;
    }

    function updateCollateral(
        address bT,
        uint index,
        uint collateralAmount
    )
        public
    {
        borrowRequest memory request = borrowRequests[bT][index];

        require(msg.sender == request.borrower);

        if (collateralAmount < request.collateralAmount) {
            // collateralAmount is decreased
            uint dec = request.collateralAmount - collateralAmount;
            require(ERC20Interface(request.cT).transfer(msg.sender, dec));
            borrowRequests[bT][index].collateralAmount -= dec;
        } else {
            // collateralAmount is kept same or increased
            require(ERC20Interface(request.cT).transferFrom(msg.sender, this, uint(dif)));
        }
    }

    function cancelBorrowRequest(
        address bT,
        uint index
    )
        public
    {
        address borrower = borrowRequests[bT][index].borrower;
        require(msg.sender == borrower);
        delete borrowRequests[bT][index];
    }

    function createAgreement(
        address bT,
        uint index,
        uint incentivization
    )
        public
    {
        borrowRequest memory request = borrowRequests[bT][index];



        require(ERC20Interface(bT).transferFrom(msg.sender, request.borrower, request.amount));

        address agreement = new LendingAgreement(
            msg.sender,
            request.borrower,
            request.cT,
            request.bT,
            request.collateralAmount,
            request.amount,
            request.paybackTime,
            request.interest,
            incentivization
        );

        ERC20Interface(request.cT).transfer(agreement, request.collateralAmount);
    }
}