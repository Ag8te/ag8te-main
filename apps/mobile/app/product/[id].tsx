import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Image, ActivityIndicator, Dimensions, Share } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import apiClient, { getImageUrl } from '../../api/client';
import { useCart } from '../../contexts/CartContext';
import { ArrowLeft, ShoppingBag, Star, Share2, Heart, Plus, Minus, Check, Truck, ShieldCheck, RotateCcw, MapPin } from 'lucide-react-native';
import { COLORS, SPACING, SIZES, SHADOWS } from '../../constants/Theme';
import { Typography } from '../../components/UI/Typography';
import { Button } from '../../components/UI/Button';

const { width } = Dimensions.get('window');

const normalizeProductLocations = (value: unknown): string[] => {
    if (Array.isArray(value)) {
        return value.map((item) => String(item || '').trim()).filter(Boolean);
    }
    if (typeof value === 'string') {
        return value.split(',').map((item) => item.trim()).filter(Boolean);
    }
    return [];
};

export default function ProductDetails() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const { addItem, itemCount } = useCart();
    const [quantity, setQuantity] = useState(1);

    const { data: product, isLoading, error } = useQuery({
        queryKey: ['product', id],
        queryFn: async () => {
            const response = await apiClient.get(`/shop/products/${id}`);
            return response.data?.data || null;
        },
        enabled: !!id,
    });

    const handleAddToCart = () => {
        if (!product) return;
        addItem({ ...product, quantity });
        router.push('/cart');
    };

    const handleShare = async () => {
        try {
            await Share.share({
                message: `Check out ${product?.name} on MzansiServe!`,
                url: `https://mzansiserve.com/shop/product/${id}`,
            });
        } catch (error) {
            console.error(error);
        }
    };

    if (isLoading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
        );
    }

    if (error || !product) {
        return (
            <View style={styles.center}>
                <Typography variant="h3">Product not found</Typography>
                <Button title="Back to Shop" onPress={() => router.back()} style={{ marginTop: SPACING.md }} />
            </View>
        );
    }

    const inStock = product.in_stock !== false;
    const price = typeof product.price === 'string' ? parseFloat(product.price) : product.price;
    const productLocations = normalizeProductLocations(product.locations);

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.iconButton} onPress={() => router.back()}>
                    <ArrowLeft color={COLORS.gray[800]} size={24} />
                </TouchableOpacity>
                <View style={{ flexDirection: 'row' }}>
                    <TouchableOpacity style={[styles.iconButton, { marginRight: SPACING.sm }]} onPress={handleShare}>
                        <Share2 color={COLORS.gray[800]} size={20} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.iconButton} onPress={() => router.push('/cart' as any)}>
                        <ShoppingBag color={COLORS.gray[800]} size={20} />
                        {itemCount > 0 && (
                            <View style={styles.cartBadge}>
                                <Typography variant="caption" color={COLORS.white} weight="bold" style={{ fontSize: 10 }}>
                                    {itemCount}
                                </Typography>
                            </View>
                        )}
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                {/* Image Gallery */}
                <View style={styles.imageContainer}>
                    <Image
                        source={{ uri: product.image_url || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=500' }}
                        style={styles.image}
                        resizeMode="contain"
                    />
                    <TouchableOpacity style={styles.wishlistButton}>
                        <Heart size={24} color={COLORS.gray[400]} />
                    </TouchableOpacity>
                </View>

                {/* Product Info */}
                <View style={styles.content}>
                    <View style={styles.categoryRow}>
                        <View style={styles.categoryBadge}>
                            <Typography variant="caption" color={COLORS.primary} weight="bold">
                                {product.category?.title || 'GENERAL'}
                            </Typography>
                        </View>
                        <View style={[styles.stockBadge, { backgroundColor: inStock ? COLORS.success + '10' : COLORS.error + '10' }]}>
                            <Typography variant="caption" color={inStock ? COLORS.success : COLORS.error} weight="bold">
                                {inStock ? 'IN STOCK' : 'OUT OF STOCK'}
                            </Typography>
                        </View>
                        {productLocations.map((location) => (
                            <View key={location} style={styles.locationBadge}>
                                <MapPin size={12} color={COLORS.primary} />
                                <Typography variant="caption" color={COLORS.gray[600]} weight="bold">
                                    {location.toUpperCase()}
                                </Typography>
                            </View>
                        ))}
                    </View>

                    <Typography variant="h1" weight="bold" style={styles.title}>
                        {product.name}
                    </Typography>

                    <View style={styles.ratingRow}>
                        <View style={styles.stars}>
                            {[1, 2, 3, 4, 5].map((i) => (
                                <Star key={i} size={16} color={i <= 4 ? "#FBBF24" : COLORS.gray[200]} fill={i <= 4 ? "#FBBF24" : "transparent"} />
                            ))}
                        </View>
                        <Typography variant="body" weight="bold" style={{ marginLeft: 8 }}>4.5</Typography>
                        <Typography variant="caption" color={COLORS.gray[400]} style={{ marginLeft: 8 }}>(48 Reviews)</Typography>
                    </View>

                    <View style={styles.priceRow}>
                        <Typography variant="h1" color={COLORS.primary} weight="bold">
                            R{price.toLocaleString()}
                        </Typography>
                        <Typography variant="subtitle" color={COLORS.gray[300]} style={styles.originalPrice}>
                            R{(price * 1.2).toLocaleString()}
                        </Typography>
                        <View style={styles.discountBadge}>
                            <Typography variant="caption" color={COLORS.primary} weight="bold">-20%</Typography>
                        </View>
                    </View>

                    <View style={styles.section}>
                        <Typography variant="subtitle" weight="bold" style={{ marginBottom: SPACING.sm }}>Description</Typography>
                        <Typography variant="body" color={COLORS.gray[600]} style={{ lineHeight: 22 }}>
                            {product.description || "No description available for this product. Our ads items are curated for quality and value."}
                        </Typography>
                    </View>

                    {/* Trust Features */}
                    <View style={styles.trustGrid}>
                        <View style={styles.trustItem}>
                            <View style={[styles.trustIcon, { backgroundColor: '#EFF6FF' }]}>
                                <Truck size={20} color="#3B82F6" />
                            </View>
                            <Typography variant="caption" weight="bold" align="center">FAST DELIVERY</Typography>
                        </View>
                        <View style={styles.trustItem}>
                            <View style={[styles.trustIcon, { backgroundColor: '#ECFDF5' }]}>
                                <ShieldCheck size={20} color="#10B981" />
                            </View>
                            <Typography variant="caption" weight="bold" align="center">SECURE PAY</Typography>
                        </View>
                        <View style={styles.trustItem}>
                            <View style={[styles.trustIcon, { backgroundColor: '#FFFBEB' }]}>
                                <RotateCcw size={20} color="#F59E0B" />
                            </View>
                            <Typography variant="caption" weight="bold" align="center">EASY RETURNS</Typography>
                        </View>
                    </View>
                </View>
            </ScrollView>

            {/* Footer Actions */}
            <View style={styles.footer}>
                <View style={styles.quantitySelector}>
                    <TouchableOpacity
                        style={styles.qtyBtn}
                        onPress={() => setQuantity(Math.max(1, quantity - 1))}
                    >
                        <Minus size={20} color={COLORS.gray[600]} />
                    </TouchableOpacity>
                    <Typography variant="subtitle" weight="bold" style={{ width: 40, textAlign: 'center' }}>
                        {quantity}
                    </Typography>
                    <TouchableOpacity
                        style={styles.qtyBtn}
                        onPress={() => setQuantity(quantity + 1)}
                    >
                        <Plus size={20} color={COLORS.gray[600]} />
                    </TouchableOpacity>
                </View>
                <Button
                    title="Add to Bag"
                    onPress={handleAddToCart}
                    disabled={!inStock}
                    style={{ flex: 1, marginLeft: SPACING.lg }}
                    icon={<ShoppingBag size={20} color={COLORS.white} />}
                />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.white,
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: SPACING.lg,
        paddingTop: 60,
        backgroundColor: COLORS.white,
        zIndex: 10,
    },
    iconButton: {
        width: 40,
        height: 40,
        backgroundColor: COLORS.gray[50],
        borderRadius: SIZES.radius.md,
        justifyContent: 'center',
        alignItems: 'center',
    },
    cartBadge: {
        position: 'absolute',
        top: -5,
        right: -5,
        backgroundColor: COLORS.error,
        borderRadius: 9,
        minWidth: 18,
        height: 18,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: COLORS.white,
    },
    scrollContent: {
        paddingBottom: 120,
    },
    imageContainer: {
        width: width,
        height: 350,
        backgroundColor: COLORS.gray[50],
        justifyContent: 'center',
        alignItems: 'center',
    },
    image: {
        width: '80%',
        height: '80%',
    },
    wishlistButton: {
        position: 'absolute',
        top: SPACING.lg,
        right: SPACING.lg,
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: COLORS.white,
        justifyContent: 'center',
        alignItems: 'center',
        ...SHADOWS.md,
    },
    content: {
        padding: SPACING.xl,
        marginTop: -30,
        backgroundColor: COLORS.white,
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
    },
    categoryRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: SPACING.md,
    },
    categoryBadge: {
        backgroundColor: COLORS.primary + '10',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: SIZES.radius.full,
        marginRight: SPACING.sm,
    },
    stockBadge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: SIZES.radius.full,
    },
    locationBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: COLORS.gray[100],
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: SIZES.radius.full,
    },
    title: {
        marginBottom: SPACING.sm,
    },
    ratingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: SPACING.lg,
    },
    stars: {
        flexDirection: 'row',
    },
    priceRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
        marginBottom: SPACING.xl,
    },
    originalPrice: {
        textDecorationLine: 'line-through',
        marginLeft: SPACING.md,
    },
    discountBadge: {
        backgroundColor: COLORS.primary + '10',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: SIZES.radius.sm,
        marginLeft: SPACING.md,
    },
    section: {
        marginBottom: SPACING.xl,
    },
    trustGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingTop: SPACING.xl,
        borderTopWidth: 1,
        borderTopColor: COLORS.gray[100],
    },
    trustItem: {
        alignItems: 'center',
        flex: 1,
    },
    trustIcon: {
        width: 44,
        height: 44,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: COLORS.white,
        padding: SPACING.lg,
        paddingBottom: 40,
        flexDirection: 'row',
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: COLORS.gray[100],
        ...SHADOWS.lg,
    },
    quantitySelector: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.gray[50],
        borderRadius: SIZES.radius.md,
        padding: 4,
    },
    qtyBtn: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
});
