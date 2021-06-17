import { ChainId } from "@sushiswap/sdk";
import axios from "axios";
import { BigNumber } from "ethers";
import { PriceUpdate, PRICE_MULTIPLIER } from "../price-updates/pair-updates";
import { MyLogger } from "./myLogger";

export async function getGweiGasPrice(chainId: number) {

  let proposeGasPrice;

  if (chainId === ChainId.MAINNET) {

    const gasPrice = await axios(`https://api.etherscan.io/api?module=gastracker&action=gasoracle&apikey=${process.env.ETHERSCAN_API_KEY}`).catch(e => MyLogger.log('Failed to get gasPrice'));

    proposeGasPrice = gasPrice?.data.result?.FastGasPrice;

  } else if (chainId === ChainId.MATIC) {

    const gasPrice = await axios('https://gasstation-mainnet.matic.network').catch(e => MyLogger.log('Failed to get gasPrice'));

    proposeGasPrice = gasPrice?.data.standard;

  }

  if (!proposeGasPrice) return;

  return BigNumber.from(Math.floor(+proposeGasPrice * 1e9));

}

export async function getData(priceUpdate: PriceUpdate, chainId = +process.env.CHAINID): Promise<{ gasPrice?: BigNumber, token0EthPrice?: BigNumber, token1EthPrice?: BigNumber }> {

  let [gasPrice, token0EthPrice]: Array<BigNumber | void> = await Promise.all([
    getGweiGasPrice(chainId),
    getToken0EthPrice(chainId, priceUpdate.token0.address)
  ]);

  if (priceUpdate.token0.address === process.env.WETH_ADDRESS) token0EthPrice = BigNumber.from("100000000"); // better precision; calculated price is usually off by some %

  if (!gasPrice || !token0EthPrice) {
    return {};
  }

  const token1EthPrice = token0EthPrice.mul(priceUpdate.token1.price).div(PRICE_MULTIPLIER);

  return { gasPrice, token0EthPrice, token1EthPrice };
}

// return price of token0 in terms of "WETH" or whichever coin the network fees are paid in (padded by 1e8)
async function getToken0EthPrice(chainId: number, tokenAddress: string) {

  if (chainId == ChainId.MAINNET) {

    const token0EthPrice = await axios(`https://api.coingecko.com/api/v3/coins/ethereum/contract/${tokenAddress}`);

    if (!token0EthPrice?.data?.market_data?.current_price?.eth) return MyLogger.log(`Couldn't fetch price of token: ${tokenAddress}`);

    return BigNumber.from(Math.floor(token0EthPrice.data?.market_data?.current_price?.eth * 1e8));

  } else if (chainId === ChainId.MATIC) {

    const [token0USDPrice, maticPrice] = await Promise.all([
      axios(`https://api.coingecko.com/api/v3/coins/polygon-pos/contract/${tokenAddress}`),
      axios(`https://api.coingecko.com/api/v3/coins/matic-network?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false`)
    ]);

    if (!token0USDPrice?.data?.market_data?.current_price.usd || !maticPrice?.data?.market_data?.current_price.usd) return MyLogger.log(`Couldn't fetch price of token: ${tokenAddress}`);

    return BigNumber.from(Math.floor(token0USDPrice?.data?.market_data?.current_price.usd * 1e8 / maticPrice?.data?.market_data?.current_price.usd));

  }
}