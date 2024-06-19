import assert from "assert";
import { Result, anyhow, ok, safely, safelyAsync } from "./lib";
import { test } from "node:test";

// This should pass type check
function genResult(genError: boolean): Result<number, Error> {
    if (genError) {
        return anyhow("calc(): error occurred");
    }
    return ok(42);
}

test("generate result and unwrap", () => {
    // This should pass type check
    genResult(true);
    genResult(false);

    const okResult: Result<number, Error> = ok(42);
    assert.strictEqual(okResult.isOk(), true);
    assert.strictEqual(okResult.isErr(), false);

    // This should pass type check
    if (okResult.isOk()) {
        assert.strictEqual(okResult.unwrap(), 42);
    }
    // This should pass type check
    if (!okResult.isErr()) {
        assert.strictEqual(okResult.unwrap(), 42);
    }
    assert.strictEqual(okResult.unwrapOr(0), 42);
    assert.strictEqual(
        okResult.unwrapOrElse(() => 0),
        42,
    );

    // Inferred
    const okResult2 = ok("Hello World");
    assert.strictEqual(okResult2.unwrap(), "Hello World");

    const errResult: Result<number, Error> = anyhow("an error occurred");
    assert.strictEqual(errResult.isOk(), false);
    assert.strictEqual(errResult.isErr(), true);

    // This should pass type check
    if (errResult.isErr()) {
        assert.strictEqual(errResult.unwrapErr().message, "an error occurred");
    }
    // This should pass type check
    if (!errResult.isOk()) {
        assert.strictEqual(errResult.unwrapErr().message, "an error occurred");
    }
    assert.strictEqual(errResult.unwrapOr(0), 0);

    const errResult2: Result<number, Error> = anyhow("42");
    assert.strictEqual(
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
    assert.strictEqual(okValue, 20);

    const errResult: Result<number, Error> = anyhow("an error occurred");
    const errValue = errResult.match(
        () => {
            throw new Error("unexpected");
        },
        (e) => e.message,
    );
    assert.strictEqual(errValue, "an error occurred");
});

test("map and mapErr", () => {
    const okResult: Result<number, Error> = ok(10);
    const mappedOkResult = okResult.map((v) => v * 2);
    assert.strictEqual(mappedOkResult.isOk() && mappedOkResult.unwrap(), 20);

    const errResult: Result<number, Error> = anyhow("an error occurred");
    const mappedErrResult = errResult.map((v) => v * 2);
    assert.strictEqual(
        mappedErrResult.isErr() && mappedErrResult.unwrapErr().message,
        "an error occurred",
    );

    const okResult2: Result<number, Error> = ok(10);
    const mappedOkResult2 = okResult2.mapErr((e) => new Error(e.message + "!"));
    assert.strictEqual(mappedOkResult2.isOk() && mappedOkResult2.unwrap(), 10);

    const errResult2: Result<number, Error> = anyhow("an error occurred");
    const mappedErrResult2 = errResult2.mapErr(
        (e) => new Error(e.message + "!"),
    );
    assert.strictEqual(
        mappedErrResult2.isErr() && mappedErrResult2.unwrapErr().message,
        "an error occurred!",
    );
});

test("andThen", () => {
    const okResult: Result<number, Error> = ok(10);
    const andThenOkResult = okResult.andThen((v) => ok(v * 2));
    assert.strictEqual(andThenOkResult.isOk() && andThenOkResult.unwrap(), 20);

    const errResult: Result<number, Error> = anyhow("an error occurred");
    const andThenErrResult = errResult.andThen((v) => ok(v * 2));
    assert.strictEqual(
        andThenErrResult.isErr() && andThenErrResult.unwrapErr().message,
        "an error occurred",
    );

    const okResult2: Result<number, Error> = ok(10);
    const andThenOkResult2 = okResult2.andThen(() =>
        anyhow("an error occurred"),
    );
    assert.strictEqual(
        andThenOkResult2.isErr() && andThenOkResult2.unwrapErr().message,
        "an error occurred",
    );

    const errResult2: Result<number, Error> = anyhow("an error occurred");
    const andThenErrResult2 = errResult2.andThen(() => anyhow("42"));
    assert.strictEqual(
        andThenErrResult2.isErr() && andThenErrResult2.unwrapErr().message,
        "an error occurred",
    );
});

test("safely", async () => {
    const safeJsonParse = (json: string): Result<unknown, Error> =>
        safely(() => JSON.parse(json));
    const result = safeJsonParse('{"a": 1}');
    assert.deepStrictEqual(result.unwrapOr(null), { a: 1 });

    const invalidJson = "invalid json";
    const result2 = safeJsonParse(invalidJson);
    assert.strictEqual(result2.isErr(), true);
    assert.strictEqual(
        result2.isErr() && result2.unwrapErr().message,
        `Unexpected token 'i', "invalid json" is not valid JSON`,
    );

    const asyncJsonParse = (s: string): Promise<unknown> =>
        Promise.resolve(JSON.parse(s));

    const safeAsyncJsonParse = (s: string): Promise<Result<unknown, Error>> =>
        safelyAsync(() => asyncJsonParse(s));

    const result3 = await safeAsyncJsonParse('{"a": 1}');
    assert.deepStrictEqual(result3.isOk() && result3.unwrap(), { a: 1 });

    const result4 = await safeAsyncJsonParse(invalidJson);
    assert.strictEqual(
        result4.isErr() && result4.unwrapErr().message,
        `Unexpected token 'i', "invalid json" is not valid JSON`,
    );
});
