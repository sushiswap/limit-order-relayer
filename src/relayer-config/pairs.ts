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
  //["USDC", "IRON"],
  //["WMATIC", "TITAN"],
  //["WETH", "USDC"],
  //["WBTC", "WETH"],
  ["WMATIC", "WETH"],
  // ["TITAN", "IRON"], edgecase can't fetch prices of these tokens directly - see how prices are fetched in utils/networkPrices.ts
  // ["WETH", "USDT"],
  // ["USDC", "USDT"],
  // ["WETH", "DAI"],
  // ["LINK", "WETH"],
  // ["WETH", "AAVE"],
  // ["USDC", "DAI"],
  // ["WMATIC", "USDC"],
  // ["FRAX", "USDC"],
  // ["WMATIC", "FISH"],
  // ["CRV", "WETH"],
  // ["SNX", "USDC"],
  // ["FRAX", "FXS"],
  // ["WETH", "DHT"],
  // ["SUSHI", "WETH"],
  // ["GRT", "WETH"]
]

export const getDesiredProfitToken = function (chainId: ChainId): string[] {

  if (chainId === ChainId.MATIC) {
    return ["WMATIC", "WETH", "SUSHI", "WBTC", "USDC", "DAI", "USDT"];
  }

}

function getPairCombinations() {

  const tokens = process.env.TOKENS.split(",");

  const combos = [];

  tokens.forEach((token, i) => {

    for (let j = i + 1; j < tokens.length; j++) {

      combos.push([token, tokens[j]]);

    }

  });

  return combos;

}