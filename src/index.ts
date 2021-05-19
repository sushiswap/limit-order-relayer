import { Database } from './database/database';
import { ILimitOrder, IWatchPair } from './models/models';
import { PriceUpdate, watchSushiwapPairs } from './price-updates/pair-updates';
import { watchLimitOrders, stopReceivingOrders } from './orders/txReceiver';
import { validOrders } from './orders/validOrders';
import { profitableOrders } from './orders/profitability';
import { executeOrders } from './orders/execute';
import { Observable } from 'rxjs';

export class LimitOrderRelayer {

  private LimitOrderUpdates: (a: IWatchPair[]) => Observable<ILimitOrder>;
  private SushiswapPairUpdates: (a: IWatchPair[]) => Observable<PriceUpdate>;
  private execute: (a: ILimitOrder[]) => void;

  private database: Database;

  constructor(orderUpdates, pairUpdates, database, execute) {

    this.LimitOrderUpdates = orderUpdates;
    this.SushiswapPairUpdates = pairUpdates;
    this.database = database;
    this.execute = execute;

  }

  public async init() {


    await this.database.connectDB();


    // which pairs we execute limit orders for
    const watchPairs = await this.database.setWatchPairs();


    if (!watchPairs || watchPairs.length == 0) return console.log('No pairs to watch');


    // save incomming limit orders into a DB
    this.LimitOrderUpdates(watchPairs).subscribe(this.database.saveLimitOrder);


    // subscribe to price updates of pools & execute orders
    this.SushiswapPairUpdates(watchPairs).subscribe(async (priceUpdate: PriceUpdate) => {


      // fetch limit orders that might be ready for execution
      // one of the two arrays should generally be empty
      const _token0Orders = await this.database.getLimitOrders(priceUpdate.token0.price, priceUpdate.pair.pairAddress, priceUpdate.token0.address);
      const _token1Orders = await this.database.getLimitOrders(priceUpdate.token1.price, priceUpdate.pair.pairAddress, priceUpdate.token1.address);

      // filter out orders that have already been executed & that aren't profitable
      const token0Orders = await profitableOrders(priceUpdate, await validOrders(_token0Orders));
      const token1Orders = await profitableOrders(priceUpdate, await validOrders(_token1Orders));

      console.log(token0Orders);
      console.log('-----------------------');
      console.log(token1Orders);

      await this.execute(token0Orders);
      await this.execute(token1Orders);


    });

  }

}

// use parameters for easier testing
new LimitOrderRelayer(watchLimitOrders, watchSushiwapPairs, Database.Instance, executeOrders).init();

process.on('exit', () => { stopReceivingOrders(); Database.Instance.disconnectDB(); });