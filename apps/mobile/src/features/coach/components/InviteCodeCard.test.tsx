import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import * as Clipboard from 'expo-clipboard';
import { InviteCodeCard } from './InviteCodeCard';

jest.mock('expo-localization', () => ({
  getLocales: () => [{ languageCode: 'en' }],
  getCalendars: () => [{ timeZone: 'Europe/Berlin' }],
}));
jest.mock('expo-clipboard', () => ({ setStringAsync: jest.fn(async () => true) }));

const CODE = '7K2QM9XA';
const GROUPED = '7K2Q-M9XA';

describe('InviteCodeCard', () => {
  it('shows and copies the code grouped for reading aloud', async () => {
    await render(<InviteCodeCard code={CODE} expiresAt="2026-12-01T10:00:00.000Z" />);

    expect(screen.getByText(GROUPED)).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Copy code' }));

    await waitFor(() => expect(Clipboard.setStringAsync).toHaveBeenCalledWith(GROUPED));
  });
});
