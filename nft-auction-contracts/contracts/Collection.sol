pragma ever-solidity >= 0.61.2;

pragma AbiHeader expire;
pragma AbiHeader time;
pragma AbiHeader pubkey;


import '@itgold/everscale-tip/contracts/TIP4_2/TIP4_2Collection.sol';
import './Nft.sol';

contract Collection is TIP4_2Collection {

    /**
    * Errors
    **/
    uint8 constant sender_is_not_owner = 101;
    uint8 constant value_is_less_than_required = 102;

    /// _remainOnNft - the number of crystals that will remain after the entire mint 
    /// process is completed on the Nft contract
    uint128 _remainOnNft = 0.3 ton;

    constructor(
        TvmCell codeNft,
        string json
    ) TIP4_1Collection (
        codeNft
    ) TIP4_2Collection (
        json
    ) public {
        tvm.accept();
    }

    function mintNft(
        string json
    ) external virtual {
        require(msg.value > _remainOnNft + 0.1 ton, value_is_less_than_required);
        tvm.rawReserve(0, 4);

        uint256 id = uint256(_totalSupply);
        _totalSupply++;

        TvmCell codeNft = _buildNftCode(address(this));
        TvmCell stateNft = tvm.buildStateInit({
            contr: Nft,
            varInit: {_id: id},
            code: codeNft
        });

        address nftAddr = new Nft{
            stateInit: stateNft,
            value: 0,
            flag: 128
        }(
            msg.sender,
            msg.sender,
            _remainOnNft,
            json
        ); 

        emit NftCreated(
            id, 
            nftAddr,
            msg.sender,
            msg.sender, 
            msg.sender
        );
    
    }
}