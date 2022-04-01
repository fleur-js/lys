## 3.1.0

Introduce `useLysForm` hooks

### `useLysForm` example

```tsx
const slice = createSlice({
  actions: {
    async submit(x) {
      const errors = validate(x.state)
      if (errors) {
        x.commit({ errors })
        return
      }

      const success = await postUser(x.state)
      x.commit({ done: true })
    }
  }
}, () => ({
  form: {
    name: '',
    isYes: null as File | null
    gender: '',
  },
  done: false,
  errors: null,
}))


// in form component
const Form = () => {
  const [state, actions] = useLysSliceRoot(slice)
  const { bind } = useLysForm(state, actions, 'form')

  return (
    <>
      <div>
        Name:
        <input type="text" {...bind('name')} />
      </div>
      <div>
        Avatar:
        <input type="file" {...bind('file')} />
      </div>
      <div>
        Gender:
        <label>
          <input type="checkbox" value="yes" {...bind('isYes')} />
          Yes
        </label>
        <label>
          <input type="checkbox" value="no" {...bind('isYes')} />
          No
        </label>

        <div>
          Websites:
          {state.form.urls.map((url, idx) => (
            <input type="text" {...bind(`websites.${idx}`)} />
          ))}
        </div>

        <button onClick={() => actions.submit()}>
          Submit
        </button>
      </div>
    </>
  )
}
```

## 3.0.0

Breaking API Changes for simplify state update method.

- Rename `draft` to `state` and it now readonly.
  - Any assigns to `state` now be ignored, use `commit()` instead.
- Rename `updateTemporary` to `commit`.
- Add `getState` in SliceActionContext

### Migration

```ts
// After 3.0.0
createSlice({
  actions: {
    someAction: async (x) => {
      x.commit({ fetching: true });

      x.commit({
        data: await fetchAPI(state.id),
        fethcing: false,
      });

      // Get latest state
      x.getState();

      // Unwrap state from　DeepReadonly<S>
      x.unwrapReadonly(x.state);
      x.unwrapReadonly(x.state.nodeOfState);
    },
  },
});

// Before 3.0.0
createSlice({
  actions: {
    someAction: async ({ draft, updateTemporary }) => {
      updateTemporary({ fetching: true });

      draft.data = await fetchAPI(draft.id);
      draft.fethcing = false;
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
