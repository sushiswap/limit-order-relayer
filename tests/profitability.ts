import { BigNumber } from "@ethersproject/bignumber";
import { ChainId } from "@sushiswap/core-sdk";
import { expect } from "chai";
import {
  MockDatabase,
  mockPriceUpdate,
  twoProfitableOrders,
  unprofitableOrder,
} from "./limitOrder";
import { ILimitOrder } from "../src/models/models";
import {
  maxMarketSell,
  getOrderEffects,
  sortOrders,
  marketSellOutput,
  getAmountOut,
  profitableOrders,
} from "../src/orders/profitability";
import { PriceUpdate, PRICE_MULTIPLIER } from "../src/pairs/pairUpdates";
import { NetworkPrices } from "../src/utils/networkPrices";
import {
  getOrderPrice,
  getOrderPriceString,
  getMinRate,
} from "../src/utils/price";

const daiBalance = BigNumber.from("102817581502091247236234371"); // 102 m
const wethBalance = BigNumber.from("50212189021597534681275"); // 50 k ~ price is 2047 DAI per WETH

const watchPair = {
  token0: {
    address: "0x6B175474E89094C44Da98b954EedeAC495271d0F",
    decimals: 18,
    symbol: "DAI",
  },
  token1: {
    address: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
    decimals: 18,
    symbol: "WETH",
  },
  pairAddress: "0xC3D03e4F041Fd4cD388c549Ee2A29a9E5075882f",
};

const priceUpdate: PriceUpdate = {
  pair: watchPair,
  token0: {
    poolBalance: daiBalance,
    decimals: 18,
    price: wethBalance.mul(PRICE_MULTIPLIER).div(daiBalance),
    address: "0x6B175474E89094C44Da98b954EedeAC495271d0F",
  },
  token1: {
    poolBalance: wethBalance,
    decimals: 18,
    price: daiBalance.mul(PRICE_MULTIPLIER).div(wethBalance),
    address: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
  },
};

const profitableSellOrder: ILimitOrder = {
  price: getOrderPriceString("5000000000000000000000", "2000000000000000000"),
  digest: "",
  order: {
    maker: "0x6B175474E89094C44Da98b954EedeAC495271d0F",
    tokenIn: "0x6B175474E89094C44Da98b954EedeAC495271d0F",
    tokenOut: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
    tokenInDecimals: 18,
    tokenInSymbol: "abc",
    tokenOutDecimals: 18,
    tokenOutSymbol: "abc",
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
    chainId: 1,
  },
  pairAddress: "0xC3D03e4F041Fd4cD388c549Ee2A29a9E5075882f",
  filledAmount: "0",
};

