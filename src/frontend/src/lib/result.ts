/**
 * Functional Result<T, E> type with async chaining support.
 * Drop this file into any TypeScript/React project and use as a utility library.
 */

// ========== Result Type ==========

export type Result<T, E> =
  | { ok: true; value: T }
  | { ok: false; error: E };

export function ok<T>(value: T): Result<T, never> {
  return { ok: true, value };
}

export function err<E>(error: E): Result<never, E> {
  return { ok: false, error };
}

export function isOk<T, E>(res: Result<T, E>): res is { ok: true; value: T } {
  return res.ok;
}

export function isErr<T, E>(res: Result<T, E>): res is { ok: false; error: E } {
  return !res.ok;
}

export function map<T, U, E>(res: Result<T, E>, fn: (val: T) => U): Result<U, E> {
  return isOk(res) ? ok(fn(res.value)) : res;
}

export function mapErr<T, E, F>(res: Result<T, E>, fn: (err: E) => F): Result<T, F> {
  return isErr(res) ? err(fn(res.error)) : res;
}

export function andThen<T, U, E>(res: Result<T, E>, fn: (val: T) => Result<U, E>): Result<U, E> {
  return isOk(res) ? fn(res.value) : res;
}

export function match<T, E, U>(
  res: Result<T, E>,
  handlers: { ok: (val: T) => U; err: (err: E) => U }
): U {
  return isOk(res) ? handlers.ok(res.value) : handlers.err(res.error);
}

export function unwrap<T, E>(res: Result<T, E>): T {
  if (isOk(res)) return res.value;
  throw new Error(`Tried to unwrap an Err: ${JSON.stringify(res.error)}`);
}

export function unwrapOr<T, E>(res: Result<T, E>, fallback: T): T {
  return isOk(res) ? res.value : fallback;
}

// ========== AsyncResultWrapper Class ==========

/**
 * A wrapper for chaining async and sync Result-producing functions.
 */
export class AsyncResultWrapper<T, E> {
  private readonly promise: Promise<Result<T, E>>;

  constructor(promise: Promise<Result<T, E>>) {
    this.promise = promise;
  }

  /**
   * Create a wrapper from a Result or Promise<Result>.
   */
  static from<T, E>(res: Result<T, E> | Promise<Result<T, E>>): AsyncResultWrapper<T, E> {
    return new AsyncResultWrapper(Promise.resolve(res));
  }

  /**
   * Chain a Result-returning function (sync or async).
   */
  andThen<U>(
    fn: (value: T) => Result<U, E> | Promise<Result<U, E>>
  ): AsyncResultWrapper<U, E> {
    const newPromise = this.promise.then(async (res) => {
      if (isErr(res)) return res;
      return fn(res.value);
    });
    return new AsyncResultWrapper(newPromise);
  }

  /**
   * Map over a successful value.
   */
  map<U>(fn: (value: T) => U | Promise<U>): AsyncResultWrapper<U, E> {
    const newPromise = this.promise.then(async (res) => {
      if (isErr(res)) return res;
      return ok(await fn(res.value));
    });
    return new AsyncResultWrapper(newPromise);
  }

  /**
   * Perform a side effect on success.
   */
  tap(fn: (value: T) => void | Promise<void>): AsyncResultWrapper<T, E> {
    const newPromise = this.promise.then(async (res) => {
      if (isOk(res)) await fn(res.value);
      return res;
    });
    return new AsyncResultWrapper(newPromise);
  }

  /**
   * Perform a side effect on error.
   */
  catch(fn: (error: E) => void | Promise<void>): AsyncResultWrapper<T, E> {
    const newPromise = this.promise.then(async (res) => {
      if (isErr(res)) await fn(res.error);
      return res;
    });
    return new AsyncResultWrapper(newPromise);
  }

  /**
   * Log the result to the console.
   */
  log(label = "Result"): AsyncResultWrapper<T, E> {
    return this.tap((val) => {
      console.log(`${label} [ok]:`, val);
    }).catch((err) => {
      console.error(`${label} [err]:`, err);
    });
  }

  /**
   * Match on ok/err and return a value.
   */
  async match<U>(handlers: {
    ok: (val: T) => U | Promise<U>;
    err: (err: E) => U | Promise<U>;
  }): Promise<U> {
    const res = await this.promise;
    return isOk(res) ? handlers.ok(res.value) : handlers.err(res.error);
  }

  /**
   * Unwrap or throw if error.
   */
  async unwrap(): Promise<T> {
    const res = await this.promise;
    if (isOk(res)) return res.value;
    throw new Error(`Tried to unwrap an Err: ${JSON.stringify(res.error)}`);
  }

  /**
   * Unwrap or return a fallback.
   */
  async unwrapOr(fallback: T): Promise<T> {
    const res = await this.promise;
    return isOk(res) ? res.value : fallback;
  }

  /**
   * Return raw Result<T, E>
   */
  async toResult(): Promise<Result<T, E>> {
    return this.promise;
  }

  /**
   * Return raw Result<T[], E>
   */
  static all<T, E>(wrappers: AsyncResultWrapper<T, E>[]): AsyncResultWrapper<T[], E> {
    const combinedPromise = Promise.all(wrappers.map((w) => w.promise)).then((results) => {
      const firstErr = results.find(isErr);
      if (firstErr) {
        return err(firstErr.error);
      }
      const allValues = results.map((r) => (r as { ok: true; value: T }).value);
      return ok(allValues);
    });

    return new AsyncResultWrapper(combinedPromise);
  }

  /**
   * Return raw Result<void, E>
   */
  void(): AsyncResultWrapper<void, E> {
    const newPromise = this.promise.then(res => isOk(res) ? ok(undefined) : res);
    return new AsyncResultWrapper(newPromise);
  }

  /**
   * Run a callback after promise settles regardless of result (like Promise.finally)
   */
  finally(fn: () => void | Promise<void>): AsyncResultWrapper<T, E> {
    const newPromise = this.promise.finally(fn);
    return new AsyncResultWrapper(newPromise);
  }
}
