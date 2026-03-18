import React, { useState, useCallback } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, ScrollView, Alert, useWindowDimensions, Switch, Platform, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAppContext } from '@/components/AppContext';
import { getColors } from '@/constants/theme';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown, Layout } from 'react-native-reanimated';
import { BlurView } from 'expo-blur';

export default function Settings() {
    const { backendUrl, setBackendUrl, socketConnected, mqttConnected, darkTheme, setDarkTheme, userRole, setUserRole, logout } = useAppContext();
    const router = useRouter();
    const [urlInput, setUrlInput] = useState(backendUrl);
    const [isSaving, setIsSaving] = useState(false);

    const theme = getColors(darkTheme);
    const { width: screenWidth } = useWindowDimensions();
    const isTablet = screenWidth > 600;

    const handleSave = async () => {
        if (!urlInput.startsWith('http')) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            Alert.alert('Configuration Error', 'Endpoint must use valid HTTP/HTTPS protocol.');
            return;
        }

        setIsSaving(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        // Simulate save delay for better UX feel
        setTimeout(() => {
            setBackendUrl(urlInput);
            setIsSaving(false);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Alert.alert('Configuration Saved', 'System parameters have been updated.');
        }, 800);
    };

    const toggleTheme = (value: boolean) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setDarkTheme(value);
    };

    return (
        <ScrollView
            style={[styles.container, { backgroundColor: theme.background }]}
            contentContainerStyle={isTablet ? styles.tabletContent : styles.content}
            showsVerticalScrollIndicator={false}
        >
            <View style={styles.header}>
                <Text style={[styles.title, { color: theme.text }]}>Settings</Text>
                <Text style={[styles.subtitle, { color: theme.textMuted }]}>Profile, Appearance, and Server</Text>
            </View>

            <Animated.View
                entering={FadeInDown.delay(100)}
                style={[styles.section, { backgroundColor: theme.cardBg, borderColor: theme.glassBorder }]}
            >
                <Text style={[styles.sectionTitle, { color: theme.text }]}>My Status</Text>
                <View style={styles.row}>
                    <View style={styles.rowLabel}>
                        <View style={[styles.iconBox, { backgroundColor: theme.primary + '15' }]}>
                            <Ionicons name="person-circle-outline" size={26} color={theme.primary} />
                        </View>
                        <View>
                            <Text style={[styles.rowText, { color: theme.text }]}>
                                {userRole === 'agent' ? 'Agent' : userRole === 'sales' ? 'Store Seller' : 'Admin'}
                            </Text>
                            <Text style={[styles.rowSubText, { color: theme.textMuted }]}>Status: Online</Text>
                        </View>
                    </View>
                    <TouchableOpacity
                        style={[styles.badge, { backgroundColor: theme.danger + '20' }]}
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                            logout();
                            router.replace('/welcome');
                        }}
                    >
                        <Text style={[styles.badgeText, { color: theme.danger }]}>LOGOUT</Text>
                    </TouchableOpacity>
                </View>
            </Animated.View>

            <Animated.View
                entering={FadeInDown.delay(150)}
                style={[styles.section, { backgroundColor: theme.cardBg, borderColor: theme.glassBorder }]}
            >
                <Text style={[styles.sectionTitle, { color: theme.text }]}>Appearance</Text>
                <View style={styles.row}>
                    <View style={styles.rowLabel}>
                        <View style={[styles.iconBox, { backgroundColor: theme.primary + '15' }]}>
                            <Ionicons name={darkTheme ? "moon" : "sunny"} size={22} color={theme.primary} />
                        </View>
                        <View>
                            <Text style={[styles.rowText, { color: theme.text }]}>Dark Mode</Text>
                            <Text style={[styles.rowSubText, { color: theme.textMuted }]}>Easier on your eyes at night</Text>
                        </View>
                    </View>
                    <Switch
                        value={darkTheme}
                        onValueChange={toggleTheme}
                        trackColor={{ false: '#cbd5e1', true: theme.primary + '80' }}
                        thumbColor={darkTheme ? theme.primary : '#f4f4f4'}
                        ios_backgroundColor="#cbd5e1"
                    />
                </View>
            </Animated.View>


            <Animated.View
                entering={FadeInDown.delay(200)}
                style={[styles.section, { backgroundColor: theme.cardBg, borderColor: theme.glassBorder }]}
            >
                <Text style={[styles.sectionTitle, { color: theme.text }]}>Connection Status</Text>

                <View style={[styles.statusRow, { borderBottomColor: theme.glassBorder }]}>
                    <View style={styles.rowLabel}>
                        <View style={[styles.iconBox, { backgroundColor: theme.secondary + '15' }]}>
                            <MaterialCommunityIcons name="api" size={24} color={theme.secondary} />
                        </View>
                        <Text style={[styles.rowText, { color: theme.text }]}>Server Link</Text>
                    </View>
                    <View style={[styles.badge, { backgroundColor: socketConnected ? theme.success + '20' : theme.danger + '20' }]}>
                        <View style={[styles.dot, { backgroundColor: socketConnected ? theme.success : theme.danger }]} />
                        <Text style={[styles.badgeText, { color: socketConnected ? theme.success : theme.danger }]}>
                            {socketConnected ? 'ONLINE' : 'OFFLINE'}
                        </Text>
                    </View>
                </View>

                <View style={[styles.statusRow, { borderBottomWidth: 0 }]}>
                    <View style={styles.rowLabel}>
                        <View style={[styles.iconBox, { backgroundColor: theme.warning + '15' }]}>
                            <MaterialCommunityIcons name="nfc" size={24} color={theme.warning} />
                        </View>
                        <Text style={[styles.rowText, { color: theme.text }]}>Card Scanner</Text>
                    </View>
                    <View style={[styles.badge, { backgroundColor: mqttConnected ? theme.success + '20' : theme.warning + '20' }]}>
                        <View style={[styles.dot, { backgroundColor: mqttConnected ? theme.success : theme.warning }]} />
                        <Text style={[styles.badgeText, { color: mqttConnected ? theme.success : theme.warning }]}>
                            {mqttConnected ? 'READY' : 'SEARCHING'}
                        </Text>
                    </View>
                </View>
            </Animated.View>

            <Animated.View
                entering={FadeInDown.delay(300)}
                style={[styles.section, { backgroundColor: theme.cardBg, borderColor: theme.glassBorder }]}
            >
                <Text style={[styles.sectionTitle, { color: theme.text }]}>Connect to Server</Text>
                <Text style={[styles.description, { color: theme.textMuted }]}>
                    Enter the address of your TapLine server to keep everything in sync.
                </Text>

                <View style={[styles.inputContainer, { borderColor: theme.glassBorder, backgroundColor: theme.background + '40' }]}>
                    <Ionicons name="globe-outline" size={20} color={theme.textMuted} style={styles.inputIcon} />
                    <TextInput
                        style={[styles.input, { color: theme.text }]}
                        value={urlInput}
                        onChangeText={setUrlInput}
                        placeholder="http://vps-server:8000"
                        placeholderTextColor={theme.textMuted + '40'}
                        autoCapitalize="none"
                        autoCorrect={false}
                        keyboardType="url"
                    />
                </View>

                <TouchableOpacity
                    style={[styles.saveButton, { backgroundColor: theme.primary, opacity: isSaving ? 0.7 : 1 }]}
                    onPress={handleSave}
                    disabled={isSaving}
                >
                    {isSaving ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <>
                            <Text style={styles.saveBtnText}>Save Connection</Text>
                            <Ionicons name="cloud-upload-outline" size={20} color="#fff" />
                        </>
                    )}
                </TouchableOpacity>
            </Animated.View>

            <View style={styles.footer}>
                <View style={[styles.divider, { backgroundColor: theme.glassBorder }]} />
                <Text style={[styles.brand, { color: theme.text }]}>Powered by TapLine</Text>
                <Text style={[styles.version, { color: theme.textMuted }]}>Version 2.4.12</Text>
            </View>
        </ScrollView >
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    content: { paddingBottom: 60 },
    tabletContent: { maxWidth: 660, alignSelf: 'center', width: '100%', paddingBottom: 60 },
    header: { paddingHorizontal: 24, paddingTop: 60, marginBottom: 20 },
    title: { fontSize: 32, fontWeight: '800', letterSpacing: -1 },
    subtitle: { fontSize: 16, marginTop: 4, fontWeight: '500', opacity: 0.7 },

    section: { padding: 24, marginHorizontal: 20, borderRadius: 32, marginBottom: 20, borderWidth: 1, elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.05, shadowRadius: 12 },
    sectionTitle: { fontSize: 18, fontWeight: '800', marginBottom: 20, letterSpacing: -0.5 },

    row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    statusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1 },
    rowLabel: { flexDirection: 'row', alignItems: 'center', gap: 14 },
    iconBox: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
    rowText: { fontSize: 16, fontWeight: '700' },
    rowSubText: { fontSize: 12, fontWeight: '500', marginTop: 2 },

    badge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
    dot: { width: 6, height: 6, borderRadius: 3, marginRight: 8 },
    badgeText: { fontSize: 11, fontWeight: '800' },

    description: { marginBottom: 20, lineHeight: 20, fontSize: 14, fontWeight: '500' },
    inputContainer: { flexDirection: 'row', alignItems: 'center', borderRadius: 18, borderWidth: 1.5, paddingHorizontal: 16, marginBottom: 24 },
    inputIcon: { marginRight: 12 },
    input: { flex: 1, height: 60, fontSize: 16, fontWeight: '600' },

    saveButton: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', height: 64, borderRadius: 20, gap: 10, elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 12 },
    saveBtnText: { color: '#fff', fontSize: 17, fontWeight: '800' },

    footer: { alignItems: 'center', marginTop: 20, paddingHorizontal: 40 },
    divider: { height: 1, width: '60%', marginBottom: 30, opacity: 0.5 },
    brand: { fontSize: 15, fontWeight: '800', opacity: 0.9 },
    version: { fontSize: 12, marginTop: 4, fontWeight: '600', letterSpacing: 0.5 }
});
