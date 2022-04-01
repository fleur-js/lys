import React, { ChangeEvent, useMemo, useRef } from "react";
import { DefaultSliceActions, Slice, StateOfSlice } from "./slice";

export const useLysForm = <
  NS extends keyof StateOfSlice<S>,
  S extends Slice<{ [k in keyof StateOfSlice<S>]: any }, any>
>(
  state: StateOfSlice<S>,
  actions: DefaultSliceActions<S>,
  space: NS,
  options: {
    initialState?: () => StateOfSlice<S>[NS];
  } = {}
) => {
  const formBindMap = useMemo(
    () => new Map<string, (e: React.ChangeEvent<HTMLElement>) => void>(),
    []
  );

  const isInitialRender = useRef(true);

  if (isInitialRender.current && options.initialState) {
    actions.set(
      (draft: any) => (draft[space] = options.initialState!() as any)
    );
  }

  isInitialRender.current = false;

  return useMemo(() => {
    return {
      bind(path: string) {
        const callback =
          formBindMap.get(path) ??
          (({
            currentTarget,
          }: ChangeEvent<
            HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
          >) => {
            actions.set((draft: any) => {
              if (currentTarget instanceof HTMLInputElement) {
                switch (currentTarget.type) {
                  case "file": {
                    const files = currentTarget.files;
                    if (!files) {
                      setValue(draft[space], path, null);
                      return;
                    }

                    setValue(
                      draft[space],
                      path,
                      currentTarget.multiple ? Array.from(files) : files[0]
                    );

                    break;
                  }
                  case "checkbox": {
                    setValue(draft[space], path, currentTarget.checked);
                    break;
                  }
                  case "radio": {
                    setValue(draft[space], path, currentTarget.value);
                    break;
                  }
                  case "date":
                  case "datetime-local": {
                    setValue(draft[space], path, currentTarget.valueAsDate);
                    break;
                  }
                  case "number":
                  case "range": {
                    setValue(
                      draft[space],
                      path,
                      currentTarget.valueAsNumber ??
                        parseFloat(currentTarget.value)
                    );
                    break;
                  }
                  case "submit":
                  case "image":
                  case "reset": {
                    break;
                  }
                  default: {
                    setValue(draft[space], path, currentTarget.value);
                  }
                }

                return;
              } else if (currentTarget instanceof HTMLTextAreaElement) {
                setValue(draft[space], path, currentTarget.value);

                return;
              } else if (currentTarget instanceof HTMLSelectElement) {
                if (currentTarget.multiple) {
                  setValue(
                    draft[space],
                    path,
                    Array.from(currentTarget.selectedOptions).map(
                      (option) => option.value
                    )
                  );
                } else {
                  setValue(draft[space], path, currentTarget.value);
                }
                return;
              }

              throw new Error(
                `Unhandlable element type ${
                  (currentTarget as HTMLElement).nodeType
                }`
              );
            });
          });

        formBindMap.set(path, callback);

        return Object.defineProperties(
          {
            onChange: callback,
          },
          {
            value: {
              get() {
                return getValue(state, path);
              },
            },
          }
        );
      },
    };
  }, []);
};

const hasOwn = (obj: any, prop: string) =>
  Object.prototype.hasOwnProperty.call(obj, prop);

const digDeepest = (obj: any, path: string) => {
  const keys = path.split(".");
  let target: any = obj;

  for (let idx = 0, l = keys.length; idx < l; idx++) {
    if (idx === l - 1) break;

    const key = keys[idx];
    if (!hasOwn(target, key)) {
      throw new Error(
        `Target has not own property ${keys.slice(0, idx).join(".")}`
      );
    }

    target = target[key];
  }

  return target;
};

const setValue = (obj: any, path: string, value: any) => {
  const keys = path.split(".");
  const lastKey = keys.slice(-1)[0];
  const target = digDeepest(obj, path);

  target[lastKey] = value;
};

const getValue = (obj: any, path: string) => {
  const keys = path.split(".");
  const lastKey = keys.slice(-1)[0];
  const target = digDeepest(obj, path);

  return target[lastKey];
};
