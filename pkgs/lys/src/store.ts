import { ObjectPatcher, patchObject } from "./patchObject";

export type SliceDefinition<
  State,
  A extends Record<string, SliceAction<State>>,
  C extends Record<string, SliceComputable<State>>,
> = {
  state: () => State;
  actions: A;
  computed?: C;
};

export type SliceComputable<State> = {
  (state: DeepReadonly<State>): any;
};

export type SliceActionContext<State> = {
  /** Update state and emit changes temporary. */
  set: (patcher: ObjectPatcher<State>) => void;
  /** Get latest state */
  get: () => State;
  unwrapReadonly: <T extends DeepReadonly<any>>(x: T) => UnwrapDeepReadonly<T>;
};

export type SliceAction<State> = {
  (context: SliceActionContext<State>, ...args: any[]): void | Promise<void>;
};

export type Slice<
  S,
  A extends Record<string, SliceAction<S>>,
  C extends Record<string, SliceComputable<S>>,
> = {
  initialState: () => S;
  actions: A;
  computables: C;
};

export type StateOfSlice<T extends Slice<any, any, any>> = T extends Slice<
  infer State,
  any,
  any
>
  ? State
  : never;

export type SliceInstance<S extends Slice<any, any, any>> = {
  state: { readonly current: StateOfSlice<S> & SliceToComputeds<S> };
  actions: SliceToActions<S>;
  dispose: () => void;
};

type ExtraArgs<T> = T extends (_: any, ...args: infer R) => any ? R : never;

// prettier-ignore
export type SliceToActions<S extends Slice<any, any, any>> = {
  [K in keyof S["actions"]]:
    ReturnType<S["actions"][K]> extends void | undefined ? (...args: ExtraArgs<S['actions'][K]>) => void
    : ReturnType<S["actions"][K]> extends Promise<any> ? (...args: ExtraArgs<S['actions'][K]>) => Promise<void>
    : never;
} & {
  /** @param applier Shallow merging object or modifier function */
  set(applier: ObjectPatcher<StateOfSlice<S>>): void;
  /** @param k Field name to reset to initial state, no specified to reset all fields */
  reset(k?: keyof StateOfSlice<S>): void;
};

export type SliceToComputeds<S extends Slice<any, any, any>> = {
  [K in keyof S["computables"]]: ReturnType<S["computables"][K]>;
};

declare const FreezeMark: unique symbol;
type FreezedStateMark = { [FreezeMark]: never };

// prettier-ignore
type DeepReadonly<T>  =
T extends string | number | boolean | symbol | undefined | null | bigint ? T
  : T extends (...args: any[]) => unknown ? T
  : T extends ReadonlyArray<infer V> ? ReadonlyArray<V> & FreezedStateMark
  : T extends ReadonlyMap<infer K, infer V> ? ReadonlyMap<K, V>  & FreezedStateMark
  : T extends ReadonlySet<infer V> ? ReadonlySet<V>  & FreezedStateMark
  // eslint-disable-next-line @typescript-eslint/ban-types
  : T extends object ? { readonly [K in keyof T]: DeepReadonly<T[K]> } & FreezedStateMark
  : never

// prettier-ignore
type UnwrapDeepReadonly<T> =
  T extends FreezedStateMark ? UnwrapDeepReadonly<Omit<T, keyof FreezedStateMark>>
  : T extends string | number | boolean | symbol | undefined | null | bigint ? T
  : T extends (...args: any[]) => unknown ? T
  : T extends ReadonlyArray<infer V> ? Array<V>
  : T extends ReadonlyMap<infer K, infer V> ? Map<K, V>
  : T extends ReadonlySet<infer V> ? Set<V>
  // eslint-disable-next-line @typescript-eslint/ban-types
  : T extends object ? { -readonly [K in keyof T]: UnwrapDeepReadonly<T[K]> }
  // : T extends symbol ? (T extends FreezedStateMark ? never : T)
  : never

const unwrapReadonly: SliceActionContext<any>["unwrapReadonly"] = (v) =>
  v as any;

export const createStore = <
  S,
  A extends Record<string, SliceAction<S>>,
  C extends Record<string, SliceComputable<S>>,
>(
  sliceDef: SliceDefinition<S, A, C>,
): Slice<S, A, C> => {
  const { computed = {} as any, actions } = sliceDef;
  return {
    initialState: sliceDef.state,
    actions,
    computables: computed,
  };
};

export const instantiateStore = <S extends Slice<any, any, any>>(
  slice: S,
  initialState?: ObjectPatcher<StateOfSlice<S>> | null,
  changed?: (state: StateOfSlice<S>) => void,
): SliceInstance<S> => {
  const baseInitial = slice.initialState();
  const initial = initialState
    ? patchObject(baseInitial, initialState)
    : baseInitial;

  const state = {
    current: initial,
  };

  const computedResultCache = new Map();
  let latestReferencedState: any = null;
  const computableProperties: Record<string, PropertyDescriptor> =
    Object.create(null);

  const updateState = (nextState: StateOfSlice<S>) => {
    state.current = Object.defineProperties(
      { ...nextState }, // Strip computed properties
      computableProperties,
    );
    changed?.(nextState);
  };

  const get = (): DeepReadonly<StateOfSlice<S>> => {
    return state.current;
  };

  const set = (patcher: ObjectPatcher<StateOfSlice<any>>) => {
    const nextState =
      typeof patcher === "function"
        ? Object.assign({}, state.current, patcher(state.current))
        : Object.assign({}, state.current, patcher);

    updateState(nextState);
  };

  const execAction = async (action: SliceAction<any>, ...args: any[]) => {
    await action({ set, get, unwrapReadonly }, ...args);
  };

  const proxyActions: any = {};
  Object.keys(slice.actions).forEach((key) => {
    proxyActions[key] = (...args: any) => {
      return execAction(slice.actions[key], ...args);
    };
  });

  (proxyActions as SliceToActions<S>).set = (patcher) => {
    execAction((x) => x.set((draft) => patchObject(draft, patcher)));
  };
  (proxyActions as SliceToActions<S>).reset = (k?) => {
    execAction((x) => {
      const initial = slice.initialState();
      x.set((draft) =>
        Object.assign(draft, k != null ? { [k]: initial[k] } : initial),
      );
    });
  };

  Object.keys(slice.computables ?? {}).forEach((key) => {
    computableProperties[key] = {
      enumerable: true,
      configurable: false,
      get: () => {
        if (Object.is(state.current, latestReferencedState)) {
          return computedResultCache.get(slice.computables[key]);
        }

        const result = slice.computables[key](state.current);
        computedResultCache.set(slice.computables[key], result);
        return result;
      },
    };
  });

  const dispose = () => {
    computedResultCache.clear();
    latestReferencedState = null;
  };

  state.current = Object.defineProperties(state.current, computableProperties);

  return {
    state,
    actions: proxyActions,
    dispose,
  };
};
