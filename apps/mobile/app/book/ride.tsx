import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, TextInput, Image } from 'react-native';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { useQuery } from '@tanstack/react-query';
import apiClient from '../../api/client';
import { ArrowLeft, MapPin, Navigation, Car, CreditCard, Star, ChevronRight, Info } from 'lucide-react-native';
import { COLORS, SPACING, SIZES, SHADOWS } from '../../constants/Theme';
import { Typography } from '../../components/UI/Typography';
import { Button } from '../../components/UI/Button';
import { Card } from '../../components/UI/Card';

export default function BookRide() {
    const router = useRouter();
    const [pickup, setPickup] = useState('');
    const [destination, setDestination] = useState('');
    const [selectedCarType, setSelectedCarType] = useState('sedan');
    const [location, setLocation] = useState<Location.LocationObject | null>(null);
    const [loadingLocation, setLoadingLocation] = useState(true);

    useEffect(() => {
        (async () => {
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission Denied', 'Permission to access location was denied. Some features might be limited.');
                setLoadingLocation(false);
                return;
            }

            let loc = await Location.getCurrentPositionAsync({});
            setLocation(loc);
            setLoadingLocation(false);
            setPickup('My Current Location');
        })();
    }, []);

    const { data: drivers, isLoading: loadingDrivers } = useQuery({
        queryKey: ['drivers-nearby', location?.coords.latitude, location?.coords.longitude],
        queryFn: async () => {
            if (!location) return [];
            const res = await apiClient.get(`/public/drivers-nearby?lat=${location.coords.latitude}&lng=${location.coords.longitude}&radius=20`);
            return res.data?.data?.drivers || [];
        },
        enabled: !!location
    });

    const { data: fareResult, isLoading: loadingFare } = useQuery({
        queryKey: ['calculate-fare', selectedCarType],
        queryFn: async () => {
            // Mock distance for demo if destination set
            const distance = destination ? 15.5 : 0; 
            const res = await apiClient.get(`/public/calculate-fare?distance=${distance}&car_type=${selectedCarType}`);
            return res.data?.data?.fare || 0;
        },
        enabled: !!destination
    });

    const handleBook = () => {
        if (!pickup || !destination) {
            Alert.alert('Missing Info', 'Please set both pickup and destination address.');
            return;
        }
        Alert.alert('Booking Request', 'Searching for the nearest driver...', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Wait for Driver', onPress: () => router.replace('/(tabs)/') }
        ]);
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                    <ArrowLeft color={COLORS.gray[800]} size={24} />
                </TouchableOpacity>
                <Typography variant="h2" weight="bold" style={{ marginLeft: SPACING.md }}>
                    Book a Ride
                </Typography>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <Card style={styles.locationCard}>
                    <View style={styles.locationStep}>
                        <View style={[styles.dot, { backgroundColor: COLORS.primary }]} />
                        <View style={styles.locationInput}>
                            <Typography variant="caption" color={COLORS.gray[500]}>PICKUP LOCATION</Typography>
                            <TextInput
                                style={styles.textInput}
                                placeholder="Where are you?"
                                value={pickup}
                                onChangeText={setPickup}
                            />
                        </View>
                        {loadingLocation && <ActivityIndicator size="small" color={COLORS.primary} />}
                    </View>
                    
                    <View style={styles.connector} />

                    <View style={styles.locationStep}>
                        <View style={[styles.dot, { backgroundColor: COLORS.secondary }]} />
                        <View style={styles.locationInput}>
                            <Typography variant="caption" color={COLORS.gray[500]}>DESTINATION</Typography>
                            <TextInput
                                style={styles.textInput}
                                placeholder="Where to?"
                                value={destination}
                                onChangeText={setDestination}
                            />
                        </View>
                    </View>
                </Card>

                <Typography variant="subtitle" weight="bold" style={{ marginTop: SPACING.xl, marginBottom: SPACING.md }}>Select Ride Type</Typography>
                
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.carTypeScroll}>
                    {[
                        { id: 'sedan', label: 'Economy', price: 'R85', time: '5 min', icon: <Car size={24} /> },
                        { id: 'suv', label: 'Premium', price: 'R140', time: '8 min', icon: <Navigation size={24} /> },
                        { id: 'van', label: 'Van/Van', price: 'R210', time: '12 min', icon: <Car size={24} /> },
                    ].map(car => (
                        <TouchableOpacity 
                            key={car.id} 
                            style={[styles.carCard, selectedCarType === car.id && styles.carCardActive]}
                            onPress={() => setSelectedCarType(car.id)}
                        >
                            <View style={[styles.carIconBox, selectedCarType === car.id && styles.carIconBoxActive]}>
                                {React.cloneElement(car.icon as any, { color: selectedCarType === car.id ? COLORS.white : COLORS.primary })}
                            </View>
                            <Typography variant="body" weight="bold" style={{ marginTop: 8 }}>{car.label}</Typography>
                            <Typography variant="caption" color={COLORS.gray[500]}>{car.time}</Typography>
                            <Typography variant="subtitle" color={COLORS.primary} weight="bold" style={{ marginTop: 4 }}>
                                {destination ? `R${fareResult || 120}` : car.price}
                            </Typography>
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                <Typography variant="subtitle" weight="bold" style={{ marginTop: SPACING.xl, marginBottom: SPACING.md }}>Nearby Drivers</Typography>
                
                {loadingDrivers ? (
                    <ActivityIndicator size="small" color={COLORS.primary} />
                ) : (drivers && drivers.length > 0 ? (
                    drivers.map((driver: any) => (
                        <TouchableOpacity key={driver.id} style={styles.driverItem}>
                            <Image 
                                source={{ uri: driver.profile_image_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(driver.name)}&background=random` }} 
                                style={styles.driverAvatar} 
                            />
                            <View style={{ flex: 1, marginLeft: SPACING.md }}>
                                <Typography variant="body" weight="bold">{driver.name}</Typography>
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    <Star size={12} color="#FBBF24" fill="#FBBF24" />
                                    <Typography variant="caption" style={{ marginLeft: 4 }}>4.9 • {driver.distance_km}km away</Typography>
                                </View>
                            </View>
                            <Typography variant="caption" color={COLORS.gray[400]}>{driver.car_types?.[0]?.toUpperCase() || 'SEDAN'}</Typography>
                            <ChevronRight size={20} color={COLORS.gray[300]} />
                        </TouchableOpacity>
                    ))
                ) : (
                    <View style={styles.infoBox}>
                        <Info size={16} color={COLORS.gray[500]} />
                        <Typography variant="caption" color={COLORS.gray[600]} style={{ marginLeft: 8 }}>
                            No drivers found within 20km. Try again later.
                        </Typography>
                    </View>
                ))}
            </ScrollView>

            <View style={styles.footer}>
                <View style={styles.paymentRow}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <CreditCard size={18} color={COLORS.gray[600]} />
                        <Typography variant="label" weight="semibold" style={{ marginLeft: 8 }}>Personal • *** 4242</Typography>
                    </View>
                    <TouchableOpacity>
                        <Typography variant="caption" color={COLORS.primary} weight="bold">CHANGE</Typography>
                    </TouchableOpacity>
                </View>
                <Button 
                    title={destination ? `Book ${selectedCarType.toUpperCase()}` : "Select Destination"}
                    fullWidth 
                    size="lg"
                    onPress={handleBook}
                    disabled={!destination}
                    style={{ backgroundColor: destination ? COLORS.primary : COLORS.gray[300] }}
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
        paddingBottom: 150,
    },
    locationCard: {
        padding: SPACING.lg,
        borderRadius: SIZES.radius.xl,
    },
    locationStep: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: 16,
    },
    locationInput: {
        flex: 1,
    },
    textInput: {
        fontSize: SIZES.font.md,
        fontWeight: '600',
        color: COLORS.gray[800],
        marginTop: 2,
        padding: 0,
    },
    connector: {
        width: 2,
        height: 20,
        backgroundColor: COLORS.gray[200],
        marginLeft: 3,
        marginVertical: 4,
    },
    carTypeScroll: {
        marginHorizontal: -SPACING.lg,
        paddingHorizontal: SPACING.lg,
    },
    carCard: {
        width: 110,
        backgroundColor: COLORS.white,
        borderRadius: SIZES.radius.lg,
        padding: SPACING.md,
        marginRight: SPACING.md,
        alignItems: 'center',
        borderWidth: 2,
        borderColor: 'transparent',
        ...SHADOWS.sm,
    },
    carCardActive: {
        borderColor: COLORS.primary,
        backgroundColor: COLORS.primary + '05',
    },
    carIconBox: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: COLORS.primary + '10',
        justifyContent: 'center',
        alignItems: 'center',
    },
    carIconBoxActive: {
        backgroundColor: COLORS.primary,
    },
    driverItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.white,
        padding: SPACING.md,
        borderRadius: SIZES.radius.lg,
        marginBottom: SPACING.sm,
        borderWidth: 1,
        borderColor: COLORS.gray[100],
    },
    driverAvatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: COLORS.gray[100],
    },
    infoBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.gray[100],
        padding: SPACING.md,
        borderRadius: SIZES.radius.md,
    },
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: COLORS.white,
        padding: SPACING.lg,
        paddingBottom: SPACING.xxl,
        borderTopWidth: 1,
        borderTopColor: COLORS.gray[200],
        ...SHADOWS.lg,
    },
    paymentRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.lg,
    },
});
