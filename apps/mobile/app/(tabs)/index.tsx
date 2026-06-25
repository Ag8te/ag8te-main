import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Image, Dimensions, ImageBackground, ActivityIndicator } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { Link, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Bell, Star, MapPin, ChevronRight, ShoppingBag, Briefcase, Car, Wrench, Tag } from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import apiClient, { getImageUrl } from '../../api/client';
import { COLORS, SPACING, SIZES } from '../../constants/Theme';
import { Typography } from '../../components/UI/Typography';
import { Card } from '../../components/UI/Card';
import { Button } from '../../components/UI/Button';

const { width } = Dimensions.get('window');

export default function Home() {
  const { user } = useAuth();
  const router = useRouter();
  const [activeSlide, setActiveSlide] = useState(0);
  const { data: recommended, isLoading: loadingRecommended } = useQuery({
    queryKey: ['recommended-providers'],
    queryFn: async () => {
      const response = await apiClient.get('/profile/service-providers?limit=3');
      return response.data?.data?.service_providers || [];
    },
  });

  const { data: slides = [] } = useQuery({
    queryKey: ['public-carousel'],
    queryFn: async () => {
      try {
        const response = await apiClient.get('/public/carousel');
        return response.data?.data?.items || [];
      } catch (error) {
        console.error('Failed to load carousel:', error);
        return [];
      }
    },
  });

  // Fallback slide if API fails or is empty
  const heroSlides = slides.length > 0 ? slides : [
    {
      id: 'fallback',
      title: 'Find the perfect service for your home',
      subtitle: 'Professional help is just a tap away.',
      cta_text: 'Request a Service',
      image_url: 'https://images.unsplash.com/photo-1581578731548-c64695ce6958?q=80&w=1000'
    }
  ];

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.contentContainer}
    >
      {/* Header Section */}
      <View style={styles.header}>
        <View>
          <Typography variant="caption" color={COLORS.gray[500]} weight="semibold">
            GOOD MORNING
          </Typography>
          <Typography variant="h2" weight="bold">
            {user ? `${user.name}` : 'Welcome!'}
          </Typography>
        </View>
        <TouchableOpacity style={styles.iconButton}>
          <Bell color={COLORS.gray[800]} size={24} />
          <View style={styles.notificationBadge} />
        </TouchableOpacity>
      </View>

      {/* Hero Section */}
      <View style={styles.heroWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          bounces={true}
          snapToInterval={width - SPACING.lg * 1.5}
          snapToAlignment="start"
          decelerationRate="fast"
          contentContainerStyle={{ paddingHorizontal: SPACING.lg, paddingRight: SPACING.xxl }}
          onScroll={(e) => {
            const offsetX = e.nativeEvent.contentOffset.x;
            const cardWidth = width - SPACING.lg * 1.5;
            const currentIndex = Math.max(0, Math.min(Math.round(offsetX / cardWidth), heroSlides.length - 1));
            setActiveSlide(currentIndex);
          }}
          scrollEventThrottle={16}
        >
          {heroSlides.map((slide: any, index: number) => (
            <ImageBackground
              key={slide.id || index}
              source={{ uri: slide.image_url?.startsWith('http') ? slide.image_url : getImageUrl(slide.image_url) }}
              style={[styles.heroCard, { width: width - SPACING.lg * 1.5 }]}
              imageStyle={{ borderRadius: SIZES.radius.xl }}
            >
              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.5)', 'rgba(0,0,0,0.95)']}
                locations={[0, 0.5, 1]}
                style={styles.heroGradient}
              >
                <View style={styles.heroContent}>
                  <View style={styles.badgeContainer}>
                    <Typography variant="caption" color={COLORS.white} weight="bold" style={styles.badgeText}>
                      {slide.badge?.toUpperCase() || 'TOP PICKS'}
                    </Typography>
                  </View>
                  <Typography
                    variant="h2"
                    color={COLORS.white}
                    weight="bold"
                    numberOfLines={2}
                    style={{ marginBottom: 6, textShadowColor: 'rgba(0,0,0,0.6)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 6 }}
                  >
                    {slide.title || 'MzansiServe\nMarketplace'}
                  </Typography>
                  <Typography
                    variant="label"
                    color={'rgba(255,255,255,0.85)'}
                    numberOfLines={2}
                    style={{ marginBottom: 16 }}
                  >
                    {slide.subtitle || 'Connecting South Africa to reliable services.'}
                  </Typography>
                  <Button
                    title={slide.cta_text || "Book a Ride"}
                    variant="secondary"
                    size="md"
                    fullWidth={true}
                    style={styles.heroButton}
                    onPress={() => router.push(slide.cta_link || '/services')}
                  />
                </View>

                {/* Local Pagination Dots inside each card (optional) or just bottom-right overlay */}
              </LinearGradient>
            </ImageBackground>
          ))}
        </ScrollView>
        {/* Pagination Dots Base Overlay */}
        {heroSlides.length > 1 && (
          <View style={styles.paginationContainer}>
            {heroSlides.map((_: any, index: number) => (
              <View
                key={index}
                style={[
                  styles.paginationDot,
                  activeSlide === index && styles.paginationDotActive
                ]}
              />
            ))}
          </View>
        )}
      </View>

      {/* Quick Access Categories */}
      <View style={styles.sectionHeader}>
        <Typography variant="h3" weight="bold">Explore Categories</Typography>
        <TouchableOpacity>
          <Typography variant="label" color={COLORS.primary}>See all</Typography>
        </TouchableOpacity>
      </View>

      <View style={styles.categoryGrid}>
        {[
          { icon: <Car />, label: 'Cab Rides', color: '#F0FDF4', iconColor: '#16A34A', href: '/book/ride' },
          { icon: <Wrench />, label: 'Service Providers', color: '#EEF2FF', iconColor: COLORS.primary, href: '/(tabs)/services' },
          { icon: <Briefcase />, label: 'Professionals', color: '#FFFBEB', iconColor: '#D97706', href: '/(tabs)/professionals' },
          { icon: <ShoppingBag />, label: 'Shop', color: '#ECFDF5', iconColor: COLORS.secondary, href: '/(tabs)/shop' },
          { icon: <Tag />, label: 'Advertisements', color: '#FEF2F2', iconColor: COLORS.error, href: '/(tabs)/shop?filter=ads' },
        ].map((item, index) => (
          <Link key={index} href={item.href as any} asChild>
            <TouchableOpacity style={styles.categoryCard}>
              <View style={[styles.categoryIcon, { backgroundColor: item.color }]}>
                {React.cloneElement(item.icon, { color: item.iconColor, size: 24 })}
              </View>
              <Typography variant="label" align="center" numberOfLines={2} style={styles.categoryLabel}>
                {item.label}
              </Typography>
            </TouchableOpacity>
          </Link>
        ))}
      </View>

      {/* Recommended Section */}
      <View style={styles.sectionHeader}>
        <Typography variant="h3" weight="bold">Recommended for You</Typography>
      </View>

      {loadingRecommended ? (
        <ActivityIndicator size="small" color={COLORS.primary} style={{ marginTop: 20, marginBottom: 40 }} />
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontalScroll}
        >
          {(recommended && recommended.length > 0 ? recommended : []).map((item: any, index: number) => {
            const user = item.provider || item.professional || {};
            const userData = user.data || {};
            const name = `${userData.full_name || ''} ${userData.surname || ''}`.trim() || userData.business_name || 'Provider';
            
            return (
              <TouchableOpacity
                key={index}
                activeOpacity={0.9}
                onPress={() => router.push({ 
                  pathname: '/provider/[id]', 
                  params: { id: user.id || item.id, category: item.type === 'professional' ? 'professionals' : 'services' } 
                })}
              >
                <Card shadow="sm" style={[styles.recommendedCard, { padding: 0 }]}>
                  <Image
                    source={{ uri: user.profile_image_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random` }}
                    style={styles.cardImage}
                    resizeMode="cover"
                  />
                  <View style={{ padding: SPACING.md }}>
                    <View style={styles.ratingRow}>
                      <Star size={14} color="#FBBF24" fill="#FBBF24" />
                      <Typography variant="caption" weight="bold" style={{ marginLeft: 4 }}>4.9</Typography>
                    </View>
                    <Typography variant="subtitle" weight="bold" numberOfLines={1}>
                      {name}
                    </Typography>
                    <View style={styles.locationRow}>
                      <MapPin size={12} color={COLORS.gray[400]} />
                      <Typography variant="caption" color={COLORS.gray[500]} style={{ marginLeft: 4 }}>
                        {userData.city || 'South Africa'}
                      </Typography>
                    </View>
                    <View style={styles.cardFooter}>
                      <Typography weight="bold" color={COLORS.primary}>
                        R{item.services?.[0]?.hourly_rate || '200'}/hr
                      </Typography>
                      <View style={styles.miniButton}>
                        <ChevronRight size={16} color={COLORS.primary} />
                      </View>
                    </View>
                  </View>
                </Card>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {!user && (
        <View style={styles.promoWrapper}>
          <ImageBackground
            source={{ uri: 'https://images.unsplash.com/photo-1521737711867-e3b97375f902?q=80&w=1000' }}
            style={styles.promoImage}
            imageStyle={{ borderRadius: SIZES.radius.xl }}
          >
            <LinearGradient
              colors={['rgba(0,0,0,0.2)', 'rgba(0,0,0,0.6)']}
              style={styles.heroGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
            >
              <View style={styles.heroContent}>
                <Typography variant="h3" color={COLORS.white} weight="bold" align="center">Ready to start?</Typography>
                <Typography variant="body" align="center" color={COLORS.white} style={{ marginTop: 8, marginBottom: 20, opacity: 0.9 }}>
                  Join thousands of users enjoying seamless services.
                </Typography>
                <Button
                  title="Create an Account"
                  onPress={() => router.push('/register' as any)}
                  style={{ alignSelf: 'center' }}
                />
              </View>
            </LinearGradient>
          </ImageBackground>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  contentContainer: {
    paddingBottom: SPACING.xl,
  },
  header: {
    padding: SPACING.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.white,
  },
  iconButton: {
    width: 44,
    height: 44,
    backgroundColor: COLORS.gray[50],
    borderRadius: SIZES.radius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationBadge: {
    position: 'absolute',
    top: 10,
    right: 12,
    width: 10,
    height: 10,
    backgroundColor: COLORS.error,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  heroWrapper: {
    paddingVertical: SPACING.lg,
    backgroundColor: 'transparent',
  },
  heroCard: {
    height: 260,
    backgroundColor: COLORS.primary,
    marginRight: SPACING.md,
    borderRadius: SIZES.radius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  heroGradient: {
    flex: 1,
    padding: SPACING.lg,
    paddingBottom: SPACING.xl,
    justifyContent: 'flex-end',
  },
  heroContent: {
    zIndex: 1,
    alignItems: 'flex-start',
  },
  badgeContainer: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
    overflow: 'hidden',
  },
  badgeText: {
    fontSize: 10,
    letterSpacing: 1,
  },
  heroButton: {
    borderRadius: 4,
    marginTop: 8,
    alignSelf: 'stretch',
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: SPACING.md,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.gray[300],
    marginHorizontal: 4,
  },
  paginationDotActive: {
    width: 24,
    backgroundColor: COLORS.primary,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    marginTop: SPACING.lg,
    marginBottom: SPACING.md,
  },
  categoryGrid: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.md,
    justifyContent: 'space-between',
  },
  categoryCard: {
    width: (width - SPACING.md * 2 - SPACING.xs * 10) / 5,
    alignItems: 'center',
    marginHorizontal: SPACING.xs,
  },
  categoryIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryLabel: {
    marginTop: 8,
    maxWidth: 72,
    lineHeight: 14,
  },
  horizontalScroll: {
    paddingLeft: SPACING.lg,
    paddingRight: SPACING.sm,
  },
  recommendedCard: {
    width: 220,
    marginRight: SPACING.md,
    borderRadius: SIZES.radius.lg,
  },
  cardImage: {
    width: '100%',
    height: 120,
    backgroundColor: COLORS.gray[100],
  },
  cardImagePlaceholder: {
    width: '100%',
    height: 120,
    backgroundColor: COLORS.gray[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray[100],
  },
  miniButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  promoCard: {
    margin: SPACING.lg,
    backgroundColor: COLORS.primary + '05',
    borderWidth: 1,
    borderColor: COLORS.primary + '20',
  },
  promoWrapper: {
    margin: SPACING.lg,
    borderRadius: SIZES.radius.xl,
    overflow: 'hidden',
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  promoImage: {
    width: '100%',
    height: 200,
    backgroundColor: COLORS.primary,
  },
});
