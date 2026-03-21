import React, { useState } from 'react';
import { View, StyleSheet, FlatList, ActivityIndicator, Image, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import apiClient from '../../api/client';
import { Search, MapPin, Star, Filter, Briefcase, Zap } from 'lucide-react-native';
import { COLORS, SPACING, SIZES, SHADOWS } from '../../constants/Theme';
import { Typography } from '../../components/UI/Typography';
import { Card } from '../../components/UI/Card';
import { Input } from '../../components/UI/Input';

const CATEGORIES = ['All', 'Cleaning', 'Plumbing', 'Electrician', 'Gardening', 'Moving', 'Beauty', 'Wellness'];

export default function Services() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  const { data, isLoading, error } = useQuery({
    queryKey: ['service-providers'],
    queryFn: async () => {
      const response = await apiClient.get('/profile/service-providers');
      const providers = response.data?.data?.service_providers || [];
      return providers.map((p: any) => ({ ...p, type: 'provider' }));
    },
  });

  const filteredData = data?.filter((item: any) => {
    const user = item.type === 'professional' ? item.professional : item.provider;
    const userData = user.data || {};
    const name = `${userData.full_name || ''} ${userData.surname || ''}`.trim() || userData.business_name || '';
    const matchesSearch = name.toLowerCase().includes(search.toLowerCase());
    
    if (selectedCategory === 'All') return matchesSearch;
    
    // Check if any service name matches the category
    const services = item.services || [];
    const matchesCategory = services.some((s: any) => 
      s.name.toLowerCase().includes(selectedCategory.toLowerCase()) ||
      (s.category && s.category.toLowerCase().includes(selectedCategory.toLowerCase()))
    );
    
    return matchesSearch && matchesCategory;
  });

  const renderHeader = () => (
    <View style={styles.header}>
      <Typography variant="h2" weight="bold" style={{ marginBottom: SPACING.md }}>Find Services</Typography>
      <Input
        placeholder="Search for services..."
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
    const user = item.type === 'professional' ? item.professional : item.provider;
    const userData = user.data || {};
    const name = `${userData.full_name || ''} ${userData.surname || ''}`.trim() || userData.business_name || 'Service Provider';

    return (
      <Card shadow="sm" style={[styles.card, { padding: 0 }]}>
        <TouchableOpacity
          activeOpacity={0.9}
          style={styles.cardInner}
          onPress={() => router.push({ pathname: '/provider/[id]', params: { id: user.id || item.provider?.id, category: 'services' } })}
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
                <Typography variant="caption" color={COLORS.primary} weight="bold">
                  {item.type === 'professional' ? 'PRO' : 'PARTNER'}
                </Typography>
              </View>
            </View>

            <View style={styles.infoRow}>
              <View style={styles.ratingBox}>
                <Star size={14} color="#FBBF24" fill="#FBBF24" />
                <Typography variant="caption" weight="bold" style={{ marginLeft: 4 }}>4.8</Typography>
              </View>
              <View style={styles.dot} />
              <Typography variant="caption" color={COLORS.gray[500]}>120 Reviews</Typography>
            </View>

            <Typography variant="label" color={COLORS.gray[600]} numberOfLines={1} style={{ marginTop: 4 }}>
              {item.services?.[0]?.description || 'Verified provider ready to assist you with high-quality service.'}
            </Typography>

            <View style={styles.cardFooter}>
              <View style={styles.locationBox}>
                <MapPin size={12} color={COLORS.gray[400]} />
                <Typography variant="caption" color={COLORS.gray[500]} style={{ marginLeft: 4 }}>
                  South Africa
                </Typography>
              </View>
              <Typography variant="subtitle" weight="bold" color={COLORS.secondary}>
                R{item.services?.[0]?.hourly_rate || '200'}/hr
              </Typography>
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
          Loading providers...
        </Typography>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={filteredData}
        renderItem={renderItem}
        keyExtractor={(item) => item.provider.id.toString()}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Briefcase size={64} color={COLORS.gray[200]} />
            <Typography variant="h3" color={COLORS.gray[400]} style={{ marginTop: 16 }}>
              No providers found
            </Typography>
            <Typography variant="body" color={COLORS.gray[500]} align="center" style={{ marginTop: 8 }}>
              Try adjusting your search or category filters.
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
