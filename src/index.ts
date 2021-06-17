import { Database } from './database/database';
import { watchSushiwapPairs } from './price-updates/pair-updates';
import { watchLimitOrders, stopReceivingOrders } from './orders/txReceiver';
import { executeOrders } from './orders/execute';
import { LimitOrderRelayer } from './LimitOrderRelayer';
import dotenv from 'dotenv';
import { validateEnv } from './utils/validateEnv';
import { refreshOrderStatus } from './orders/validOrders';

dotenv.config();

validateEnv();

new LimitOrderRelayer(
  watchLimitOrders,
  watchSushiwapPairs,
  executeOrders,
  refreshOrderStatus,
  Database.Instance
).init();

process.on('exit', () => { stopReceivingOrders(); Database.Instance.disconnectDB(); });
