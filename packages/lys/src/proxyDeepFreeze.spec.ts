import { proxyDeepFreeze } from "./proxyDeepFreeze";

describe("proxyDeepFreeze", () => {
  it("get shallow primitive values", () => {
    const obj = proxyDeepFreeze({ a: 1, b: null });
    expect(obj).toMatchObject({ a: 1, b: null });
  });

  it("get deep primitive values", () => {
    const obj = proxyDeepFreeze({ a: { b: 1 }, c: { d: { e: 2 } } });
    expect(obj).toMatchObject({ a: { b: 1 }, c: { d: { e: 2 } } });
  });

  it("get deep primitive values", () => {
    const obj = proxyDeepFreeze({ a: { b: 1 }, c: { d: { e: () => 1 } } });
    expect(obj).toMatchObject({ a: { b: 1 } });
    expect(obj.c.d.e).toBeInstanceOf(Function);
    expect(obj.c.d.e()).toBe(1);
  });
});
