import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react-native';

import { Button } from '../button';

describe('Button', () => {
  it('renders label and triggers onPress when pressed', async () => {
    const onPress = jest.fn();
    await render(<Button label="Start Walk" onPress={onPress} />);

    const button = screen.getByRole('button', { name: 'Start Walk' });
    expect(button).toBeTruthy();

    fireEvent.press(button);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not trigger onPress when disabled or loading', async () => {
    const onPress = jest.fn();
    const { rerender } = await render(<Button label="Save" disabled onPress={onPress} />);

    fireEvent.press(screen.getByRole('button', { name: 'Save' }));
    expect(onPress).not.toHaveBeenCalled();

    await rerender(<Button label="Save" loading onPress={onPress} />);
    fireEvent.press(screen.getByRole('button', { name: 'Save' }));
    expect(onPress).not.toHaveBeenCalled();
  });
});
