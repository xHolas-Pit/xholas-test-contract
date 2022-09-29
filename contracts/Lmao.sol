// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import { IERC20 } from '@openzeppelin/contracts/token/ERC20/IERC20.sol';

import { BytesLib } from './libs/BytesLib.sol';
import { IWormhole } from './Wormhole/IWormhole.sol';
import { ITokenBridge } from './Wormhole/ITokenBridge.sol';
import { BridgeStructs } from './Wormhole/BridgeStructs.sol';

contract Lmao {
    using BytesLib for bytes;

    event Log(string indexed str);
    event TokenTransferred(address indexed addr);
    event BridgeReceivedLog(
        address wrappedAsset,
        uint8 payloadID,
        uint256 amount,
        address tokenAddress,
        uint16 tokenChain,
        bytes32 to,
        uint16 toChain,
        address fromAddress
    );

    IWormhole immutable CORE_BRIDGE;
    ITokenBridge immutable TOKEN_BRIDGE;
    address immutable TOKEN_BRIDGE_ADDRESS;

    address FEE_TOKEN_ADDRESS = address(0);
    address NATIVE_TOKEN_ADDRESS = address(0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE);
    uint16 immutable WORMHOLE_CHAIN_ID;

    uint32 nonce = 0;

    constructor(
        address _coreBridgeAddress,
        address _tokenBridgeAddress,
        uint16 _wormholeChainId
    ) {
        CORE_BRIDGE = IWormhole(_coreBridgeAddress);
        TOKEN_BRIDGE = ITokenBridge(_tokenBridgeAddress);
        TOKEN_BRIDGE_ADDRESS = _tokenBridgeAddress;
        WORMHOLE_CHAIN_ID = _wormholeChainId;
    }

    // For bytes64, use this function, which just ignores the first 32 bytes
//    function bytes64ToAddress(bytes memory bys) private pure returns (address addr) {
//        assembly {
//            addr := mload(add(bys, 32))
//        }
//    }

    function bytesToAddress(bytes memory data) private pure returns (address addr) {
        bytes memory b = data;
        assembly {
            addr := mload(add(b, 20))
        }
    }

    function bytes32ToAddress(bytes32 bys) private pure returns (address) {
        return address(uint160(uint256(bys)));
    }

    function addressToBytes32(address addr) private pure returns (bytes32) {
        return bytes32(uint256(uint160(addr)) << 96);
    }

    function bytesToBytes32(bytes memory bys) private pure returns (bytes32 bys32) {
        if (bys.length == 0) return 0x0;
        assembly {
            bys32 := mload(add(bys, 32))
        }
    }

    function executeBridgeOrigin(
        uint16 _targetChainId,
        bytes32 _targetContractAddress
//        address _originTokenAddress
//        uint256 _originTokenAmount
    ) external payable returns (uint256 sequence) {
//        require(_originTokenAddress == NATIVE_TOKEN_ADDRESS, "Only ETH bridging is supported at the moment!");
        // Increase nonce first to prevent reentry with same nonce
        nonce += 1;
        // Native token
        sequence = TOKEN_BRIDGE.wrapAndTransferETHWithPayload{ value: msg.value }(
            _targetChainId,
            _targetContractAddress,
            nonce,
            abi.encodePacked(msg.sender)
        );

//        if (_originTokenAddress != NATIVE_TOKEN_ADDRESS) {
//            require(_originTokenAmount > 0, "Token amount is invalid!");
//            require(IERC20(_originTokenAddress).allowance(address(this)) >= amount);
//            amount = _originTokenAmount;
//
//            // transfer token to this address for approval for token bridge
//            IERC20(_originTokenAddress).transferFrom(msg.sender, address(this), amount);
//            // approve token bridge to move token amount to its contract (for locking & minting)
//            IERC20(_originTokenAddress).approve(TOKEN_BRIDGE_ADDRESS, amount);
//
//            TOKEN_BRIDGE.transferTokensWithPayload(
//                _originTokenAddress,
//                amount,
//                _targetChainId,
//                _targetContractAddress,
//                nonce,
//                abi.encodePacked(msg.sender)
//            );
//        }
    }

    function receiveBridge(bytes memory encodedVm) external {
        // Complete transfer will give the Tokens to this Contract
        // Unlike solana, we don't need to check that the emitter is a Portal contract as register_ scripts register all the Portal contracts
        // and the completeTransfer function checks the emitter is a valid Portal contract on one of the chains it's registered with
        // Can only be redeemed once, will automatically fail by the bridge afterwards
        BridgeStructs.TransferWithPayload memory vaa = _decodeVaaPayload(TOKEN_BRIDGE.completeTransferWithPayload(encodedVm));

//        require(vaa.toChain == WORMHOLE_CHAIN_ID, "Wrong Chain ID!");

//        // https://github.com/wormhole-foundation/wormhole/blob/dev.v2/ethereum/contracts/bridge/BridgeGetters.sol#L49
        address wrapped = TOKEN_BRIDGE.wrappedAsset(vaa.tokenChain, vaa.tokenAddress);
        require(wrapped != address(0), 'No wrapper for this token created yet');

        emit BridgeReceivedLog({
            wrappedAsset: wrapped,
            payloadID: vaa.payloadID,
            amount: vaa.amount,
            tokenAddress: bytes32ToAddress(vaa.tokenAddress),
            tokenChain: vaa.tokenChain,
            to: vaa.to,
            toChain: vaa.toChain,
            fromAddress: bytes32ToAddress(vaa.fromAddress)
        });

        address receiver = bytesToAddress(vaa.payload.slice(0, 20));
//        require(IERC20(wrapped).balanceOf(address(this)) >= vaa.amount, 'Insufficient amount of token to transfer');
//        require(IERC20(wrapped).transferFrom(address(this), receiver, vaa.amount), 'Transfer of token failed');

        emit TokenTransferred(receiver);

//        // Mint tokens to this contract
//        // amt they paid is NATIVE
//        // multiply by 100 to get how many tokens to give out
//        uint256 amtToMint = vaa.amount * 100;
//        _mint(address(this), amtToMint);
//        // Give Token Bridge allowance to take tokens from this contract
//        this.approve(address(token_bridge), amtToMint);
//        // Transfer tokens via Token Bridge over to Recipient in payload
//        uint64 sequence = token_bridge.transferTokens(address(this), amtToMint, vaa.tokenChain, bytes32(vaa.payload), 0, nonce);
//        nonce += 1;
//        return sequence;
    }

    function _decodeVaaPayload(bytes memory payload) private pure returns (BridgeStructs.TransferWithPayload memory) {
        BridgeStructs.TransferWithPayload memory decoded = BridgeStructs.TransferWithPayload({
            payloadID: payload.slice(0,1).toUint8(0),
            amount: payload.slice(1,32).toUint256(0),
            tokenAddress: payload.slice(33,32).toBytes32(0),
            tokenChain: payload.slice(65,2).toUint16(0),
            to: payload.slice(67,32).toBytes32(0),
            toChain: payload.slice(99,2).toUint16(0),
            fromAddress: payload.slice(101,32).toBytes32(0),
            payload: payload.slice(133, payload.length-133)
        });

        return decoded;
    }
}
