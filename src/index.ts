import { Database } from './database/database';
import { ILimitOrder, Side } from './models/models';
import { PriceUpdate, watchSushiwapPairs } from './price-updates/pair-updates';
import { watchLimitOrders, stopReceivingOrders } from './orders/txReceiver';
import { validOrders } from './orders/validOrders';
import { executableOrders } from './orders/profitability';
import { executeOrders } from './orders/execute';
import { Observable } from 'rxjs';

export class LimitOrderRelayer {

  private LimitOrderUpdates: Observable<ILimitOrder>;
  private SushiswapPairUpdates: Observable<PriceUpdate>;
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
    watchLimitOrders(watchPairs).subscribe(this.database.saveLimitOrder);


    // subscribe to price updates of pools & execute orders
    watchSushiwapPairs(watchPairs).subscribe(async (priceUpdate: PriceUpdate) => {


      // fetch limit orders that might be ready for execution
      // one of the two arrays should generally be empty
      const _buyOrders = await this.database.getLimitOrders(Side.Buy, priceUpdate.price.toString(), priceUpdate.pair.pairAddress)
      const _sellOrders = await this.database.getLimitOrders(Side.Sell, priceUpdate.price.toString(), priceUpdate.pair.pairAddress)

      // filter out orders that have already been executed & that aren't profitable
      const buyOrders = await executableOrders(priceUpdate, await validOrders(_buyOrders));
      const sellOrders = await executableOrders(priceUpdate, await validOrders(_sellOrders));


      await this.execute(buyOrders);
      await this.execute(sellOrders);


    });

  }

}

// use parameters for easier testing
new LimitOrderRelayer(watchLimitOrders, watchSushiwapPairs, Database.Instance, executeOrders).init();

process.on('exit', () => { stopReceivingOrders(); Database.Instance.disconnectDB(); });