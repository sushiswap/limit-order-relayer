import { Database } from './database/database';
import { IExecutedOrder, ILimitOrder, IWatchPair } from './models/models';
import { PriceUpdate } from './price-updates/pair-updates';
import { ExecutableOrder, profitableOrders } from './orders/profitability';
import { Observable, Subject } from 'rxjs';

export class LimitOrderRelayer {

  // parameterize the following for easier testing
  public LimitOrderUpdates: (a: IWatchPair[]) => Observable<ILimitOrder>;
  public SushiswapPairUpdates: (a: IWatchPair[]) => Observable<PriceUpdate>;
  public executeOrders: (a: ExecutableOrder[]) => Promise<IExecutedOrder[]>;
  public refreshOrderStatus: (orders: ILimitOrder[], fetchUserBalance?: boolean) => Promise<ILimitOrder[]>;
  public database: Database;


  constructor(
    orderUpdates: (a: IWatchPair[]) => Observable<ILimitOrder>,
    pairUpdates: (a: IWatchPair[]) => Observable<PriceUpdate>,
    executeOrders: (a: ExecutableOrder[]) => Promise<IExecutedOrder[]>,
    refreshOrderStatus: (orders: ILimitOrder[], fetchUserBalance?: boolean) => Promise<ILimitOrder[]>,
    database: Database
  ) {

    this.LimitOrderUpdates = orderUpdates;
    this.SushiswapPairUpdates = pairUpdates;
    this.executeOrders = executeOrders;
    this.refreshOrderStatus = refreshOrderStatus;
    this.database = database;

  }


  public async init() {

    await this.database.connectDB();

    // which pairs we execute limit orders for
    const watchPairs = await this.database.setWatchPairs();

    if (!watchPairs || watchPairs.length == 0) return console.log('No pairs to watch');


    // save incomming limit orders into a DB
    this.LimitOrderUpdates(watchPairs).subscribe(limitOrder => {
      this.database.saveLimitOrder(limitOrder);
    });


    // subscribe to price updates of pools & execute orders
    this.SushiswapPairUpdates(watchPairs).subscribe(async (priceUpdate: PriceUpdate) => {

      // for a given price update on a pool check buy or sell
      // limit orders that might be ready for execution
      // (one of the two arrays should generally be empty)
      const __token0Orders = await this.database.getLimitOrders(priceUpdate.token0.price, priceUpdate.pair.pairAddress, priceUpdate.token0.address);
      const __token1Orders = await this.database.getLimitOrders(priceUpdate.token1.price, priceUpdate.pair.pairAddress, priceUpdate.token1.address);

      // filter out expired / already filled orders
      const _token0Orders = await this.refreshOrderStatus(__token0Orders);
      const _token1Orders = await this.refreshOrderStatus(__token1Orders);


      // filter out orders that aren't profitable
      const token0Orders = await profitableOrders(priceUpdate, _token0Orders);
      const token1Orders = await profitableOrders(priceUpdate, _token1Orders);

      this.execute(token0Orders);
      this.execute(token1Orders);

    });

  }


  // also for testing purposes
  private _executeOrders = new Subject<ExecutableOrder[]>();
  public get submittedOrders(): Observable<ExecutableOrder[]> {
    return this._executeOrders.asObservable();
  }


  private async execute(orders: ExecutableOrder[]) {
    if (orders.length > 0) {

      const executed = await this.executeOrders(orders);

      await this.database.saveExecutedOrder(executed);

      this._executeOrders.next(orders);
    }
  }

}