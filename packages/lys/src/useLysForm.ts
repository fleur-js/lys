import React, { ChangeEvent, useMemo, useRef } from "react";
import { DefaultSliceActions, Slice, StateOfSlice } from "./slice";

export const useLysForm = <
  NS extends keyof StateOfSlice<S>,
  S extends Slice<{ [k in keyof StateOfSlice<S>]: any }, any>
>(
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
    actions.set((draft) => (draft[space] = options.initialState()));
  }

  isInitialRender.current = false;

  return useMemo(() => {
    return {
      bind(name: string) {
        const callback =
          formBindMap.get(name) ??
          (({
            currentTarget,
          }: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
            actions.set((draft) => {
              if (currentTarget instanceof HTMLInputElement) {
                switch (currentTarget.type) {
                  case "file": {
                    setValue(
                      draft[space],
                      name,
                      currentTarget.multiple
                        ? [...currentTarget.files]
                        : currentTarget.files[0]
                    );
                    break;
                  }
                  case "checkbox": {
                    setValue(draft[space], name, currentTarget.checked);
                    break;
                  }
                  case "radio": {
                    setValue(draft[space], name, currentTarget.value);
                    break;
                  }
                  case "date":
                  case "datetime-local": {
                    setValue(draft[space], name, currentTarget.valueAsDate);
                    break;
                  }
                  case "number":
                  case "range": {
                    setValue(
                      draft[space],
                      name,
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
                    setValue(draft[space], name, currentTarget.value);
                  }
                }
              } else if (currentTarget instanceof HTMLTextAreaElement) {
                setValue(draft[space], name, currentTarget.value);
              }
            });
          });

        formBindMap.set(name, callback);

        return {
          onChange: callback,
        };
      },
    };
  }, []);
};

const hasOwn = (obj: any, prop: string) =>
  Object.prototype.hasOwnProperty.call(obj, prop);

const setValue = (obj: any, path: string, value: any) => {
  const keys = path.split(".");
  const lastKey = keys.slice(-1)[0];
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

  target[lastKey] = value;
};
