import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, useWindowDimensions, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Image, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useAppContext } from '@/components/AppContext';
import { getColors } from '@/constants/theme';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeIn, FadeInDown, FadeInUp, Layout } from 'react-native-reanimated';
import axios from 'axios';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

export default function WelcomeScreen() {
    const { setUserRole, darkTheme, setTerminalId, setAuthToken, backendUrl } = useAppContext();
    const theme = getColors(darkTheme);
    const router = useRouter();
    const { width } = useWindowDimensions();

    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [loading, setLoading] = useState(false);
    const [activeRole, setActiveRole] = useState<'agent' | 'sales' | null>(null);
    const [isRegisterMode, setIsRegisterMode] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const handleAuth = async () => {
        if (!activeRole) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            return;
        }

        if (!username || !password || (isRegisterMode && !fullName)) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            Alert.alert('Missing Info', 'Please fill in all required fields.');
            return;
        }

        setLoading(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        try {
            const endpoint = isRegisterMode ? '/auth/register' : '/auth/login';
            const payload = isRegisterMode
                ? { username, password, role: activeRole, name: fullName }
                : { username, password };

            const response = await axios.post(`${backendUrl}${endpoint}`, payload);

            if (isRegisterMode) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                Alert.alert('Success', 'Account created! Please sign in.');
                setIsRegisterMode(false);
            } else {
                const { token, user } = response.data;
                await setAuthToken(token);
                await setUserRole(user.role);
                await setTerminalId(user.terminalId);

                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                router.replace('/(tabs)');
            }
        } catch (error: any) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            const msg = error.response?.data?.error || 'Authentication failed. Please check your connection.';
            Alert.alert('Auth Error', msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1 }}
        >
            <ScrollView
                contentContainerStyle={[styles.container, { backgroundColor: theme.background }]}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                {/* Background Art */}
                <View style={StyleSheet.absoluteFill} pointerEvents="none">
                    <Animated.View
                        entering={FadeIn.delay(200).duration(3000)}
                        style={[styles.floatingCircle, { top: -100, right: -100, width: 400, height: 400, backgroundColor: theme.primary + '15' }]}
                    />
                    <Animated.View
                        entering={FadeIn.delay(500).duration(3000)}
                        style={[styles.floatingCircle, { bottom: -150, left: -150, width: 500, height: 500, backgroundColor: theme.primary + '08' }]}
                    />
                    <Animated.View
                        entering={FadeIn.delay(800).duration(2000)}
                        style={[styles.glowPoint, { top: '30%', left: '10%', backgroundColor: theme.primary + '10' }]}
                    />
                </View>

                <View style={styles.contentWrapper}>
                    <Animated.View
                        entering={FadeInDown.duration(1000).springify()}
                        style={styles.logoOuter}
                    >
                        <View style={[styles.glassLogo, { borderColor: theme.glassBorder }]}>
                            <Image
                                source={require('@/assets/images/TP_circular.png')}
                                style={styles.logoImg}
                                resizeMode="cover"
                            />
                        </View>
                    </Animated.View>

                    <Animated.View entering={FadeInDown.delay(200)} style={styles.brandText}>
                        <Text style={[styles.mainTitle, { color: theme.text }]}>TapLine</Text>
                        <Text style={[styles.tagline, { color: theme.primary }]}>SECURE WALLET SYSTEM</Text>
                    </Animated.View>

                    {!activeRole ? (
                        <Animated.View entering={FadeIn.delay(400)} style={styles.modeSection}>
                            <Text style={[styles.sectionHeading, { color: theme.text }]}>Choose Your Workplace</Text>

                            <View style={styles.gridContainer}>
                                <TouchableOpacity
                                    style={[styles.premiumCard, { backgroundColor: theme.cardBg + '80', borderColor: theme.glassBorder }]}
                                    activeOpacity={0.8}
                                    onPress={() => {
                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                        setActiveRole('agent');
                                    }}
                                >
                                    <View style={[styles.cardIconBox, { backgroundColor: theme.primary + '15' }]}>
                                        <LinearGradient colors={[theme.primary, '#E65100']} style={StyleSheet.absoluteFill} />
                                        <Ionicons name="shield-checkmark" size={32} color="white" />
                                    </View>
                                    <View style={styles.cardText}>
                                        <Text style={[styles.cardTitle, { color: theme.text }]}>Agent Hub</Text>
                                        <Text style={[styles.cardSub, { color: theme.textMuted }]}>Full access to systems, card management & refilling.</Text>
                                    </View>
                                    <Ionicons name="chevron-forward" size={20} color={theme.primary} />
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[styles.premiumCard, { backgroundColor: theme.cardBg + '80', borderColor: theme.glassBorder }]}
                                    activeOpacity={0.8}
                                    onPress={() => {
                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                        setActiveRole('sales');
                                    }}
                                >
                                    <View style={[styles.cardIconBox, { backgroundColor: theme.primary + '15' }]}>
                                        <LinearGradient colors={['#607D8B', '#263238']} style={StyleSheet.absoluteFill} />
                                        <Ionicons name="cart" size={32} color="white" />
                                    </View>
                                    <View style={styles.cardText}>
                                        <Text style={[styles.cardTitle, { color: theme.text }]}>Store Manager</Text>
                                        <Text style={[styles.cardSub, { color: theme.textMuted }]}>Process sales, manage products & track daily earnings.</Text>
                                    </View>
                                    <Ionicons name="chevron-forward" size={20} color={theme.primary} />
                                </TouchableOpacity>
                            </View>

                            <Animated.View entering={FadeInUp.delay(600)} style={styles.safetyCard}>
                                <BlurView intensity={20} tint={darkTheme ? 'dark' : 'light'} style={[styles.safetyInner, { borderColor: theme.glassBorder }]}>
                                    <View style={[styles.safetyIcon, { backgroundColor: theme.primary + '15' }]}>
                                        <Ionicons name="finger-print" size={24} color={theme.primary} />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={[styles.safetyTitle, { color: theme.text }]}>Encrypted Session</Text>
                                        <Text style={[styles.safetyDesc, { color: theme.textMuted }]}>
                                            Authorized biometric-level security for every transaction.
                                        </Text>
                                    </View>
                                </BlurView>
                            </Animated.View>
                        </Animated.View>
                    ) : (
                        <Animated.View entering={FadeIn.duration(400)} style={styles.authView}>
                            <TouchableOpacity
                                style={styles.backLink}
                                onPress={() => {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    setActiveRole(null);
                                    setIsRegisterMode(false);
                                }}
                            >
                                <Ionicons name="chevron-back" size={20} color={theme.primary} />
                                <Text style={[styles.backLinkLabel, { color: theme.primary }]}>Go Back</Text>
                            </TouchableOpacity>

                            <View style={styles.formHeader}>
                                <Text style={[styles.formTitle, { color: theme.text }]}>
                                    {isRegisterMode ? 'Create Account' : 'Welcome Back'}
                                </Text>
                                <Text style={[styles.formSub, { color: theme.textMuted }]}>
                                    Logging into {activeRole === 'agent' ? 'Agent' : 'Seller'} Workspace
                                </Text>
                            </View>

                            <View style={styles.formFields}>
                                {isRegisterMode && (
                                    <View style={[styles.pillInput, { backgroundColor: theme.cardBg, borderColor: theme.glassBorder }]}>
                                        <Ionicons name="person-outline" size={20} color={theme.primary} />
                                        <TextInput
                                            style={[styles.field, { color: theme.text }]}
                                            placeholder="Your Full Name"
                                            placeholderTextColor={theme.textMuted + '60'}
                                            value={fullName}
                                            onChangeText={setFullName}
                                        />
                                    </View>
                                )}

                                <View style={[styles.pillInput, { backgroundColor: theme.cardBg, borderColor: theme.glassBorder }]}>
                                    <Ionicons name="at-outline" size={20} color={theme.primary} />
                                    <TextInput
                                        style={[styles.field, { color: theme.text }]}
                                        placeholder="Username"
                                        placeholderTextColor={theme.textMuted + '60'}
                                        value={username}
                                        onChangeText={setUsername}
                                        autoCapitalize="none"
                                    />
                                </View>

                                <View style={[styles.pillInput, { backgroundColor: theme.cardBg, borderColor: theme.glassBorder }]}>
                                    <Ionicons name="key-outline" size={20} color={theme.primary} />
                                    <TextInput
                                        style={[styles.field, { color: theme.text }]}
                                        placeholder="Password"
                                        placeholderTextColor={theme.textMuted + '60'}
                                        value={password}
                                        onChangeText={setPassword}
                                        secureTextEntry={!showPassword}
                                    />
                                    <TouchableOpacity
                                        onPress={() => {
                                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                            setShowPassword(!showPassword);
                                        }}
                                        style={styles.eyeBtn}
                                    >
                                        <Ionicons
                                            name={showPassword ? "eye-off-outline" : "eye-outline"}
                                            size={22}
                                            color={theme.textMuted}
                                        />
                                    </TouchableOpacity>
                                </View>

                                <TouchableOpacity
                                    style={[styles.actionBtn, { backgroundColor: theme.primary }]}
                                    onPress={handleAuth}
                                    disabled={loading}
                                >
                                    <LinearGradient
                                        colors={[theme.primary, '#E65100']}
                                        style={StyleSheet.absoluteFill}
                                    />
                                    {loading ? <ActivityIndicator color="#fff" /> : (
                                        <Text style={styles.actionBtnText}>
                                            {isRegisterMode ? 'Join Now' : 'Enter Workspace'}
                                        </Text>
                                    )}
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.switchMode}
                                    onPress={() => {
                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                        setIsRegisterMode(!isRegisterMode);
                                    }}
                                >
                                    <Text style={[styles.switchModeText, { color: theme.textMuted }]}>
                                        {isRegisterMode ? 'Already have an account? Sign In' : 'Need a new account? Register Here'}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </Animated.View>
                    )}

                    <Animated.View entering={FadeIn.delay(800)} style={styles.legalFooter}>
                        <Text style={[styles.copyText, { color: theme.textMuted }]}>TAPLINE SMART SYSTEMS • SECURE VERSION</Text>
                    </Animated.View>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flexGrow: 1, paddingHorizontal: 24, paddingBottom: 60, paddingVertical: 40, justifyContent: 'center' },
    floatingCircle: { position: 'absolute', borderRadius: 999, opacity: 0.6 },
    glowPoint: { position: 'absolute', width: 200, height: 200, borderRadius: 100, opacity: 0.4 },
    contentWrapper: { alignItems: 'center', width: '100%' },
    logoOuter: { marginBottom: 32, marginTop: 'auto' },
    glassLogo: {
        width: 180,
        height: 180,
        borderRadius: 90,
        backgroundColor: '#000000',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        elevation: 30,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 15 },
        shadowOpacity: 0.5,
        shadowRadius: 20,
    },
    logoImg: {
        width: 180,
        height: 180,
        borderRadius: 90,
    },
    brandText: { alignItems: 'center', marginBottom: 48 },
    mainTitle: { fontSize: 52, fontWeight: '900', letterSpacing: -2, textAlign: 'center' },
    tagline: { fontSize: 13, fontWeight: '800', letterSpacing: 3, marginTop: 4, opacity: 0.8 },

    modeSection: { width: '100%', marginBottom: 'auto' },
    sectionHeading: { fontSize: 20, fontWeight: '800', textAlign: 'center', marginBottom: 24, opacity: 0.7 },
    gridContainer: { gap: 16, width: '100%' },
    premiumCard: {
        width: '100%',
        padding: 24,
        borderRadius: 32,
        borderWidth: 1.5,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.2,
        shadowRadius: 15,
    },
    cardIconBox: {
        width: 64,
        height: 64,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
    },
    cardText: { flex: 1 },
    cardTitle: { fontSize: 19, fontWeight: '900', marginBottom: 4 },
    cardSub: { fontSize: 13, fontWeight: '500', lineHeight: 18, opacity: 0.6 },

    safetyCard: { marginTop: 40 },
    safetyInner: { flexDirection: 'row', padding: 24, borderRadius: 32, borderWidth: 1.5, gap: 16, alignItems: 'center', overflow: 'hidden' },
    safetyIcon: { width: 44, height: 44, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
    safetyTitle: { fontSize: 16, fontWeight: '900', marginBottom: 2 },
    safetyDesc: { fontSize: 12, fontWeight: '500', lineHeight: 18, opacity: 0.6 },

    authView: { width: '100%', maxWidth: 450, alignSelf: 'center', marginBottom: 'auto' },
    backLink: { alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 32, paddingVertical: 10, paddingHorizontal: 20, borderRadius: 20 },
    backLinkLabel: { fontSize: 14, fontWeight: '800', letterSpacing: 0.5 },
    formHeader: { alignItems: 'center', marginBottom: 40 },
    formTitle: { fontSize: 36, fontWeight: '900', letterSpacing: -1 },
    formSub: { fontSize: 13, fontWeight: '600', marginTop: 6, opacity: 0.5 },
    formFields: { gap: 14 },
    pillInput: { height: 68, borderRadius: 24, borderWidth: 1.5, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, gap: 16 },
    field: { flex: 1, fontSize: 16, fontWeight: '700' },
    eyeBtn: { padding: 4 },
    actionBtn: { height: 72, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginTop: 16, elevation: 15, shadowColor: '#FF6F00', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.3, shadowRadius: 20, overflow: 'hidden' },
    actionBtnText: { color: '#ffffff', fontSize: 18, fontWeight: '900', letterSpacing: 0.5 },
    switchMode: { alignSelf: 'center', marginTop: 32, paddingVertical: 10 },
    switchModeText: { fontSize: 14, fontWeight: '700' },

    legalFooter: { marginTop: 60, alignItems: 'center' },
    copyText: { fontSize: 10, fontWeight: '900', letterSpacing: 1.5, opacity: 0.3 }
});
