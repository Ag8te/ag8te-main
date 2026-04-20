import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';
import { Drawer } from 'expo-router/drawer';
import { useAuth } from '../../contexts/AuthContext';
import { useRouter } from 'expo-router';
import { LayoutDashboard, Clock, ClipboardList, MessageSquare, Star, Wallet, User, LogOut } from 'lucide-react-native';
import { DrawerContentScrollView, DrawerItemList, DrawerItem } from '@react-navigation/drawer';

function CustomDrawerContent(props: any) {
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.replace('/login');
  };

  return (
    <DrawerContentScrollView {...props} contentContainerStyle={{ flex: 1 }}>
      <View style={styles.drawerHeader}>
        <View style={styles.avatarPlaceholder}>
          <Text style={styles.avatarText}>{user?.name?.charAt(0) || 'U'}</Text>
        </View>
        <Text style={styles.userName}>{user?.name || 'User'}</Text>
        <Text style={styles.userRole}>{user?.role?.replace('-', ' ').toUpperCase()}</Text>
      </View>
      
      <View style={{ flex: 1 }}>
        <DrawerItemList {...props} />
      </View>

      <View style={styles.drawerFooter}>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <LogOut color="#FF3B30" size={20} />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>
    </DrawerContentScrollView>
  );
}

export default function DashboardLayout() {
  const { user } = useAuth();

  return (
    <Drawer
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={{
        headerShown: true,
        drawerActiveTintColor: '#007AFF',
        drawerInactiveTintColor: '#666',
      }}
    >
      <Drawer.Screen
        name="driver"
        options={{
          drawerLabel: 'Driver Account Management',
          title: 'Driver Console',
          drawerIcon: ({ color, size }) => <LayoutDashboard color={color} size={size} />,
          drawerItemStyle: { display: user?.role === 'driver' ? 'flex' : 'none' }
        }}
      />
      <Drawer.Screen
        name="professional"
        options={{
          drawerLabel: 'Expert Account Management',
          title: 'Expert Console',
          drawerIcon: ({ color, size }) => <LayoutDashboard color={color} size={size} />,
          drawerItemStyle: { display: user?.role === 'professional' ? 'flex' : 'none' }
        }}
      />
      <Drawer.Screen
        name="service-provider"
        options={{
          drawerLabel: 'Service Account Management',
          title: 'Service HUB',
          drawerIcon: ({ color, size }) => <LayoutDashboard color={color} size={size} />,
          drawerItemStyle: { display: user?.role === 'service-provider' ? 'flex' : 'none' }
        }}
      />
    </Drawer>
  );
}

const styles = StyleSheet.create({
  drawerHeader: {
    padding: 20,
    backgroundColor: '#f8f9fa',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    marginBottom: 10,
  },
  avatarPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  avatarText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  userRole: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: 'bold',
    marginTop: 2,
  },
  drawerFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoutText: {
    color: '#FF3B30',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
  },
});
