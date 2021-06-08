import { Database } from './database/database';
import { IExecutedOrder, ILimitOrder, IWatchPair } from './models/models';
import { PriceUpdate, watchSushiwapPairs } from './price-updates/pair-updates';
import { watchLimitOrders, stopReceivingOrders } from './orders/txReceiver';
import { validOrders } from './orders/validOrders';
import { ExecutableOrder, profitableOrders } from './orders/profitability';
import { executeOrders } from './orders/execute';
import { Observable, Subject } from 'rxjs';
import { watchPairModel } from './models/mongooseModels';

export class LimitOrderRelayer {

  // parameterize the following for easier testing
  public LimitOrderUpdates: (a: IWatchPair[]) => Observable<ILimitOrder>;
  public SushiswapPairUpdates: (a: IWatchPair[]) => Observable<PriceUpdate>;
  public executeOrders: (a: ExecutableOrder[]) => IExecutedOrder[];
  public database: Database;


  private _executeOrders = new Subject<ExecutableOrder[]>();


  constructor(orderUpdates, pairUpdates, database, executeOrders) {

    this.LimitOrderUpdates = orderUpdates;
    this.SushiswapPairUpdates = pairUpdates;
    this.database = database;
    this.executeOrders = executeOrders;

  }

  // for logging purposes  
  public get submittedOrders(): Observable<ExecutableOrder[]> {
    return this._executeOrders.asObservable();
  }


  public async init() {


    await this.database.connectDB();


    // which pairs we execute limit orders for
    const watchPairs = await this.database.setWatchPairs();


    if (!watchPairs || watchPairs.length == 0) return console.log('No pairs to watch');

    // save incomming limit orders into a DB
    this.LimitOrderUpdates(watchPairs).subscribe(limitOrder => this.database.saveLimitOrder(limitOrder));


    // subscribe to price updates of pools & execute orders
    this.SushiswapPairUpdates(watchPairs).subscribe(async (priceUpdate: PriceUpdate) => {

      console.log(`price update: ${priceUpdate.pair.token0.symbol}-${priceUpdate.pair.token1.symbol}`, priceUpdate.token0.price.toString());

      // fetch limit orders that might be ready for execution
      // one of the two arrays should generally be empty
      const __token0Orders = await this.database.getLimitOrders(priceUpdate.token0.price, priceUpdate.pair.pairAddress, priceUpdate.token0.address);
      const __token1Orders = await this.database.getLimitOrders(priceUpdate.token1.price, priceUpdate.pair.pairAddress, priceUpdate.token1.address);
      console.log(__token0Orders, __token1Orders);
      // filter out expired / already filled orders
      const _token0Orders = await validOrders(__token0Orders, this.database);
      const _token1Orders = await validOrders(__token1Orders, this.database);

      // filter out orders that aren't profitable
      const token0Orders = await profitableOrders(priceUpdate, _token0Orders);
      const token1Orders = await profitableOrders(priceUpdate, _token1Orders);

      this.execute(token0Orders);
      this.execute(token1Orders);

    });

  }


  private async execute(orders: ExecutableOrder[]) {
    if (orders.length > 0) {

      const executed = await this.executeOrders(orders);

      await this.database.saveExecutedOrder(executed);

      this._executeOrders.next(orders);
    }
  }

}