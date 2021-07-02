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
import { filter } from 'rxjs/operators';

export class LimitOrderRelayer {

  // parameterize the following for easier testing
  public LimitOrderUpdates: (a: IWatchPair[]) => Observable<ILimitOrder>;
  public SushiswapPairUpdates: (a: IWatchPair[]) => Observable<PriceUpdate[]>;
  public executeOrders: (a: ExecutableOrder[], gasPrice: BigNumber) => Promise<IExecutedOrder[]>;
  public refreshGroupOrderStatus: (pairLimitOrders: ILimitOrder[][][]) => Promise<ILimitOrder[][][]>;
  public database: Database;
  public networkPrices: NetworkPrices;


  constructor(
    orderUpdates: (a: IWatchPair[]) => Observable<ILimitOrder>,
    pairUpdates: (a: IWatchPair[]) => Observable<PriceUpdate[]>,
    executeOrders: (a: ExecutableOrder[], gasPrice: BigNumber) => Promise<IExecutedOrder[]>,
    refreshGroupOrderStatus: (pairLimitOrders: ILimitOrder[][][]) => Promise<ILimitOrder[][][]>,
    database: Database,
    networkPrices: NetworkPrices
  ) {
    this.LimitOrderUpdates = orderUpdates;
    this.SushiswapPairUpdates = pairUpdates;
    this.executeOrders = executeOrders;
    this.refreshGroupOrderStatus = refreshGroupOrderStatus;
    this.database = database;
    this.networkPrices = networkPrices;
  }


  public async init() {

    const [, dbError] = await safeAwait(this.database.connectDB());

    if (dbError) return MyLogger.log(`Failed to connect to db: ${dbError}`);


    // which pairs we execute limit orders for
    // const [watchPairs,] = await safeAwait(this.database.setWatchPairs());
    const [watchPairs, err] = await safeAwait(getLimitOrderPairs());

    if (!watchPairs || watchPairs.length == 0 || !!err) return MyLogger.log(`No pairs to watch, err: ${err}`);


    // save incomming limit orders into a DB
    this.LimitOrderUpdates(watchPairs).pipe(filter(a => !!a)).subscribe(limitOrder => {
      this.database.saveLimitOrder(limitOrder);
    });


    // subscribe to price updates of pools & execute orders
    this.SushiswapPairUpdates(watchPairs).subscribe(async (priceUpdates: PriceUpdate[]) => {

      const networkPrices: { gasPrice: BigNumber, token0EthPrice: BigNumber, token1EthPrice: BigNumber }[] = [];

      const groupedOrders: ILimitOrder[][][] = [];

      // because the loops are async - don't just push to the array! instead do `groupedOrders[i] = ...` & `networkPrices[i] = ...`

      await Promise.all(priceUpdates.map(async (priceUpdate, i) => {

        const [prices, error] = await safeAwait(this.networkPrices.getPrices(priceUpdate));

        if (error) return MyLogger.log(`Couldn't fetch network prices ${error}`);

        networkPrices[i] = prices;

        // for a given price update on a pool check "buy" or "sell" limit orders that might be ready for execution
        // (one of the two arrays should generally be empty)
        const __token0Orders = await this.database.getLimitOrders(priceUpdate.token0.price, priceUpdate.pair.pairAddress, priceUpdate.token0.address);
        const __token1Orders = await this.database.getLimitOrders(priceUpdate.token1.price, priceUpdate.pair.pairAddress, priceUpdate.token1.address);

        groupedOrders[i] = [__token0Orders, __token1Orders];

      }));

      // filter out expired / already filled orders (they are grouped together so this can be only 1 onchain call) // could this be a problem if there is too many orders ? 
      const [validOrders, err] = await safeAwait(this.refreshGroupOrderStatus(groupedOrders));

      if (err) return MyLogger.log(`FAILED TO REFRESH GROUP ORDER STATUS ${err.toString().substr(0, 400)}`);

      validOrders.forEach(async ([_token0Orders, _token1Orders], i) => {

        const token0Orders = await profitableOrders(priceUpdates[i], _token0Orders, networkPrices[i]);
        const token1Orders = await profitableOrders(priceUpdates[i], _token1Orders, networkPrices[i]);

        this.execute(token0Orders, networkPrices[i].gasPrice);
        this.execute(token1Orders, networkPrices[i].gasPrice);

      });



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