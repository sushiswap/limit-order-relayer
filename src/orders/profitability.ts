import { BigNumber } from "@ethersproject/bignumber";
import { ILimitOrder } from "../models/models";
import { PriceUpdate, PRICE_MULTIPLIER } from "../price-updates/pair-updates";
import axios from 'axios';
import { getMinRate } from "../utils/price";
import { ChainId } from "@sushiswap/sdk";

export interface ExecutableOrder {
  limitOrderData: ILimitOrder,
  profitGwei: BigNumber,
  inAmount: BigNumber,
  outAmount: BigNumber,
  outDiff: BigNumber,
  minAmountIn: BigNumber
}

/**
 * @param priceUpdate Current state of a Sushiswap pool
 * @param orders Orders that can be executed & if gas is 0 are already profitable
 * @returns Array of orders that when executed will net some profit for the relayer
 */
export async function profitableOrders(priceUpdate: PriceUpdate, orders: ILimitOrder[], data = getData)
  : Promise<ExecutableOrder[]> {

  if (orders.length === 0) return [];

  const sellingToken0 = orders[0].order.tokenIn === priceUpdate.token0.address;

  const { gasPrice, token0EthPrice, token1EthPrice } = await data(priceUpdate); // eth prices are multiplied by 1e9

  if (!gasPrice || !token0EthPrice || !token1EthPrice) return [];

  return await _getProfitableOrders(priceUpdate, orders, sellingToken0, gasPrice, token0EthPrice, token1EthPrice);
}

export async function _getProfitableOrders(priceUpdate: PriceUpdate, orders: ILimitOrder[], sellingToken0: boolean, gasPrice: BigNumber, token0EthPrice: BigNumber, token1EthPrice: BigNumber)
  : Promise<ExecutableOrder[]> {

  orders = sortOrders(orders);

  const profitable: ExecutableOrder[] = [];

  orders.forEach(orderData => {
    // how much of the order can be filled without crossing limit price ? e.g. huge orders will be partially filled because their price impact is too high
    const effects = getOrderEffects(orderData, sellingToken0, priceUpdate, token0EthPrice, token1EthPrice);

    if (!!effects) {

      const {
        partialFill,
        inAmount,
        outAmount,
        outDiff,
        profitGwei,
        newPrice,
        newToken0Amount,
        newToken1Amount,
        minAmountIn
      } = effects;

      if (profitGwei.gt(gasPrice.mul("380000"))) { // ~ 100k gas profit

        profitable.push({
          limitOrderData: orderData,
          profitGwei,
          inAmount,
          outDiff,
          outAmount,
          minAmountIn,
        });

        priceUpdate.token0.poolBalance = newToken0Amount;
        priceUpdate.token1.poolBalance = newToken1Amount;
        priceUpdate.token0.price = priceUpdate.token1.poolBalance.div(priceUpdate.token0.poolBalance);
        priceUpdate.token1.price = priceUpdate.token0.poolBalance.div(priceUpdate.token1.poolBalance);

      }

    }

  });

  return profitable;
}

// lowest sell order first
export function sortOrders(orders: ILimitOrder[]) {
  return orders.sort((a, b) => BigNumber.from(a.price.toString()).sub(BigNumber.from(b.price.toString())).lt(0) ? -1 : 1);
}

export async function getData(priceUpdate: PriceUpdate, chainId = +process.env.CHAINID): Promise<{ gasPrice?: BigNumber, token0EthPrice?: BigNumber, token1EthPrice?: BigNumber }> {

  let [gasPrice, token0EthPrice]: Array<BigNumber | void> = await Promise.all([
    getGasPrice(chainId),
    getToken0EthPrice(chainId, priceUpdate.token0.address)
  ]);

  if (priceUpdate.token0.address === process.env.WETH_ADDRESS) token0EthPrice = BigNumber.from("100000000"); // better precision; calculated price is usually off by some %

  if (!gasPrice || !token0EthPrice) {
    console.log("Failed to fetch gas price or token0 price");
    return {};
  }

  const token1EthPrice = token0EthPrice.mul(priceUpdate.token1.price).div(PRICE_MULTIPLIER);

  return { gasPrice, token0EthPrice, token1EthPrice };
}

