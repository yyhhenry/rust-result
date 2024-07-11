import { test } from 'node:test';
import { deepStrictEqual } from 'node:assert';
import { anyhow, ok, type Result, safely, safelyAsync } from "./lib.js";

test("Empty ok", () => {
    // This should pass type check
    function emptyOk(): Result<void, Error> {
        return ok();
    }
    deepStrictEqual(emptyOk().isOk(), true);
    deepStrictEqual(emptyOk(), ok());
});

test("generate result and unwrap", () => {
    // This should pass type check
    function genResult(genError: boolean): Result<number, Error> {
        if (genError) {
            return anyhow("calc(): error occurred");
        }
        return ok(42);
    }
    // This should pass type check
    genResult(true);
    genResult(false);

    const okResult: Result<number, Error> = ok(42);
    deepStrictEqual(okResult.isOk(), true);
    deepStrictEqual(okResult.isErr(), false);

    // This should pass type check
    if (okResult.isOk()) {
        deepStrictEqual(okResult.unwrap(), 42);
    }
    // This should pass type check
    if (!okResult.isErr()) {
        deepStrictEqual(okResult.unwrap(), 42);
    }
    deepStrictEqual(okResult.unwrapOr(0), 42);
    deepStrictEqual(
        okResult.unwrapOrElse(() => 0),
        42,
    );

    // Inferred
    const okResult2 = ok("Hello World");
    deepStrictEqual(okResult2.unwrap(), "Hello World");

    const errResult: Result<number, Error> = anyhow("an error occurred");
    deepStrictEqual(errResult.isOk(), false);
    deepStrictEqual(errResult.isErr(), true);

    // This should pass type check
    if (errResult.isErr()) {
        deepStrictEqual(errResult.unwrapErr().message, "an error occurred");
    }
    // This should pass type check
    if (!errResult.isOk()) {
        deepStrictEqual(errResult.unwrapErr().message, "an error occurred");
    }
    deepStrictEqual(errResult.unwrapOr(0), 0);

    const errResult2: Result<number, Error> = anyhow("42");
    deepStrictEqual(
        errResult2.unwrapOrElse((e) => +e.message),
        42,
    );
});

test("match", () => {
    const okResult: Result<number, Error> = ok(10);
    const okValue = okResult.match(
        (v) => v * 2,
        () => {
            throw new Error("unexpected");
        },
    );
    deepStrictEqual(okValue, 20);

    const errResult: Result<number, Error> = anyhow("an error occurred");
    const errValue = errResult.match(
        () => {
            throw new Error("unexpected");
        },
        (e) => e.message,
    );
    deepStrictEqual(errValue, "an error occurred");
});

test("map and mapErr", () => {
    const okResult: Result<number, Error> = ok(10);
    const mappedOkResult = okResult.map((v) => v * 2);
    deepStrictEqual(mappedOkResult.isOk() && mappedOkResult.unwrap(), 20);

    const errResult: Result<number, Error> = anyhow("an error occurred");
    const mappedErrResult = errResult.map((v) => v * 2);
    deepStrictEqual(
        mappedErrResult.isErr() && mappedErrResult.unwrapErr().message,
        "an error occurred",
    );

    const okResult2: Result<number, Error> = ok(10);
    const mappedOkResult2 = okResult2.mapErr((e) => new Error(e.message + "!"));
    deepStrictEqual(mappedOkResult2.isOk() && mappedOkResult2.unwrap(), 10);

    const errResult2: Result<number, Error> = anyhow("an error occurred");
    const mappedErrResult2 = errResult2.mapErr(
        (e) => new Error(e.message + "!"),
    );
    deepStrictEqual(
        mappedErrResult2.isErr() && mappedErrResult2.unwrapErr().message,
        "an error occurred!",
    );
});

test("andThen", () => {
    const okResult: Result<number, Error> = ok(10);
    const andThenOkResult = okResult.andThen((v) => ok(v * 2));
    deepStrictEqual(andThenOkResult.isOk() && andThenOkResult.unwrap(), 20);

    const errResult: Result<number, Error> = anyhow("an error occurred");
    const andThenErrResult = errResult.andThen((v) => ok(v * 2));
    deepStrictEqual(
        andThenErrResult.isErr() && andThenErrResult.unwrapErr().message,
        "an error occurred",
    );

    const okResult2: Result<number, Error> = ok(10);
    const andThenOkResult2 = okResult2.andThen(() => anyhow("an error occurred"));
    deepStrictEqual(
        andThenOkResult2.isErr() && andThenOkResult2.unwrapErr().message,
        "an error occurred",
    );

    const errResult2: Result<number, Error> = anyhow("an error occurred");
    const andThenErrResult2 = errResult2.andThen(() => anyhow("42"));
    deepStrictEqual(
        andThenErrResult2.isErr() && andThenErrResult2.unwrapErr().message,
        "an error occurred",
    );
});

test("safely", async () => {
    const safeJsonParse = (json: string): Result<unknown, Error> =>
        safely(() => JSON.parse(json));
    const result = safeJsonParse('{"a": 1}');
    deepStrictEqual(result.unwrapOr(null), { a: 1 });

    const invalidJson = "invalid json";
    let errStr = "";
    try {
        JSON.parse(invalidJson);
    } catch (e) {
        if (e instanceof Error) {
            errStr = e.message;
        }
    }
    const result2 = safeJsonParse(invalidJson);
    deepStrictEqual(result2.isErr(), true);
    deepStrictEqual(result2.isErr() && result2.unwrapErr().message, errStr);

    const asyncJsonParse = (s: string): Promise<unknown> =>
        Promise.resolve(JSON.parse(s));

    const safeAsyncJsonParse = (s: string): Promise<Result<unknown, Error>> =>
        safelyAsync(() => asyncJsonParse(s));

    const result3 = await safeAsyncJsonParse('{"a": 1}');
    deepStrictEqual(result3.isOk() && result3.unwrap(), { a: 1 });

    const result4 = await safeAsyncJsonParse(invalidJson);
    deepStrictEqual(result4.isErr() && result4.unwrapErr().message, errStr);
});
