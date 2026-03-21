import React from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Switch } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Bell, Lock, User, Globe, Moon } from 'lucide-react-native';
import { COLORS, SPACING, SIZES } from '../constants/Theme';
import { Typography } from '../components/UI/Typography';

export default function Settings() {
    const router = useRouter();
    const [pushEnabled, setPushEnabled] = React.useState(true);
    const [emailEnabled, setEmailEnabled] = React.useState(false);
    const [darkMode, setDarkMode] = React.useState(false);

    const SETTING_SECTIONS = [
        {
            title: 'Preferences',
            items: [
                { icon: <Globe size={20} color={COLORS.gray[600]} />, label: 'Language', value: 'English (UK)', type: 'link' },
                { icon: <Moon size={20} color={COLORS.gray[600]} />, label: 'Dark Mode', value: darkMode, onValueChange: setDarkMode, type: 'switch' },
            ]
        },
        {
            title: 'Notifications',
            items: [
                { icon: <Bell size={20} color={COLORS.gray[600]} />, label: 'Push Notifications', value: pushEnabled, onValueChange: setPushEnabled, type: 'switch' },
                { icon: <Bell size={20} color={COLORS.gray[600]} />, label: 'Email Alerts', value: emailEnabled, onValueChange: setEmailEnabled, type: 'switch' },
            ]
        },
        {
            title: 'Account',
            items: [
                { icon: <User size={20} color={COLORS.gray[600]} />, label: 'Personal Information', type: 'link', href: '/profile/edit' },
                { icon: <Lock size={20} color={COLORS.gray[600]} />, label: 'Change Password', type: 'link', href: '/profile/password' },
            ]
        }
    ];

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                    <ArrowLeft color={COLORS.gray[800]} size={24} />
                </TouchableOpacity>
                <Typography variant="h2" weight="bold" style={{ marginLeft: SPACING.md }}>
                    Settings
                </Typography>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {SETTING_SECTIONS.map((section, idx) => (
                    <View key={idx} style={styles.section}>
                        <Typography variant="subtitle" weight="bold" color={COLORS.gray[500]} style={styles.sectionTitle}>
                            {section.title.toUpperCase()}
                        </Typography>
                        <View style={styles.card}>
                            {section.items.map((item: any, itemIdx) => (
                                <TouchableOpacity 
                                    key={itemIdx} 
                                    style={[styles.itemRow, itemIdx === section.items.length - 1 && styles.noBorder]}
                                    onPress={() => item.type === 'link' && item.href ? router.push(item.href as any) : null}
                                    activeOpacity={item.type === 'link' ? 0.7 : 1}
                                >
                                    <View style={styles.itemLeft}>
                                        <View style={styles.iconBox}>
                                            {item.icon}
                                        </View>
                                        <Typography variant="body" weight="medium" style={{ marginLeft: SPACING.md }}>
                                            {item.label}
                                        </Typography>
                                    </View>

                                    {item.type === 'switch' ? (
                                        <Switch
                                            value={item.value as boolean}
                                            onValueChange={item.onValueChange as any}
                                            trackColor={{ false: COLORS.gray[300], true: COLORS.primary }}
                                            thumbColor={COLORS.white}
                                        />
                                    ) : (
                                        <View style={styles.linkRight}>
                                            {item.value && (
                                                <Typography variant="label" color={COLORS.gray[400]} style={{ marginRight: SPACING.sm }}>
                                                    {item.value}
                                                </Typography>
                                            )}
                                            <ArrowLeft style={{ transform: [{ rotate: '180deg' }] }} size={16} color={COLORS.gray[300]} />
                                        </View>
                                    )}
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                ))}
            </ScrollView>
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
        paddingBottom: SPACING.xxl * 2,
    },
    section: {
        marginBottom: SPACING.xl,
    },
    sectionTitle: {
        marginBottom: SPACING.sm,
        marginLeft: SPACING.sm,
        letterSpacing: 1,
    },
    card: {
        backgroundColor: COLORS.white,
        borderRadius: SIZES.radius.lg,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.05)',
    },
    itemRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: SPACING.md,
        paddingHorizontal: SPACING.lg,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.gray[100],
    },
    noBorder: {
        borderBottomWidth: 0,
    },
    itemLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconBox: {
        width: 32,
        height: 32,
        borderRadius: 8,
        backgroundColor: COLORS.gray[50],
        justifyContent: 'center',
        alignItems: 'center',
    },
    linkRight: {
        flexDirection: 'row',
        alignItems: 'center',
    },
});
