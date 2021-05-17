import { createDraft, Draft, finishDraft } from "immer";
import { ObjectPatcher, patchObject } from "./patchObject";
import { DeepReadonly } from "./typeutils";

export type SliceDefinition<State, ComputedState> = {
  actions: {
    [K: string]: SliceAction<State>;
  };
  computed?: {
    [K: string]: SliceComputable<State & ComputedState>;
  };
};

export type SliceComputable<State> = {
  (state: DeepReadonly<State>): any;
};

export type SliceActionContext<State> = {
  draft: Draft<State>;
  /**
   * Update state and emit changes temporary.
   */
  updateTemporary: (patcher: ObjectPatcher<Draft<State>>) => void;
};

export type SliceAction<State> = {
  (context: SliceActionContext<State>, ...args: any[]): void | Promise<void>;
};

export type Slice<State, SDef extends SliceDefinition<any, any>> = {
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

export const createSlice = <S, Def extends SliceDefinition<S, any>>(
  sliceDef: Def,
  initialStateFactory: () => S
): Slice<S, Def> => {
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

  const execAction = async (action: SliceAction<any>, ...args: any[]) => {
    const base = state.current;
    const draft = createDraft(base);

    const updateTemporary = (
      patcher: ObjectPatcher<Draft<StateOfSlice<any>>>
    ) => {
      const tmpDraft = createDraft(base);
      patchObject(tmpDraft, patcher);

      // Won't do this. When use destructive assignment by draft
      // destructed property is not update and desync from base draft, it makes confusing
      // // patchObject(draft, patcher);

      const nextState = finishDraft(tmpDraft);
      updateState(nextState);
    };

    const result = action({ draft, updateTemporary }, ...args);

    if (result instanceof Promise) {
      await result;
    }

    const nextState = finishDraft(draft);
    updateState(nextState);
  };

  const proxyActions: any = {};
  Object.keys(slice.actions).forEach((key) => {
    proxyActions[key] = (...args: any) => {
      return execAction(slice.actions[key], ...args);
    };
  });

  (proxyActions as SliceToActions<S>).set = (patcher) => {
    execAction(({ draft }) => patchObject(draft, patcher));
  };
  (proxyActions as SliceToActions<S>).reset = (k?) => {
    execAction(({ draft }) => {
      const initial = slice.initialStateFactory();
      Object.assign(draft, k != null ? { [k]: initial[k] } : initial);
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
