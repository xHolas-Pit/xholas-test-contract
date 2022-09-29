import type { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { task } from 'hardhat/config'

import { Lmao, Lmao__factory } from '../../types'

interface TaskArguments {
  coreBridgeAddress: string,
  tokenBridgeAddress: string,
  wormholeChainId: number,
}

// Help: npx hardhat help deploy:Lmao
// Example: (addresses must be in lowercase)
// npx hardhat --network goerli deploy:Lmao --wormhole-chain-id 2 --core-bridge-address 0x706abc4e45d419950511e474c7b9ed348a4a716c --token-bridge-address 0xf890982f9310df57d00f659cf4fd87e65aded8d7
// npx hardhat --network bsc deploy:Lmao --wormhole-chain-id 4 --core-bridge-address 0x68605AD7b15c732a30b1BbC62BE8F2A509D74b4D --token-bridge-address 0x9dcF9D205C9De35334D646BeE44b2D2859712A09
// npx hardhat --network polygon-mumbai deploy:Lmao --wormhole-chain-id 5 --core-bridge-address 0x0cbe91cf822c73c2315fb05100c2f714765d5c20 --token-bridge-address 0x377d55a7928c046e18eebb61977e714d2a76472a
task('deploy:Lmao')
  .addParam('wormholeChainId', 'Wormhole Chain ID')
  .addParam('coreBridgeAddress', 'Wormhole Core Bridge Address')
  .addParam('tokenBridgeAddress', 'Wormhole Token Bridge Address')
  .setAction(async function (taskArguments: TaskArguments, { ethers }) {
    const signers: SignerWithAddress[] = await ethers.getSigners()
    const lmaoFactory = await ethers.getContractFactory('contracts/Lmao.sol:Lmao')
    lmaoFactory.connect(signers[0])
    const lmao: Lmao = <Lmao>await lmaoFactory.deploy(
      taskArguments.coreBridgeAddress,
      taskArguments.tokenBridgeAddress,
      taskArguments.wormholeChainId,
    )
    console.log(lmao.deployTransaction)
    await lmao.deployed()
    console.log('Lmao deployed to: ', lmao.address)
  })
