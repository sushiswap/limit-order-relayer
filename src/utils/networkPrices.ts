import { ChainId } from "@sushiswap/sdk";
import axios from "axios";
import { BigNumber } from "ethers";
import { PriceUpdate, PRICE_MULTIPLIER } from "../price-updates/pair-updates";
import { MyLogger } from "./myLogger";

export class NetworkPrices {

  // use 1 min cache to help prevent rate limits
  private cache: {
    [key: string]: {
      timestamp: number,
      value: BigNumber
    }
  } = {};

  /**
  * @returns Gas price in wei units (e.g.) 9000000000 for gas price of '9', token0 and token1 prices in eth
  * @note use safeAwait when calling this, it might throw an error
  * @note eth prices are multiplied by 1e8
  */
  public getPrices = async function (priceUpdate: PriceUpdate, chainId = +process.env.CHAINID):
    Promise<{ gasPrice: BigNumber, token0EthPrice: BigNumber, token1EthPrice: BigNumber }> {

    let gasPrice, token0EthPrice, token1EthPrice;

    [gasPrice, token0EthPrice, token1EthPrice] = await Promise.all([
      this.getWeiGasPrice(chainId),
      this.getTokenEthPrice(chainId, priceUpdate.token0.address, priceUpdate.token0.addressMainnet),
      this.getTokenEthPrice(chainId, priceUpdate.token1.address, priceUpdate.token1.addressMainnet)
    ]);

    if (priceUpdate.token0.address === process.env.WETH_ADDRESS) token0EthPrice = BigNumber.from("100000000"); // better precision; calculated price is usually off by some %

    if (priceUpdate.token1.address === process.env.WETH_ADDRESS) token1EthPrice = BigNumber.from("100000000"); // better precision; calculated price is usually off by some %

    if (!token0EthPrice && !token1EthPrice) throw new Error(`Couldn't fetch token prices ${priceUpdate.token1.address} ${priceUpdate.token0.address}`);

    if (!token1EthPrice) token1EthPrice = token0EthPrice.mul(priceUpdate.token1.price).div(PRICE_MULTIPLIER);

    if (!token0EthPrice) token0EthPrice = token1EthPrice.mul(priceUpdate.token0.price).div(PRICE_MULTIPLIER);

    return { gasPrice, token0EthPrice, token1EthPrice };
  }

  /**
  * @returns Gas price in wei units (e.g.) 9000000000 for gas price of '9'
  * @note use safeAwait when calling this, it might throw an error
  */
  public getWeiGasPrice = async function (chainId: number): Promise<BigNumber> {

    if (this.cache["gasprice"]?.timestamp > (new Date().getTime() - 60000)) return this.cache["gasprice"]?.value;

    let proposeGasPrice;

    if (chainId === ChainId.MAINNET) {

      const gasPrice = await axios(`https://api.etherscan.io/api?module=gastracker&action=gasoracle&apikey=${process.env.ETHERSCAN_API_KEY}`);

      proposeGasPrice = gasPrice?.data.result?.FastGasPrice;

    } else if (chainId === ChainId.MATIC) {

      const gasPrice = await axios('https://gasstation-mainnet.matic.network');

      proposeGasPrice = gasPrice?.data.standard;

    }

    if (!proposeGasPrice) throw new Error(`Failed to get gas price for ${chainId}`);

    this.cache["gasprice"] = {
      timestamp: (new Date()).getTime(),
      value: BigNumber.from(Math.floor(+proposeGasPrice * 1e9))
    };

    return this.cache["gasprice"].value;

  }

  // todo test this for each token in relayer-config
  /**
   * @returns price of token in terms of "WETH" or whichever coin the network fees are paid in
   * @note eth prices are multiplied by 1e8
   */
  public getTokenEthPrice = async function (chainId: number, tokenAddress: string, tokenMainnetAddress?: string): Promise<BigNumber | undefined> {

    if (this.cache[tokenAddress]?.timestamp > (new Date().getTime() - 60000)) return this.cache[tokenAddress]?.value;

    let tokenPrice: any;

    try {


      if (chainId == ChainId.MAINNET) {

        const token0EthPrice = await axios(`https://api.coingecko.com/api/v3/coins/ethereum/contract/${tokenAddress}`);

        tokenPrice = token0EthPrice?.data?.market_data?.current_price?.eth

      } else if (chainId === ChainId.MATIC) {

        const [token0USDPrice, maticPrice] = await Promise.all([
          tokenMainnetAddress ?
            axios(`https://api.coingecko.com/api/v3/coins/ethereum/contract/${tokenMainnetAddress}`) :
            axios(`https://api.coingecko.com/api/v3/coins/polygon-pos/contract/${tokenAddress}`),
          axios(`https://api.coingecko.com/api/v3/coins/matic-network?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false`)
        ]);

        const tokenUsd = token0USDPrice?.data?.market_data?.current_price.usd;
        const maticUsd = maticPrice?.data?.market_data?.current_price.usd;

        if (tokenUsd && maticUsd) {
          tokenPrice = tokenUsd / maticUsd;
        }

      }

    } catch (e) {

      return MyLogger.log(`Couldn't fetch eth price of token: ${tokenAddress} ${e}`);

    }

    if (!tokenPrice) {

      return MyLogger.log(`Couldn't fetch eth price of token: ${tokenAddress}`);

    }

    this.cache[tokenAddress] = {
      timestamp: (new Date()).getTime(),
      value: BigNumber.from(Math.floor(tokenPrice * 1e8))
    };

    return this.cache[tokenAddress].value;

  }
}