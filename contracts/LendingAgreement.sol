pragma solidity ^0.4.19;

contract LendingAgreement {

    address lender;
    address borrower;

    uint paybackTime;

    // > Constructor
    function LendingAgreement(
        address _lender,
        address _borrower,
        address _cT,
        address _bT,
        uint _collateralAmount,
        uint _amount,
        uint _paybackTime,
        uint _interest,
        uint _incentivization
    )
        public
    {

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

    function liquidate(

    )
        public
    {
        if (now > paybackTime) {
        }
        // } else if () {

        // }
    }
}