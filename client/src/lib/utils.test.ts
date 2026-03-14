import { describe, expect, it } from 'vitest';
import { cn } from './utils';

describe('cn', () => {
  it('merges conditional class names', () => {
    const includeHidden = false;
    const classes = cn('p-2', includeHidden ? 'hidden' : undefined, undefined, 'text-sm', null, 'font-medium');
    expect(classes).toContain('p-2');
    expect(classes).toContain('text-sm');
    expect(classes).toContain('font-medium');
    expect(classes).not.toContain('hidden');
  });

  it('resolves conflicting Tailwind classes to the latest value', () => {
    const classes = cn('p-2', 'p-4', 'text-gray-500', 'text-gray-900');
    expect(classes).toContain('p-4');
    expect(classes).toContain('text-gray-900');
    expect(classes).not.toContain('p-2');
    expect(classes).not.toContain('text-gray-500');
  });
});
