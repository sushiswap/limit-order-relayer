import { ILimitOrder } from '../src/models/models';
import { Observable, of } from 'rxjs';
import { getLimitOrderPairs } from '../src/utils/watchPairs';
import { BigNumber } from '@ethersproject/bignumber';
import { PriceUpdate, PRICE_MULTIPLIER } from '../src/price-updates/pair-updates';
import { LimitOrderRelayer } from '../src/LimitOrderRelayer';
import { executeOrders } from '../src/orders/execute';
import { Database } from '../src/database/database';
import { expect } from 'chai';

describe('LimitOrderTest', () => {
  it('Executing 2 Limit Orders', async () => {

    const limitOrderRelayer = new LimitOrderRelayer(
      mockLimitOrderWatcher,
      mockPairwatcher,
      executeOrders,
      mockOrderStatusRefresh,
      MockDatabase.Instance
    );

    const received = await new Promise<any>((resolve, reject) => {

      limitOrderRelayer.submittedOrders.subscribe({
        next: resolve,
        error: reject
      });

      limitOrderRelayer.init();

    });

    expect(received.length).to.be.eq(2, "Didn't execute both orders")

  }).timeout(20000);
});

const twoProfitableOrders: ILimitOrder[] = [
  {
    order: {
      maker: '0x0Cc7090D567f902F50cB5621a7d6A59874364bA1',
      tokenIn: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619',
      tokenOut: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270',
      tokenInDecimals: 18,
      tokenOutDecimals: 18,
      tokenInSymbol: 'WETH',
      tokenOutSymbol: 'MATIC',
      amountIn: '50000000000000000',
      amountOut: '75050000000000000000',
      recipient: '0x0Cc7090D567f902F50cB5621a7d6A59874364bA1',
      startTime: 0,
      endTime: 1624042839,
      stopPrice: '0',
      oracleAddress: '0x0000000000000000000000000000000000000000',
      oracleData: '0x00000000000000000000000000000000000000000000000000000000000000',
      v: 28,
      r: '0x99b49756a14f944d6f6359ce8767edba48fc69c824eb131ee2d85c3278d668c0',
      s: '0x0c0f45fb8e44fca2982601d6b47b2fbd5f6726f539f4d2393dcd482f0e05ea19',
      chainId: 137
    },
    price: '1505516549648946840521',
    digest: '0x46dd48973b42d35c872cbf569bae8213ea5fba300b172c0ab1dc7064a6678a4c',
    pairAddress: '0xc4e595acDD7d12feC385E5dA5D43160e8A0bAC0E',
  },
  {
    order: {
      maker: '0x0Cc7090D567f902F50cB5621a7d6A59874364bA1',
      tokenIn: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619',
      tokenOut: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270',
      tokenInDecimals: 18,
      tokenOutDecimals: 18,
      tokenInSymbol: 'WETH',
      tokenOutSymbol: 'MATIC',
      amountIn: '50000000000000000',
      amountOut: '75100000000000000000',
      recipient: '0x0Cc7090D567f902F50cB5621a7d6A59874364bA1',
      startTime: 0,
      endTime: 2624042847,
      stopPrice: '0',
      oracleAddress: '0x0000000000000000000000000000000000000000',
      oracleData: '0x00000000000000000000000000000000000000000000000000000000000000',
      v: 27,
      r: '0xc8704f13d59bb8f3b57fbef04a2db3b1918c2eba10f5136a6088e0b95a3b3e37',
      s: '0x099578119c9f555d7c2d57092ad55540896ecee06773c9703392e22a2d3d25bf',
      chainId: 137
    },
    price: '1506519558676028084252',
    digest: '0x40fda8d0104644f51ad231485f9864e5fdf443f49ff0cdd5354fbb51feed9750',
    pairAddress: '0xc4e595acDD7d12feC385E5dA5D43160e8A0bAC0E',
  }
];

const wmaticBalance = BigNumber.from("29251199619224541435352689");
const wethBalance = BigNumber.from("18243857044724546396431");

const mockWatchPair = {
  token0: {
    address: "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270",
    decimals: 18,
    symbol: "WMATIC"
  },
  token1: {
    address: "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619",
    decimals: 18,
    symbol: "WETH"
  },
  pairAddress: "0xC3D03e4F041Fd4cD388c549Ee2A29a9E5075882f",
}

const mockPriceUpdate: PriceUpdate = {
  pair: mockWatchPair,
  token0: {
    poolBalance: wmaticBalance,
    price: wethBalance.mul(PRICE_MULTIPLIER).div(wmaticBalance), // price is calculated as (token1Balance * {PRICE_MULTIPLIER}) / token0Balance
    address: "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270"
  },
  token1: {
    poolBalance: wethBalance,
    price: wmaticBalance.mul(PRICE_MULTIPLIER).div(wethBalance), // price is calculated as (token0Balance * {PRICE_MULTIPLIER}) / token1Balance
    address: "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619"
  }
}

const mockPromise = (a?) => new Promise<any>((r, re) => r(a));

function mockLimitOrderWatcher(): Observable<ILimitOrder> {
  return of(undefined);
}

function mockPairwatcher(): Observable<PriceUpdate> {
  return of(mockPriceUpdate);
}

function mockOrderStatusRefresh(orders: ILimitOrder[]) {
  return mockPromise(orders.map(order => { order.filledAmount = "0"; return order }));
}

class MockDatabase extends Database {
  private static __instance: MockDatabase;
  public static get Instance() { return this.__instance || (this.__instance = new this()); }
  connectDB = () => { return mockPromise(true) };
  setWatchPairs = () => { return mockPromise([undefined]) };
  dropPairs = () => { return mockPromise(true) };
  saveWatchPairs = (wp) => { return getLimitOrderPairs() };
  saveLimitOrder = (lo) => { return mockPromise(lo) };
  saveExecutedOrder = (eo) => { return mockPromise(eo) };
  getLimitOrders = (price: BigNumber, pairAddress: string, token0: string) => {
    return mockPromise(token0 === twoProfitableOrders[0].order.tokenIn ? twoProfitableOrders : [])
  };
  updateLimitOrders = (o) => { return mockPromise([]) }
  deleteLimitOrders = (o) => { return mockPromise([]) }
}