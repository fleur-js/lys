export type ObjectPatcher<T> = ((object: T) => void) | Partial<T>;

export const patchObject = <T>(obj: T, patcher: ObjectPatcher<T>): T => {
  if (typeof patcher === "function") {
    patcher(obj);
  } else {
    Object.assign({}, obj, patcher);
  }

  return obj;
};
