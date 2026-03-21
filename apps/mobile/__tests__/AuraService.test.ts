import AuraService from '../services/auraService';
import apiClient from '../api/client';

// Mock apiClient
jest.mock('../api/client', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));

describe('AuraService UNIT TESTS', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getAuraAccessToken', () => {
    it('successfully fetches a token from the backend', async () => {
      const mockToken = 'mock-aura-token-123';
      (apiClient.get as jest.Mock).mockResolvedValue({
        data: { success: true, data: { token: mockToken } }
      });

      const token = await AuraService.getAuraAccessToken();
      
      expect(apiClient.get).toHaveBeenCalledWith('/emergency/config');
      expect(token).toBe(mockToken);
    });

    it('throws an error when the backend call fails', async () => {
      const mockError = new Error('Network error');
      (apiClient.get as jest.Mock).mockRejectedValue(mockError);

      await expect(AuraService.getAuraAccessToken()).rejects.toThrow('Network error');
    });
  });

  describe('triggerAlert', () => {
    const mockPayload: any = {
      alert_type: 'security',
      location: { latitude: -26.2041, longitude: 28.0473 },
      timestamp: '2026-03-20T21:00:00Z',
    };

    it('logs the alert to the backend and then triggers Aura', async () => {
      (apiClient.post as jest.Mock).mockResolvedValue({
        data: { success: true, message: 'Alert triggered' }
      });

      const result = await AuraService.triggerAlert(mockPayload);

      // Check first call (log)
      expect(apiClient.post).toHaveBeenCalledWith('/emergency/log', {
        alert_type: mockPayload.alert_type,
        location: mockPayload.location,
        timestamp: mockPayload.timestamp
      });

      // Check second call (trigger)
      expect(apiClient.post).toHaveBeenCalledWith('/emergency/trigger', mockPayload);
      expect(result.success).toBe(true);
    });
  });

  describe('addCustomer', () => {
    it('calls the correct endpoint with user data', async () => {
      const userData = { full_name: 'Test user', id_number: '123' };
      (apiClient.post as jest.Mock).mockResolvedValue({ data: { success: true } });

      await AuraService.addCustomer(userData);

      expect(apiClient.post).toHaveBeenCalledWith('/emergency/customer/add', userData);
    });
  });
});
