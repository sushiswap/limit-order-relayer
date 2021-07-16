import dotenv from 'dotenv';
import axios from 'axios';
import { LAMBDA_URL } from 'limitorderv2-sdk';
import { ChainId } from '@sushiswap/sdk';
dotenv.config();

export const fetchLimitOrderPairs = async function (chainId: ChainId): Promise<string[][]> {

  const fetchFromApi = false;

  if (!fetchFromApi) {

    return _limitOrderPairs;

  } else {

    return (await axios(`${LAMBDA_URL}/orders/pairs`, {
      method: 'POST',
      data: {
        chainId: chainId
      }
    })).data.data.pairs.map(pair => [pair.token0.symbol, pair.token1.symbol]);

  }
}

export const _limitOrderPairs: string[][] = [
  // ["TITAN", "IRON"], edgecase can't fetch prices of these tokens directly - see how prices are fetched in utils/networkPrices.ts
  ["WETH", "WMATIC"],
  ["WETH", "USDC"],
  ["WMATIC", "USDC"],
  ["WETH", "DAI"],
  ["WBTC", "WETH"],
  ["USDC", "USDT"],
  ["USDC", "IRON"],
  ["WETH", "USDT"],
  ["WMATIC", "WETH"],
  ["USDC", "DAI"],
  ["WETH", "AAVE"],
  ["LINK", "WETH"],
  ["FRAX", "USDC"],
  ["WMATIC", "USDC"],
  ["WMATIC", "FISH"],
  ["WMATIC", "TITAN"],
  ["CRV", "WETH"],
  ["SNX", "USDC"],
  ["FRAX", "FXS"],
  ["SUSHI", "WETH"],
  ["GRT", "WETH"], // v1.0
  ["WBTC", "ibBTC"],
  ["USDC", "PUSD"],
  ["dTOP", "WETH"],
  ["SNX", "WETH"],
  ["DHT", "WETH"],
  ["USDC", "PYQ"],
  ["WETH", "SX"],
  ["OMEN", "WETH"],
  ["OMEN", "WMATIC"],
  ["WETH", "wFIL"],
  ["USDC", "BIFI"],
  ["WMATIC", "WOOFY"],
  ["SUSHI", "WMATIC"],
  ["WMATIC", "PGOV"],
  ["renDOGE", "WETH"],
  ["WMATIC", "BONE"],
  ["USDC", "BONE"],
  ["USDC", "SUSHI"], // v1.1
];

export const getDesiredProfitToken = function (chainId: ChainId): string[] {

  if (chainId === ChainId.MATIC) {
    return ["WMATIC", "WETH", "SUSHI", "WBTC", "USDC", "DAI", "USDT"];
  }

}
