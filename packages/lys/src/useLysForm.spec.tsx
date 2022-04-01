import React from "react";
import { renderHook } from "@testing-library/react-hooks";
import { fireEvent, render, waitFor } from "@testing-library/react";
import { useLysForm } from "./bindInput";
import { createSlice, instantiateSlice, SliceActions } from "./slice";
import {
  createLysContext,
  LysContext,
  LysProvider,
  LysReactContext,
} from "./LysContext";
import { ReactElement } from "react";

describe("useLysForm", () => {
  const slice = createSlice(
    {
      actions: {},
      computed: {},
    },
    (): { form: { file: File | null; files: []; name: string } } => ({
      form: {
        file: null,
        files: [],
        name: "",
      },
    })
  );

  const mockFile = new File(["🐿️"], "test.txt");

  function setup({
    context,
    actions,
    elements,
  }: {
    context: LysContext;
    actions: SliceActions<any>;
    elements: (bind: any) => ReactElement;
  }) {
    const App = () => {
      const { bind } = useLysForm(actions, "form");
      return elements(bind);
    };

    return render(
      <LysReactContext.Provider value={context}>
        <App />
      </LysReactContext.Provider>
    );
  }

  it("should be defined", async () => {
    const context = createLysContext();
    const { state, actions } = context.createSliceInstance(slice);

    const result = setup({
      context,
      actions,
      elements: (bind) => (
        <>
          <input type="text" {...bind("name")} data-testid="name" />
          <input type="file" {...bind("file")} data-testid="file" />
          <input type="file" {...bind("files")} multiple data-testid="files" />
        </>
      ),
    });

    await waitFor(() => {
      const input = result.getByTestId("name");
      fireEvent.change(input, { target: { value: "test" } });

      const fileInput = result.getByTestId("file");
      fireEvent.change(fileInput, {
        target: { files: [mockFile] },
      });

      const filesInput = result.getByTestId("files");
      fireEvent.change(filesInput, {
        target: { files: [mockFile, mockFile] },
      });
    });

    expect(state.current.form.name).toBe("test");
    expect(state.current.form.file).toBe(mockFile);
    expect(state.current.form.files).toEqual([mockFile, mockFile]);
  });
});
