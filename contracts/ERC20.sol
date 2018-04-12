pragma solidity ^0.4.19;

import "@gnosis.pm/gnosis-core-contracts/contracts/Tokens/StandardToken.sol";

contract ERC20 is StandardToken {
    function ERC20(address[] accounts)
    	public 
    {
    	for (uint i = 0; i < accounts.length; i++) {
    		balances[accounts[i]] = 100 * 10 ** 18;
    	}
    }
}
