import { Database } from './database/database';
import { Side } from './models/models';
import { PriceUpdate, watchSushiwapPairs } from './price-updates/pair-updates';
import { watchLimitOrders, stopReceivingOrders } from './orders/txReceiver';
import { validOrders } from './orders/validOrders';
import { executableOrders } from './orders/profitability';

async function init() {


  const database = Database.Instance;


  await database.connectDB();


  // which pairs we execute limit orders for
  const watchPairs = await database.setWatchPairs();


  if (!watchPairs || watchPairs.length == 0) return console.log('No pairs to watch');


  // save incomming limit orders into a DB
  watchLimitOrders(watchPairs).subscribe(database.saveLimitOrder);


  // subscribe to price updates of pools & execute orders
  watchSushiwapPairs(watchPairs).subscribe(async (priceUpdate: PriceUpdate) => {

    // one of the two arrays should generally be empty
    const buyOrders = await executableOrders(priceUpdate, await validOrders(await database.getLimitOrders(Side.Buy, priceUpdate.price.toString(), priceUpdate.pair.pairAddress)));
    const sellOrders = await executableOrders(priceUpdate, await validOrders(await database.getLimitOrders(Side.Sell, priceUpdate.price.toString(), priceUpdate.pair.pairAddress)));

    executableOrders

  });

}


init();


process.on('exit', () => { stopReceivingOrders(); Database.Instance.disconnectDB(); });