export async function getGasPrice(chainId: number) {

  if (chainId === ChainId.MAINNET) {

    const gasPrice = await axios(`https://api.etherscan.io/api?module=gastracker&action=gasoracle&apikey=${process.env.ETHERSCAN_API_KEY}`);
    return !!gasPrice?.data?.result?.FastGasPrice ? BigNumber.from(Math.floor(+gasPrice.data.result.FastGasPrice)) : undefined

  } else if (chainId === ChainId.MATIC) {

    const gasPrice = await axios('https://gasstation-mainnet.matic.network');
    const fastPrice = gasPrice?.data.fast;
    const standardPrice = gasPrice?.data.standard;

    if (!fastPrice || !standardPrice) return;

    const average = (+fastPrice + standardPrice) / 2;

    return BigNumber.from(Math.floor(average));

  }
}

// return price of token0 in terms of "WETH" or whichever coin the network fees are paid in (padded by 1e8)
async function getToken0EthPrice(chainId: number, tokenAddress: string) {

  if (chainId == ChainId.MAINNET) {

    const token0EthPrice = await axios(`https://api.coingecko.com/api/v3/coins/ethereum/contract/${tokenAddress}`);

    if (!token0EthPrice?.data?.market_data?.current_price?.eth) return;

    return BigNumber.from(Math.floor(token0EthPrice.data?.market_data?.current_price?.eth * 1e8));

  } else if (chainId === ChainId.MATIC) {

    const [token0USDPrice, maticPrice] = await Promise.all([
      axios(`https://api.coingecko.com/api/v3/coins/polygon-pos/contract/${tokenAddress}`),
      axios(`https://api.coingecko.com/api/v3/coins/matic-network?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false`)
    ]);

    if (!token0USDPrice?.data?.market_data?.current_price.usd || !maticPrice?.data?.market_data?.current_price.usd) return;

    return BigNumber.from(Math.floor(token0USDPrice?.data?.market_data?.current_price.usd * 1e8 / maticPrice?.data?.market_data?.current_price.usd));

  }
}

export function getOrderEffects(orderData: ILimitOrder, sellingToken0: boolean, priceUpdate: PriceUpdate, token0EthPrice: BigNumber, token1EthPrice: BigNumber):
  false | { partialFill: BigNumber, inAmount: BigNumber, outAmount: BigNumber, outDiff: BigNumber, minAmountIn: BigNumber, profitGwei: BigNumber, newPrice: BigNumber, newToken0Amount: BigNumber, newToken1Amount: BigNumber } {

  const _inAmount = BigNumber.from(orderData.order.amountIn);

  const limitPrice = BigNumber.from(orderData.price.toString());

  const { inAmount, outAmount, newPrice, newToken0Amount, newToken1Amount } = maxMarketSell(
    limitPrice,
    sellingToken0 ? priceUpdate.token0.price : priceUpdate.token1.price,
    sellingToken0,
    _inAmount,
    orderData.filledAmount,
    priceUpdate.token0.poolBalance,
    priceUpdate.token1.poolBalance
  );

  if (inAmount.eq("0")) return false;

  const partialFill = inAmount.lt(_inAmount);

  const minRate = getMinRate(orderData.order.amountIn, orderData.order.amountOut);

  const outDiff = outAmount.sub(inAmount.mul(minRate).div(PRICE_MULTIPLIER)); // relayer profit in out tokens

  const minAmountIn = getMinAmountIn(BigNumber.from(orderData.order.amountOut), sellingToken0, priceUpdate.token0.poolBalance, priceUpdate.token1.poolBalance);

  let profitGwei: BigNumber;

  // todo test case for tokens with diferent decimal count
  if (outDiff.lt("0")) {
    profitGwei = BigNumber.from("0");
  } else {

    // eth price is already 1e8 padded
    // mul by 10 to get price in terms of gewi units
    const price = BigNumber.from(10).mul(sellingToken0 ? token1EthPrice : token0EthPrice);
    const tokenDecimalPadding = BigNumber.from("10").pow(orderData.order.tokenOutDecimals);
    profitGwei = outDiff.mul(price).div(tokenDecimalPadding);
  }


  return { partialFill, inAmount, outAmount, outDiff, profitGwei, newPrice, newToken0Amount, newToken1Amount, minAmountIn };
}

