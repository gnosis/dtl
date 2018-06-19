pragma solidity ^0.4.19;

contract MathSimple {
    function max(uint a, uint b)
        public
        pure
        returns (uint)
    {
        return (a < b) ? b : a;
    }

    function min(uint a, uint b)
        public
        pure
        returns (uint)
    {
        return (a > b) ? b : a;
    }

    function safeToMul(uint a, uint b)
        public
        pure
        returns (bool)
    {
        return b == 0 || a * b / b == a;
    }

    function mul(uint a, uint b)
        public
        pure
        returns (uint)
    {
        require(safeToMul(a, b));
        return a * b;
    }
}