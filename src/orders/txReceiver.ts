import { BigNumber } from '@ethersproject/bignumber';
import { ILimitOrderData, SOCKET_URL, LimitOrder } from 'limitorderv2-sdk';
import { Observable, Subject } from 'rxjs';
import { filter, map, tap } from 'rxjs/operators';
import { IMessageEvent, w3cwebsocket } from 'websocket';
import { IWatchPair, ILimitOrder } from '../models/models';
import { MyLogger } from '../utils/myLogger';
import { getOrderPrice } from '../utils/price';
import { validateLimitOrderData } from './validOrders';
import { io } from "socket.io-client"

const socketUrl = `wss://limit-order-ffo5rqmjnq-uc.a.run.app`
const socket = io(socketUrl);
socket.on("connect", () => {
  console.log(socket.id); // x8WIv7-mJelg7on_ALbx
});

socket.on("disconnect", () => {
  console.log(socket.id); // undefined
});

// receive orders from the websocket
function _watchLimitOrders(watchPairs: IWatchPair[]): Observable<ILimitOrderData> {
  const updates = new Subject<ILimitOrderData>()

  
  socket.on("sushi", (arg1) => {
    // console.log(arg1);

    if ((arg1.tag = 'LIMIT_ORDER_V2')) {
      delete arg1["tag"]
      const order: ILimitOrderData = arg1
      updates.next(order)
    }
  });
  return updates
}

export function watchLimitOrders(watchPairs: IWatchPair[], watcher = _watchLimitOrders): Observable<ILimitOrder> {
  return watcher(watchPairs).pipe(

    filter(order => validateLimitOrderData(order, watchPairs)),

    map((order: ILimitOrderData) => {

      const digest = LimitOrder.getLimitOrder(order).getTypeHash();

      const price = getOrderPrice(BigNumber.from(order.amountIn), BigNumber.from(order.amountOut)).toString();

      return { price, digest, order };

    }));
}

export function stopReceivingOrders() { socket?.close() };