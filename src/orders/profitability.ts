import { BigNumber } from "@ethersproject/bignumber";
import { ILimitOrder } from "../models/models";
import { PriceUpdate, PRICE_MULTIPLIER } from "../price-updates/pair-updates";
import axios from 'axios';
import { getMinRate } from "../utils/price";

/**
 * @param priceUpdate Current state of a Sushiswap pool
 * @param orders Orders that can be executed & if gas is 0 are already profitable
 * @returns Array of orders that when executed will net some profit for the relayer
 */
export async function profitableOrders(priceUpdate: PriceUpdate, orders: ILimitOrder[], data = getData)
  : Promise<{ limitOrderData: ILimitOrder, profitEth: BigNumber, inAmount: BigNumber, outAmount: BigNumber, outDiff: BigNumber }[]> {

  if (orders.length === 0) return [];

  const sellingToken0 = orders[0].order.tokenIn === priceUpdate.token0.address;

  const { gasPrice, token0EthPrice, token1EthPrice } = await data(priceUpdate); // eth prices are multiplied by 1e9

  if (!gasPrice || !token0EthPrice) return [];

  return await _getProfitableOrders(priceUpdate, orders, sellingToken0, gasPrice, token0EthPrice, token1EthPrice);
}

export async function _getProfitableOrders(priceUpdate: PriceUpdate, orders: ILimitOrder[], sellingToken0: boolean, gasPrice: BigNumber, token0EthPrice: BigNumber, token1EthPrice: BigNumber)
  : Promise<{ limitOrderData: ILimitOrder, profitEth: BigNumber, inAmount: BigNumber, outAmount: BigNumber, outDiff: BigNumber }[]> {

  orders = sortOrders(orders);

  const profitable: {
    limitOrderData: ILimitOrder,
    profitEth: BigNumber,
    inAmount: BigNumber,
    outDiff: BigNumber,
    outAmount: BigNumber
  }[] = [];

  orders.forEach(order => {

    // how much of the order can be filled without crossing limit price ? e.g. huge orders will be partially filled because their price impact is too high
    const effects = getOrderEffects(order, sellingToken0, priceUpdate, token0EthPrice, token1EthPrice);

    if (!!effects) {

      const {
        partialFill,
        inAmount,
        outAmount,
        outDiff,
        profitEth,
        newPrice,
        newToken0Amount,
        newToken1Amount
      } = effects;

      if (profitEth.gt(gasPrice.mul(1e9).mul("280000"))) { // ~ 20k gas profit

        profitable.push({
          limitOrderData: order,
          profitEth,
          inAmount,
          outDiff,
          outAmount
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
  return orders.sort((a, b) => BigNumber.from(a.price).sub(BigNumber.from(b.price)).lt(0) ? -1 : 1);
}

export async function getData(priceUpdate: PriceUpdate): Promise<{ gasPrice?: BigNumber, token0EthPrice?: BigNumber, token1EthPrice?: BigNumber }> {

  let [_gasPrice, _token0EthPrice]: any[] = await Promise.all([
    axios(`https://api.etherscan.io/api?module=gastracker&action=gasoracle&apikey=${process.env.ETHERSCAN_API_KEY}`),
    axios(`https://api.coingecko.com/api/v3/coins/ethereum/contract/${priceUpdate.token0.address}`)
  ]);

  _gasPrice = _gasPrice.data?.result?.FastGasPrice as string;
  _token0EthPrice = _token0EthPrice.data?.market_data?.current_price?.eth as number;

  if (priceUpdate.token0.address === process.env.WETH_ADDRESS) _token0EthPrice = 1;

  if (!_gasPrice || !_token0EthPrice) return {};

  const gasPrice = BigNumber.from(_gasPrice);
  const token0EthPrice = BigNumber.from(_token0EthPrice * 1e8);
  const token1EthPrice = token0EthPrice.mul(priceUpdate.token1.price).div(PRICE_MULTIPLIER);

  return { gasPrice, token0EthPrice, token1EthPrice };
}

export function getOrderEffects(orderData: ILimitOrder, sellingToken0: boolean, priceUpdate: PriceUpdate, token0EthPrice: BigNumber, token1EthPrice: BigNumber):
  false | { partialFill: BigNumber, inAmount: BigNumber, outAmount: BigNumber, outDiff: BigNumber, profitEth: BigNumber, newPrice: BigNumber, newToken0Amount: BigNumber, newToken1Amount: BigNumber } {

  const _inAmount = BigNumber.from(orderData.order.amountIn);
  const limitPrice = BigNumber.from(orderData.price);

  const { inAmount, outAmount, newPrice, newToken0Amount, newToken1Amount } = maxMarketSell(
    limitPrice,
    sellingToken0 ? priceUpdate.token0.price : priceUpdate.token1.price,
    sellingToken0,
    _inAmount,
    priceUpdate.token0.poolBalance,
    priceUpdate.token1.poolBalance
  );

  if (inAmount.eq("0")) return false;

  const partialFill = inAmount.lt(_inAmount);
  const minRate = getMinRate(orderData.order.amountIn, orderData.order.amountOut);
  const outDiff = outAmount.sub(inAmount.mul(minRate).div(PRICE_MULTIPLIER)); // relayer profit in out tokens

  let profitEth: BigNumber;

  if (outDiff.lt("0")) {
    profitEth = BigNumber.from("0");
  } else {
    profitEth = outDiff.mul(sellingToken0 ? token1EthPrice : token0EthPrice).div(1e8); // eth price 1e8 padded
  }


  return { partialFill, inAmount, outAmount, outDiff, profitEth, newPrice, newToken0Amount, newToken1Amount };
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
export function maxMarketSell(limitPrice: BigNumber, currentPrice: BigNumber, sellingToken0: boolean, inAmount: BigNumber, token0Amount: BigNumber, token1Amount: BigNumber) {

  if (currentPrice.lt(limitPrice)) return { inAmount: BigNumber.from("0") } as any;

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
    const { outAmount, newPrice, newToken0Amount, newToken1Amount } = marketSellOutput(sellingToken0, inAmount, token0Amount, token1Amount);
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

export function getAmountOut(amountIn: BigNumber, reserveIn: BigNumber, reserveOut: BigNumber) {
  const amountInWithFee = amountIn.mul(BigNumber.from(997));
  const numerator = amountInWithFee.mul(reserveOut);
  const denominator = reserveIn.mul(BigNumber.from(1000)).add(amountInWithFee);
  return numerator.div(denominator);
}