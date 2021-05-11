import { connectDB, setWatchPairs } from './database';
import { PriceUpdate, PRICE_MULTIPLIER, watchSushiwapPairs } from './pairWatcher';

async function init() {

  await connectDB();

  // which pairs we execute limit orders for
  const watchPairs = await setWatchPairs();

  if (!watchPairs || watchPairs.length == 0) return console.log('No pairs to watch');

  // save incomming limit orders into a DF
  // watchLimitOrders(watchPairs)

  // subscribe to price updates of pools & execute orders
  watchSushiwapPairs(watchPairs).subscribe((priceUpdate: PriceUpdate) => {

    console.log(`token0: ${priceUpdate.pair.token0.symbol}, token1: ${priceUpdate.pair.token1.symbol} ~ ${(priceUpdate.token0Balance.mul(PRICE_MULTIPLIER)).div(priceUpdate.token1Balance)}`);
    // fetch relevant limitOrders from DB
    // calculate prifitabiliy
    // execute order if profitabel

  });

}

init();
