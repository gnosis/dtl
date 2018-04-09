pragma solidity ^0.4.19;

import "./StandardToken.sol";

contract TokenWithConstr is StandardToken {
    function TokenWithConstr(
    	uint amount
    )
    	public 
    {
    	balances[msg.sender] = amount;
    }
}
