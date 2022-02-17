const handler: ProxyHandler<any> = {
  get: (target, name) => {
    const value = Reflect.get(target, name);
    if (value === null || typeof value !== "object") return value;

    return proxyDeepFreeze(value);
  },

  set: () => false,
  defineProperty: () => false,
  deleteProperty: () => false,
  setPrototypeOf: () => false,
  isExtensible: () => false,
  preventExtensions: () => true,
};

// eslint-disable-next-line @typescript-eslint/ban-types
export const proxyDeepFreeze = <T extends object>(obj: T): T => {
  return new Proxy(obj, handler);
};
