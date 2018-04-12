pragma solidity ^0.4.19;

import "@gnosis.pm/gnosis-core-contracts/contracts/Tokens/StandardToken.sol";
import "./DX.sol";
import "./LendingAgreement.sol";
import "./Proxy.sol";

contract RequestRegistry {

    uint constant REQUEST_COLLATERAL = 4;
    uint constant AGREEMENT_COLLATERAL = 3;

    struct request {
        address Pc;
        address Tc;
        address Tb;
        uint Ac;
        uint Ab;
        uint returnTime;
    }

    struct fraction {
        uint num;
        uint den;
    }

    address dx;
    address ethToken;
    address lendingAgreement;

    // token => index => request
    mapping (address => mapping (uint => request)) public requests;
    // token => latestIndex
    mapping (address => uint) public latestIndices;

    function RequestRegistry(
        address _dx,
        address _ethToken,
        address _lendingAgreement
    )
        public
    {
        dx = _dx;
        ethToken = _ethToken;
        lendingAgreement = _lendingAgreement;
    }

    // For the purposes of this contract:
    // Tc = collateral token

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
        // get ratio of prices from DutchX
        uint num; uint den;
        (num, den) = getRatioOfPricesFromDX(Tb, Tc);

        // uint Ac = Ab * REQUEST_COLLATERAL * TPbrice / TPcrice;
        uint Ac = Ab * REQUEST_COLLATERAL * num / den;

        // Transfer collateral
        require(StandardToken(Tc).transferFrom(msg.sender, this, Ac));

        // if (! StandardToken(Tc).transferFrom(msg.sender, this, Ac)) {
        //     Log('Not working', 1);
        //     return;
        // }

        uint latestIndex = latestIndices[Tb];

        // Create borrow request
        requests[Tb][latestIndex + 1] = request(
            msg.sender,
            Tc,
            Tb,
            Ac,
            Ab,
            returnTime
        );

        // Increment latest index
        latestIndices[Tb] += 1;
    }

    function changeAc(
        address Tb,
        uint index,
        uint Ac
    )
        public
    {
        request memory thisRequest = requests[Tb][index];

        require(msg.sender == thisRequest.Pc);

        if (Ac < thisRequest.Ac) {
            // Ac is decreased
            uint dec = thisRequest.Ac - Ac;
            require(StandardToken(thisRequest.Tc).transfer(msg.sender, dec));
            requests[Tb][index].Ac -= dec;
        } else if (Ac > thisRequest.Ac) {
            // Ac is increased
            uint inc = Ac - thisRequest.Ac;
            require(StandardToken(thisRequest.Tc).transferFrom(msg.sender, this, inc));
            requests[Tb][index].Ac += inc;
        }
    }

    function cancelRequest(
        address Tb,
        uint index
    )
        public
    {
        address Pc = requests[Tb][index].Pc;
        // if (msg.sender != Pc) {
        //     return;
        // }
        require(msg.sender == Pc);
        delete requests[Tb][index];
    }

    function acceptRequest(
        address Tb,
        uint index,
        uint incentivization
    )
        public
    {
        request memory thisRequest = requests[Tb][index];

        // incentivization has to be smaller than collateral amount
        require(thisRequest.Ac > incentivization);

        // latest auction index for DutchX auction
        uint num; uint den;
        (num, den) = getRatioOfPricesFromDX(Tb, thisRequest.Tc);

        // Value of collateral might have decreased before agreement created
        // Only borrow requests with collateral at least 3x are accepted
        // This is to protect the requester from forced liqudiation

        require(thisRequest.Ac >= thisRequest.Ab * AGREEMENT_COLLATERAL * num / den);
        // if (thisRequest.Ac < thisRequest.Ab * AGREEMENT_COLLATERAL * num / den) {
        //     Log('R1',1);
        // }

        require(StandardToken(Tb).transferFrom(msg.sender, thisRequest.Pc, thisRequest.Ab));
        // if (!StandardToken(Tb).transferFrom(msg.sender, thisRequest.Pc, thisRequest.Ab)) {
        //     Log('R2',1);
        // }

        address agreement = new Proxy(lendingAgreement);

        LendingAgreement(agreement).setupLendingAgreement(
            dx,
            ethToken,
            msg.sender,
            thisRequest.Pc,
            thisRequest.Tc,
            thisRequest.Tb,
            thisRequest.Ac,
            thisRequest.Ab,
            thisRequest.returnTime,
            incentivization
        );

        require(StandardToken(thisRequest.Tc).transfer(agreement, thisRequest.Ac));
        // if (!StandardToken(thisRequest.Tc).transfer(agreement, thisRequest.Ac)) {
        //     Log('R3',1);
        // }

        delete requests[Tb][index];
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

    event Log(
        string l,
        uint n
    );

    event LogAddress(
        string l,
        address a
    );
}