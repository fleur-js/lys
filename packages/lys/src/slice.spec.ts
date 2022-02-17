import { createSlice, instantiateSlice } from "./slice";

const wait = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

describe("slice", () => {
  interface State {
    submitting: boolean;
    form: { name: string };
    items: number[];
  }

  const slice = createSlice(
    {
      actions: {
        async submit(x) {
          x.commit({ submitting: true });

          await wait(1000);
          x.commit({ submitting: false });
        },
        getStateSpec(x, spy: (s: any) => void) {
          x.commit({ submitting: true });
          spy({ ...x.getState() });
        },
      },
      computed: {
        isEditable: (s) => !s.submitting,
        itemOf: (s) => (index: number) => s.items[index],
      },
    },
    (): State => ({ submitting: false, form: { name: "" }, items: [] })
  );

  beforeEach(() => {
    jest.useFakeTimers();
  });

  describe("builtin actions", () => {
    describe("set", () => {
      it("object style", () => {
        const { state, actions } = instantiateSlice(slice);

        actions.set({ submitting: true });
        expect(state.current.submitting).toBe(true);
      });

      it("patch function style", () => {
        const { state, actions } = instantiateSlice(slice);

        actions.set((draft) => (draft.form.name = "Hanakla-san"));
        expect(state.current.form.name).toBe("Hanakla-san");
      });
    });

    describe("reset", () => {
      it("without key", () => {
        const { state, actions } = instantiateSlice(slice, {
          form: { name: "aaa" },
        });

        actions.reset();
        expect(state.current.form.name).toBe("");
      });

      it("with key", async () => {
        const { state, actions } = instantiateSlice(slice, {
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
      const { state, actions } = instantiateSlice(slice);
      expect(state.current.isEditable).toBe(true);

      actions.set({ submitting: true });
      expect(state.current.isEditable).toBe(false);
    });

    it("should not cache lambda result", () => {
      const { state, actions } = instantiateSlice(slice);
      actions.set({ items: [0, 1] });

      expect(state.current.itemOf(0)).toBe(0);
      expect(state.current.itemOf(1)).toBe(1);
    });

    it("should referenceable computed in action", () => {
      let sampledState: any = null;

      const { actions } = instantiateSlice(
        createSlice(
          {
            actions: {
              sample: (x) => {
                sampledState = { ...x.state };
              },
            },
            computed: {
              computedValue: () => true,
            },
          },
          () => ({})
        )
      );

      actions.sample();
      expect(sampledState).toMatchObject({ computedValue: true });
    });
  });

  describe("commit", () => {
    it("it works", async () => {
      const { state, actions } = instantiateSlice(slice);

      expect(state.current.submitting).toBe(false);
      const promise = actions.submit();
      expect(state.current.submitting).toBe(true);

      jest.runAllTimers();
      await promise;
      await promise;
      expect(state.current.submitting).toBe(false);
    });
  });

  describe("getState", () => {
    const { state, actions } = instantiateSlice(slice);

    expect(state.current).toMatchObject({ submitting: false });

    const spy = jest.fn();
    actions.getStateSpec(spy);

    expect(spy).toBeCalledWith(expect.objectContaining({ submitting: true }));
  });
});
