import Mongoose from "mongoose";
import { executedOrderModel, limitOrderModel, watchPairModel } from "../models/mongooseModels";
import { IExecutedOrder, IExecutedOrderModel, ILimitOrder, ILimitOrderModel, IWatchPair, IWatchPairModel } from "../models/models";
import { getLimitOrderPairs } from "../utils/watchPairs";
import { BigNumber } from "@ethersproject/bignumber";
import { MyLogger } from "../utils/myLogger";

export class Database {

  private static _instance: Database;

  private database: Mongoose.Connection;

  // private WatchPairModel = Mongoose.model<IWatchPairModel>("watchPairModel", watchPairModel);
  private LimitOrderModel = Mongoose.model<ILimitOrderModel>("limitOrderModel", limitOrderModel);
  private ExecutedOrderModel = Mongoose.model<IExecutedOrderModel>("executedOrderModel", executedOrderModel);

  public static get Instance() {
    return this._instance || (this._instance = new this());
  }

  public async connectDB(): Promise<void> {

    return new Promise((resolve, reject) => {

      const uri = process.env.MONGODB_URL;

      if (this.database) return resolve();

      Mongoose.connect(uri, {
        useNewUrlParser: true,
        useFindAndModify: true,
        useUnifiedTopology: true,
        useCreateIndex: true,
      });

      this.database = Mongoose.connection;

      this.database.once("open", () => { MyLogger.log("Connected to database"); resolve(); });

      this.database.on("error", () => { MyLogger.log("Error connecting to database"); reject(); });

    });
  };

  public disconnectDB() {
    if (this.database) Mongoose.disconnect();
  };

  /* public async setWatchPairs(): Promise<IWatchPair[] | void> {
    await this.dropPairs();
    return this.saveWatchPairs(await getLimitOrderPairs());
  } */

  /* protected async dropPairs() {
    await this.WatchPairModel.deleteMany({}).exec();
  } */

  public async saveLimitOrders(limitOrders: ILimitOrder[]): Promise<(ILimitOrder | void)[]> {
    return Promise.all(limitOrders.map(order => this.saveLimitOrder(order)));
  }

  /* public saveWatchPairs(watchPairs: IWatchPair[]): Promise<IWatchPair[] | void> {

    return Promise.all(watchPairs.map(async pair => {

      const model = new this.WatchPairModel(pair);

      model.token0 = pair.token0;
      model.token1 = pair.token1;

      return model.save();

    }));
  } */

  public async saveLimitOrder(limitOrder: ILimitOrder): Promise<ILimitOrder | void> {

    const model = new this.LimitOrderModel(limitOrder);

    return model.save().then(() => MyLogger.log('Limit order saved ✔')).catch(err => {
      if (err.code === 11000) {
        console.log('Ignored saving an existing order');
      } else {
        console.log(err);
      }
    });
  }


  // since price has been changed to a string (due to overflow errors) we cannot query with "price: { $lt: price.toString() }"
  public async getLimitOrders(price: BigNumber, pairAddress: string, tokenIn: string): Promise<ILimitOrder[]> {
    const currentTime = Math.floor(new Date().getTime() / 1000);
    const orders: ILimitOrder[] = await this.LimitOrderModel.find({ pairAddress, 'order.tokenIn': tokenIn, 'order.startTime': { $lt: currentTime }, 'order.endTime': { $gt: currentTime } }).exec();
    return orders;
  }

  public async getAllLimitOrders(): Promise<ILimitOrder[]> {
    return this.LimitOrderModel.find({});
  }

  public async deleteLimitOrders(orders: ILimitOrder[]): Promise<{ ok?: number, deletedCount?: number }> {
    return this.LimitOrderModel.deleteMany({ digest: { $in: orders.map(order => order.digest) } }).exec();
  }

  public async saveExecutedOrder(orders: IExecutedOrder[]): Promise<IExecutedOrder[]> {
    return await Promise.all(orders.map(order => {
      return (new this.ExecutedOrderModel(order)).save();
    }));
  }

}