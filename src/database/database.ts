import Mongoose from "mongoose";
import { limitOrderModel, watchPairModel } from "../models/mongooseModels";
import { ILimitOrder, ILimitOrderModel, IWatchPair, IWatchPairModel, Side } from "../models/models";
import { getLimitOrderPairs } from "../utils/watchPairs";

export class Database {

  private static _instance: Database;

  private database: Mongoose.Connection;

  private WatchPairModel = Mongoose.model<IWatchPairModel>("watchPairModel", watchPairModel);
  private LimitOrderModel = Mongoose.model<ILimitOrderModel>("limitOrderModel", limitOrderModel);

  public static get Instance() {
    return this._instance || (this._instance = new this());
  }

  private constructor() { };

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

  private async dropPairs() {
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

  public async getLimitOrders(side: Side, price: string, pairAddress: string): Promise<ILimitOrder[]> {
    if (side === Side.Buy) {
      return this.LimitOrderModel.find({ pairAddress, price: { $gt: price } }).exec();
    } else {
      return this.LimitOrderModel.find({ pairAddress, price: { $lt: price } }).exec();
    }
  }

  public async updateLimitOrders(orders: ILimitOrder[]): Promise<ILimitOrder[]> {
    return orders; // TODO
  }

  public async deleteLimitOrders(orders: ILimitOrder[]): Promise<ILimitOrder[]> {
    return orders; // TODO
  }

}