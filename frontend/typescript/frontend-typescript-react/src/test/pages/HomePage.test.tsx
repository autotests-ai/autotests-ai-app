import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { HomePage } from '../../pages/HomePage';

describe('HomePage', () => {
  it('renders an empty design-system page-shell', () => {
    render(<HomePage />);

    const shell = screen.getByTestId('page-shell');
    expect(shell.tagName).toBe('MAIN');
    expect(shell).toHaveClass('page-shell', 'page-shell--below-header');
    expect(shell).toBeEmptyDOMElement();
  });
});
