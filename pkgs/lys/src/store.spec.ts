import { createStore, instantiateStore } from "./store";

const wait = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

describe("slice", () => {
  interface State {
    submitting: boolean;
    form: { name: string };
    items: number[];
  }

  const slice = createStore({
    state: (): State => ({ submitting: false, form: { name: "" }, items: [] }),
    actions: {
      async submit(x) {
        x.set({ submitting: true });

        await wait(1000);
        x.set({ submitting: false });
      },
      getStateSpec(x, spy: (s: any) => void) {
        x.set({ submitting: true });
        spy({ ...x.get() });
      },
      getUnwrapReadonlySpec(x, spy: (s: any) => void) {
        const s: State = x.unwrapReadonly(x.get());
        spy(s);
      },
    },
    computed: {
      isEditable: (s) => !s.submitting,
      itemOf: (s) => (index: number) => s.items[index],
    },
  });

  beforeEach(() => {
    vi.useFakeTimers();
  });

  describe("builtin actions", () => {
    describe("set", () => {
      it("object style", () => {
        const { state, actions } = instantiateStore(slice);

        actions.set({ submitting: true });
        expect(state.current.submitting).toBe(true);
      });

      it("patch function style", () => {
        const { state, actions } = instantiateStore(slice);

        actions.set((draft) => (draft.form.name = "Hanakla-san"));
        expect(state.current.form.name).toBe("Hanakla-san");
      });
    });

    describe("reset", () => {
      it("without key", () => {
        const { state, actions } = instantiateStore(slice, {
          form: { name: "aaa" },
        });

        actions.reset();
        expect(state.current.form.name).toBe("");
      });

      it("with key", async () => {
        const { state, actions } = instantiateStore(slice, {
          submitting: true,
          form: { name: "aaa" },
        });

        actions.reset("submitting");
        expect(state.current.submitting).toBe(false);
        expect(state.current.form.name).toBe("aaa"); // Expect not to change
      });
    });
  });

  describe("computed", () => {
    it("should select value", () => {
      const { state, actions } = instantiateStore(slice);
      expect(state.current.isEditable).toBe(true);

      actions.set({ submitting: true });
      expect(state.current.isEditable).toBe(false);
    });

    it("should not cache lambda result", () => {
      const { state, actions } = instantiateStore(slice);
      actions.set({ items: [0, 1] });

      expect(state.current.itemOf(0)).toBe(0);
      expect(state.current.itemOf(1)).toBe(1);
    });

    it("should referenceable computed in action", () => {
      let sampledState: any = null;

      const { actions } = instantiateStore(
        createStore({
          state: () => ({}),
          actions: {
            sample: (x) => {
              sampledState = { ...x.get() };
            },
          },
          computed: {
            computedValue: () => true,
          },
        }),
      );

      actions.sample();
      expect(sampledState).toMatchObject({ computedValue: true });
    });
  });

  describe("set", () => {
    it("it works", async () => {
      const { state, actions } = instantiateStore(slice);

      expect(state.current.submitting).toBe(false);
      const promise = actions.submit();
      expect(state.current.submitting).toBe(true);

      vi.runAllTimers();
      await promise;
      await promise;
      expect(state.current.submitting).toBe(false);
    });
  });

  describe("getState", () => {
    it("it works", () => {
      const { state, actions } = instantiateStore(slice);

      expect(state.current).toMatchObject({ submitting: false });

      const spy = vi.fn();
      actions.getStateSpec(spy);

      expect(spy).toBeCalledWith(expect.objectContaining({ submitting: true }));
    });
  });

  describe("unwrapReadonly", () => {
    it("check", () => {
      const { state, actions } = instantiateStore(slice);

      const spy = vi.fn();
      actions.getUnwrapReadonlySpec(spy);

      expect(spy.mock.calls[0][0]).toEqual(state.current);
    });
  });
});
