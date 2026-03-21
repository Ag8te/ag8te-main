import React from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, Image } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useRouter } from 'expo-router';
import { ChevronRight, Heart, Settings, LogOut, HelpCircle, Shield, CreditCard, ChevronLeft, Calendar, ShoppingBag } from 'lucide-react-native';
import { COLORS, SPACING, SIZES, SHADOWS } from '../../constants/Theme';
import { Typography } from '../../components/UI/Typography';
import { Button } from '../../components/UI/Button';

export default function Profile() {
  const { user, logout } = useAuth();
  const router = useRouter();

  if (!user) {
    return (
      <View style={styles.center}>
        <Image
          source={{ uri: 'https://images.unsplash.com/photo-1511367461989-f85a21fda167?q=80&w=600' }}
          style={styles.guestImage}
        />
        <Typography variant="h2" weight="bold" style={{ marginTop: SPACING.xl, marginBottom: SPACING.sm }}>
          Join MzansiServe
        </Typography>
        <Typography variant="body" color={COLORS.gray[500]} align="center" style={{ marginBottom: SPACING.xl, paddingHorizontal: SPACING.xl }}>
          Sign in to save your favorite services and manage your profile.
        </Typography>
        <Button title="Login or Register" onPress={() => router.push('/login')} style={{ width: 250 }} />
      </View>
    );
  }

  const menuItems = [
    { title: 'My Bookings', icon: <Calendar color={COLORS.primary} size={22} />, route: '/history?type=bookings' },
    { title: 'My Orders', icon: <ShoppingBag color={COLORS.secondary} size={22} />, route: '/history?type=orders' },
    { title: 'My Wishlist', icon: <Heart color={COLORS.error} size={22} />, route: '/wishlist' },
    { title: 'Payment Methods', icon: <CreditCard color={COLORS.gray[700]} size={22} />, route: '/settings' },
    { title: 'Account Settings', icon: <Settings color={COLORS.gray[700]} size={22} />, route: '/settings' },
    { title: 'Privacy & Security', icon: <Shield color={COLORS.gray[700]} size={22} />, route: '/terms' },
    { title: 'Help & Support', icon: <HelpCircle color={COLORS.gray[700]} size={22} />, route: '/terms' },
  ];

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.headerBackground} />

      <View style={styles.profileSection}>
        <Image
          source={{ uri: user.profile_image_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=10B981&color=fff&size=200` }}
          style={styles.avatar}
        />
        <Typography variant="h2" weight="bold" style={{ marginTop: SPACING.md }}>
          {user.name}
        </Typography>
        <Typography variant="label" color={COLORS.gray[500]} style={{ marginTop: 2 }}>
          {user.email}
        </Typography>
        <View style={styles.roleBadge}>
          <Typography variant="caption" weight="bold" color={COLORS.primary}>
            {user.role?.toUpperCase() || 'CLIENT'}
          </Typography>
        </View>
      </View>

      <View style={styles.menuContainer}>
        {menuItems.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={styles.menuItem}
            onPress={() => item.route ? router.push(item.route as any) : null}
            activeOpacity={0.7}
          >
            <View style={styles.menuIconBox}>
              {item.icon}
            </View>
            <Typography variant="body" weight="medium" style={{ flex: 1, marginLeft: SPACING.md }}>
              {item.title}
            </Typography>
            <ChevronRight color={COLORS.gray[300]} size={20} />
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={logout} activeOpacity={0.7}>
        <LogOut color={COLORS.error} size={20} />
        <Typography variant="body" weight="bold" color={COLORS.error} style={{ marginLeft: SPACING.sm }}>
          Logout
        </Typography>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.gray[50],
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.white,
  },
  guestImage: {
    width: 200,
    height: 200,
    borderRadius: 100,
  },
  headerBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 140,
    backgroundColor: COLORS.primary,
  },
  profileSection: {
    alignItems: 'center',
    marginTop: 80,
    paddingHorizontal: SPACING.lg,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: COLORS.white,
    backgroundColor: COLORS.gray[200],
  },
  roleBadge: {
    marginTop: SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: 4,
    backgroundColor: COLORS.primary + '15',
    borderRadius: 16,
  },
  menuContainer: {
    marginTop: SPACING.xl,
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radius.xl,
    marginHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[100],
  },
  menuIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.gray[50],
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.xl,
    marginBottom: SPACING.xxl,
    paddingVertical: SPACING.md,
    justifyContent: 'center',
    backgroundColor: COLORS.error + '10',
    borderRadius: SIZES.radius.lg,
    borderWidth: 1,
    borderColor: COLORS.error + '30',
  },
});
