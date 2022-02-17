## 3.0.0

Breaking API Changes for simplify state update method.

- Rename `draft` to `state` and it now readonly.
  - Any assigns to `state` now be ignored, use `commit()` instead.
- Rename `updateTemporary` to `commit`.

```ts
// After 3.0.0
createSlice({
  actions: {
    someAction: async ({ draft, updateTemporary }) => {
      updateTemporary({ fetching: true });

      draft.data = await fetchAPI(draft.id);
      draft.fethcing = false;
    },
  },
});

// Before 3.0.0
createSlice({
  actions: {
    someAction: async (x) => {
      x.commit({ fetching: true });

      x.commit({
        data: await fetchAPI(x.state.id),
        fethcing: false,
      });
    },
  },
});
```

## 2.0.1

- Fix README

## 2.0.0

- Breaking: `createSlice` interface was changed

  ```ts
  // After 2.0.0
  createSlice({
    actions: {
      someAction: (...) => { ... },
    },
    computed: {
      ok: state => state.***,
    }
  }, () => ({ /* initial state */}))

  // Before 2.0.0
  createSlice({
    someAction: (...) => { ... },
  }, () => ({ /* initial state */}))
  ```

- [#3](https://github.com/fleur-js/lys/pull/3) Introduce `computed` property
- [#4](https://github.com/fleur-js/lys/pull/4) Add `mockSlice` function for testing

## 1.0.3

- [#2](https://github.com/fleur-js/lys/pull/2) Fix slice instance will remaining after root component unmount
- [#2](https://github.com/fleur-js/lys/pull/2) Remove unused peer dependency (react-dom)

## 0.1.2

- Add comment for builtin action `set` and `reset`
- Fix action not returning Promise

## 0.1.0

First release
