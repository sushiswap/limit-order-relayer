import { ChainId } from '@sushiswap/core-sdk'
import axios, { AxiosResponse } from 'axios'
import { BigNumber } from 'ethers'
import { PriceUpdate, PRICE_MULTIPLIER } from '../pairs/pairUpdates'
import { getWeth } from './misc'
import { safeAwait } from './myAwait'
import { MyProvider } from './myProvider'

export class NetworkPrices {
  // use 1 min cache to help prevent rate limits
  cache: {
    [key: string]: {
      timestamp: number
      value: BigNumber
    }
  } = {}

  stablecoins = ['DAI', 'USDC', 'USDT', 'MIM', 'UST', 'FRAX']

  /**
   * @returns Gas price in wei units (e.g.) 9000000000 for gas price of '9', token0 and token1 prices in eth
   * @note use safeAwait when calling this, it might throw an error
   * @note eth prices are multiplied by 1e8
   */
  public getPrices = async function (
    priceUpdate: PriceUpdate,
    chainId = +process.env.CHAINID
  ): Promise<{
    gasPrice: BigNumber
    token0EthPrice: BigNumber
    token1EthPrice: BigNumber
  }> {
    const gasPrice = await this.getWeiGasPrice(chainId)

    let token0EthPrice, token1EthPrice

    if (priceUpdate.token0.address === getWeth(+process.env.CHAINID))
      token0EthPrice = BigNumber.from('1000000000000000000')

    if (priceUpdate.token1.address === getWeth(+process.env.CHAINID))
      token1EthPrice = BigNumber.from('1000000000000000000')

    if (!token0EthPrice && !token1EthPrice) {
      // fetch one of the prices from coingecko

      let err1, err2

      ;[token0EthPrice, err1] = await safeAwait(
        this.getTokenEthPrice(
          chainId,
          priceUpdate.token0.address,
          priceUpdate.token0.decimals,
          priceUpdate.token0.addressMainnet,
          priceUpdate.pair.token0.symbol
        )
      )

      if (!token0EthPrice) {
        ;[token1EthPrice, err2] = await safeAwait(
          this.getTokenEthPrice(
            chainId,
            priceUpdate.token1.address,
            priceUpdate.token1.decimals,
            priceUpdate.token1.addressMainnet,
            priceUpdate.pair.token1.symbol
          )
        )
      }

      if (err1 && err2) console.log(err1, err2)
    }

    // if we have one token price we can caluculate the other from the pool's price
    if (token0EthPrice && !token1EthPrice)
      token1EthPrice = token0EthPrice.mul(priceUpdate.token1.price).div(PRICE_MULTIPLIER)

    if (token1EthPrice && !token0EthPrice)
      token0EthPrice = token1EthPrice.mul(priceUpdate.token0.price).div(PRICE_MULTIPLIER)

    if (!token0EthPrice && !token1EthPrice)
      throw new Error(`Couldn't fetch token prices ${priceUpdate.token1.address} ${priceUpdate.token0.address}`)

    return { gasPrice, token0EthPrice, token1EthPrice }
  }

  /**
   * @returns Gas price in wei units (e.g.) 9000000000 for gas price of '9'
   * @note use safeAwait when calling this, it might throw an error
   */
  public getWeiGasPrice = async function (chainId: number): Promise<BigNumber> {
    return MyProvider.Instance.provider.getGasPrice()
  }

