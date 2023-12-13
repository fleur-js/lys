import { useCallback, useContext, useMemo, useReducer, useRef } from "react";
import { Slice, StateOfSlice } from "./store";
import { LysReactContext } from "./LysContext";
import { useIsomorphicLayoutEffect } from "./utils";
import { ObjectPatcher } from "./patchObject";

const hasOwnKey = Object.prototype.hasOwnProperty;

// Object.is polyfill
const is = (x: any, y: any): boolean => {
  if (x === y) {
    return x !== 0 || y !== 0 || 1 / x === 1 / y;
  } else {
    return x !== x && y !== y;
  }
};

/** Shallow equality check */
const shallowEqual = (prev: any, next: any) => {
  if (is(prev, next)) return true;
  if (typeof prev !== typeof next) return false;

  if (Array.isArray(prev) && Array.isArray(next)) {
    if (prev.length !== next.length) return false;

    for (const idx in prev) {
      if (!is(prev[idx], next[idx])) return false;
    }
  }

  if (
    typeof prev === "object" &&
    typeof next === "object" &&
    prev !== null &&
    next !== null
  ) {
    for (const key in prev) {
      if (!hasOwnKey.call(next, key)) continue;
      if (!is(prev[key], next[key])) return false;
    }
  }

  return false;
};

const useLysContext = () => {
  const lysContext = useContext(LysReactContext);

  if (!lysContext) {
    throw new Error(
      "Lys: LysContext must be placed of top of useLysSliceRoot or useLysSlice",
    );
  }

  return lysContext;
};

const useLysSliceInternal = <S extends Slice<any, any>>(
  slice: S,
  initialState?: ObjectPatcher<Draft<StateOfSlice<S>>> | null,
  { isRoot = true }: { isRoot?: boolean } = {},
) => {
  const lysContext = useLysContext();
  const isFirstRendering = useRef(true);
  const initialStateLoaded = useRef(initialState != null);

  if (!isRoot && !lysContext.hasSliceInstance(slice)) {
    throw new Error(
      `Lys: Slice must be initialized in upper tree Component with \`useLysSliceRoot(slice)\``,
    );
  }

  if (
    isFirstRendering.current &&
    isRoot &&
    lysContext.hasSliceInstance(slice)
  ) {
    console.warn(
      "Lys: Slice is already initalized in upper tree. Ignore this if you are using StrictMode",
    );
  }

  const [, rerender] = useReducer((s) => s + 1, 0);
  const prevStateRef = useRef<StateOfSlice<S> | null>(null);

  const instance = useMemo(
    () =>
      lysContext.getSliceInstance(slice) ??
      lysContext.createSliceInstance(slice, initialState),
    [slice],
  );

  const checkAndRerender = useCallback(() => {
    if (shallowEqual(prevStateRef.current, instance.state.current)) return;
    prevStateRef.current = instance.state.current;
    rerender();
  }, []);

  useIsomorphicLayoutEffect(() => {
    lysContext.observeSliceUpdate(slice, checkAndRerender);
    return () => lysContext.unobserveSliceUpdate(slice, checkAndRerender);
  }, [slice]);

  // Unset slice instance when root is unmounted
  useIsomorphicLayoutEffect(() => {
    if (!isRoot) return;
    return () => {
      lysContext.unsetSliceInstance(slice);
    };
  }, []);

  useIsomorphicLayoutEffect(() => {
    if (initialStateLoaded.current || initialState == null) {
      return;
    }

    instance.actions.set(initialState);
    initialStateLoaded.current = true;
  }, [initialState]);

  isFirstRendering.current = false;
  return [instance.state.current, instance.actions] as const;
};

export const useLysStoreWithInitialState = <S extends Slice<any, any>>(
  slice: S,
  initialState?: ObjectPatcher<StateOfSlice<S>> | null,
) => {
  return useLysSliceInternal(slice, initialState, { isRoot: true });
};

export const useLysStore = <S extends Slice<any, any>>(slice: S) => {
  return useLysSliceInternal(slice, null, { isRoot: false });
};
