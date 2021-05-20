import Mongoose, { UpdateWriteOpResult } from "mongoose";
import { limitOrderModel, watchPairModel } from "../models/mongooseModels";
import { ILimitOrder, ILimitOrderModel, IWatchPair, IWatchPairModel } from "../models/models";
import { getLimitOrderPairs } from "../utils/watchPairs";
import { BigNumber } from "@ethersproject/bignumber";

export class Database {

  private static _instance: Database;

  private database: Mongoose.Connection;

  private WatchPairModel = Mongoose.model<IWatchPairModel>("watchPairModel", watchPairModel);
  private LimitOrderModel = Mongoose.model<ILimitOrderModel>("limitOrderModel", limitOrderModel);

  public static get Instance() {
    return this._instance || (this._instance = new this());
  }

  protected constructor() { };

  public async connectDB(): Promise<void> {

    return new Promise((resolve, reject) => {

      const uri = process.env.MONGODB_URL;

      if (this.database) return reject();

      Mongoose.connect(uri, {
        useNewUrlParser: true,
        useFindAndModify: true,
        useUnifiedTopology: true,
        useCreateIndex: true,
      });

      this.database = Mongoose.connection;

      this.database.once("open", () => { console.log("Connected to database"); resolve(); });

      this.database.on("error", () => { console.log("Error connecting to database"); reject(); });

    });
  };

  public disconnectDB() {
    if (this.database) Mongoose.disconnect();
  };

  public async setWatchPairs(): Promise<IWatchPair[] | void> {
    await this.dropPairs();
    return this.saveWatchPairs(await getLimitOrderPairs());
  }

  protected async dropPairs() {
    await this.WatchPairModel.deleteMany({});
  }

  public saveWatchPairs(watchPairs: IWatchPair[]): Promise<IWatchPair[] | void> {

    return Promise.all(watchPairs.map(async pair => {

      const model = new this.WatchPairModel(pair);

      model.token0 = pair.token0;
      model.token1 = pair.token1;

      return model.save();

    }));
  }

  public async saveLimitOrder(limitOrder: ILimitOrder): Promise<ILimitOrder | void> {

    const model = new this.LimitOrderModel(limitOrder);

    return model.save().then(() => console.log('Limit order saved')).catch(err => {
      if (err.code === 11000) {
        console.log('Ignored saving an existing order');
      } else {
        console.log(err);
      }
    });
  }

  public async getLimitOrders(price: BigNumber, pairAddress: string, tokenIn: string): Promise<ILimitOrder[]> {
    return this.LimitOrderModel.find({ pairAddress, 'order.tokenIn': tokenIn, price: { $gt: price.toString() } }).exec();
  }

  public async updateLimitOrders(orders: ILimitOrder[]): Promise<UpdateWriteOpResult[]> {
    return Promise.all(orders.map(order => this.LimitOrderModel.updateOne({ digest: order.digest }, order).exec())); // TODO test this
  }

  public async deleteLimitOrders(orders: ILimitOrder[]): Promise<{ ok?: number }[]> {
    return Promise.all(orders.map(order => this.LimitOrderModel.deleteOne({ digest: order.digest }).exec())); // TODO test
  }

}