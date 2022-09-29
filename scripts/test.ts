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


import {Lmao, Lmao__factory} from '../types'

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
    lmaoContractAddress: '0x718A7375EeC3982b9c02fca1DDEb6f511d0C6452',
  },
  bsc: {
    // TESTNET
    type: 'evm',
    wormholeChainId: 4,
    rpc: 'https://data-seed-prebsc-1-s1.binance.org:8545/',
    bridgeAddress: '0x68605AD7b15c732a30b1BbC62BE8F2A509D74b4D',
    tokenBridgeAddress: '0x9dcF9D205C9De35334D646BeE44b2D2859712A09',
    // change manually after deployment
    lmaoContractAddress: '0x31510D2dC8e148E0DE544eCaDC9315186bf44731',
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
  attemptInterval: number = 90000,
): Promise<{ vaaBytes: string }> {
  if (attempt > maxAttempts) throw new Error('VAA not found!')
  await new Promise((r) => setTimeout(r, attemptInterval))
  try {
    const { data } = await axios.get<FetchVaa>(url)
    if (data.code === 5 || data.message === 'requested VAA not found in store') throw new Error('VAA not found')
    return data as { vaaBytes: string }
  } catch (err) {
    console.log(`VAA attempt failed (${attempt}/${maxAttempts})`)
    attempt += 1
    return fetchVaaAttempt(url, attempt, maxAttempts, (attempt ** (5/3)) * attemptInterval)
  }
}

// NOTE: Finality on Ethereum & Polygon is about 15 minutes when using Portal, for both mainnets and testnets
async function fetchVaa(src: string, tx: ethers.ContractReceipt){ // portal = true
  const srcNetwork = networkConfig[src];
  tx.logs.filter((l) => {
    console.log(l.address)
  })
  const seq = parseSequenceFromLogEth(tx, srcNetwork.bridgeAddress);
  const emitterAddr = getEmitterAddressEth(srcNetwork.tokenBridgeAddress)

  console.log(
    'Searching for: ',
    `${wormholeRestAddress}/v1/signed_vaa/${srcNetwork.wormholeChainId}/${emitterAddr}/${seq}`
  );

  await new Promise((r) => setTimeout(r, 5000)); // wait for Guardian to pick up message

  const vaaPickUpUrl = `${wormholeRestAddress}/v1/signed_vaa/${srcNetwork.wormholeChainId}/${emitterAddr}/${seq}`
  const maxAttempts = 10
  const attemptInterval = 10000 // 10s
  let attempt = 0

  const { vaaBytes } = await fetchVaaAttempt(vaaPickUpUrl, attempt, maxAttempts, attemptInterval)
  console.log('VAA found: ', vaaBytes)
  return vaaBytes
}


const wallet = new ethers.Wallet(process.env.PRIVATE_KEY as string)

const networkConfigKeys = Object.keys(networkConfig)
const signer: { [key: string]: ethers.Wallet } = {}
const lmao: { [key: string]: Lmao } = {}

networkConfigKeys.forEach((key) => {
  signer[key] = wallet.connect(new ethers.providers.JsonRpcProvider(networkConfig[key].rpc))
  lmao[key] = Lmao__factory.connect(networkConfig[key].lmaoContractAddress, signer[key])
})

const stupidConfig = {
  goerli: { gasLimit: 21000000 },
  bsc: { gasLimit: 1000000 },
  mumbai: { gasLimit: 10000000 },
}


async function test() {
  const amountEth = '0.001' // i'm broke even in testnet

  // const originChainName = 'goerli'
  // const targetChainName = 'mumbai'
  const originChainName = 'bsc'
  const targetChainName = 'goerli'

  // in Wormhole formats
  const targetChainId = networkConfig[targetChainName].wormholeChainId
  const targetChainAddress = tryNativeToUint8Array(
    networkConfig[targetChainName].lmaoContractAddress,
    targetChainId as ChainId,
  )

  // Step 1: Goerli
  // Needs to wait some time to retrieve the VAA
  const tx1 = await lmao[originChainName].executeBridgeOrigin(
    targetChainId,
    targetChainAddress,
    {
      ...stupidConfig[originChainName],
      value: ethers.utils.parseEther(amountEth),
    }
  )
  console.log(tx1)
  const receipt = await tx1.wait()
  const vaa = await fetchVaa(originChainName, receipt)
  // const vaa = 'AQAAAAABAKeemf3FyXgQDN4IFKLrZ1nqqZujBpAE74sGzLy7QFVxc1s9vuBJdbN0CqgEln/7t9nV4tCadSfKdXv8zmfengsBYzQFeCdCAQAAAgAAAAAAAAAAAAAAAPiQmC+TEN9X0A9lnPT9h+Za3tjXAAAAAAAACBUBAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA7msoAAAAAAAAAAAAAAAAA2u5qvESlG0C0qVy8KAXTO/PeorcAAiI44xvGNEGMI7f7ftdVHC3F3GeGpqRfO3VhEhuIwwqjAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=='

  // Step 2: Mumbai
  const tx2 = await lmao[targetChainName].receiveBridge(
    Buffer.from(vaa, 'base64'),
    stupidConfig[targetChainName]
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
