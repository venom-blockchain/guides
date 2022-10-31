pragma ever-solidity >= 0.61.2;
pragma AbiHeader expire;
pragma AbiHeader pubkey;

import "./Ballot.sol";

contract Vote {
    uint16  static _nonce;
    TvmCell static _ballotCode;

    uint256 _managerPublicKey;
    uint32  _acceptedCount;
    uint32  _rejectedCount;

    event NewBallot(address ballotAddress, address owner);

    constructor(
        uint256 managerPublicKey,
        address sendRemainingGasTo
    ) public {
        tvm.accept();
        tvm.rawReserve(0.1 ever, 0);
        _managerPublicKey = managerPublicKey;
        sendRemainingGasTo.transfer({ value: 0, flag: 128, bounce: false });
    }

    function deployBallot(address owner, address sendRemainingGasTo) external view {
        tvm.rawReserve(0.1 ever, 0);
        TvmCell ballotStateInit = tvm.buildStateInit({
            contr: Ballot,
            varInit: {
                _vote: address(this),
                _managerPublicKey: _managerPublicKey,
                _owner: owner
            },
            code: _ballotCode
        });
        
        address ballot = new Ballot{
            stateInit: ballotStateInit,
            value: 0,
            flag: 128
        }(
            sendRemainingGasTo
        );
        emit NewBallot(ballot, owner);
    }

    // this function will be called by ballots, but how we can know - is calling ballot a fake or not?
    function onBallotUsed(address owner, address sendRemainingGasTo, bool accept) external {
        tvm.rawReserve(0.1 ever, 0);
        // if you know init params of contract you can pretty simple calculate it's address
        TvmCell ballotStateInit = tvm.buildStateInit({
            contr: Ballot,
            varInit: {
                _vote: address(this),
                _managerPublicKey: _managerPublicKey,
                _owner: owner
            },
            code: _ballotCode
        });
        // so address is a hash from state init
        address expectedAddress = address(tvm.hash(ballotStateInit));
        // and now we can just compare msg.sender address with calculated expected address
        // if its equals - calling ballot has the same code, that Vote stores and deploys
        if (msg.sender == expectedAddress) {
            if (accept) {
                _acceptedCount++;
            } else {
                _rejectedCount++;
            }
            sendRemainingGasTo.transfer({value: 0, flag: 128, bounce: false});
        } else {
            msg.sender.transfer({ value: 0, flag: 128, bounce: false });
        }
    }

    function getDetails() external view returns (uint32 accepted, uint32 rejected) {
        return (_acceptedCount, _rejectedCount);
    }
}
