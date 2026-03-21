import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import apiClient from '../../api/client';
import { ArrowLeft, User, Mail, Phone, MapPin, Camera, Save } from 'lucide-react-native';
import { COLORS, SPACING, SIZES, SHADOWS } from '../../constants/Theme';
import { Typography } from '../../components/UI/Typography';
import { Input } from '../../components/UI/Input';
import { Button } from '../../components/UI/Button';

export default function EditProfile() {
    const { user, setUser } = useAuth();
    const router = useRouter();
    
    const [name, setName] = useState(user?.name || '');
    const [email, setEmail] = useState(user?.email || '');
    const [phone, setPhone] = useState(user?.data?.phone_number || '');
    const [city, setCity] = useState(user?.data?.city || '');
    const [loading, setLoading] = useState(false);

    const handleSave = async () => {
        if (!name || !email) {
            Alert.alert('Error', 'Name and Email are required.');
            return;
        }

        setLoading(true);
        try {
            const payload = {
                full_name: name,
                email: email,
                phone_number: phone,
                city: city
            };
            
            if (user) {
                setUser({
                    ...user,
                    name: name,
                    data: {
                        ...user.data,
                        phone_number: phone,
                        city: city
                    }
                });
            }
            
            Alert.alert('Success', 'Profile updated successfully.');
            router.back();
        } catch (err) {
            Alert.alert('Error', 'Failed to update profile.');
        } finally {
            setLoading(true);
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                    <ArrowLeft color={COLORS.gray[800]} size={24} />
                </TouchableOpacity>
                <Typography variant="h2" weight="bold" style={{ marginLeft: SPACING.md }}>
                    Edit Profile
                </Typography>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <View style={styles.avatarSection}>
                    <View style={styles.avatarWrapper}>
                        <Image
                            source={{ uri: user?.profile_image_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=10B981&color=fff&size=200` }}
                            style={styles.avatar}
                        />
                        <TouchableOpacity style={styles.cameraButton}>
                            <Camera size={20} color={COLORS.white} />
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.form}>
                    <Input
                        label="Full Name"
                        placeholder="Your full name"
                        value={name}
                        onChangeText={setName}
                        icon={<User color={COLORS.gray[400]} size={20} />}
                        containerStyle={styles.input}
                    />
                    
                    <Input
                        label="Email Address"
                        placeholder="your@email.com"
                        value={email}
                        onChangeText={setEmail}
                        keyboardType="email-address"
                        icon={<Mail color={COLORS.gray[400]} size={20} />}
                        containerStyle={styles.input}
                    />

                    <Input
                        label="Phone Number"
                        placeholder="+27 00 000 0000"
                        value={phone}
                        onChangeText={setPhone}
                        keyboardType="phone-pad"
                        icon={<Phone color={COLORS.gray[400]} size={20} />}
                        containerStyle={styles.input}
                    />

                    <Input
                        label="City / Region"
                        placeholder="e.g. Cape Town"
                        value={city}
                        onChangeText={setCity}
                        icon={<MapPin color={COLORS.gray[400]} size={20} />}
                        containerStyle={styles.input}
                    />
                </View>

                <Button
                    title="Save Changes"
                    onPress={handleSave}
                    loading={loading}
                    icon={<Save size={20} color={COLORS.white} />}
                    style={{ marginTop: SPACING.xl }}
                />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.white,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: SPACING.lg,
        paddingTop: SPACING.xxl,
        paddingBottom: SPACING.md,
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
    },
    avatarSection: {
        alignItems: 'center',
        marginVertical: SPACING.xl,
    },
    avatarWrapper: {
        position: 'relative',
    },
    avatar: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: COLORS.gray[100],
    },
    cameraButton: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: COLORS.primary,
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: COLORS.white,
    },
    form: {
        marginTop: SPACING.lg,
    },
    input: {
        marginBottom: SPACING.lg,
    },
});
