
/* use this when the promise might throw an unexpected error */
export async function safeAwait<T>(promise: Promise<T>): Promise<[T, Error]> {
  try {
    const data = await promise;
    return [data, undefined];
  } catch (error) {
    return [undefined, error];
  }
}