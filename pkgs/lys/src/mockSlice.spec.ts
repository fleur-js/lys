import { mockSlice } from "./mockSlice";
import { createSlice } from "./slice";

describe("mockSlice", () => {
  it("should mock action", () => {
    const actionSpy = jest.fn();
    const mockSpy = jest.fn();

    const slice = createSlice({ actions: { foo: actionSpy } }, () => ({}));
    const { actions } = mockSlice(slice, {}, { foo: mockSpy });

    actions.foo("a");

    expect(actionSpy.mock.calls.length).toBe(0);
    expect(mockSpy).toBeCalledWith(
      expect.objectContaining({
        commit: expect.anything(),
        state: expect.anything(),
        getState: expect.anything(),
      }),
      "a",
    );
  });
});
