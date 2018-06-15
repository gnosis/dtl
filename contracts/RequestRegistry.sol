pragma solidity ^0.4.19;

import "@gnosis.pm/util-contracts/contracts/StandardToken.sol";
import "@gnosis.pm/util-contracts/contracts/Proxy.sol";
import "@gnosis.pm/dx-contracts/contracts/DutchExchange.sol";
import "./LendingAgreement.sol";
import "./MathSimple.sol";

contract RequestRegistry is MathSimple {

    uint constant AGREEMENT_COLLATERAL = 3;

    struct request {
        address Pc;
        address Tc;
        uint Ab;
        uint returnTime;
    }

    address dx;
    address lendingAgreement;

    // Q: Structure storage
    // token => index => request
    mapping (address => mapping (uint => request)) public requests;
    // token => latestIndex
    mapping (address => uint) public latestIndices;

    event Log(
        string l,
        uint n
    );

    event LogAddress(
        string l,
        address a
    );

    event NewAgreement(address agreement);

    function RequestRegistry(
        address _dx,
        address _lendingAgreement
    )
        public
    {
        dx = _dx;
        lendingAgreement = _lendingAgreement;
    }

    /// @dev post a new borrow request
    /// @param Tc - 
    function postRequest(
        address Tc,
        address Tb,
        uint Ab,
        uint returnTime
    )
        public
    {
        // R1
        require(Tc != Tb);

        // R2
        require(Ab > 0);

        // R3
        require(returnTime > now);
        // if (!(returnTime > now)) {
        //     Log('returnTime', returnTime);
        //     Log('now', now);
        //     return;
        // }

        // Token pair should be initialized
        // (otherwise it could never get accepted)
        require(DutchExchange(dx).getAuctionIndex(Tc, Tb) > 0);

        uint latestIndex = latestIndices[Tb];

        // Create borrow request
        requests[Tb][latestIndex] = request(
            msg.sender,
            Tc,
            Ab,
            returnTime
        );

        // Increment latest index
        latestIndices[Tb] += 1;
    }

    function cancelRequest(
        address Tb,
        uint index
    )
        public
    {
        require(msg.sender == requests[Tb][index].Pc);
        // if (!(msg.sender == requests[Tb][index].Pc)) {
        //     Log('R1', 1);
        //     return;
        // }

        // Delete request
        delete requests[Tb][index];
    }

    function acceptRequest(
        address Tb,
        uint index,
        uint incentivization
    )
        public
        returns (address newProxyForAgreement)
    {
        request memory thisRequest = requests[Tb][index];

        // latest auction index for DutchX auction
        uint num; uint den;
        (num, den) = getRatioOfPricesFromDX(Tb, thisRequest.Tc);

        uint Ac = mul(mul(thisRequest.Ab, AGREEMENT_COLLATERAL), num) / den;

        // Perform lending
        require(StandardToken(Tb).transferFrom(msg.sender, thisRequest.Pc, thisRequest.Ab));
        // if (!StandardToken(Tb).transferFrom(msg.sender, thisRequest.Pc, thisRequest.Ab)) {
        //     Log('R2',1);
        // }

        newProxyForAgreement = new Proxy(lendingAgreement);

        LendingAgreement(newProxyForAgreement).setupLendingAgreement(
            dx,
            msg.sender,
            thisRequest.Pc,
            thisRequest.Tc,
            Tb,
            Ac,
            thisRequest.Ab,
            thisRequest.returnTime,
            incentivization
        );

        // Transfer collateral from Pc to proxy
        require(StandardToken(thisRequest.Tc).transferFrom(thisRequest.Pc, newProxyForAgreement, Ac));
        // if (!StandardToken(thisRequest.Tc).transferFrom(thisRequest.Pc, newProxyForAgreement, Ac)) {
        //     Log('R3',1);
        // }

        delete requests[Tb][index];

        NewAgreement(newProxyForAgreement);
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
        // getPriceInPastAuction works the following way:
        // if token1 == token2, it outputs (1, 1).
        // if they are not equal, it outputs price in units [token2]/[token1]
        // requires that token pair to have been initialized
        (num, den) = DutchExchange(dx).getPriceInPastAuction(token1, token2, lAI);
    }
}