import { createDraft, Draft, finishDraft } from "immer";
import { ObjectPatcher, patchObject } from "./patchObject";

export type SliceDefinition<State> = {
  actions: {
    [K: string]: SliceAction<State>;
  };
  computed?: {
    [K: string]: SliceComputable<State>;
  };
};

export type SliceComputable<State> = {
  (state: DeepReadonly<State>): any;
};

export type SliceActionContext<State> = {
  state: DeepReadonly<State>;
  /** Update state and emit changes temporary. */
  commit: (patcher: ObjectPatcher<Draft<State>>) => void;
  /** Get latest state */
  getState: () => State;
  unwrapReadonly: <T extends DeepReadonly<any>>(x: T) => UnwrapDeepReadonly<T>;
};

export type SliceAction<State> = {
  (context: SliceActionContext<State>, ...args: any[]): void | Promise<void>;
};

export type Slice<State, SDef extends SliceDefinition<any>> = {
  initialStateFactory: () => State;
  actions: SDef["actions"];
  computables: SDef["computed"] extends undefined | void
    ? {} // eslint-disable-line @typescript-eslint/ban-types
    : SDef["computed"];
};

export type StateOfSlice<T extends Slice<any, any>> = T extends Slice<
  infer State,
  any
>
  ? State
  : never;

export type SliceInstance<S extends Slice<any, any>> = {
  state: { readonly current: StateOfSlice<S> & SliceToComputeds<S> };
  actions: SliceToActions<S>;
  dispose: () => void;
};

type ExtraArgs<T> = T extends (_: any, ...args: infer R) => any ? R : never;

// prettier-ignore
export type SliceToActions<S extends Slice<any, any>> = {
  [K in keyof S["actions"]]:
    ReturnType<S["actions"][K]> extends void | undefined ? (...args: ExtraArgs<S['actions'][K]>) => void
    : ReturnType<S["actions"][K]> extends Promise<any> ? (...args: ExtraArgs<S['actions'][K]>) => Promise<void>
    : never;
} & {
  /** @param applier Shallow merging object or modifier function */
  set(applier: ObjectPatcher<Draft<StateOfSlice<S>>>): void;
  /** @param k Field name to reset to initial state, no specified to reset all fields */
  reset(k?: keyof StateOfSlice<S>): void;
};

export type SliceToComputeds<S extends Slice<any, any>> = {
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

export const createSlice = <S, VDef extends SliceDefinition<S>>(
  sliceDef: VDef,
  initialStateFactory: () => S
): Slice<S, VDef> => {
  const { computed = {} as any, actions } = sliceDef;
  return { initialStateFactory, actions, computables: computed };
};

export const instantiateSlice = <S extends Slice<any, any>>(
  slice: S,
  initialState?: ObjectPatcher<Draft<StateOfSlice<S>>> | null,
  changed?: (state: StateOfSlice<S>) => void
): SliceInstance<S> => {
  const baseInitial = slice.initialStateFactory();
  const initial = initialState
    ? patchObject(baseInitial, initialState)
    : baseInitial;

  const state = {
    current: initial,
  };

  const computedResultCache = new Map();
  let latestReferencedState: any = null;
  const computableProperties: Record<
    string,
    PropertyDescriptor
  > = Object.create(null);

  const updateState = (nextState: StateOfSlice<S>) => {
    state.current = Object.defineProperties(
      { ...nextState }, // Strip computed properties
      computableProperties
    );
    changed?.(nextState);
  };

  const getState = (): DeepReadonly<StateOfSlice<S>> => {
    return state.current;
  };

  const commit = (patcher: ObjectPatcher<Draft<StateOfSlice<any>>>) => {
    const draft = createDraft(state.current);
    patchObject(draft, patcher);
    const nextState = finishDraft(draft);

    updateState(nextState);
  };

  const execAction = async (action: SliceAction<any>, ...args: any[]) => {
    const proxyBase = getState();
    await action(
      { state: proxyBase, commit, getState, unwrapReadonly },
      ...args
    );
  };

  const proxyActions: any = {};
  Object.keys(slice.actions).forEach((key) => {
    proxyActions[key] = (...args: any) => {
      return execAction(slice.actions[key], ...args);
    };
  });

  (proxyActions as SliceToActions<S>).set = (patcher) => {
    execAction((x) => x.commit((draft) => patchObject(draft, patcher)));
  };
  (proxyActions as SliceToActions<S>).reset = (k?) => {
    execAction((x) => {
      const initial = slice.initialStateFactory();
      x.commit((draft) =>
        Object.assign(draft, k != null ? { [k]: initial[k] } : initial)
      );
    });
  };

  Object.keys(slice.computables ?? {}).forEach((key) => {
    computableProperties[key] = {
      enumerable: true,
      configurable: false,
      get: () => {
        // Check state object change by immer
        if (state.current === latestReferencedState) {
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
