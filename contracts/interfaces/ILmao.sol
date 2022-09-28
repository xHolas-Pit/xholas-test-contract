// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

interface Lmao {
    function executeBridgeOrigin(
        uint16 _targetChainId,
        bytes32 _targetContractAddress
    ) external payable returns (uint256 sequence);

    function receiveBridge(
        bytes memory encodedVm
    ) external;
}
