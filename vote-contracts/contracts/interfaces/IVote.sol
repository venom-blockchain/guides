pragma ever-solidity >= 0.61.2;
pragma AbiHeader expire;

interface IVote {
    function onBallotUsed(address owner, address sendRemainingGasTo, bool accept) external;
}