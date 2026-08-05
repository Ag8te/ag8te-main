import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, FlatList, Image } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import apiClient from '../api/client';
import { ArrowLeft, Calendar, ShoppingBag, Clock, CheckCircle, ChevronRight, Package, MapPin } from 'lucide-react-native';
import { COLORS, SPACING, SIZES, SHADOWS } from '../constants/Theme';
import { Typography } from '../components/UI/Typography';
import { Card } from '../components/UI/Card';

export default function History() {
    const { type: initialType } = useLocalSearchParams<{ type: 'bookings' | 'orders' }>();
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<'bookings' | 'orders'>(initialType || 'bookings');

    const { data: bookings, isLoading: loadingBookings } = useQuery({
        queryKey: ['my-bookings'],
        queryFn: async () => {
            const res = await apiClient.get('/requests/my-requests');
            return res.data?.data?.requests || [];
        },
        enabled: activeTab === 'bookings'
    });

    const { data: orders, isLoading: loadingOrders } = useQuery({
        queryKey: ['my-orders'],
        queryFn: async () => {
            const res = await apiClient.get('/marketplace/my-orders');
            return res.data?.data?.orders || [];
        },
        enabled: activeTab === 'orders'
    });

    const renderBookingItem = ({ item }: { item: any }) => (
        <Card shadow="sm" style={styles.itemCard}>
            <TouchableOpacity style={styles.itemInner} onPress={() => {}}>
                <View style={styles.itemHeader}>
                    <View style={styles.statusBadge}>
                        <Typography variant="caption" weight="bold" color={COLORS.primary}>
                            {item.status?.toUpperCase() || 'PENDING'}
                        </Typography>
                    </View>
                    <Typography variant="caption" color={COLORS.gray[400]}>
                        {new Date(item.created_at).toLocaleDateString()}
                    </Typography>
                </View>

                <View style={styles.itemBody}>
                    <View style={styles.iconCircle}>
                        <Calendar size={20} color={COLORS.primary} />
                    </View>
                    <View style={{ flex: 1, marginLeft: SPACING.md }}>
                        <Typography variant="body" weight="bold">
                            {item.preferences?.service_name || 'General Service'}
                        </Typography>
                        <Typography variant="caption" color={COLORS.gray[500]} style={{ marginTop: 2 }}>
                            With {item.provider_name || 'Service Provider'}
                        </Typography>
                    </View>
                    <Typography variant="body" weight="bold">R{item.payment_amount || '0'}</Typography>
                </View>

                <View style={styles.itemFooter}>
                    <MapPin size={12} color={COLORS.gray[400]} />
                    <Typography variant="caption" color={COLORS.gray[500]} style={{ marginLeft: 4 }}>
                        {item.location?.address || 'On-site'}
                    </Typography>
                </View>
            </TouchableOpacity>
        </Card>
    );

    const renderOrderItem = ({ item }: { item: any }) => (
        <Card shadow="sm" style={styles.itemCard}>
            <TouchableOpacity style={styles.itemInner} onPress={() => {}}>
                <View style={styles.itemHeader}>
                    <View style={[styles.statusBadge, { backgroundColor: COLORS.secondary + '10' }]}>
                        <Typography variant="caption" weight="bold" color={COLORS.secondary}>
                            {item.status?.toUpperCase() || 'PAID'}
                        </Typography>
                    </View>
                    <Typography variant="caption" color={COLORS.gray[400]}>
                        #{item.id?.substring(0, 8).toUpperCase()}
                    </Typography>
                </View>

                <View style={styles.itemBody}>
                    <View style={[styles.iconCircle, { backgroundColor: COLORS.secondary + '10' }]}>
                        <Package size={20} color={COLORS.secondary} />
                    </View>
                    <View style={{ flex: 1, marginLeft: SPACING.md }}>
                        <Typography variant="body" weight="bold">
                            Order from {item.shop_name || 'AG8TE Store'}
                        </Typography>
                        <Typography variant="caption" color={COLORS.gray[500]} style={{ marginTop: 2 }}>
                            {item.items?.length || 0} items
                        </Typography>
                    </View>
                    <Typography variant="body" weight="bold">R{item.total_amount || item.amount || '0'}</Typography>
                </View>

                <View style={styles.itemFooter}>
                    <Clock size={12} color={COLORS.gray[400]} />
                    <Typography variant="caption" color={COLORS.gray[500]} style={{ marginLeft: 4 }}>
                        Ordered on {new Date(item.created_at).toLocaleDateString()}
                    </Typography>
                </View>
            </TouchableOpacity>
        </Card>
    );

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                    <ArrowLeft color={COLORS.gray[800]} size={24} />
                </TouchableOpacity>
                <Typography variant="h2" weight="bold" style={{ marginLeft: SPACING.md }}>
                    Activity History
                </Typography>
            </View>

            <View style={styles.tabs}>
                <TouchableOpacity 
                    style={[styles.tab, activeTab === 'bookings' && styles.activeTab]}
                    onPress={() => setActiveTab('bookings')}
                >
                    <Typography 
                        variant="body" 
                        weight="bold" 
                        color={activeTab === 'bookings' ? COLORS.primary : COLORS.gray[400]}
                    >
                        Bookings
                    </Typography>
                </TouchableOpacity>
                <TouchableOpacity 
                    style={[styles.tab, activeTab === 'orders' && styles.activeTab]}
                    onPress={() => setActiveTab('orders')}
                >
                    <Typography 
                        variant="body" 
                        weight="bold" 
                        color={activeTab === 'orders' ? COLORS.primary : COLORS.gray[400]}
                    >
                        Orders
                    </Typography>
                </TouchableOpacity>
            </View>

            {activeTab === 'bookings' ? (
                loadingBookings ? (
                    <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 40 }} />
                ) : (
                    <FlatList
                        data={bookings}
                        renderItem={renderBookingItem}
                        keyExtractor={(item) => item.id}
                        contentContainerStyle={styles.list}
                        ListEmptyComponent={
                            <View style={styles.empty}>
                                <Calendar size={64} color={COLORS.gray[200]} />
                                <Typography variant="h3" color={COLORS.gray[400]} style={{ marginTop: 16 }}>No bookings yet</Typography>
                                <Typography variant="body" color={COLORS.gray[500]} align="center" style={{ marginTop: 8 }}>
                                    Your service requests will appear here.
                                </Typography>
                            </View>
                        }
                    />
                )
            ) : (
                loadingOrders ? (
                    <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 40 }} />
                ) : (
                    <FlatList
                        data={orders}
                        renderItem={renderOrderItem}
                        keyExtractor={(item) => item.id}
                        contentContainerStyle={styles.list}
                        ListEmptyComponent={
                            <View style={styles.empty}>
                                <ShoppingBag size={64} color={COLORS.gray[200]} />
                                <Typography variant="h3" color={COLORS.gray[400]} style={{ marginTop: 16 }}>No orders yet</Typography>
                                <Typography variant="body" color={COLORS.gray[500]} align="center" style={{ marginTop: 8 }}>
                                    Your marketplace purchases will appear here.
                                </Typography>
                            </View>
                        }
                    />
                )
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.gray[50],
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: SPACING.lg,
        paddingTop: SPACING.xxl,
        paddingBottom: SPACING.md,
        backgroundColor: COLORS.white,
    },
    backButton: {
        width: 40,
        height: 40,
        backgroundColor: COLORS.gray[50],
        borderRadius: SIZES.radius.full,
        justifyContent: 'center',
        alignItems: 'center',
    },
    tabs: {
        flexDirection: 'row',
        backgroundColor: COLORS.white,
        paddingHorizontal: SPACING.lg,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.gray[100],
    },
    tab: {
        flex: 1,
        paddingVertical: SPACING.md,
        alignItems: 'center',
        borderBottomWidth: 2,
        borderBottomColor: 'transparent',
    },
    activeTab: {
        borderBottomColor: COLORS.primary,
    },
    list: {
        padding: SPACING.lg,
    },
    itemCard: {
        marginBottom: SPACING.md,
        padding: 0,
        borderRadius: SIZES.radius.lg,
    },
    itemInner: {
        padding: SPACING.md,
    },
    itemHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.md,
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        backgroundColor: COLORS.primary + '10',
        borderRadius: 4,
    },
    itemBody: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconCircle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: COLORS.primary + '10',
        justifyContent: 'center',
        alignItems: 'center',
    },
    itemFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: SPACING.md,
        paddingTop: SPACING.sm,
        borderTopWidth: 1,
        borderTopColor: COLORS.gray[50],
    },
    empty: {
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 100,
        paddingHorizontal: 40,
    }
});
