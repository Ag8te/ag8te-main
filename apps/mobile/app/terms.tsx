import React from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Shield } from 'lucide-react-native';
import { COLORS, SPACING, SIZES } from '../constants/Theme';
import { Typography } from '../components/UI/Typography';

export default function Terms() {
    const router = useRouter();

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                    <ArrowLeft color={COLORS.gray[800]} size={24} />
                </TouchableOpacity>
                <Typography variant="h2" weight="bold" style={{ marginLeft: SPACING.md }}>
                    Terms & Conditions
                </Typography>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <View style={styles.infoBox}>
                    <Shield size={24} color={COLORS.primary} />
                    <Typography variant="body" weight="bold" style={{ marginLeft: SPACING.md }}>
                        Our Commitment to You
                    </Typography>
                </View>

                <View style={styles.section}>
                    <Typography variant="subtitle" weight="bold" style={{ marginBottom: 8 }}>1. Acceptance of Terms</Typography>
                    <Typography variant="body" color={COLORS.gray[600]}>
                        By accessing and using MzansiServe, you agree to comply with and be bound by these Terms and Conditions. If you do not agree to these terms, please do not use the application.
                    </Typography>
                </View>

                <View style={styles.section}>
                    <Typography variant="subtitle" weight="bold" style={{ marginBottom: 8 }}>2. User Registration</Typography>
                    <Typography variant="body" color={COLORS.gray[600]}>
                        To use certain features of the app, you must register for an account. You agree to provide accurate, current, and complete information during the registration process and to update such information to keep it accurate, current, and complete.
                    </Typography>
                </View>

                <View style={styles.section}>
                    <Typography variant="subtitle" weight="bold" style={{ marginBottom: 8 }}>3. Services and Fees</Typography>
                    <Typography variant="body" color={COLORS.gray[600]}>
                        MzansiServe facilitates connections between service providers and clients. We may charge fees for certain services. All fees are clearly stated at the time of booking or purchase.
                    </Typography>
                </View>

                <View style={styles.section}>
                    <Typography variant="subtitle" weight="bold" style={{ marginBottom: 8 }}>4. Privacy Policy</Typography>
                    <Typography variant="body" color={COLORS.gray[600]}>
                        Your use of the app is also governed by our Privacy Policy. Please review our Privacy Policy to understand our practices.
                    </Typography>
                </View>

                <View style={styles.section}>
                    <Typography variant="subtitle" weight="bold" style={{ marginBottom: 8 }}>5. Limitation of Liability</Typography>
                    <Typography variant="body" color={COLORS.gray[600]}>
                        MzansiServe is not liable for any direct, indirect, incidental, special, or consequential damages resulting from the use or inability to use the app or for the cost of procurement of substitute services.
                    </Typography>
                </View>

                <Typography variant="caption" color={COLORS.gray[400]} style={{ marginTop: SPACING.xxl, marginBottom: SPACING.xl, textAlign: 'center' }}>
                    Last updated: October 2023
                </Typography>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.white,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: SPACING.lg,
        paddingTop: SPACING.xxl,
        paddingBottom: SPACING.md,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.gray[100],
    },
    backButton: {
        width: 40,
        height: 40,
        backgroundColor: COLORS.gray[50],
        borderRadius: SIZES.radius.full,
        justifyContent: 'center',
        alignItems: 'center',
    },
    scrollContent: {
        padding: SPACING.lg,
    },
    infoBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.primary + '08',
        padding: SPACING.lg,
        borderRadius: SIZES.radius.lg,
        marginVertical: SPACING.lg,
    },
    section: {
        marginBottom: SPACING.xl,
    },
});
