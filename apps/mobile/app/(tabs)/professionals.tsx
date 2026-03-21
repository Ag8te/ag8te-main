import React, { useState } from 'react';
import { View, StyleSheet, FlatList, ActivityIndicator, Image, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import apiClient from '../../api/client';
import { Search, MapPin, Star, Users, Zap } from 'lucide-react-native';
import { COLORS, SPACING, SIZES } from '../../constants/Theme';
import { Typography } from '../../components/UI/Typography';
import { Card } from '../../components/UI/Card';
import { Input } from '../../components/UI/Input';

const CATEGORIES = ['All', 'Accountant', 'Lawyer', 'IT Specialist', 'Architect', 'Consultant', 'Tutor', 'Engineer'];

export default function Professionals() {
    const router = useRouter();
    const [search, setSearch] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('All');

    const { data, isLoading, error } = useQuery({
        queryKey: ['professionals'],
        queryFn: async () => {
            const response = await apiClient.get('/profile/professionals');
            return response.data?.data?.professionals || [];
        },
    });

    const filteredData = data?.filter((item: any) => {
        const user = item.professional || {};
        const userData = user.data || {};
        const name = `${user.full_name || ''} ${user.surname || ''}`.trim() || user.name || 'Professional';
        const matchesSearch = name.toLowerCase().includes(search.toLowerCase());
        
        if (selectedCategory === 'All') return matchesSearch;
        
        const profession = userData.profession || '';
        const services = item.services || [];
        const matchesCategory = profession.toLowerCase().includes(selectedCategory.toLowerCase()) ||
                              services.some((s: any) => 
                                s.name.toLowerCase().includes(selectedCategory.toLowerCase()) ||
                                (s.category && s.category.toLowerCase().includes(selectedCategory.toLowerCase()))
                              );
        
        return matchesSearch && matchesCategory;
    });

    const renderHeader = () => (
        <View style={styles.header}>
            <Typography variant="h2" weight="bold" style={{ marginBottom: SPACING.md }}>Professionals</Typography>
            <Input
                placeholder="Search for professionals..."
                value={search}
                onChangeText={setSearch}
                icon={<Search color={COLORS.gray[400]} size={20} />}
                containerStyle={{ marginBottom: SPACING.md }}
            />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categories}>
                {CATEGORIES.map((cat) => (
                    <TouchableOpacity
                        key={cat}
                        onPress={() => setSelectedCategory(cat)}
                        style={[
                            styles.categoryChip,
                            selectedCategory === cat && styles.categoryChipActive
                        ]}
                    >
                        <Typography
                            variant="label"
                            color={selectedCategory === cat ? COLORS.white : COLORS.gray[600]}
                            weight={selectedCategory === cat ? 'bold' : 'medium'}
                        >
                            {cat}
                        </Typography>
                    </TouchableOpacity>
                ))}
            </ScrollView>
        </View>
    );

    const renderItem = ({ item }: { item: any }) => {
        const user = item.professional || {};
        const name = `${user.full_name || ''} ${user.surname || ''}`.trim() || user.name || 'Professional';

        return (
            <Card shadow="sm" style={[styles.card, { padding: 0 }]}>
                <TouchableOpacity
                    activeOpacity={0.9}
                    style={styles.cardInner}
                    onPress={() => router.push({ pathname: '/provider/[id]', params: { id: user.id || item.professional?.id, category: 'professionals' } })}
                >
                    <Image
                        source={{ uri: user.profile_image_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&size=150` }}
                        style={styles.image}
                    />
                    <View style={styles.cardContent}>
                        <View style={styles.titleRow}>
                            <Typography variant="subtitle" weight="bold" numberOfLines={1} style={{ flex: 1 }}>
                                {name}
                            </Typography>
                            <View style={styles.badge}>
                                <Typography variant="caption" color={COLORS.primary} weight="bold">PRO</Typography>
                            </View>
                        </View>

                        <View style={styles.infoRow}>
                            <View style={styles.ratingBox}>
                                <Star size={14} color="#FBBF24" fill="#FBBF24" />
                                <Typography variant="caption" weight="bold" style={{ marginLeft: 4 }}>4.9</Typography>
                            </View>
                            <View style={styles.dot} />
                            <Typography variant="caption" color={COLORS.gray[500]}>Verified</Typography>
                        </View>

                        <Typography variant="label" color={COLORS.gray[600]} numberOfLines={1} style={{ marginTop: 4 }}>
                            {user.data?.profession || 'Independent Professional'}
                        </Typography>

                        <View style={styles.cardFooter}>
                            <View style={styles.locationBox}>
                                <MapPin size={12} color={COLORS.gray[400]} />
                                <Typography variant="caption" color={COLORS.gray[500]} style={{ marginLeft: 4 }}>
                                    South Africa
                                </Typography>
                            </View>
                            {item.min_hourly_rate && (
                                <Typography variant="subtitle" weight="bold" color={COLORS.secondary}>
                                    R{item.min_hourly_rate}/hr
                                </Typography>
                            )}
                        </View>
                    </View>
                </TouchableOpacity>
            </Card>
        );
    };

    if (isLoading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Typography variant="body" color={COLORS.gray[500]} style={{ marginTop: 12 }}>
                    Loading professionals...
                </Typography>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <FlatList
                data={filteredData}
                renderItem={renderItem}
                keyExtractor={(item) => item.professional?.id?.toString() || Math.random().toString()}
                ListHeaderComponent={renderHeader}
                contentContainerStyle={styles.list}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Users size={64} color={COLORS.gray[200]} />
                        <Typography variant="h3" color={COLORS.gray[400]} style={{ marginTop: 16 }}>
                            No professionals found
                        </Typography>
                        <Typography variant="body" color={COLORS.gray[500]} align="center" style={{ marginTop: 8 }}>
                            Check back later.
                        </Typography>
                    </View>
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: COLORS.background,
    },
    header: {
        padding: SPACING.lg,
        backgroundColor: COLORS.white,
        borderBottomLeftRadius: SIZES.radius.xl,
        borderBottomRightRadius: SIZES.radius.xl,
        marginBottom: SPACING.md,
    },
    categories: {
        paddingVertical: SPACING.xs,
    },
    categoryChip: {
        paddingHorizontal: SPACING.lg,
        paddingVertical: SPACING.sm,
        borderRadius: SIZES.radius.full,
        backgroundColor: COLORS.gray[50],
        marginRight: SPACING.sm,
        borderWidth: 1,
        borderColor: COLORS.gray[100],
    },
    categoryChipActive: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary,
    },
    list: {
        paddingBottom: SPACING.xl,
    },
    card: {
        marginHorizontal: SPACING.lg,
        marginBottom: SPACING.md,
        borderRadius: SIZES.radius.lg,
        overflow: 'hidden',
        backgroundColor: COLORS.white,
        borderWidth: 1,
        borderColor: COLORS.gray[100],
    },
    cardInner: {
        flexDirection: 'row',
        padding: SPACING.md,
    },
    image: {
        width: 90,
        height: 90,
        borderRadius: SIZES.radius.md,
        backgroundColor: COLORS.gray[100],
    },
    cardContent: {
        flex: 1,
        marginLeft: SPACING.md,
    },
    titleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    badge: {
        backgroundColor: COLORS.primary + '10',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        marginLeft: 8,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
    },
    ratingBox: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    dot: {
        width: 3,
        height: 3,
        borderRadius: 1.5,
        backgroundColor: COLORS.gray[300],
        marginHorizontal: 8,
    },
    cardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 12,
    },
    locationBox: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    emptyContainer: {
        alignItems: 'center',
        padding: SPACING.xxl,
        marginTop: SPACING.xxl,
    },
});
