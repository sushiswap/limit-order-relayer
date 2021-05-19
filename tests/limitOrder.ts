import { Database } from '../src/database/database';
import { ILimitOrder } from '../src/models/models';
import { Observable, of } from 'rxjs';
import { getLimitOrderPairs } from '../src/utils/watchPairs';

describe('LimitOrderTest', () => {
  it('Executing Limit Order', () => {

    // watchLimitOrders, watchSushiwapPairs, Database.Instance, executeOrders
  });
});

function mockLimitOrderWatcher(): Observable<ILimitOrder> {
  return of({
    price: "5000",
    digest: "",
    order: {
      maker: "0x",
      tokenIn: "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2", // WETH
      tokenOut: "0x6b175474e89094c44da98b954eedeac495271d0f", // DAI
      // DAI < WETH so price is [dai balance / eth balance]
      tokenInDecimals: 18,
      tokenOutDecimals: 18,
      amountIn: "1",
      amountOut: "5000",
      recipient: "",
      startTime: "",
      endTime: "",
      stopPrice: "",
      oracleAddress: "",
      oracleData: "",
      v: 28,
      r: "",
      s: "",
      chainId: 1
    },
    pairAddress: "0x",
    filledAmount: "0",
  });
}

class MockDatabase extends Database {
  private mockPromise = (a) => new Promise<any>((r, re) => r(a));
  connectDB(): Promise<void> { return; };
  setWatchPairs() { return this.mockPromise([]) };
  saveWatchPairs(wp) { return getLimitOrderPairs() };
  saveLimitOrder(lo) { return this.mockPromise(lo) };
  getLimitOrders(side, price, pairAddress) { return this.mockPromise([]) };
  updateLimitOrders(o) { return this.mockPromise([]) }
  deleteLimitOrders(o) { return this.mockPromise([]) }
}