import dotenv from 'dotenv';
import { ChainId } from '@sushiswap/sdk';

dotenv.config();

export const fetchLimitOrderPairs = async function (chainId: ChainId): Promise<string[][]> {

  _limitOrderPairs.forEach((pair0, i) => {
    _limitOrderPairs.forEach((pair1, j) => {
      if (i !== j && ((pair0[0] === pair1[0] && pair0[1] === pair1[1]) || (pair0[0] === pair1[1] && pair0[1] === pair1[0]))) {
        throw new Error(`Doubled pairs ${i}, ${j}`);
      }
    });
  });

  return _limitOrderPairs;

}

export const _limitOrderPairs: string[][] = [
  // ["TITAN", "IRON"], edgecase can't fetch prices of these tokens directly - see how prices are fetched in utils/networkPrices.ts
  ["WETH", "WMATIC"],
  ["WETH", "USDC"],
  ["WETH", "DAI"],
  ["WBTC", "WETH"],
  ["USDC", "USDT"],
  ["USDC", "IRON"],
  ["WETH", "USDT"],
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
  // ["USDC", "PYQ"], the filler ontract isn't exempt from pyq transfer fees yet
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
  // ["WMATIC", "CGG"], cgg not isn't default token list yet
  ["LINK", "WMATIC"],
  ["WMATIC", "DAI"],
  ["USDT", "DAI"],
  ["WMATIC", "SPADE"],
  ["WMATIC", "DPI"],
  ["WMATIC", "PIXEL"],
  ["WMATIC", "GMS"],
  ["USDC", "miMatic"],
  ["WMATIC", "USDT"],
  ["WMATIC", "AAVE"],
  ["WMATIC", "POLAR"],
  ["USDC", "POLAR"],
  ["USDC", "JPYC"],
  ["USDC", "CHUM"],
  ["WETH", "JPYC"],
  ["WMATIC", "JPYC"],
  ["WMATIC", "WBTC"],
  ["USDC", "WBTC"],
  ["renBTC", "WBTC"],
  ["USDC", "DINO"],
  ["WMATIC", "DINO"],
  ["WMATIC", "GAJ"],
  ["WMATIC", "DMAGIC"],
  ["USDC", "GAJ"],
  ["WETH", "PolyDoge"],
  ["WMATIC", "PolyDoge"],
  ["USDC", "PolyDoge"],
  ["SUSHI", "LINK"],
  ["SUSHI", "USDT"],
  ["SUSHI", "DAI"],
  ["SUSHI", "WBTC"],
  ["WMATIC", "CRV"],
  ["JPYC", "USDT"],
  // ["UMA", "WETH"], only 3 holders on polygon - need to also have other pools to enable arb in order to allow low liq tokens
  ["USDC", "TITAN"],
  ["WMATIC", "PUSD"],// v1.2
];

export const getDesiredProfitToken = function (chainId: ChainId): string[] {

  if (chainId === ChainId.MATIC) {
    return ["WMATIC", "WETH", "SUSHI", "WBTC", "USDC", "DAI", "USDT"];
  }

}
