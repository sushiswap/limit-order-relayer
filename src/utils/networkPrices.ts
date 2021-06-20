import { ChainId } from "@sushiswap/sdk";
import axios from "axios";
import { BigNumber } from "ethers";
import { PriceUpdate, PRICE_MULTIPLIER } from "../price-updates/pair-updates";

export class NetworkPrices {

  /**
  * @returns Gas price in wei units (e.g.) 9000000000 for gas price of '9', token0 and token1 prices in eth
  * @note use safeAwait when calling this, it might throw an error
  * @note eth prices are multiplied by 1e8
  */
  public getPrices = async function (priceUpdate: PriceUpdate, chainId = +process.env.CHAINID):
    Promise<{ gasPrice: BigNumber, token0EthPrice: BigNumber, token1EthPrice: BigNumber }> {

    let gasPrice, token0EthPrice, token1EthPrice;

    [gasPrice, token0EthPrice] = await Promise.all([
      this.getWeiGasPrice(chainId),
      this.getToken0EthPrice(chainId, priceUpdate.token0.address)
    ]);

    if (priceUpdate.token0.address === process.env.WETH_ADDRESS) token0EthPrice = BigNumber.from("100000000"); // better precision; calculated price is usually off by some %

    token1EthPrice = token0EthPrice.mul(priceUpdate.token1.price).div(PRICE_MULTIPLIER);

    if (priceUpdate.token1.address === process.env.WETH_ADDRESS) token1EthPrice = BigNumber.from("100000000"); // better precision; calculated price is usually off by some %

    return { gasPrice, token0EthPrice, token1EthPrice };
  }

  /**
  * @returns Gas price in wei units (e.g.) 9000000000 for gas price of '9'
  * @note use safeAwait when calling this, it might throw an error
  */
  public getWeiGasPrice = async function (chainId: number): Promise<BigNumber> {

    let proposeGasPrice;

    if (chainId === ChainId.MAINNET) {

      const gasPrice = await axios(`https://api.etherscan.io/api?module=gastracker&action=gasoracle&apikey=${process.env.ETHERSCAN_API_KEY}`);

      proposeGasPrice = gasPrice?.data.result?.FastGasPrice;

    } else if (chainId === ChainId.MATIC) {

      const gasPrice = await axios('https://gasstation-mainnet.matic.network');

      proposeGasPrice = gasPrice?.data.standard;

    }

    if (!proposeGasPrice) throw new Error(`Failed to get gas price for ${chainId}`);

    return BigNumber.from(Math.floor(+proposeGasPrice * 1e9));

  }

  // todo test this for each token in relayer-config
  /**
   * @returns price of token0 in terms of "WETH" or whichever coin the network fees are paid in (padded by 1e8)
   * @note use safeAwait when calling this, it might throw an error
   * @note eth prices are multiplied by 1e8
   */
  public getToken0EthPrice = async function (chainId: number, tokenAddress: string) {

    let tokenPrice: any;

    if (chainId == ChainId.MAINNET) {

      const token0EthPrice = await axios(`https://api.coingecko.com/api/v3/coins/ethereum/contract/${tokenAddress}`);

      tokenPrice = token0EthPrice?.data?.market_data?.current_price?.eth

    } else if (chainId === ChainId.MATIC) {

      const [token0USDPrice, maticPrice] = await Promise.all([
        axios(`https://api.coingecko.com/api/v3/coins/polygon-pos/contract/${tokenAddress}`),
        axios(`https://api.coingecko.com/api/v3/coins/matic-network?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false`)
      ]);

      const tokenUsd = token0USDPrice?.data?.market_data?.current_price.usd;
      const maticUsd = maticPrice?.data?.market_data?.current_price.usd;

      if (tokenUsd && maticUsd) {

        tokenPrice = tokenUsd / maticUsd;

      }

    }

    if (!tokenPrice) throw new Error(`Couldn't fetch eth price of token: ${tokenAddress}`);

    return BigNumber.from(Math.floor(tokenPrice * 1e8));

  }
}