/**
 * How much can we sell so that the new price won't cross the limit order price
 * note: limitPrice & currentPrice are both multiplied by PRICE_MULTIPLIER
 * @param limitPrice price of the order
 * @param currentPrice current price in pool
 * @param sellingToken0 true if inputToken is token0
 * @param inAmount amount that we want to sell
 * @param token0Amount balance of token0 in pool
 * @param token1Amount balance of token1 in pool
 * @returns amountIn that we can sell so that limitPrice is not surpassed (due to price slippage), amountOut, newPrice, newToken0Balance, newToken1Balance
 */
export function maxMarketSell(
  limitPrice: BigNumber,
  currentPrice: BigNumber,
  sellingToken0: boolean,
  inAmount: BigNumber,
  filledAmount: string,
  token0Amount: BigNumber,
  token1Amount: BigNumber) {

  if (currentPrice.lt(limitPrice)) return { inAmount: BigNumber.from("0") } as any;

  inAmount = inAmount.sub(filledAmount);

  const marketSell = marketSellOutput(sellingToken0, inAmount, token0Amount, token1Amount);

  if (marketSell.newPrice.lt(limitPrice)) {

    // price impact is too high
    // calculating the amountIn (a) to get such a price impact that newPrice === price is a quadratic equation [ aa + 2ax + xx - xy/price = 0 ]
    // alternatively estimate amountIn with the following approach:

    // executionPrice = currentPrice + limitPrice / 2

    // limitPrice = (y - amountIn * executionPrice) / (x + amountIn)
    // amountIn = (y - x * limitPrice) / (limitPrice + executionPrice)

    const executionPrice = limitPrice.add(currentPrice).div(2);
    const x = sellingToken0 ? token0Amount : token1Amount;
    const y = sellingToken0 ? token1Amount : token0Amount;
    inAmount = y.sub(x.mul(limitPrice).div(PRICE_MULTIPLIER)).mul(PRICE_MULTIPLIER).div(executionPrice.add(limitPrice));

    return { inAmount, ...marketSellOutput(sellingToken0, inAmount, token0Amount, token1Amount) };

  } else {

    return { inAmount, ...marketSell };

  }

}

export function marketSellOutput(sellingToken0: boolean, inAmount: BigNumber, token0Amount: BigNumber, token1Amount: BigNumber) {

  let outAmount: BigNumber, newPrice: BigNumber, newToken0Amount: BigNumber, newToken1Amount: BigNumber;

  if (sellingToken0) {

    outAmount = getAmountOut(inAmount, token0Amount, token1Amount);
    newToken0Amount = token0Amount.add(inAmount);
    newToken1Amount = token1Amount.sub(outAmount);
    newPrice = newToken1Amount.mul(PRICE_MULTIPLIER).div(newToken0Amount); // price should be in terms of token1 / token0 when selling token0

  } else {

    outAmount = getAmountOut(inAmount, token1Amount, token0Amount);
    newToken0Amount = token0Amount.sub(outAmount);
    newToken1Amount = token1Amount.add(inAmount);
    newPrice = newToken0Amount.mul(PRICE_MULTIPLIER).div(newToken1Amount); // price should be in terms of token0 / token1 when selling token1

  }

  return { outAmount, newPrice, newToken0Amount, newToken1Amount };
}

export function getAmountIn(amountOut: BigNumber, reserveIn: BigNumber, reserveOut: BigNumber) {
  const numerator = reserveIn.mul(amountOut).mul(1000);
  const denominator = reserveOut.sub(amountOut).mul(997);
  return numerator.div(denominator).add(1);
}

export function getAmountOut(amountIn: BigNumber, reserveIn: BigNumber, reserveOut: BigNumber) {
  const amountInWithFee = amountIn.mul(BigNumber.from(997));
  const numerator = amountInWithFee.mul(reserveOut);
  const denominator = reserveIn.mul(BigNumber.from(1000)).add(amountInWithFee);
  return numerator.div(denominator);
}

export function getMinAmountIn(amountOut: BigNumber, sellingToken0: boolean, reserve0: BigNumber, reserve1: BigNumber) { // TODO test
  if (sellingToken0) {
    return getAmountIn(amountOut, reserve0, reserve1);
  } else {
    return getAmountIn(amountOut, reserve1, reserve0);
  }
}