import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import MathRenderer from './MathRenderer';

describe('MathRenderer', () => {
  it('renders plain text content', () => {
    render(<MathRenderer content="Solve this problem." />);
    expect(screen.getByText('Solve this problem.')).toBeInTheDocument();
  });

  it('renders KaTeX output for inline math', () => {
    const { container } = render(<MathRenderer content="Solve $x^2 + 1 = 0$ now." />);
    expect(screen.getByText(/Solve/)).toBeInTheDocument();
    expect(container.querySelector('.katex')).toBeInTheDocument();
  });
});
