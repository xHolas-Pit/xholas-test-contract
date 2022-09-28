import {
  tryNativeToUint8Array,
  // getOriginalAssetEth,
  getEmitterAddressEth,
  parseSequenceFromLogEth,
  ChainId,
  // transferFromEthNative
} from '@certusone/wormhole-sdk'
import axios from 'axios'
import * as dotenv from 'dotenv'
import { ethers } from 'ethers'
import * as util from 'util'


import { Lmao__factory } from '../types'

dotenv.config({ path: '../.env' }) // running this script inside the 'scripts' folder

interface NetworkConfig {
  type: string
  wormholeChainId: number
  rpc: string
  bridgeAddress: string // core bridge address
  tokenBridgeAddress: string
  lmaoContractAddress: string
}

// NOTE: MAKE SURE THAT ADDRESSES ARE IN VALID FORMAT (upper & lowercase)
const networkConfig: { [key: string]: NetworkConfig } = {
  goerli: {
    type: 'evm',
    wormholeChainId: 2,
    rpc: 'https://rpc.ankr.com/eth_goerli',
    bridgeAddress: '0x706abc4E45D419950511e474C7B9Ed348A4a716c',
    tokenBridgeAddress: '0xF890982f9310df57d00f659cf4fd87e65adEd8d7',
    // change manually after deployment
    lmaoContractAddress: '0x57cCAEb5CbE8D641caaCAA3B30486eAA21c79882',
  },
  mumbai: {
    type: 'evm',
    wormholeChainId: 5,
    rpc: 'https://rpc.ankr.com/polygon_mumbai',
    bridgeAddress: '0x0CBE91CF822c73C2315FB05100C2F714765d5c20',
    tokenBridgeAddress: '0x377D55a7928c046E18eEbb61977e714d2a76472a',
    // wrappedNativeAddress: '',
    // change manually after deployment
    lmaoContractAddress: '0xA4761c3640323A6Dd97B9c2636A9C52f632F4a80',
  }
}

// const wormholeRestAddress = 'http://localhost:7071'
const wormholeRestAddress = 'https://wormhole-v2-testnet-api.certus.one'

// const bridgeAddress = '0x0CBE91CF822c73C2315FB05100C2F714765d5c20'

interface FetchVaa {
  code: number, message: string, details: any[], vaaBytes?: string,
}

async function fetchVaaAttempt(
  url: string,
  attempt: number,
  maxAttempts: number,
  waitTime: number = 30000,
): Promise<{ vaaBytes: string }> {
  if (attempt > maxAttempts) throw new Error('VAA not found!')
  await new Promise((r) => setTimeout(r, waitTime))
  try {
    const { data } = await axios.get<FetchVaa>(url)
    if (data.code === 5 || data.message === 'requested VAA not found in store') throw new Error('VAA not found')
    return data as { vaaBytes: string }
  } catch (err) {
    console.log(`VAA attempt failed (${attempt}/${maxAttempts})`)
    return fetchVaaAttempt(url, attempt + 1, maxAttempts, waitTime)
  }
}

// NOTE: Finality on Ethereum & Polygon is about 15 minutes when using Portal, for both mainnets and testnets
async function fetchVaa(src: string, tx: ethers.ContractReceipt){ // portal = true
  const srcNetwork = networkConfig[src];
  const seq = parseSequenceFromLogEth(tx, srcNetwork.bridgeAddress);
  const emitterAddr = getEmitterAddressEth(srcNetwork.tokenBridgeAddress)

  console.log(
    'Searching for: ',
    `${wormholeRestAddress}/v1/signed_vaa/${srcNetwork.wormholeChainId}/${emitterAddr}/${seq}`
  );

  await new Promise((r) => setTimeout(r, 5000)); // wait for Guardian to pick up message

  const vaaPickUpUrl = `${wormholeRestAddress}/v1/signed_vaa/${srcNetwork.wormholeChainId}/${emitterAddr}/${seq}`
  const maxAttempts = 10
  const attemptInterval = 10000
  let attempt = 1

  const { vaaBytes } = await fetchVaaAttempt(vaaPickUpUrl, attempt, maxAttempts, attempt * 10 * attemptInterval)
  console.log('VAA found: ', vaaBytes)
  return vaaBytes
}


const provider = {
  goerli: new ethers.providers.JsonRpcProvider(networkConfig.goerli.rpc),
  mumbai: new ethers.providers.JsonRpcProvider(networkConfig.mumbai.rpc),
}

const wallet = new ethers.Wallet(process.env.PRIVATE_KEY as string)
const signer = {
  goerli: wallet.connect(provider.goerli),
  mumbai: wallet.connect(provider.mumbai),
}

const lmaoGoerli = Lmao__factory.connect(networkConfig.goerli.lmaoContractAddress, signer.goerli)
const lmaoMumbai = Lmao__factory.connect(networkConfig.mumbai.lmaoContractAddress, signer.mumbai)

const stupidConfigGoerli = { gasLimit: 21000000 }
const stupidConfigMumbai = { gasLimit: 10000000 }


async function test() {
  const amountEth = '0.001' // i'm broke even in testnet

  const originChainName = 'goerli'
  const targetChainName = 'mumbai'

  // in Wormhole formats
  const targetChainId = networkConfig[targetChainName].wormholeChainId
  const targetChainAddress = ethers.utils.hexlify(
    tryNativeToUint8Array(
      networkConfig[targetChainName].lmaoContractAddress,
      targetChainId as ChainId,
    )
  )

  /*
  // Step 1: Goerli
  // Needs to wait some time to retrieve the VAA
  const tx1 = await lmaoGoerli.executeBridgeOrigin(
    targetChainId,
    targetChainAddress,
    {
      ...stupidConfigGoerli,
      value: ethers.utils.parseEther(amountEth),
    }
  )
  console.log(tx1)
  const receipt = await tx1.wait()
  const vaa = await fetchVaa(originChainName, receipt)
  */
  const vaa = 'AQAAAAABAKeemf3FyXgQDN4IFKLrZ1nqqZujBpAE74sGzLy7QFVxc1s9vuBJdbN0CqgEln/7t9nV4tCadSfKdXv8zmfengsBYzQFeCdCAQAAAgAAAAAAAAAAAAAAAPiQmC+TEN9X0A9lnPT9h+Za3tjXAAAAAAAACBUBAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA7msoAAAAAAAAAAAAAAAAA2u5qvESlG0C0qVy8KAXTO/PeorcAAiI44xvGNEGMI7f7ftdVHC3F3GeGpqRfO3VhEhuIwwqjAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=='

  // Step 2: Mumbai
  const tx2 = await lmaoMumbai.receiveBridge(
    Buffer.from(vaa, 'base64'),
    stupidConfigMumbai
  )
  console.log(tx2)
  // Even though we call our contract, portal=true here because our contract calls Portal's transfer() function, making the emitter Portal
  const receiveBridgeVAA = await fetchVaa(targetChainName, await tx2.wait())
  console.log(receiveBridgeVAA)
}

test().catch((err) => {
  console.error(err)
  process.exit(1)
})
