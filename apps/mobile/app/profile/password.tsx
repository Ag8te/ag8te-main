import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Lock, ShieldCheck, Save } from 'lucide-react-native';
import { COLORS, SPACING, SIZES, SHADOWS } from '../../constants/Theme';
import { Typography } from '../../components/UI/Typography';
import { Input } from '../../components/UI/Input';
import { Button } from '../../components/UI/Button';

export default function ChangePassword() {
    const router = useRouter();
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSave = async () => {
        if (!currentPassword || !newPassword || !confirmPassword) {
            Alert.alert('Error', 'All fields are required.');
            return;
        }

        if (newPassword !== confirmPassword) {
            Alert.alert('Error', 'New passwords do not match.');
            return;
        }

        if (newPassword.length < 8) {
            Alert.alert('Error', 'Password must be at least 8 characters.');
            return;
        }

        setLoading(true);
        try {
            // In a real app we would call an API here
            // const res = await apiClient.post('/profile/change-password', { currentPassword, newPassword });
            
            Alert.alert('Success', 'Password changed successfully. Please login again if required.');
            router.back();
        } catch (err) {
            Alert.alert('Error', 'Failed to change password. Current password may be incorrect.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                    <ArrowLeft color={COLORS.gray[800]} size={24} />
                </TouchableOpacity>
                <Typography variant="h2" weight="bold" style={{ marginLeft: SPACING.md }}>
                    Change Password
                </Typography>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <View style={styles.infoBox}>
                    <ShieldCheck size={24} color={COLORS.primary} />
                    <Typography variant="body" color={COLORS.gray[600]} style={{ marginLeft: SPACING.md, flex: 1 }}>
                        Choose a strong password with at least 8 characters, including numbers and special symbols.
                    </Typography>
                </View>

                <View style={styles.form}>
                    <Input
                        label="Current Password"
                        placeholder="••••••••"
                        value={currentPassword}
                        onChangeText={setCurrentPassword}
                        secureTextEntry
                        icon={<Lock color={COLORS.gray[400]} size={20} />}
                        containerStyle={styles.input}
                    />
                    
                    <Input
                        label="New Password"
                        placeholder="••••••••"
                        value={newPassword}
                        onChangeText={setNewPassword}
                        secureTextEntry
                        icon={<Lock color={COLORS.gray[400]} size={20} />}
                        containerStyle={styles.input}
                    />

                    <Input
                        label="Confirm New Password"
                        placeholder="••••••••"
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                        secureTextEntry
                        icon={<Lock color={COLORS.gray[400]} size={20} />}
                        containerStyle={styles.input}
                    />
                </View>

                <Button
                    title="Update Password"
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
    infoBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.primary + '08',
        padding: SPACING.lg,
        borderRadius: SIZES.radius.lg,
        marginVertical: SPACING.lg,
        borderWidth: 1,
        borderColor: COLORS.primary + '15',
    },
    form: {
        marginTop: SPACING.md,
    },
    input: {
        marginBottom: SPACING.lg,
    },
});
