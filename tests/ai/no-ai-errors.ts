// chooseAnswer catches any exception, logs `console.error('AI error', …)` and falls back to a safe legal answer, so a
// crash inside the AI would otherwise pass unnoticed. Call failOnAiErrors() at the top level of a test file: every test
// in it then fails if console.error was called.
import { afterEach, beforeEach, expect, vi, type MockInstance } from 'vitest';

export function failOnAiErrors(): void {
  let spy: MockInstance<typeof console.error> | null = null;
  beforeEach(() => {
    spy = vi.spyOn(console, 'error');
  });
  afterEach(() => {
    const calls = spy?.mock.calls ?? [];
    spy?.mockRestore();
    spy = null;
    expect(calls.map((c) => c.map(String).join(' ')), 'console.error (an AI error was caught and hidden by a fallback)').toEqual([]);
  });
}