describe("Profitability", () => {
  it("Should calculate amountOut of trade", () => {
    const amountIn = BigNumber.from("100000000000000000");
    const reserveIn = BigNumber.from("1000000000000000000000");
    const reserveOut = BigNumber.from("50000000000");
    const amountOut = getAmountOut(amountIn, reserveIn, reserveOut);
    const { newPrice } = marketSellOutput(
      true,
      amountIn,
      reserveIn,
      reserveOut
    );
    expect(amountOut.toString()).to.be.eq("4984503");
    expect(newPrice.toString()).to.be.eq("49990016");
  });

  it("Should calculate largest amountIn possible for market selling [0]", () => {
    const sellingToken0 = true; // selling dai for eth
    const token0Amount = daiBalance;
    const token1Amount = wethBalance;
    const _inAmount = BigNumber.from("10000000000000000000000"); // 10k
    const currentPrice = token1Amount.mul(PRICE_MULTIPLIER).div(token0Amount);
    const limitPrice = token1Amount
      .mul(PRICE_MULTIPLIER)
      .div(token0Amount.add(_inAmount)); // limit price would be exceeded if the whole amountIn would sell

    const { inAmount, outAmount, newToken0Amount, newToken1Amount } =
      maxMarketSell(
        limitPrice,
        currentPrice,
        sellingToken0,
        _inAmount,
        token0Amount,
        token1Amount,
        "0",
        "999999999999999999999999999"
      );

    expect(inAmount.lt(_inAmount)).to.equal(true, "inAmount wasn't decreased");
    expect(inAmount.toString()).to.equal(
      "4999878428512704256313",
      "inAmount wasn't calculated correctly"
    );
  });

  it("Should calculate largest amountIn possible for market selling [1]", () => {
    const sellingToken0 = false; // selling weth for dai
    const token0Amount = daiBalance;
    const token1Amount = wethBalance;
    const _inAmount = BigNumber.from("10000000000000000000"); // 10
    const currentPrice = token0Amount.mul(PRICE_MULTIPLIER).div(token1Amount);
    const limitPrice = token0Amount
      .mul(PRICE_MULTIPLIER)
      .div(token1Amount.add(_inAmount.mul(4)));

    const { inAmount, outAmount, newToken0Amount, newToken1Amount } =
      maxMarketSell(
        limitPrice,
        currentPrice,
        sellingToken0,
        _inAmount,
        token0Amount,
        token1Amount,
        "0",
        "999999999999999999999999999"
      );

    expect(
      newToken0Amount.mul(PRICE_MULTIPLIER).div(newToken1Amount).gt(limitPrice)
    ).to.be.true;
    expect(inAmount.eq(_inAmount)).to.equal(
      true,
      "inAmount was decreased by mistake"
    );
  });

  it("Should calculate largest amountIn possible for market selling [2]", () => {
    const amountIn = BigNumber.from("100000000000000000000"); // 100 eth
    const amountOut = BigNumber.from("204000000000000000000000"); // 204m dai
    const orderPrice = getOrderPrice(amountIn, amountOut);
    const limitPrice = amountOut.mul(PRICE_MULTIPLIER).div(amountIn);
    const currentPrice = BigNumber.from("2047661802951207732279");

    const { inAmount, outAmount, newToken0Amount, newToken1Amount } =
      maxMarketSell(
        orderPrice,
        currentPrice,
        false,
        amountIn,
        BigNumber.from("102817581502091247236234371"),
        BigNumber.from("50212189021597534681275"),
        "0",
        "999999999999999999999999999"
      );
    expect(
      newToken0Amount.mul(PRICE_MULTIPLIER).div(newToken1Amount).gt(orderPrice)
    ).to.be.true;
    expect(outAmount.mul(PRICE_MULTIPLIER).div(inAmount).gt(limitPrice)).to.be
      .true;
  });

  it("Should calculate largest amountIn possible for market selling [3]", () => {
    const sellingToken0 = false; // selling weth for dai
    const token0Amount = daiBalance;
    const token1Amount = wethBalance;
    const _inAmount = BigNumber.from("10000000000000000000"); // 10
    const currentPrice = token0Amount.mul(PRICE_MULTIPLIER).div(token1Amount);
    const limitPrice = token0Amount
      .mul(PRICE_MULTIPLIER)
      .div(token1Amount.add(_inAmount.mul(100)));

    const {
      inAmount,
      outAmount,
      newToken0Amount,
      newToken1Amount,
    }: { [key: string]: BigNumber } = maxMarketSell(
      limitPrice,
      currentPrice,
      sellingToken0,
      _inAmount,
      token0Amount,
      token1Amount,
      _inAmount.div(2).toString(),
      BigNumber.from("999999999999999999999999999").toString()
    );

    expect(
      outAmount.gte(inAmount.mul(limitPrice).div(PRICE_MULTIPLIER))
    ).to.be.eq(true, "out amount was not calculated correctly");
    expect(
      newToken0Amount.mul(PRICE_MULTIPLIER).div(newToken1Amount).gt(limitPrice)
    ).to.be.true;
    expect(inAmount.eq(_inAmount.div(2))).to.be.eq(
      true,
      "inAmount was not calculated correctly"
    );
  });

  it("Should caclulate the state after limit order execution [0]", () => {
    const token1EthPrice = BigNumber.from("1000000000000000000"); // 1
    const token0EthPrice = BigNumber.from("499540000000000"); // 0.00049954

    const effects = getOrderEffects(
      profitableSellOrder,
      true,
      priceUpdate,
      token0EthPrice,
      token1EthPrice
    );

    expect(effects).to.not.be.false;

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
      } = effects;
      expect(partialFill).to.be.false;
      expect(inAmount.toString()).to.be.eq("5000000000000000000000");
      expect(outDiff.toString()).to.be.eq("434366022828002928"); // 0.4 weth
      expect(
        outDiff.add(profitableSellOrder.order.amountOut).toString()
      ).to.be.eq(outAmount.toString(), "profit was not calculated correctly");
      expect(profitGwei.toString()).to.be.eq(
        "434366022",
        "profit in eth was not calculated correctly"
      );
      expect(newPrice.toString()).to.be.eq(
        newToken1Amount.mul(PRICE_MULTIPLIER).div(newToken0Amount).toString(),
        "new price was not calculated correctly"
      );
      expect(newToken0Amount.toString()).to.be.eq(
        priceUpdate.token0.poolBalance.add(inAmount).toString(),
        "pool balance 0 wasn't updated correctly"
      );
      expect(newToken1Amount.toString()).to.be.eq(
        priceUpdate.token1.poolBalance.sub(outAmount).toString(),
        "pool balance 1 wasn't updated correctly"
      );
    }
  });

  it("Should caclulate the state after limit order execution [1]", () => {
    const token1EthPrice = BigNumber.from("1000000000000000000"); // 1
    const token0EthPrice = BigNumber.from("499540000000000"); // 0.00049954

    const _unprofitableOrder = JSON.parse(JSON.stringify(profitableSellOrder));
    _unprofitableOrder.order.amountOut = "2500000000000000000";
    _unprofitableOrder.price = getOrderPriceString(
      "2500000000000000000",
      "5000000000000000000000"
    );

    const effects = getOrderEffects(
      _unprofitableOrder,
      true,
      priceUpdate,
      token0EthPrice,
      token1EthPrice
    );
    expect(effects).to.be.false;
  });

  it("Should caclulate the state after limit order execution [2]", () => {
    const token1EthPrice = BigNumber.from("1000000000000000000"); // 1
    const token0EthPrice = BigNumber.from("499540000000000"); // 0.00049954
    const _profitableSellOrder = JSON.parse(
      JSON.stringify(profitableSellOrder)
    );

    _profitableSellOrder.order.amountIn = "2100000000000000000000000"; // 2.1m dai
    _profitableSellOrder.order.amountOut = "1000000000000000000000";
    _profitableSellOrder.price = getOrderPriceString(
      "2100000000000000000000000",
      "1000000000000000000000"
    );
    const minRate = getMinRate(
      "2100000000000000000000000",
      "1000000000000000000000"
    );

    const effects = getOrderEffects(
      _profitableSellOrder,
      true,
      priceUpdate,
      token0EthPrice,
      token1EthPrice
    );

    expect(effects).to.not.be.false;

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
      } = effects;
      expect(partialFill).to.be.true;
      expect(inAmount.toString()).to.be.eq("1149378868394259778113658"); // 1.1m
      expect(outDiff.toString()).to.be.eq("6137162461943073335"); // 6.1 weth
      expect(
        outAmount.sub(outDiff).eq(inAmount.mul(minRate).div(PRICE_MULTIPLIER))
      ).to.be.true;
      expect(profitGwei.toString()).to.be.eq(
        "6137162461",
        "profit in eth was not calculated correctly"
      );
      expect(newPrice.toString()).to.be.eq(
        newToken1Amount.mul(PRICE_MULTIPLIER).div(newToken0Amount).toString(),
        "new price was not calculated correctly"
      );
      expect(newToken0Amount.toString()).to.be.eq(
        priceUpdate.token0.poolBalance.add(inAmount).toString(),
        "pool balance 0 wasn't updated correctly"
      );
      expect(newToken1Amount.toString()).to.be.eq(
        priceUpdate.token1.poolBalance.sub(outAmount).toString(),
        "pool balance 1 wasn't updated correctly"
      );
    }
  });

  it("Should caclulate the state after limit order execution [3]", () => {
    const token1EthPrice = BigNumber.from("1000000000000000000"); // 1
    const token0EthPrice = BigNumber.from("499540000000000"); // 0.00049954

    const _profitableSellOrder = JSON.parse(
      JSON.stringify(profitableSellOrder)
    );
    _profitableSellOrder.order.amountIn = "100000000000000000000"; // selling 100 weth @ 2040; current price is 2047 DAI
    _profitableSellOrder.order.amountOut = "204000000000000000000000";
    _profitableSellOrder.price = getOrderPriceString(
      "100000000000000000000",
      "204000000000000000000000"
    );
    const minRate = getMinRate(
      "100000000000000000000",
      "204000000000000000000000"
    );

    const effects = getOrderEffects(
      _profitableSellOrder,
      false,
      priceUpdate,
      token0EthPrice,
      token1EthPrice
    );

    expect(effects).to.not.be.false;

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
      } = effects;

      expect(partialFill).to.be.true;
      expect(inAmount.toString()).to.be.eq("18688470915997364972"); // 18 weth
      expect(outDiff.toString()).to.be.eq("14232117311711939112"); // 14 dai ~ 0.007 weth
      expect(
        outAmount.sub(outDiff).eq(inAmount.mul(minRate).div(PRICE_MULTIPLIER))
      ).to.be.true;
      expect(profitGwei.toString()).to.be.eq(
        "7109511",
        "profit in eth was not calculated correctly"
      );
      expect(newPrice.toString()).to.be.eq(
        newToken0Amount.mul(PRICE_MULTIPLIER).div(newToken1Amount).toString(),
        "new price was not calculated correctly"
      );
      expect(newToken0Amount.toString()).to.be.eq(
        priceUpdate.token0.poolBalance.sub(outAmount).toString(),
        "pool balance 0 wasn't updated correctly"
      );
      expect(newToken1Amount.toString()).to.be.eq(
        priceUpdate.token1.poolBalance.add(inAmount).toString(),
        "pool balance 1 wasn't updated correctly"
      );
    }
  });

  it("Should filter unprofitable orders out", async () => {
    const _priceUpdate = deepCopyPriceUpdate(priceUpdate);

    const profitable = await profitableOrders(
      _priceUpdate,
      [profitableSellOrder],
      {
        gasPrice: BigNumber.from("40"),
        token0EthPrice: BigNumber.from("499540000000000"),
        token1EthPrice: BigNumber.from("1000000000000000000"),
      }
    );

    expect(profitable.length).to.be.eq(
      1,
      "Profitable oroder was filtered out by mistake"
    );
  });

  it("Should fetch external data", async () => {
    const { gasPrice, token0EthPrice, token1EthPrice } =
      await new NetworkPrices().getPrices(priceUpdate, ChainId.ETHEREUM);
    expect(!!gasPrice && !!token0EthPrice && !!token1EthPrice).to.be.true;
    expect(gasPrice.gt("0") && token0EthPrice.gt("0") && token1EthPrice.gt("0"))
      .to.be.true;
  }).timeout(5000);

  it("Should sort tokens by lowest price first", () => {
    const orders = sortOrders([
      { price: "1000" },
      { price: "999" },
    ] as ILimitOrder[]);
    expect(orders[0].price).to.be.eq(
      "999",
      "Failed to sort orders by lowest price"
    );
  });

  it("Should filter orders by price", async () => {
    expect(
      MockDatabase.Instance.filterLimitOrdersByPrice(
        [...twoProfitableOrders, unprofitableOrder],
        mockPriceUpdate.token1.price
      ).length
    ).to.be.eq(2, "did not filter out unprofitable orders correctly");
  });

  /* it.('Should calcualte profitability', async () => {
    const validOrder = {
      order: {
        maker: "0x8f99B0b48b23908Da9f727B5083052d5099e6aea",
        tokenIn: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
        tokenOut: "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063",
        tokenInDecimals: 6,
        tokenOutDecimals: 18,
        amountIn: 8455724,
        amountOut: 5919006800000000000,
        recipient: "0x8f99B0b48b23908Da9f727B5083052d5099e6aea",
        startTime: "0",
        endTime: "9007199254740991",
        stopPrice: "0",
        oracleAddress: "0x0000000000000000000000000000000000000000",
        oracleData: "0x00000000000000000000000000000000000000000000000000000000000000",
        v: 27,
        r: "0x62ad8d9e63ad4ba612c95d25c24b4e9f9c676222022912153f9e45e1cf933ae2",
        s: "0x4b50c1d01295d2057714cb1a890ac794a377e9a82ad73533c70bc010f23a99a0",
        chainId: 137
      },
      price: "702106318956870611835506519558",
      digest: "0x7199c3bc3f97f73f82ba3ac9ebb788dc2f4d76602e3c8676ead56c59bc61b4e5",
      valid: true,
      pairAddress: "0xCD578F016888B57F1b1e3f887f392F0159E26747",
      filledAmount: "0",
      userBalance: "10220158"
    }
    const priceUpdate = {
      token0: {
        price: BigNumber.from("999181521688920758768061723009"),
        poolBalance: BigNumber.from("14915914799339"),
        address: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
        addressMainnet: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'
      },
      token1: {
        price: BigNumber.from("1000819"),
        poolBalance: BigNumber.from('14903706446585835155899385'),
        address: '0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063',
        addressMainnet: '0x6B175474E89094C44Da98b954EedeAC495271d0F'
      },
      pair: {
        token0: {
          address: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
          addressMainnet: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
          symbol: 'USDC',
          decimals: 6
        },
        token1: {
          address: '0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063',
          addressMainnet: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
          symbol: 'DAI',
          decimals: 18
        },
        pairAddress: '0xCD578F016888B57F1b1e3f887f392F0159E26747'
      }
    }
    // console.log(await profitableOrders(priceUpdate, [validOrder]));
  }); */
});

function deepCopyPriceUpdate(priceUpdate: PriceUpdate) {
  const _priceUpdate = { ...priceUpdate };
  _priceUpdate.token0 = { ...priceUpdate.token0 };
  _priceUpdate.token1 = { ...priceUpdate.token1 };
  return _priceUpdate;
}

export class MockNetworkPrices extends NetworkPrices {
  getWeiGasPrice = async function (chainid: ChainId): Promise<BigNumber> {
    return BigNumber.from("4");
  };
  public getPrices = async function (
    priceUpdate: PriceUpdate,
    chainId
  ): Promise<{
    gasPrice: BigNumber;
    token0EthPrice: BigNumber;
    token1EthPrice: BigNumber;
  }> {
    return {
      gasPrice: BigNumber.from("4"),
      token0EthPrice: BigNumber.from("499540000000000"), // 0.00049954
      token1EthPrice: BigNumber.from("1000000000000000000"), // 1
    };
  };
}
