import { render } from "@testing-library/react";
import React, {
  createRef,
  forwardRef,
  useEffect,
  useImperativeHandle,
  useState,
} from "react";
import { act } from "react-dom/test-utils";
import { LysProvider, createLysContext, LysContext } from "./LysContext";
import { createStore } from "./store";
import { useLysStoreWithInitialState, useLysStore } from "./useSlice";

describe("useLysStore", () => {
  const App: React.FC<{ context: LysContext }> = ({ children }) => (
    <LysProvider>{children}</LysProvider>
  );

  beforeEach(() => {
    vi.useFakeTimers();
  });

  it("Basic usage: Should intialize, action, action to update state", async () => {
    const slice = createStore({
      state: () => ({ count: 0 }),
      actions: {
        increment(x) {
          x.set((prev) => ({ count: prev.count + 1 }));
          x.get().isZero;
        },
      },
      computed: {
        isZero: (state) => state.count === 0,
      },
    });

    const context = createLysContext();
    const rootRef = createRef<any>();
    const subRef = createRef<any>();

    const RootComponent = forwardRef((_, ref) => {
      const [state, actions] = useLysStoreWithInitialState(slice);

      useImperativeHandle(
        ref,
        () => ({
          increment: () => actions.increment(),
        }),
        [actions],
      );

      return (
        <div>
          <div>
            Root: {state.count}(isZero: {state.isZero.toString()})
          </div>
          <SubComponent ref={subRef} />
        </div>
      );
    });

    const SubComponent = forwardRef((_, ref) => {
      const [state, actions] = useLysStore(slice);

      useImperativeHandle(
        ref,
        () => ({
          increment: () => actions.increment(),
        }),
        [actions],
      );

      return <div>Sub: {state.count}</div>;
    });

    const element = (
      <App context={context}>
        <RootComponent ref={rootRef} />
      </App>
    );

    const result = render(element);

    // Initial State
    expect(result.container.innerHTML).toMatchInlineSnapshot(
      `"<div><div>Root: 0(isZero: true)</div><div>Sub: 0</div></div>"`,
    );

    // First update
    await act(async () => {
      rootRef.current.increment();
      await new Promise(requestAnimationFrame);
    });

    result.rerender(element);
    expect(result.container.innerHTML).toMatchInlineSnapshot(
      `"<div><div>Root: 1(isZero: false)</div><div>Sub: 1</div></div>"`,
    );

    // Second update
    // (Check state derived from first update)
    await act(async () => {
      rootRef.current.increment();
      await new Promise(requestAnimationFrame);
    });

    result.rerender(element);
    expect(result.container.innerHTML).toMatchInlineSnapshot(
      `"<div><div>Root: 2(isZero: false)</div><div>Sub: 2</div></div>"`,
    );

    // Third update by SubComponent
    // (Check action executable and correctly updated by SubComponent)
    await act(async () => {
      subRef.current.increment();
      await new Promise(requestAnimationFrame);
    });

    result.rerender(element);
    expect(result.container.innerHTML).toMatchInlineSnapshot(
      `"<div><div>Root: 3(isZero: false)</div><div>Sub: 3</div></div>"`,
    );
  });

  describe("With async data fetch", () => {
    it("Should accept fetched data", async () => {
      const context = createLysContext();
      const slice = createStore({ actions: {} }, () => ({ loaded: false }));

      const useFakeFetch = () => {
        const [loaded, setState] = useState(false);

        useEffect(() => {
          setTimeout(() => setState(true), 500);
        }, []);

        return loaded ? { loaded: true } : null;
      };

      const Comp = () => {
        const data = useFakeFetch();
        const [state] = useLysStoreWithInitialState(slice, data);

        return <>{JSON.stringify(state)}</>;
      };

      const result = render(
        <App context={context}>
          <Comp />
        </App>,
      );

      expect(JSON.parse(result.container.textContent!).loaded).toBe(false);

      await act(async () => {
        const waiter = new Promise<void>((r) => setTimeout(r, 1000));
        vi.runAllTimers();
        await waiter;
      });

      expect(JSON.parse(result.container.textContent!).loaded).toBe(true);
    });

    it("Should ignore next data", async () => {
      const context = createLysContext();
      const slice = createStore({
        state: () => ({ locked: "initial" }),
        actions: {},
      });
      const fetchSpy = vi.fn();

      const useFakeFetch = () => {
        const [loaded, setState] = useState(false);

        useEffect(() => {
          setTimeout(() => {
            setState(true);
            fetchSpy();
          }, 500);
        }, []);

        return loaded ? { locked: "you not lock from data" } : null;
      };

      const Comp = () => {
        const data = useFakeFetch();
        const [state] = useLysStoreWithInitialState(
          slice,
          data ? data : { locked: "locked!" },
        );

        return <>{JSON.stringify(state)}</>;
      };

      const result = render(
        <App context={context}>
          <Comp />
        </App>,
      );

      expect(JSON.parse(result.container.textContent!).locked).toBe("locked!");

      await act(async () => {
        const waiter = new Promise<void>((r) => setTimeout(r, 1000));
        vi.runAllTimers();
        await waiter;
      });

      expect(fetchSpy).toBeCalled();
      expect(JSON.parse(result.container.textContent!).locked).toBe("locked!");
    });
  });
});
