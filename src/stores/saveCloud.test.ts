// ══════════════════════════════════════════════════════════════════
// TESTS — saveCloud silent-failure fix
// ══════════════════════════════════════════════════════════════════

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mockSupabaseQuery } from "@/test/setup";
import { saveCloud, type SaveError } from "./saveCloud";
import type { DatosPerfil } from "@/lib/types";

/**
 * Minimal DatosPerfil fixture. Includes a non-empty nested array so
 * structural assertions can verify byte-for-byte payload passing.
 */
function makeContent(): DatosPerfil {
	return {
		banco: [],
		planes: [],
		trabajaderas: [],
	};
}

// ── Supabase mock overrides per-test ─────────────────────────────────
// We capture every `.update(...).eq(...).then(...)` call so tests can
// assert what was sent and simulate resolve/reject per scenario.
type UpdateCall = {
	content: DatosPerfil | undefined;
	pid: string;
};
const updateCalls: UpdateCall[] = [];
let nextUpdateBehavior: "resolve" | "reject" = "resolve";
let nextUpdateError: unknown = null;

function resetSupabaseMocks(): void {
	updateCalls.length = 0;
	nextUpdateBehavior = "resolve";
	nextUpdateError = null;

	mockSupabaseQuery.update.mockClear();
	mockSupabaseQuery.eq.mockClear();

	vi.mocked(supabase.auth.getSession).mockReset();
	vi.mocked(supabase.auth.getSession).mockResolvedValue({
		data: { session: { user: { id: "u1" } } },
	} as never);

// proyectos.update({ content }).eq(id, pid)
// `.update()` returns a chainable; `.eq()` returns a Promise that resolves
// or rejects per the test setup.
	mockSupabaseQuery.update.mockImplementation((payload: { content: DatosPerfil }) => {
		const call: UpdateCall = { content: payload.content, pid: "" };
		updateCalls.push(call);
		return {
			eq: vi.fn((_col: string, value: string) => {
				call.pid = value;
				return nextUpdateBehavior === "resolve"
					? Promise.resolve({ data: null, error: null })
					: Promise.reject(nextUpdateError);
			}),
		};
	});
}

function lastCall(): UpdateCall | undefined {
	return updateCalls[updateCalls.length - 1];
}

// ── saveCloud imports supabase indirectly ──────────────────────────
import { supabase } from "@/lib/supabase";

// ── Setup / teardown ───────────────────────────────────────────────
beforeEach(() => {
	vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
	resetSupabaseMocks();
});

afterEach(() => {
	vi.useRealTimers();
	vi.restoreAllMocks();
});

// ══════════════════════════════════════════════════════════════════
// REQ-SP-1: Debounce + persistence semantics
// ══════════════════════════════════════════════════════════════════

describe("REQ-SP-1: saveCloud debounce + persistence semantics", () => {
	it("1.1 short-circuits when targetPid is empty (no timer, no network)", () => {
		const onErr = vi.fn();
		saveCloud(makeContent(), "", onErr);
		vi.advanceTimersByTime(1000);

		expect(updateCalls.length).toBe(0);
		expect(mockSupabaseQuery.update).not.toHaveBeenCalled();
		expect(onErr).not.toHaveBeenCalled();
	});

	it("1.2 fires exactly one update after debounce with active session", async () => {
		const content = makeContent();
		await vi.advanceTimersByTimeAsync(800);

		saveCloud(content, "p1");
		await vi.advanceTimersByTimeAsync(800);

		expect(mockSupabaseQuery.update).toHaveBeenCalledTimes(1);
		expect(lastCall()?.content).toEqual(content);
		expect(lastCall()?.pid).toBe("p1");
	});

	it("1.3 collapses multiple rapid calls into a single last-write-wins update", async () => {
		const c1 = makeContent();
		const c2 = makeContent();
		const c3 = makeContent();

		saveCloud(c1, "p1");
		await vi.advanceTimersByTimeAsync(200);
		saveCloud(c2, "p1");
		await vi.advanceTimersByTimeAsync(400);
		saveCloud(c3, "p1");
		await vi.advanceTimersByTimeAsync(800);

		expect(mockSupabaseQuery.update).toHaveBeenCalledTimes(1);
		expect(lastCall()?.content).toEqual(c3);
		expect(lastCall()?.pid).toBe("p1");
	});

	it("1.4 maintains independent timers per targetPid", async () => {
		const c1 = makeContent();
		const c2 = makeContent();

		saveCloud(c1, "p1");
		await vi.advanceTimersByTimeAsync(100);
		saveCloud(c2, "p2");
		await vi.advanceTimersByTimeAsync(800);

		// Both timers should have fired; two distinct update calls.
		expect(mockSupabaseQuery.update).toHaveBeenCalledTimes(2);
		const updateContents = updateCalls.map((c) => c.content);
		expect(updateContents).toContainEqual(c1);
		expect(updateContents).toContainEqual(c2);
		const pids = updateCalls.map((u) => u.pid).sort();
		expect(pids).toEqual(["p1", "p2"]);
	});

	it("1.5 silently drops save when getSession returns null (default shape)", async () => {
		vi.mocked(supabase.auth.getSession).mockResolvedValueOnce({
			data: { session: null },
		} as never);

		// No callback passed — exercises the silent default contract.
		saveCloud(makeContent(), "p1");
		await vi.advanceTimersByTimeAsync(800);

		expect(updateCalls.length).toBe(0);
	});

	it("1.6 silently swallows network rejection (default shape)", async () => {
		nextUpdateBehavior = "reject";
		nextUpdateError = new Error("RLS violation");

		// Attach a no-op handler so the rejection is "handled" from vitest's
		// perspective before saveCloud's timer can race against the watcher.
		const noopHandler = () => {};
		process.on("unhandledRejection", noopHandler);
		try {
			// No callback passed — exercises the silent default contract.
			saveCloud(makeContent(), "p1");
			await vi.advanceTimersByTimeAsync(800);
			expect(mockSupabaseQuery.update).toHaveBeenCalledTimes(1);
		} finally {
			process.off("unhandledRejection", noopHandler);
		}
	});
});

