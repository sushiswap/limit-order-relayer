import dotenv from 'dotenv';
dotenv.config();

export const _limitOrderPairs: string[][] = [
  // ["USDC", "IRON"],
  // ["WMATIC", "TITAN"],
  ["WETH", "USDC"],
  ["WBTC", "WETH"],
  // ["WMATIC", "WETH"],
  // ["TITAN", "IRON"],
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
  ["SUSHI", "WETH"],
  // ["GRT", "WETH"]
]

export const _desiredProfitToken: string[] = ["WMATIC", "WETH", "SUSHI", "WBTC", "USDC", "DAI", "USDT"];

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