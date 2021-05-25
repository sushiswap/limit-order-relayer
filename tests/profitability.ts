import { BigNumber } from '@ethersproject/bignumber';
import { expect } from 'chai';
import { ILimitOrder } from '../src/models/models';
import { maxMarketSell, getOrderEffects, getData, sortOrders, marketSellOutput, getAmountOut, profitableOrders } from '../src/orders/profitability';
import { PriceUpdate, PRICE_MULTIPLIER } from '../src/price-updates/pair-updates';
import { getOrderPrice, getOrderPriceString, getMinRate } from '../src/utils/price';

const daiBalance = BigNumber.from("102817581502091247236234371"); // 102 m
const wethBalance = BigNumber.from("50212189021597534681275"); // 50 k ~ price is 2047 DAI per WETH

const watchPair = {
  token0: { address: "0x6B175474E89094C44Da98b954EedeAC495271d0F", decimals: 18, symbol: "DAI" },
  token1: { address: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", decimals: 18, symbol: "WETH" },
  pairAddress: "0xC3D03e4F041Fd4cD388c549Ee2A29a9E5075882f",
}

const priceUpdate: PriceUpdate = {
  pair: watchPair,
  token0: { poolBalance: daiBalance, price: wethBalance.mul(PRICE_MULTIPLIER).div(daiBalance), address: "0x6B175474E89094C44Da98b954EedeAC495271d0F" },
  token1: { poolBalance: wethBalance, price: daiBalance.mul(PRICE_MULTIPLIER).div(wethBalance), address: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2" }
}

const profitableSellOrder: ILimitOrder = {
  price: getOrderPriceString("5000000000000000000000", "2000000000000000000"),
  digest: "",
  order: {
    maker: "0x6B175474E89094C44Da98b954EedeAC495271d0F",
    tokenIn: "0x6B175474E89094C44Da98b954EedeAC495271d0F",
    tokenOut: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
    tokenInDecimals: 18,
    tokenOutDecimals: 18,
    amountIn: "5000000000000000000000", // 5k dai
    amountOut: "2000000000000000000", // 2 weth
    recipient: "0x6B175474E89094C44Da98b954EedeAC495271d0F",
    startTime: "0",
    endTime: "9999999999999",
    stopPrice: "0",
    oracleAddress: "0x6B175474E89094C44Da98b954EedeAC495271d0F",
    oracleData: "",
    v: 27,
    r: "",
    s: "",
    chainId: 1
  },
  pairAddress: "0xC3D03e4F041Fd4cD388c549Ee2A29a9E5075882f",
  filledAmount: "0"
};

describe('Profitability', () => {

  it('Should calculate amountOut of trade', () => {
    const amountIn = BigNumber.from("100000000000000000");
    const reserveIn = BigNumber.from("1000000000000000000000");
    const reserveOut = BigNumber.from("50000000000");
    const amountOut = getAmountOut(amountIn, reserveIn, reserveOut);
    const { newPrice } = marketSellOutput(true, amountIn, reserveIn, reserveOut);
    expect(amountOut.toString()).to.be.eq("4984503");
    expect(newPrice.toString()).to.be.eq("49990016");
  });

  it('Should calculate largest amountIn possible for market selling [0]', () => {

    const sellingToken0 = true; // selling dai for eth
    const token0Amount = daiBalance;
    const token1Amount = wethBalance;
    const _inAmount = BigNumber.from("10000000000000000000000"); // 10k
    const currentPrice = token1Amount.mul(PRICE_MULTIPLIER).div(token0Amount);
    const limitPrice = token1Amount.mul(PRICE_MULTIPLIER).div(token0Amount.add(_inAmount)); // limit price would be exceeded if the whole amountIn would sell

    const { inAmount, outAmount, newToken0Amount, newToken1Amount } = maxMarketSell(limitPrice, currentPrice, sellingToken0, _inAmount, token0Amount, token1Amount);

    expect(inAmount.lt(_inAmount)).to.equal(true, "inAmount wasn't decreased");
    expect(inAmount.toString()).to.equal("4999878428512704256313", "inAmount wasn't calculated correctly");

  });

  it('Should calculate largest amountIn possible for market selling [1]', () => {

    const sellingToken0 = false; // selling weth for dai
    const token0Amount = daiBalance;
    const token1Amount = wethBalance;
    const _inAmount = BigNumber.from("10000000000000000000"); // 10
    const currentPrice = token0Amount.mul(PRICE_MULTIPLIER).div(token1Amount);
    const limitPrice = token0Amount.mul(PRICE_MULTIPLIER).div(token1Amount.add(_inAmount.mul(4)));

    const { inAmount, outAmount, newToken0Amount, newToken1Amount } = maxMarketSell(limitPrice, currentPrice, sellingToken0, _inAmount, token0Amount, token1Amount);

    expect(newToken0Amount.mul(PRICE_MULTIPLIER).div(newToken1Amount).gt(limitPrice)).to.be.true;
    expect(inAmount.eq(_inAmount)).to.equal(true, "inAmount was decreased by mistake");

  });

  it('Should calculate largest amountIn possible for market selling [2]', () => {

    const amountIn = BigNumber.from("100000000000000000000"); // 100 eth
    const amountOut = BigNumber.from("204000000000000000000000"); // 204m dai
    const orderPrice = getOrderPrice(amountIn, amountOut);
    const limitPrice = amountOut.mul(PRICE_MULTIPLIER).div(amountIn);
    const currentPrice = BigNumber.from("2047661802951207732279");

    const { inAmount, outAmount, newToken0Amount, newToken1Amount } = maxMarketSell(
      orderPrice,
      currentPrice,
      false,
      amountIn,
      BigNumber.from("102817581502091247236234371"),
      BigNumber.from("50212189021597534681275"),
    );
    expect(newToken0Amount.mul(PRICE_MULTIPLIER).div(newToken1Amount).gt(orderPrice)).to.be.true;
    expect(outAmount.mul(PRICE_MULTIPLIER).div(inAmount).gt(limitPrice)).to.be.true;
  });

  it('Should caclulate the state after limit order execution [0]', () => {
    const token1EthPrice = BigNumber.from("100000000"); // 1
    const token0EthPrice = BigNumber.from("49954"); // 0.00049954

    const effects = getOrderEffects(profitableSellOrder, true, priceUpdate, token0EthPrice, token1EthPrice);

    expect(effects).to.not.be.false;

    if (!!effects) {

      const { partialFill, inAmount, outAmount, outDiff, profitEth, newPrice, newToken0Amount, newToken1Amount } = effects;
      expect(partialFill).to.be.false;
      expect(inAmount.toString()).to.be.eq("5000000000000000000000");
      expect(outDiff.toString()).to.be.eq("434366022828002928"); // 0.4 weth
      expect(outDiff.add(profitableSellOrder.order.amountOut).toString()).to.be.eq(outAmount.toString(), "profit was not calculated correctly");
      expect(profitEth.toString()).to.be.eq("434366022828002928", "profit in eth was not calculated correctly");
      expect(newPrice.toString()).to.be.eq(newToken1Amount.mul(PRICE_MULTIPLIER).div(newToken0Amount).toString(), "new price was not calculated correctly");
      expect(newToken0Amount.toString()).to.be.eq(priceUpdate.token0.poolBalance.add(inAmount).toString(), "pool balance 0 wasn't updated correctly");
      expect(newToken1Amount.toString()).to.be.eq(priceUpdate.token1.poolBalance.sub(outAmount).toString(), "pool balance 1 wasn't updated correctly");

    }

  });

  it('Should caclulate the state after limit order execution [1]', () => {
    const token1EthPrice = BigNumber.from("100000000"); // 1
    const token0EthPrice = BigNumber.from("49954"); // 0.00049954

    const _unprofitableOrder = JSON.parse(JSON.stringify(profitableSellOrder));
    _unprofitableOrder.order.amountOut = "2500000000000000000";
    _unprofitableOrder.price = getOrderPriceString("2500000000000000000", "5000000000000000000000");

    const effects = getOrderEffects(_unprofitableOrder, true, priceUpdate, token0EthPrice, token1EthPrice);
    expect(effects).to.be.false;

  });

  it('Should caclulate the state after limit order execution [2]', () => {
    const token1EthPrice = BigNumber.from("100000000");
    const token0EthPrice = BigNumber.from("49954");
    const _profitableSellOrder = JSON.parse(JSON.stringify(profitableSellOrder));;

    _profitableSellOrder.order.amountIn = "2100000000000000000000000"; // 2.1m dai
    _profitableSellOrder.order.amountOut = "1000000000000000000000";
    _profitableSellOrder.price = getOrderPriceString("2100000000000000000000000", "1000000000000000000000");
    const minRate = getMinRate("2100000000000000000000000", "1000000000000000000000");

    const effects = getOrderEffects(_profitableSellOrder, true, priceUpdate, token0EthPrice, token1EthPrice);

    expect(effects).to.not.be.false;

    if (!!effects) {

      const { partialFill, inAmount, outAmount, outDiff, profitEth, newPrice, newToken0Amount, newToken1Amount } = effects;
      expect(partialFill).to.be.true;
      expect(inAmount.toString()).to.be.eq("1149378868394259778113658"); // 1.1m
      expect(outDiff.toString()).to.be.eq("6137162461943073335"); // 6.1 weth
      expect(outAmount.sub(outDiff).eq(inAmount.mul(minRate).div(PRICE_MULTIPLIER))).to.be.true;
      expect(profitEth.toString()).to.be.eq("6137162461943073335", "profit in eth was not calculated correctly");
      expect(newPrice.toString()).to.be.eq(newToken1Amount.mul(PRICE_MULTIPLIER).div(newToken0Amount).toString(), "new price was not calculated correctly");
      expect(newToken0Amount.toString()).to.be.eq(priceUpdate.token0.poolBalance.add(inAmount).toString(), "pool balance 0 wasn't updated correctly");
      expect(newToken1Amount.toString()).to.be.eq(priceUpdate.token1.poolBalance.sub(outAmount).toString(), "pool balance 1 wasn't updated correctly");

    }
  });

  it('Should caclulate the state after limit order execution [3]', () => {
    const token1EthPrice = BigNumber.from("100000000");
    const token0EthPrice = BigNumber.from("49954");

    const _profitableSellOrder = JSON.parse(JSON.stringify(profitableSellOrder));
    _profitableSellOrder.order.amountIn = "100000000000000000000"; // selling 100 weth @ 2040; current price is 2047 DAI
    _profitableSellOrder.order.amountOut = "204000000000000000000000";
    _profitableSellOrder.price = getOrderPriceString("100000000000000000000", "204000000000000000000000");
    const minRate = getMinRate("100000000000000000000", "204000000000000000000000");

    const effects = getOrderEffects(_profitableSellOrder, false, priceUpdate, token0EthPrice, token1EthPrice);

    expect(effects).to.not.be.false;

    if (!!effects) {

      const { partialFill, inAmount, outAmount, outDiff, profitEth, newPrice, newToken0Amount, newToken1Amount } = effects;
      expect(partialFill).to.be.true;
      expect(inAmount.toString()).to.be.eq("18688470915997364972"); // 18 weth
      expect(outDiff.toString()).to.be.eq("14232117311711939112"); // 14 dai ~ 0.007 weth
      expect(outAmount.sub(outDiff).eq(inAmount.mul(minRate).div(PRICE_MULTIPLIER))).to.be.true;
      expect(profitEth.toString()).to.be.eq("7109511881892582", "profit in eth was not calculated correctly");
      expect(newPrice.toString()).to.be.eq(newToken0Amount.mul(PRICE_MULTIPLIER).div(newToken1Amount).toString(), "new price was not calculated correctly");
      expect(newToken0Amount.toString()).to.be.eq(priceUpdate.token0.poolBalance.sub(outAmount).toString(), "pool balance 0 wasn't updated correctly");
      expect(newToken1Amount.toString()).to.be.eq(priceUpdate.token1.poolBalance.add(inAmount).toString(), "pool balance 1 wasn't updated correctly");

    }
  });

  it('Should filter unprofitable orders out', async () => {

    const _priceUpdate = deepCopyPriceUpdate(priceUpdate);

    const profitable = await profitableOrders(_priceUpdate, [profitableSellOrder], () => new Promise((r) => r({
      gasPrice: BigNumber.from("40"),
      token0EthPrice: BigNumber.from("49954"),
      token1EthPrice: BigNumber.from("100000000")
    })));

    expect(profitable.length).to.be.eq(1, "Profitable roder was filtered out by mistake");

  });

  it('Should fetch external data', async () => {
    const { gasPrice, token0EthPrice, token1EthPrice } = await getData(priceUpdate);
    expect(!!gasPrice && !!token0EthPrice && !!token1EthPrice).to.be.true;
    expect(gasPrice.gt("0") && token0EthPrice.gt("0") && token1EthPrice.gt("0")).to.be.true;
  }).timeout(5000);

  it('Should sort tokens by lowest price first', () => {
    const orders = sortOrders([{ price: "1000" }, { price: "999" }] as ILimitOrder[]);
    expect(orders[0].price).to.be.eq("999", "Failed to sort orders by lowest price");
  });
});

function deepCopyPriceUpdate(priceUpdate: PriceUpdate) {
  const _priceUpdate = { ...priceUpdate };
  _priceUpdate.token0 = { ...priceUpdate.token0 };
  _priceUpdate.token1 = { ...priceUpdate.token1 };
  return _priceUpdate;
}