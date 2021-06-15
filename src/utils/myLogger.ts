
export class MyLogger {

  static log(s: string) {
    console.log(`${new Date().toUTCString()}: ${s}`);
  }

}