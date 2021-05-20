import { ILimitOrder } from '../src/models/models';
import { Observable, of } from 'rxjs';
import { getLimitOrderPairs } from '../src/utils/watchPairs';
import { BigNumber } from '@ethersproject/bignumber';
import { PriceUpdate, PRICE_MULTIPLIER } from '../src/price-updates/pair-updates';
import { LimitOrderRelayer } from '../src/LimitOrderRelayer';
import { executeOrders } from '../src/orders/execute';
import { Database } from '../src/database/database';
import { expect } from 'chai';
import { validOrders } from '../src/orders/validOrders';

describe('LimitOrderTest', () => {
  it('Executing Limit Order', async () => {

    const limitOrder = new LimitOrderRelayer(mockLimitOrderWatcher, mockPairwatcher, MockDatabase.Instance, executeOrders);

    let orders: ILimitOrder[];

    orders = await limitOrder.database.getLimitOrders(mockPriceUpdate.token1.price, mockPriceUpdate.pair.pairAddress, mockLimitOrder.order.tokenIn);

    expect(orders[0]).to.equal(mockLimitOrder, "order was not fetched from DB");

    orders = await validOrders(orders, limitOrder.database);

    expect(orders[0]).to.equal(mockLimitOrder, "order was filtered out");


    /*     let success = false;
    
        limitOrder.submittedOrders.subscribe(orders => {
          if (orders.length > 0) success = true;
        });
    
        limitOrder.init();
    
        await new Promise((r) => setTimeout(r, 1000));
    
        expect(success).to.be.true("Order was not executed"); */

  });
});

const mockLimitOrder: ILimitOrder = {
  digest: "0x64877b8800176d7075d010deacc25e3b5baedcabb0064f0f70287127a5ad1a51",
  order: {
    maker: "0x80cF9eD9556729A09DCd1E7a58f8401eB44e5525",
    tokenIn: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", // WETH
    tokenOut: "0x6B175474E89094C44Da98b954EedeAC495271d0F", // DAI
    tokenInDecimals: 18,
    tokenOutDecimals: 18,
    amountIn: "1000000000000000000", // 1 WETH
    amountOut: "2500000000000000000000", // price is in terms of tokenOut (aka 2500 DAI)
    recipient: '0x80cF9eD9556729A09DCd1E7a58f8401eB44e5525',
    startTime: '0',
    endTime: '2000000000000',
    stopPrice: '0',
    oracleAddress: '0x0000000000000000000000000000000000000000',
    oracleData: '0x00000000000000000000000000000000000000000000000000000000000000',
    v: 27,
    r: '0xb329d28a2d8789b7381cbe307dc687ea46f3dad763bde94b6814820617fbbb49',
    s: '0x74f47425d7dc35021016089c723e6cb09e874a45cc6d74f23dd4d15cc20b705c',
    chainId: 1
  },
  price: BigNumber.from("2500").mul(PRICE_MULTIPLIER).toString(),
  pairAddress: "0xC3D03e4F041Fd4cD388c549Ee2A29a9E5075882f"
};

const daiBalance = BigNumber.from("123897604486763299470868769"); // 123 m
const wethBalance = BigNumber.from("45251174156508396022079"); // 45 k ~ price is 2733 DAI per WETH

const mockWatchPair = {
  token0: {
    address: "0x6B175474E89094C44Da98b954EedeAC495271d0F",
    decimals: 18,
    symbol: "DAI"
  },
  token1: {
    address: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
    decimals: 18,
    symbol: "WETH"
  },
  pairAddress: "0xC3D03e4F041Fd4cD388c549Ee2A29a9E5075882f",
}

const mockPriceUpdate: PriceUpdate = {
  pair: mockWatchPair,
  token0: {
    poolBalance: daiBalance,
    price: wethBalance.mul(PRICE_MULTIPLIER).div(daiBalance), // price is calculated as (token1Balance * {PRICE_MULTIPLIER}) / token0Balance
    address: "0x6B175474E89094C44Da98b954EedeAC495271d0F"
  },
  token1: {
    poolBalance: wethBalance,
    price: daiBalance.mul(PRICE_MULTIPLIER).div(wethBalance), // price is calculated as (token0Balance * {PRICE_MULTIPLIER}) / token1Balance
    address: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"
  }
}

function mockLimitOrderWatcher(): Observable<ILimitOrder> {
  return of(mockLimitOrder);
}

function mockPairwatcher(): Observable<PriceUpdate> {
  return of(mockPriceUpdate);
}

class MockDatabase extends Database {
  private mockPromise = (a?) => new Promise<any>((r, re) => r(a));
  private static __instance: MockDatabase;
  public static get Instance() { return this.__instance || (this.__instance = new this()); }
  connectDB = () => { return this.mockPromise(true) };
  dropPairs = () => { return this.mockPromise(true) };
  saveWatchPairs = (wp) => { return getLimitOrderPairs() };
  saveLimitOrder = (lo) => { return this.mockPromise(lo) };
  getLimitOrders = (price: BigNumber, pairAddress: string, token0: string) => {
    return this.mockPromise(mockLimitOrder.order.tokenIn == token0 ? [mockLimitOrder] : []);
  };
  updateLimitOrders = (o) => { return this.mockPromise([]) }
  deleteLimitOrders = (o) => { return this.mockPromise([]) }
}