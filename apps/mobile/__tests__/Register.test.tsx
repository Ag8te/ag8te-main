import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import Register from '../app/register';
import { AuthProvider } from '../contexts/AuthContext';

// Mock useAuth
jest.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    register: jest.fn().mockResolvedValue({ success: true }),
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock apiClient
jest.mock('../api/client', () => ({
  __esModule: true,
  default: {
    get: jest.fn().mockResolvedValue({ data: { success: true, data: { services: [], gateways: [] } } }),
    post: jest.fn().mockResolvedValue({ data: { success: true } }),
  },
}));

// Mock expo-router
jest.mock('expo-router', () => ({
  useRouter: () => ({
    back: jest.fn(),
    push: jest.fn(),
    replace: jest.fn(),
  }),
}));

describe('Mobile Register Screen', () => {
  it('renders Step 1 correctly', () => {
    const { getByText, getByPlaceholderText } = render(
      <AuthProvider>
        <Register />
      </AuthProvider>
    );

    expect(getByText('Step 1 of 3')).toBeTruthy();
    expect(getByText('Create Account')).toBeTruthy();
    expect(getByPlaceholderText('Thabo')).toBeTruthy();
    expect(getByPlaceholderText('Mokoena')).toBeTruthy();
  });

  it('validates Step 1 and moves to Step 2', async () => {
    const { getByText, getByPlaceholderText } = render(
      <AuthProvider>
        <Register />
      </AuthProvider>
    );

    fireEvent.changeText(getByPlaceholderText('Thabo'), 'John');
    fireEvent.changeText(getByPlaceholderText('Mokoena'), 'Doe');
    fireEvent.changeText(getByPlaceholderText('name@example.com'), 'john@example.com');
    fireEvent.changeText(getByPlaceholderText('Min 8 characters'), 'password123');
    fireEvent.changeText(getByPlaceholderText('Repeat password'), 'password123');

    fireEvent.press(getByText('Continue'));

    await waitFor(() => {
      expect(getByText('Step 2 of 3')).toBeTruthy();
      expect(getByText('Personal Info')).toBeTruthy();
    });
  });

  it('does not request document uploads during client registration', async () => {
    const { getByText, getAllByText, getByPlaceholderText, queryByText } = render(
      <AuthProvider>
        <Register />
      </AuthProvider>
    );

    fireEvent.changeText(getByPlaceholderText('Thabo'), 'John');
    fireEvent.changeText(getByPlaceholderText('Mokoena'), 'Doe');
    fireEvent.changeText(getByPlaceholderText('name@example.com'), 'john@example.com');
    fireEvent.changeText(getByPlaceholderText('Min 8 characters'), 'password123');
    fireEvent.changeText(getByPlaceholderText('Repeat password'), 'password123');
    fireEvent.press(getByText('Continue'));

    await waitFor(() => expect(getByText('Personal Info')).toBeTruthy());
    fireEvent.changeText(getByPlaceholderText('081 000 1111'), '0820000000');
    fireEvent.press(getByText(/female/i));
    fireEvent.changeText(getByPlaceholderText('Enter number'), '9001010000080');
    fireEvent.changeText(getByPlaceholderText("Kin's full name"), 'Kin Person');
    fireEvent.changeText(getByPlaceholderText('081...'), '0821111111');
    fireEvent.press(getByText('Continue'));

    await waitFor(() => expect(getAllByText('Complete Registration').length).toBeGreaterThan(0));
    expect(queryByText('Verification Documents')).toBeNull();
    expect(queryByText('Profile Photo')).toBeNull();
    expect(queryByText('ID Document')).toBeNull();
  });
});
