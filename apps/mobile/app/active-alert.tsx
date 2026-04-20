import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import { useEmergency } from '../contexts/EmergencyContext';
import { Typography } from '../components/UI/Typography';
import { Button } from '../components/UI/Button';
import { COLORS, SPACING, SIZES } from '../constants/Theme';
import { X, ShieldAlert, Activity, RefreshCw } from 'lucide-react-native';

export default function ActiveAlert() {
    const { isAlertActive, endAlert, alertUrl, activeAlertType } = useEmergency();
    const [isLoading, setIsLoading] = useState(true);

    const handleEndAlert = () => {
        Alert.alert(
            "End Emergency?",
            "Are you sure you want to end this emergency alert?",
            [
                { text: "Cancel", style: "cancel" },
                { 
                    text: "End Alert", 
                    style: "destructive",
                    onPress: () => endAlert()
                }
            ]
        );
    };

    if (!isAlertActive) {
        return (
            <View style={styles.errorContainer}>
                <Typography variant="h3">No Active Alert</Typography>
                <Button title="Back to Account Management" onPress={endAlert} style={{ marginTop: 20 }} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.titleRow}>
                    {activeAlertType === 'security' ? (
                        <ShieldAlert color={COLORS.error} size={24} />
                    ) : (
                        <Activity color={COLORS.primary} size={24} />
                    )}
                    <Typography variant="h2" weight="bold" style={{ marginLeft: 10, color: COLORS.white }}>
                        {activeAlertType?.toUpperCase()} ALERT LIVE
                    </Typography>
                </View>
                <TouchableOpacity style={styles.closeButton} onPress={handleEndAlert}>
                    <X color={COLORS.white} size={24} />
                </TouchableOpacity>
            </View>

            {/* WebView for Aura Response Dashboard */}
            <View style={styles.webviewContainer}>
                {isLoading && (
                    <View style={styles.loader}>
                        <ActivityIndicator size="large" color={COLORS.primary} />
                        <Typography style={{ marginTop: 10 }}>Connecting to Aura Command Center...</Typography>
                    </View>
                )}
                <WebView
                    source={{ uri: alertUrl || 'https://panic.aura.services/mock' }}
                    style={styles.webview}
                    onLoadEnd={() => setIsLoading(false)}
                />
            </View>

            {/* Footer Status */}
            <View style={styles.footer}>
                <View style={styles.statusBadge}>
                    <View style={styles.pulse} />
                    <Typography variant="label" weight="bold" color={COLORS.error}>TRANSMITTING GPS DATA</Typography>
                </View>
                <Button 
                    title="END EMERGENCY" 
                    variant="danger" 
                    onPress={handleEndAlert}
                    style={styles.endButton}
                />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#111',
    },
    header: {
        paddingTop: 60,
        paddingHorizontal: SPACING.lg,
        paddingBottom: 20,
        backgroundColor: '#111',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    closeButton: {
        padding: 5,
    },
    webviewContainer: {
        flex: 1,
        backgroundColor: COLORS.white,
    },
    webview: {
        flex: 1,
    },
    loader: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: COLORS.white,
        zIndex: 1,
    },
    footer: {
        padding: SPACING.lg,
        paddingBottom: 40,
        backgroundColor: '#111',
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(239, 68, 68, 0.3)',
        marginBottom: 20,
    },
    pulse: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: COLORS.error,
        marginRight: 10,
    },
    endButton: {
        height: 56,
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    }
});
