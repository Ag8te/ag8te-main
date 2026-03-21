import React, { useState } from 'react';
import { View, StyleSheet, FlatList, ActivityIndicator, Image, TouchableOpacity, Dimensions, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import apiClient from '../../api/client';
import { useCart } from '../../contexts/CartContext';
import { Search, ShoppingBag, Plus, Filter, Heart } from 'lucide-react-native';
import { COLORS, SPACING, SIZES, SHADOWS } from '../../constants/Theme';
import { Typography } from '../../components/UI/Typography';
import { Card } from '../../components/UI/Card';
import { Input } from '../../components/UI/Input';
import { Button } from '../../components/UI/Button';

const { width } = Dimensions.get('window');
const COLUMN_WIDTH = (width - SPACING.lg * 2 - SPACING.md) / 2;
const CATEGORIES = ['All', 'Electronics', 'Home', 'Fashion', 'Health', 'Sports', 'Other'];

export default function Shop() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const { addItem, itemCount } = useCart();

  const { data, isLoading } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const response = await apiClient.get('/shop/products?limit=500');
      return response.data?.data?.items || response.data?.data?.products || response.data?.data || [];
    },
  });

  const filteredData = data?.filter((item: any) => {
    const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || 
                           item.category?.toLowerCase() === selectedCategory.toLowerCase();
    return matchesSearch && matchesCategory;
  });

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.titleRow}>
        <Typography variant="h2" weight="bold">ads</Typography>
        <View style={{ flexDirection: 'row' }}>
          <TouchableOpacity style={[styles.iconButton, { marginRight: SPACING.sm }]}>
            <Filter color={COLORS.gray[800]} size={20} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton} onPress={() => router.push('/cart' as any)}>
            <ShoppingBag color={COLORS.gray[800]} size={20} />
            {itemCount > 0 && (
              <View style={styles.badge}>
                <Typography variant="caption" color={COLORS.white} weight="bold" style={{ fontSize: 10 }}>
                  {itemCount > 99 ? '99+' : itemCount}
                </Typography>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>
      <Input
        placeholder="Search products..."
        value={search}
        onChangeText={setSearch}
        icon={<Search color={COLORS.gray[400]} size={20} />}
        containerStyle={{ marginTop: SPACING.md, marginBottom: SPACING.md }}
      />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>
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

  const renderItem = ({ item }: { item: any }) => (
    <Card shadow="sm" style={[styles.productCard, { padding: 0 }]}>
      <TouchableOpacity
        activeOpacity={0.9}
        style={{ flex: 1 }}
        onPress={() => router.push({ pathname: '/product/[id]', params: { id: item.id } })}
      >
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: item.image_url || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=500' }}
            style={styles.image}
          />
          <TouchableOpacity style={styles.wishlistButton}>
            <Heart size={18} color={COLORS.gray[400]} />
          </TouchableOpacity>
        </View>
        <View style={styles.cardContent}>
          <Typography variant="label" color={COLORS.gray[500]} numberOfLines={1}>
            {item.category || 'General'}
          </Typography>
          <Typography variant="subtitle" weight="bold" numberOfLines={1} style={{ marginTop: 2 }}>
            {item.name}
          </Typography>

          <View style={styles.priceRow}>
            <Typography variant="h3" weight="bold" color={COLORS.primary}>
              R{item.price}
            </Typography>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => addItem({ ...item, quantity: 1 })}
            >
              <Plus size={20} color={COLORS.white} />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </Card>
  );

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Typography variant="body" color={COLORS.gray[500]} style={{ marginTop: 12 }}>
          Loading classified ads...
        </Typography>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={filteredData}
        renderItem={renderItem}
        keyExtractor={(item) => item.id.toString()}
        numColumns={2}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        columnWrapperStyle={styles.columnWrapper}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <ShoppingBag size={64} color={COLORS.gray[200]} />
            <Typography variant="h3" color={COLORS.gray[400]} style={{ marginTop: 16 }}>
              No products found
            </Typography>
            <Typography variant="body" color={COLORS.gray[500]} align="center" style={{ marginTop: 8 }}>
              Check back later for new arrivals!
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
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  iconButton: {
    width: 40,
    height: 40,
    backgroundColor: COLORS.gray[50],
    borderRadius: SIZES.radius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: COLORS.error,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 4,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  list: {
    paddingBottom: SPACING.xl,
  },
  columnWrapper: {
    paddingHorizontal: SPACING.lg,
    justifyContent: 'space-between',
  },
  productCard: {
    width: COLUMN_WIDTH,
    marginBottom: SPACING.md,
    borderRadius: SIZES.radius.lg,
    overflow: 'hidden',
  },
  imageContainer: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: COLORS.gray[50],
  },
  image: {
    width: '100%',
    height: '100%',
    backgroundColor: COLORS.gray[100],
  },
  wishlistButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardContent: {
    padding: SPACING.md,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.sm,
  },
  addButton: {
    backgroundColor: COLORS.primary,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    padding: SPACING.xxl,
    marginTop: SPACING.xxl,
  },
  categoryScroll: {
    paddingBottom: SPACING.sm,
  },
  categoryChip: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.xs + 2,
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
});
