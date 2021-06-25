import { Database } from './database/database';
import { IExecutedOrder, ILimitOrder, IWatchPair } from './models/models';
import { ExecutableOrder, profitableOrders } from './orders/profitability';
import { Observable, Subject } from 'rxjs';
import { safeAwait } from './utils/myAwait';
import { MyLogger } from './utils/myLogger';
import { NetworkPrices } from './utils/networkPrices';
import { BigNumber } from 'ethers';
import { getLimitOrderPairs } from './pairs/watchPairs';
import { PriceUpdate } from './pairs/pairUpdates';

export class LimitOrderRelayer {

  // parameterize the following for easier testing
  public LimitOrderUpdates: (a: IWatchPair[]) => Observable<ILimitOrder>;
  public SushiswapPairUpdates: (a: IWatchPair[]) => Observable<PriceUpdate>;
  public executeOrders: (a: ExecutableOrder[], gasPrice: BigNumber) => Promise<IExecutedOrder[]>;
  public refreshOrderStatus: (orders: ILimitOrder[], fetchUserBalance?: boolean) => Promise<ILimitOrder[]>;
  public database: Database;
  public networkPrices: NetworkPrices;


  constructor(
    orderUpdates: (a: IWatchPair[]) => Observable<ILimitOrder>,
    pairUpdates: (a: IWatchPair[]) => Observable<PriceUpdate>,
    executeOrders: (a: ExecutableOrder[], gasPrice: BigNumber) => Promise<IExecutedOrder[]>,
    refreshOrderStatus: (orders: ILimitOrder[], fetchUserBalance?: boolean) => Promise<ILimitOrder[]>,
    database: Database,
    networkPrices: NetworkPrices
  ) {
    this.LimitOrderUpdates = orderUpdates;
    this.SushiswapPairUpdates = pairUpdates;
    this.executeOrders = executeOrders;
    this.refreshOrderStatus = refreshOrderStatus;
    this.database = database;
    this.networkPrices = networkPrices;
  }


  public async init() {


    const [, dbError] = await safeAwait(this.database.connectDB());

    if (dbError) return MyLogger.log(`Failed to connect to db: ${dbError}`);


    // which pairs we execute limit orders for
    // const [watchPairs,] = await safeAwait(this.database.setWatchPairs());
    const [watchPairs,] = await safeAwait(getLimitOrderPairs());


    if (!watchPairs || watchPairs.length == 0) return MyLogger.log('No pairs to watch');


    // save incomming limit orders into a DB
    this.LimitOrderUpdates(watchPairs).subscribe(limitOrder => {
      this.database.saveLimitOrder(limitOrder);
    });


    // subscribe to price updates of pools & execute orders
    this.SushiswapPairUpdates(watchPairs).subscribe(async (priceUpdate: PriceUpdate) => {


      const [prices, error] = await safeAwait(this.networkPrices.getPrices(priceUpdate));

      if (error) return MyLogger.log(`Couldn't fetch network prices ${error}`);

      const { gasPrice, token0EthPrice, token1EthPrice } = prices;


      // for a given price update on a pool check "buy" or "sell" limit orders that might be ready for execution
      // (one of the two arrays should generally be empty)
      const __token0Orders = await this.database.getLimitOrders(priceUpdate.token0.price, priceUpdate.pair.pairAddress, priceUpdate.token0.address);
      const __token1Orders = await this.database.getLimitOrders(priceUpdate.token1.price, priceUpdate.pair.pairAddress, priceUpdate.token1.address);


      // filter out expired / already filled orders      
      const _token0Orders = await this.refreshOrderStatus(__token0Orders);
      const _token1Orders = await this.refreshOrderStatus(__token1Orders);


      // filter out orders that aren't profitable
      const token0Orders = await profitableOrders(priceUpdate, _token0Orders, { gasPrice, token0EthPrice, token1EthPrice });
      const token1Orders = await profitableOrders(priceUpdate, _token1Orders, { gasPrice, token0EthPrice, token1EthPrice });


      this.execute(token0Orders, gasPrice);
      this.execute(token1Orders, gasPrice);

    });

  }


  // also for testing purposes
  private _executedOrders = new Subject<IExecutedOrder[]>();
  public get submittedOrders(): Observable<IExecutedOrder[]> {
    return this._executedOrders.asObservable();
  }


  private async execute(orders: ExecutableOrder[], gasPrice: BigNumber) {

    if (orders.length > 0) {

      const executed = await this.executeOrders(orders, gasPrice);

      const [, error] = await safeAwait(this.database.saveExecutedOrder(executed));

      if (error) MyLogger.log(`Couldn't save executed order ${error}`)

      this._executedOrders.next(executed);

    }
  }

}