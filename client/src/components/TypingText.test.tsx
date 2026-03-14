import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import TypingText from './TypingText';

describe('TypingText', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('progressively renders text and fires onComplete', () => {
    const onComplete = vi.fn();
    render(<TypingText text="Hello world" speed={10} onComplete={onComplete} />);

    act(() => {
      vi.advanceTimersByTime(200);
    });

    expect(screen.getByText('Hello world')).toBeInTheDocument();
    expect(onComplete).toHaveBeenCalledTimes(1);
  });
});
