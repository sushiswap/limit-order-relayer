import Mongoose from "mongoose";
import { watchPairModel } from "./models/mongooseModels";
import { IWatchPair, IWatchPairModel } from "./models/models";
import { getLimitOrderPairs } from "./config/watchPairs";

let database: Mongoose.Connection;

const WatchPairModel = Mongoose.model<IWatchPairModel>("watchPairModel", watchPairModel);

export const connectDB = async (): Promise<void> => {

  return new Promise((resolve, reject) => {

    const uri = process.env.MONGODB_URL;

    if (database) return reject();

    Mongoose.connect(uri, {
      useNewUrlParser: true,
      useFindAndModify: true,
      useUnifiedTopology: true,
      useCreateIndex: true,
    });

    database = Mongoose.connection;

    database.once("open", () => {
      console.log("Connected to database");
      resolve();
    });

    database.on("error", () => {
      console.log("Error connecting to database");
      reject();
    });

  });
};

export const disconnect = () => {
  if (!database) {
    return;
  }
  Mongoose.disconnect();
};

export async function setWatchPairs(): Promise<IWatchPair[] | void> {
  await dropPairs();
  return saveWatchPairs(await getLimitOrderPairs());
}

async function dropPairs() {
  await WatchPairModel.deleteMany({});
}

async function saveWatchPairs(watchPairs: IWatchPair[]): Promise<IWatchPair[] | void> {

  return Promise.all(watchPairs.map(async pair => {

    const model = new WatchPairModel(pair);

    model.token0 = pair.token0;
    model.token1 = pair.token1;

    return model.save();

  }));
}