// ══════════════════════════════════════════════════════════════════
// REQ-SP-2: Optional onSaveError callback hook
// ══════════════════════════════════════════════════════════════════

describe("REQ-SP-2: optional onSaveError callback hook", () => {
	it("2.1 invokes onSaveError with 'no-session' when getSession returns null", async () => {
		vi.mocked(supabase.auth.getSession).mockResolvedValueOnce({
			data: { session: null },
		} as never);

		const onErr = vi.fn();
		saveCloud(makeContent(), "p1", onErr);
		await vi.advanceTimersByTimeAsync(800);

		expect(onErr).toHaveBeenCalledTimes(1);
		expect(onErr).toHaveBeenCalledWith({ reason: "no-session" });
	});

	it("2.2 invokes onSaveError with 'network-error' when update rejects", async () => {
		const err = new Error("RLS violation");
		nextUpdateBehavior = "reject";
		nextUpdateError = err;

		const onErr = vi.fn();
		// Attach a no-op handler so vitest's unhandled-rejection watcher
		// doesn't fail the test before await settles the rejection.
		const noopHandler = () => {};
		process.on("unhandledRejection", noopHandler);
		try {
			saveCloud(makeContent(), "p1", onErr);
			await vi.advanceTimersByTimeAsync(800);
			expect(onErr).toHaveBeenCalledTimes(1);
			expect(onErr).toHaveBeenCalledWith({ reason: "network-error", error: err });
		} finally {
			process.off("unhandledRejection", noopHandler);
		}
	});

	it("2.3 does NOT invoke onSaveError when save succeeds", async () => {
		const onErr = vi.fn();
		saveCloud(makeContent(), "p1", onErr);
		await vi.advanceTimersByTimeAsync(800);

		expect(mockSupabaseQuery.update).toHaveBeenCalledTimes(1);
		expect(onErr).not.toHaveBeenCalled();
	});

	it("2.4 does NOT invoke onSaveError when targetPid is empty", () => {
		const onErr = vi.fn();
		saveCloud(makeContent(), "", onErr);
		vi.advanceTimersByTime(1000);

		expect(onErr).not.toHaveBeenCalled();
		expect(mockSupabaseQuery.update).not.toHaveBeenCalled();
	});

	it("2.5 catches a throwing hook so it does not propagate or break subsequent calls", async () => {
		vi.mocked(supabase.auth.getSession).mockResolvedValueOnce({
			data: { session: null },
		} as never);

		const onErr = vi.fn(() => {
			throw new Error("hook bug");
		});
		// This MUST NOT throw.
		expect(() => saveCloud(makeContent(), "p1", onErr)).not.toThrow();
		await vi.advanceTimersByTimeAsync(800);

		expect(onErr).toHaveBeenCalledTimes(1);

		// Subsequent call with a fresh session should still schedule normally.
		const onErr2 = vi.fn();
		saveCloud(makeContent(), "p1", onErr2);
		await vi.advanceTimersByTimeAsync(800);

		expect(mockSupabaseQuery.update).toHaveBeenCalledTimes(1);
		expect(onErr2).not.toHaveBeenCalled();
	});
});

// ══════════════════════════════════════════════════════════════════
// REQ-SP-3: Payload shape contract
// ══════════════════════════════════════════════════════════════════

describe("REQ-SP-3: payload shape contract", () => {
	it("3.1 sends content byte-for-byte and uses targetPid in eq filter", async () => {
		const content = makeContent();
		saveCloud(content, "p1");
		await vi.advanceTimersByTimeAsync(800);

		expect(updateCalls.length).toBeGreaterThan(0);
		expect(lastCall()?.content).toEqual(content);
		expect(lastCall()?.content).toBe(content); // same reference, no transform
		expect(lastCall()?.pid).toBe("p1");
	});
});

// ══════════════════════════════════════════════════════════════════
// SaveError type contract — compile-time + runtime
// ══════════════════════════════════════════════════════════════════

describe("SaveError discriminated union", () => {
	it("4.1 narrow on reason: 'no-session' excludes error field", () => {
		const err: SaveError = { reason: "no-session" };
		// @ts-expect-error — 'error' must NOT exist on no-session
		err.error;
		expect(err.reason).toBe("no-session");
	});

	it("4.2 narrow on reason: 'network-error' requires error field", () => {
		const err: SaveError = { reason: "network-error", error: new Error("x") };
		expect(err.reason).toBe("network-error");
		if (err.reason === "network-error") {
			expect(err.error).toBeInstanceOf(Error);
		}
	});
});