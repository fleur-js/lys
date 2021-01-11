export type DeepPartial<T> = T extends () =>
  | any
  | boolean
  | number
  | string
  | null
  | undefined
  ? T
  : // : T extends Array<infer R> ? R // Disallow array partialize, it hard to use
    // : T extends Map<infer K, infer V> ? ReadonlyMap<K, V>
    // : T extends Set<infer V> ? ReadonlySet<V>
    { [K in keyof T]: DeepPartial<T[K]> };

// prettier-ignore
export type DeepReadonly<T> =
  T extends () => any | boolean | number | string | null | undefined ? T
  : T extends Array<infer R> ? ReadonlyArray<DeepReadonly<R>>
  : T extends Map<infer K, infer V> ? ReadonlyMap<K, V>
  : T extends Set<infer V> ? ReadonlySet<V>
  : { readonly [K in keyof T]: DeepReadonly<T[K]> }

type A = DeepReadonly<[1, 2, 3]>;
