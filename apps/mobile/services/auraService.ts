import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import apiClient from '../api/client';

// Aura API Configuration
const AURA_BASE_URL = 'https://panic.aura.services/panic-api/v2';
const AURA_CLIENT_ID = 'sb_ag8te_client_id'; // This should ideally come from backend config

export interface AlertPayload {
    external_user_id: string;
    role: string;
    location: {
        latitude: number;
        longitude: number;
        accuracy?: number;
    };
    alert_type: 'security' | 'medical';
    timestamp: string;
}

/**
 * Service to handle Aura Emergency integration
 */
export const AuraService = {
    /**
     * Get Aura Access Token (Ideally this should be cached or handled by backend)
     */
    async getAuraAccessToken() {
        // In a real scenario, the backend should provide this to avoid exposing client_secret
        // For development, we might mock this or call a backend endpoint
        try {
            const response = await apiClient.get('/emergency/config');
            return response.data.data.token; // Example if backend proxies token
        } catch (error) {
            console.error('Failed to get Aura access token:', error);
            throw error;
        }
    },

    /**
     * Trigger an emergency alert
     */
    async triggerAlert(payload: AlertPayload) {
        try {
            // 1. Log alert to our backend first
            await apiClient.post('/emergency/log', {
                alert_type: payload.alert_type,
                location: payload.location,
                timestamp: payload.timestamp
            });

            // 2. Transmit to Aura (Proxy via backend or direct if allowed)
            // For now, mirroring reference project's direct-ish approach but using backend as proxy for security
            const response = await apiClient.post('/emergency/trigger', payload);
            return response.data;
        } catch (error) {
            console.error('Failed to trigger Aura alert:', error);
            throw error;
        }
    },

    /**
     * Add a customer to Aura
     */
    async addCustomer(userData: any) {
        try {
            const response = await apiClient.post('/emergency/customer/add', userData);
            return response.data;
        } catch (error) {
            console.error('Failed to add customer to Aura:', error);
            throw error;
        }
    }
};

export default AuraService;
