[npm-url]: https://www.npmjs.com/package/@fleur/lys
[ci-image-url]: https://img.shields.io/github/workflow/status/fleur-js/lys/CI?logo=github&style=flat-square
[version-image-url]: https://img.shields.io/npm/v/@fleur/lys?style=flat-square
[license-url]: https://opensource.org/licenses/MIT
[license-image]: https://img.shields.io/npm/l/@fleur/lys.svg?style=flat-square
[downloads-image]: https://img.shields.io/npm/dw/@fleur/lys.svg?style=flat-square&logo=npm
[bundlephobia-url]: https://bundlephobia.com/result?p=@fleur/lys@2.0.1
[bundlephobia-image]: https://img.shields.io/bundlephobia/minzip/@fleur/lys?style=flat-square

# Lys ![CI][ci-image-url] [![latest][version-image-url]][npm-url] [![BundleSize][bundlephobia-image]][bundlephobia-url] [![License][license-image]][license-url] [![npm][downloads-image]][npm-url]
Lys (risu) is an minimal statement manger for '21s React.


It's focus to **Per page state management**, not application global state management.  
Lys is usable to instead of `useReducer`, `Mobx`, or `Recoil` if you have async procedure.

See [CodeSandbox Example](https://codesandbox.io/s/fleur-lys-official-example-ok533?file=/src/App.js)

```
yarn add @fleur/lys
```

- [Features](#features)
- [Usage](#usage)
- [Testing](#testing)

## Features

- Per page level micro state management
- Initial state via external data
  - Can be use with likes `Next.js`, `useSWR`
- Testing friendly
- Type safe
- Minimal re-rendering

## Usage

Summary in [CodeSandbox Example](https://codesandbox.io/s/fleur-lys-official-example-ok533?file=/src/App.js).

First, define your slice.

```tsx
import { createSlice } from '@fleur/lys'

const formSlice = createSlice({
  actions: {
    // Define actions
    async patchItem({ draft }, index: number, patch: Partial<FormState['items'][0]>) {
      Object.assign(draft.form.items[index], patch)
    },
    async submit({ draft, updateTemporary }) {
      if (draft.hasError) return

      // Update the state visible from Component.
      // It's not effected to current `draft`.
      // On after complete this action, reset to action result draft.
      updateTemporary({ submitting: true })

      draft.form = await (await fetch('/api/users', { 
        method: 'POST',
        body: JSON.stringify(draft.form)
      })).json()
    },
    async validate({ draft }) {
      const { form } = draft
      draft.hasError = false

      // Use your favorite validator
      draft.hasError = await validateForm(form)
    },
  },
  computed: {
    // You can define computable values in `computed`
    // `computed` is cached between to next state changed
    itemOf: (state) => (index: number) => state.form.items[index],
    canSubmit: (state) => !state.submitting
  }
}, (): FormState => ({
  // Define initial state
  submitting: false,
  hasError: false,
  form: {
    id: null,
    username: '',
    items: [{ name: '' }]
  }
}))
```

Next, initialize slice on your page component

```tsx
import { useLysSliceRoot, useLysSlice } from '@fleur/lys'

export const NewUserPage = () => {
  const { data: initialData, error } = useSWR('/users/1', fetcher)

  // Initialize slice by `useLysSliceRoot`
  // `initialState` in second argument, it shallow override to Slice's initial state.
  // `initialData` is re-evaluated when it changes from null or undefined to something else.
  //
  // Or can you define `fetchUser` in slice and call it in `useEffect()`
  const [state, actions] = useLysSliceRoot(formSlice, initialData ? { form: initialData } : null)

  const handleChangeName = useCallback(({ currentTarget }) => {
    // `set` is builtin action
    actions.set(({ form }) => { form.username = currentTarget.value })
  },[])

  const handleSubmit = useCallback(async () => {
    await actions.validate()
    await actions.submit()
  }, [])
  
  return (
    <div>
      <label>
        Display name: <input type="text" value={state.form.name} onChange={handleChangeName} />
      </label>

      <h1>Your items</h1>
      {state.form.items.map((index) => <Item index={index} />)}

      <button disabled={!state.canSubmit} onClick={handleSubmit}>Register</button>
    </div>
  )
}
```

Use initialize slice into child component

```tsx
// In child component
const Item = ({ index }) => {
  // Use slice from page root by `useLysSlice`
  const [state, actions] = useLysSlice(formSlice)
  const item = state.itemOf(index)

  const handleChangeName = useCallback(({ currentTarget }) => {
    // Can call action from child component and share state with root.
    // Re-rendering from root (no duplicate re-rendering)
    actions.patchItem(index, { name: currentTarget.value })
  }, [])

  return (
    <div>
      Item of #{index + 1}
      <label>Name: <input type="text" value={item.name} /></label>
    </div>
  )
}
```

## Testing

Lys's Slice is very testable.
Let look testing example!

```tsx
import { instantiateSlice, createSlice } from '@fleur/lys'

// Define (Normally, import from other file)
const slice = createSlice({
  actions: {
    increment({ draft }) {
      draft.count++
    }
  },
  computed: {
    isZero: (state) => state.count === 0
  }
}, () => ({ count: 0, submitting: false }))

describe('Testing slice', () => {
  it('Should increment one', async () => {
    // instantiate
    const { state, actions } = instantiateSlice(slice)
    
    // Expection
    expect(state.current.count).toBe(0)
    expect(state.current.isZero).toBe(true)

    await actions.increment()
    expect(state.current.count).toBe(1)
    expect(state.current.isZero).toBe(false)
  })

  it('mock slice actions (for component testing)', () => {
    const actionSpy = jest.fn(({ draft }) => draft.count = 10)

    const { state, actions } = mockSlice(slice, { /* part of initial state here */ }, {
      /* Mock action implementations here */
      increment: actionSpy
    })

    actions.increment()
    expect(actionSpy).toBeCalled()
  })
})
```
