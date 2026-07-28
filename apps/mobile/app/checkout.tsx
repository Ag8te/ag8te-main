import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, CheckCircle, MapPin, CreditCard, ExternalLink } from 'lucide-react-native';
import { COLORS, SPACING, SIZES, SHADOWS } from '../constants/Theme';
import { Typography } from '../components/UI/Typography';
import { useCart } from '../contexts/CartContext';
import { Button } from '../components/UI/Button';
import { Input } from '../components/UI/Input';
import * as Linking from 'expo-linking';
import * as SecureStore from 'expo-secure-store';

// Mock Image for PayPal Logo (since we don't have the asset)
const PayPalLogo = () => (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Typography variant="subtitle" weight="bold" color="#003087">Pay</Typography>
        <Typography variant="subtitle" weight="bold" color="#009cde">Pal</Typography>
    </View>
);

export default function Checkout() {
    const router = useRouter();
    const { items, total, clearCart } = useCart();
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState<'card' | 'paypal'>('card');

    const handlePlaceOrder = async () => {
    try {
        setLoading(true);

        // GETTING REAL TOKEN
        const token = await SecureStore.getItemAsync("token");

        if (!token) {
            throw new Error("You must be logged in to make a payment");
        }

        const response = await fetch('https://mzansiserve.co.za/api/payments/create-order', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({
                items,
                shipping_address: "123 Nelson Mandela Blvd",
                total: total,
                provider: paymentMethod === 'paypal' ? 'paypal' : 'yoco'
            })
        });

        const result = await response.json();

        console.log("PAYMENT RESPONSE:", result); //VERY IMPORTANT

        if (!response.ok) {
            throw new Error(result.message || "Payment failed");
        }

        const redirectUrl = result?.data?.redirect_url;

        if (!redirectUrl) {
            throw new Error("No payment URL returned");
        }

        //  OPEN PAYMENT PAGE
        await Linking.openURL(redirectUrl);

    } catch (error: any) {
        console.error("PAYMENT ERROR:", error);
        Alert.alert("Payment Error", error.message);
    } finally {
        setLoading(false);
    }
    };

    if (success) {
        return (
            <View style={styles.successContainer}>
                <CheckCircle size={80} color={COLORS.primary} />
                <Typography variant="h1" weight="bold" style={{ marginTop: SPACING.xl }}>
                    Order Confirmed!
                </Typography>
                <Typography variant="body" color={COLORS.gray[500]} align="center" style={{ marginTop: SPACING.md, paddingHorizontal: SPACING.xl }}>
                    Your purchase was successful. Detailed tracking information has been sent to your email.
                </Typography>
                <Button
                    title="Continue Shopping"
                    onPress={() => router.replace('/(tabs)/shop')}
                    style={{ marginTop: SPACING.xxl, width: 250 }}
                />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                    <ArrowLeft color={COLORS.gray[800]} size={24} />
                </TouchableOpacity>
                <Typography variant="h2" weight="bold" style={{ marginLeft: SPACING.md }}>
                    Secure Checkout
                </Typography>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <MapPin color={COLORS.primary} size={20} />
                        <Typography variant="subtitle" weight="bold" style={{ marginLeft: SPACING.sm }}>
                            Shipping Address
                        </Typography>
                    </View>
                    <View style={styles.card}>
                        <Input placeholder="Full Name" defaultValue="John Doe" />
                        <Input placeholder="Street Address" defaultValue="123 Nelson Mandela Blvd" containerStyle={{ marginTop: SPACING.sm }} />
                        <Input placeholder="City" defaultValue="Cape Town" containerStyle={{ marginTop: SPACING.sm }} />
                        <Input placeholder="Postal Code" defaultValue="8001" keyboardType="numeric" containerStyle={{ marginTop: SPACING.sm }} />
                    </View>
                </View>

                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <CreditCard color={COLORS.primary} size={20} />
                        <Typography variant="subtitle" weight="bold" style={{ marginLeft: SPACING.sm }}>
                            Payment Method
                        </Typography>
                    </View>
                    <View style={styles.paymentMethodContainer}>
                        <TouchableOpacity 
                            style={[styles.paymentMethodOption, paymentMethod === 'card' && styles.paymentMethodActive]}
                            onPress={() => setPaymentMethod('card')}
                        >
                            <CreditCard color={paymentMethod === 'card' ? COLORS.primary : COLORS.gray[400]} size={24} />
                            <Typography variant="body" weight="medium" style={{ marginTop: 4 }}>Card</Typography>
                        </TouchableOpacity>

                        <TouchableOpacity 
                            style={[styles.paymentMethodOption, paymentMethod === 'paypal' && styles.paymentMethodActive]}
                            onPress={() => setPaymentMethod('paypal')}
                        >
                            <PayPalLogo />
                            <Typography variant="body" weight="medium" style={{ marginTop: 4 }}>PayPal</Typography>
                        </TouchableOpacity>
                    </View>

                    {paymentMethod === 'card' ? (
                        <View style={styles.card}>
                            <Input placeholder="Card Number" defaultValue="**** **** **** 4242" keyboardType="numeric" icon={<CreditCard color={COLORS.gray[400]} size={20} />} />
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: SPACING.sm }}>
                                <Input placeholder="MM/YY" defaultValue="12/26" containerStyle={{ flex: 1, marginRight: SPACING.sm }} />
                                <Input placeholder="CVC" defaultValue="123" keyboardType="numeric" secureTextEntry containerStyle={{ flex: 1 }} />
                            </View>
                        </View>
                    ) : (
                        <View style={styles.card}>
                            <Typography variant="body" color={COLORS.gray[600]} style={{ marginBottom: SPACING.md }}>
                                You will be redirected to PayPal to complete your purchase securely.
                            </Typography>
                            <View style={styles.paypalInfo}>
                                <ExternalLink size={16} color={COLORS.gray[400]} />
                                <Typography variant="label" color={COLORS.gray[500]} style={{ marginLeft: 8 }}>
                                    Secure checkout via PayPal
                                </Typography>
                            </View>
                        </View>
                    )}
                </View>

            </ScrollView>

            <View style={styles.footer}>
                <View style={styles.totalRow}>
                    <Typography variant="subtitle" color={COLORS.gray[500]}>Total to Pay</Typography>
                    <Typography variant="h2" weight="bold" color={COLORS.primary}>R{total.toFixed(2)}</Typography>
                </View>
                <Button
                    title={paymentMethod === 'paypal' ? "Pay with PayPal" : "Complete Purchase"}
                    fullWidth
                    size="lg"
                    onPress={handlePlaceOrder}
                    loading={loading}
                    icon={paymentMethod === 'paypal' ? <ExternalLink size={20} color={COLORS.white} /> : <CheckCircle size={20} color={COLORS.white} />}
                    variant={paymentMethod === 'paypal' ? 'primary' : 'primary'}
                />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.gray[50],
    },
    successContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: COLORS.white,
        padding: SPACING.xxl,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: SPACING.lg,
        paddingTop: SPACING.xxl,
        paddingBottom: SPACING.md,
        backgroundColor: COLORS.white,
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
        paddingBottom: 120, // Space for footer
    },
    section: {
        marginBottom: SPACING.xxl,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: SPACING.sm,
        paddingHorizontal: SPACING.xs,
    },
    card: {
        backgroundColor: COLORS.white,
        borderRadius: SIZES.radius.lg,
        padding: SPACING.md,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.05)',
    },
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: COLORS.white,
        padding: SPACING.lg,
        paddingBottom: SPACING.xxl, // Safe area
        borderTopWidth: 1,
        borderTopColor: COLORS.gray[200],
        ...SHADOWS.lg,
    },
    totalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.md,
    },
    paymentMethodContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: SPACING.md,
    },
    paymentMethodOption: {
        flex: 0.48,
        backgroundColor: COLORS.white,
        borderRadius: SIZES.radius.md,
        padding: SPACING.md,
        alignItems: 'center',
        borderWidth: 2,
        borderColor: 'transparent',
        ...SHADOWS.sm,
    },
    paymentMethodActive: {
        borderColor: COLORS.primary,
        backgroundColor: COLORS.primary + '05',
    },
    paypalInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.gray[50],
        padding: SPACING.sm,
        borderRadius: SIZES.radius.sm,
    }
});
