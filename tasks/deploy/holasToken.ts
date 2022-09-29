import type { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { task } from 'hardhat/config'

import { HolasToken, HolasToken__factory } from '../../types'

interface TaskArguments {
}

// Help: npx hardhat help deploy:HolasToken
// Example: (addresses must be in lowercase)
// npx hardhat --network bsc deploy:HolasToken 
task('deploy:HolasToken')
  .setAction(async function (taskArguments: TaskArguments, { ethers }) {
    const signers: SignerWithAddress[] = await ethers.getSigners()
    const holasTokenFactory = await ethers.getContractFactory('contracts/HolasToken.sol:HolasToken')
    holasTokenFactory.connect(signers[0])
    const holasToken: HolasToken = <HolasToken>await holasTokenFactory.deploy(
    )
    console.log(holasToken.deployTransaction)
    await holasToken.deployed()
    console.log('HolasToken deployed to: ', holasToken.address)
  })
