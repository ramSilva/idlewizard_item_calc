// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { InProcessWorker } from "../worker/inProcessWorker.ts";
import { OptimizerClient, type WorkerLike } from "../worker/optimizerClient.ts";
import type { WorkerRequest } from "../worker/protocol.ts";
import { App } from "./App.tsx";
import { defaultState, encodeState } from "./state.ts";

/** Records requests and never answers, for tests that only check the wiring. */
class SilentWorker implements WorkerLike {
  readonly received: WorkerRequest[] = [];
  postMessage(message: WorkerRequest): void {
    this.received.push(message);
  }
  addEventListener(): void {}
  terminate(): void {}
}

const selectValue = (label: string) => (screen.getByLabelText(label) as HTMLSelectElement).value;

afterEach(() => {
  cleanup();
  window.localStorage.clear();
  window.history.replaceState(null, "", "/");
});

describe("App", () => {
  it("resets the setup to the new class's guide defaults and asks the worker for its relevance", async () => {
    const workers: SilentWorker[] = [];
    render(<App createClient={() => new OptimizerClient(workers[workers.push(new SilentWorker()) - 1])} />);
    expect(selectValue("Class")).toBe("oni");
    expect(selectValue("Stance")).toBe("berserk");
    expect(selectValue("Spell slot 1")).toBe("60");

    fireEvent.change(screen.getByLabelText("Class"), { target: { value: "shaman" } });
    expect(selectValue("Pet")).toBe("herald-of-rot");
    expect(selectValue("Spell slot 1")).toBe("18");
    expect(screen.queryByLabelText("Stance")).toBeNull();
    expect(window.location.hash).toMatch(/^#s=/);

    await waitFor(() => expect(workers.flatMap((w) => w.received).some((m) => m.type === "run" && m.request.selection.classId === "shaman")).toBe(true));
    const run = workers.flatMap((w) => w.received).find((m) => m.type === "run" && m.request.selection.classId === "shaman")!;
    expect(run.type === "run" && run.request.levels).toEqual([0]);
    expect(run.type === "run" && run.request.relevanceLevel).toBe(0);
  });

  it("restores a shared state from the URL", () => {
    const state = defaultState("temporalist");
    state.items = { ...state.items, enchant: 11, excludedSlots: ["Weapon"] };
    window.history.replaceState(null, "", `/#s=${encodeState(state)}`);
    render(<App createClient={() => new OptimizerClient(new SilentWorker())} />);
    expect(selectValue("Class")).toBe("temporalist");
    fireEvent.click(screen.getByRole("tab", { name: "Items" }));
    expect((screen.getByLabelText("Global enchant level") as HTMLInputElement).value).toBe("11");
    expect((screen.getByRole("checkbox", { name: /^Weapon/ }) as HTMLInputElement).checked).toBe(false);
  });

  it("splits the inputs by ranking relevance and shows the best set from the worker", async () => {
    render(<App createClient={() => new OptimizerClient(new InProcessWorker())} />);
    fireEvent.click(screen.getByRole("tab", { name: /^Inputs/ }));
    const hidden = await screen.findByText(/Doesn't affect the ranking/, undefined, { timeout: 60_000 });
    const details = hidden.closest("details")!;
    expect(within(details).getByText("Mysteries.Count")).toBeTruthy();
    expect(within(details).queryByText("AttrPoints.Spellcraft")).toBeNull();
    expect(screen.getByText("Weapon.CataclysmCharges").closest("details")).toBeNull();

    fireEvent.click(screen.getByRole("tab", { name: /^Results/ }));
    expect(screen.getByText(/Best set at enchant 0: ×.* vs no items/)).toBeTruthy();
    const rows = screen.getAllByRole("row").filter((r) => r.closest("table")?.classList.contains("best-set"));
    expect(rows.length).toBe(21);
  }, 90_000);
});