  // todo test this for each token in relayer-config
  /**
   * @returns price of token in terms of "WETH" or whichever coin the network fees are paid in
   * @note eth prices are multiplied by 1e8
   * use safe await when calling
   */
  public getTokenEthPrice = async function (
    chainId: number,
    tokenAddress: string,
    tokenDecimals: number,
    tokenMainnetAddress?: string,
    tokenSymbol?: string
  ): Promise<BigNumber | undefined> {
    if (this.cache[tokenAddress]?.timestamp > new Date().getTime() - 60000) return this.cache[tokenAddress]?.value

    const isUSD = this.stablecoins.includes(tokenSymbol)

    let tokenPrice: any

    try {
      if (chainId == ChainId.ETHEREUM) {
        const token0EthPrice = await CoingeckoRequests.Instance.makeRequest(
          `https://api.coingecko.com/api/v3/coins/ethereum/contract/${tokenAddress}`
        )

        tokenPrice = token0EthPrice?.data?.market_data?.current_price?.eth
      } else if (chainId === ChainId.MATIC) {
        let maticUsd

        if (this.cache['wmatic']?.timestamp > new Date().getTime() - 60000) {
          maticUsd = this.cache['wmatic']?.value
        } else {
          maticUsd = (
            await CoingeckoRequests.Instance.makeRequest(
              `https://api.coingecko.com/api/v3/coins/matic-network?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false`
            )
          )?.data?.market_data?.current_price.usd

          this.cache['wmatic'] = {
            timestamp: new Date().getTime(),
            value: maticUsd,
          }
        }

        let tokenUsd

        if (isUSD) {
          tokenUsd = 1
        } else {
          tokenUsd = (
            await (tokenMainnetAddress
              ? CoingeckoRequests.Instance.makeRequest(
                  `https://api.coingecko.com/api/v3/coins/ethereum/contract/${tokenMainnetAddress}`
                )
              : CoingeckoRequests.Instance.makeRequest(
                  `https://api.coingecko.com/api/v3/coins/polygon-pos/contract/${tokenAddress}`
                ))
          )?.data?.market_data?.current_price.usd
        }

        if (tokenUsd && maticUsd) {
          tokenPrice = tokenUsd / maticUsd
        }
      } else if (chainId === ChainId.AVALANCHE) {
        let avaxUsd

        if (this.cache['wavax']?.timestamp > new Date().getTime() - 60000) {
          avaxUsd = this.cache['wavax']?.value
        } else {
          avaxUsd = (
            await CoingeckoRequests.Instance.makeRequest(
              `https://api.coingecko.com/api/v3/coins/avalanche-2?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false`
            )
          )?.data?.market_data?.current_price.usd

          this.cache['wavax'] = {
            timestamp: new Date().getTime(),
            value: avaxUsd,
          }
        }

        let tokenUsd

        if (isUSD) {
          tokenUsd = 1
        } else {
          tokenUsd = (
            await (tokenMainnetAddress
              ? CoingeckoRequests.Instance.makeRequest(
                  `https://api.coingecko.com/api/v3/coins/ethereum/contract/${tokenMainnetAddress}`
                )
              : CoingeckoRequests.Instance.makeRequest(
                  `https://api.coingecko.com/api/v3/coins/avalanche-2/contract/${tokenAddress}`
                ))
          )?.data?.market_data?.current_price.usd
        }

        if (tokenUsd && avaxUsd) {
          tokenPrice = tokenUsd / avaxUsd
        }
      }
    } catch (e) {
      throw new Error(`Couldn't fetch eth price of token: ${tokenAddress} ${e.toString().substring(0, 400)} ...`)
    }

    if (!tokenPrice) {
      throw new Error(`Couldn't fetch eth price of token: ${tokenAddress}`)
    }

    // we want the price to be padded by 18 decimals - more if the token has less than 18 decimals
    const e8value = BigNumber.from(Math.floor(tokenPrice * 1e9))

    const diff = BigNumber.from('10').pow(9 + (18 - tokenDecimals))

    const e18value = e8value.mul(diff)

    this.cache[tokenAddress] = {
      timestamp: new Date().getTime(),
      value: e18value,
    }

    return this.cache[tokenAddress].value
  }
}

// set a manual rate limit for coingecko requests (50 req / min)
// also with own internal cache
class CoingeckoRequests {
  private static _instance: CoingeckoRequests

  public static get Instance() {
    return this._instance || (this._instance = new this())
  }

  nextRequestAvalable = 0
  internalCache: {
    [key: string]: {
      timestamp: number
      value: AxiosResponse
    }
  } = {}

  protected constructor() {}

  makeRequest(url): Promise<AxiosResponse> {
    return new Promise(async (resolve, reject) => {
      let currentTime = new Date().getTime()

      if (this.internalCache[url]?.timestamp + 60000 > currentTime) {
        return resolve(this.internalCache[url].value)
      } else {
        await new Promise((r) =>
          setTimeout(
            () => r(undefined),
            currentTime < this.nextRequestAvalable ? this.nextRequestAvalable - currentTime : 0
          )
        )
        this.nextRequestAvalable = Math.max(this.nextRequestAvalable, currentTime) + 1000

        if (this.internalCache[url]?.timestamp + 60000 > new Date().getTime()) {
          this.nextRequestAvalable -= 1000
          return resolve(this.internalCache[url].value)
        }

        const [response, err] = await safeAwait(axios(url))
        if (err) reject(err)

        this.internalCache[url] = {
          timestamp: new Date().getTime(),
          value: response,
        }
        resolve(response)
      }
    })
  }
}
