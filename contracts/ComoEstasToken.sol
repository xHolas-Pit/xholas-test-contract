// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import { ERC20Burnable } from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { ERC20Permit } from "@openzeppelin/contracts/token/ERC20/extensions/draft-ERC20Permit.sol";
import { ERC20FlashMint } from "@openzeppelin/contracts/token/ERC20/extensions/ERC20FlashMint.sol";

contract ComoEstasToken is ERC20, ERC20Burnable, Ownable, ERC20Permit, ERC20FlashMint {
    constructor() ERC20("ComoEstasToken", "CET") ERC20Permit("ComoEstasToken") {
        _mint(msg.sender, 1000000 * 10 ** decimals());
    }

    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
    }
}
