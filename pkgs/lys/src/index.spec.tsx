import React, { createRef, forwardRef, useImperativeHandle } from "react";
import { render } from "@testing-library/react";
import { LysContext, createSlice, useLysSliceRoot } from "./";
import { SliceToActions } from "./slice";
import { act } from "react-dom/test-utils";

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe("lys", () => {
  const formSlice = createSlice(
    {
      actions: {
        async submit(x) {
          x.commit((draft) => {
            draft.status.loading = true;
          });

          await wait(1000);

          x.commit({ status: { loading: false, submitted: true } });
        },
      },
    },
    () => ({
      status: { loading: false, submitted: false },
    }),
  );

  const Component = forwardRef<SliceToActions<typeof formSlice>>((_, ref) => {
    const [state, actions] = useLysSliceRoot(formSlice);

    useImperativeHandle(ref, () => actions, []);
    return <>{JSON.stringify(state)}</>;
  });

  it("render", async () => {
    const ref = createRef<SliceToActions<typeof formSlice>>();
    const { container } = render(
      <LysContext>
        <Component ref={ref} />
      </LysContext>,
    );

    // Should display initial state
    expect(JSON.parse(container.textContent).status).toMatchObject({
      loading: false,
      submitted: false,
    });

    // Should changeImmidiate changes immidiaty
    act(() => {
      ref.current.submit();
    });
    expect(JSON.parse(container.textContent).status).toMatchObject({
      loading: true,
      submitted: false,
    });

    // Should apply state of action finished
    await act(async () => wait(1000));
    expect(JSON.parse(container.textContent).status).toMatchObject({
      loading: false,
      submitted: true,
    });
  });
});
