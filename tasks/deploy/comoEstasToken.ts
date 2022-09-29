import type { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { task } from 'hardhat/config'

import { ComoEstasToken, ComoEstasToken__factory } from '../../types'

interface TaskArguments {
}

// Help: npx hardhat help deploy:HolasToken
// Example: (addresses must be in lowercase)
// npx hardhat --network bsc deploy:ComoEstasToken 
task('deploy:ComoEstasToken')
  .setAction(async function (taskArguments: TaskArguments, { ethers }) {
    const signers: SignerWithAddress[] = await ethers.getSigners()
    const ComoEstasTokenFactory = await ethers.getContractFactory('contracts/ComoEstasToken.sol:ComoEstasToken')
    ComoEstasTokenFactory.connect(signers[0])
    const ComoEstasToken: ComoEstasToken = <ComoEstasToken>await ComoEstasTokenFactory.deploy(
    )
    console.log(ComoEstasToken.deployTransaction)
    await ComoEstasToken.deployed()
    console.log('ComoEstasToken deployed to: ', ComoEstasToken.address)
  })
