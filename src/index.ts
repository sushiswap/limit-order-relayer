import { Database } from './database/database';
import { watchSushiwapPairs } from './price-updates/pair-updates';
import { watchLimitOrders, stopReceivingOrders } from './orders/txReceiver';
import { executeOrders } from './orders/execute';
import { LimitOrderRelayer } from './LimitOrderRelayer';

new LimitOrderRelayer(watchLimitOrders, watchSushiwapPairs, Database.Instance, executeOrders).init();

process.on('exit', () => { stopReceivingOrders(); Database.Instance.disconnectDB(); });