import React, { useEffect, useState, useCallback } from 'react';
import { StyleSheet, View, Text, ScrollView, RefreshControl, useWindowDimensions } from 'react-native';
import { useAppContext } from '@/components/AppContext';
import { getColors } from '@/constants/theme';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown, Layout } from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';

export default function SystemDashboard() {
    const { systemStats, darkTheme, refreshTransactions, socketConnected, terminalId, userRole } = useAppContext();
    const [refreshing, setRefreshing] = useState(false);

    const theme = getColors(darkTheme);
    const { width } = useWindowDimensions();
    const isTablet = width > 600;

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        refreshTransactions();
        setTimeout(() => setRefreshing(false), 800);
    }, []);

    const StatCard = ({ title, value, icon, color, delay = 0, subtitle = "" }: any) => (
        <Animated.View
            entering={FadeInDown.delay(delay).duration(600)}
            style={[styles.statCard, { backgroundColor: theme.cardBg, borderColor: theme.glassBorder, width: isTablet ? (width - 80) / 2 : '100%' }]}
        >
            <View style={styles.statHeader}>
                <View style={[styles.statIconBox, { backgroundColor: color + '15' }]}>
                    <MaterialCommunityIcons name={icon} size={28} color={color} />
                </View>
                <View style={styles.statusDotBox}>
                    <View style={[styles.pulseDot, { backgroundColor: color }]} />
                </View>
            </View>
            <Text style={[styles.statValue, { color: theme.text }]}>{value}</Text>
            <Text style={[styles.statTitle, { color: theme.textMuted }]}>{title}</Text>
            {subtitle ? <Text style={[styles.statSub, { color: color }]}>{subtitle}</Text> : null}
        </Animated.View>
    );

    return (
        <ScrollView
            style={[styles.container, { backgroundColor: theme.background }]}
            contentContainerStyle={styles.content}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
            showsVerticalScrollIndicator={false}
        >
            <View style={styles.header}>
                <View>
                    <Text style={[styles.title, { color: theme.text }]}>
                        {userRole === 'agent' ? 'Agent Dashboard' : 'Seller Dashboard'}
                    </Text>
                    <Text style={[styles.subtitle, { color: theme.textMuted }]}>
                        Device ID: {terminalId} • {userRole === 'agent' ? 'Agent' : 'Store Seller'}
                    </Text>
                </View>
                <BlurView intensity={20} style={[styles.liveBadge, { backgroundColor: socketConnected ? theme.success + '20' : theme.danger + '20', overflow: 'hidden' }]}>
                    <Text style={[styles.liveText, { color: socketConnected ? theme.success : theme.danger }]}>{socketConnected ? 'ONLINE' : 'OFFLINE'}</Text>
                </BlurView>
            </View>

            {userRole === 'agent' ? (
                <View style={styles.dashboardSection}>
                    <View style={styles.statsGrid}>
                        <StatCard
                            title="Cards Registered"
                            value={systemStats?.totalCards || 0}
                            icon="card-account-details-outline"
                            color={theme.success}
                            delay={50}
                            subtitle="Total Ecosystem"
                        />
                        <StatCard
                            title="Daily Refills"
                            value={systemStats?.todayTopupCount || 0}
                            icon="sync-circle"
                            color={theme.secondary}
                            delay={150}
                            subtitle="Actions Today"
                        />
                        <StatCard
                            title="Money Added"
                            value={`$${(systemStats?.todayTopupTotal || 0).toFixed(2)}`}
                            icon="shield-plus"
                            color={theme.primary}
                            delay={250}
                            subtitle="Cash Flow"
                        />
                    </View>
                    <Animated.View entering={FadeInDown.delay(300)} style={[styles.wideCard, { backgroundColor: theme.cardBg, borderColor: theme.glassBorder }]}>
                        <View style={styles.wideHeader}>
                            <Text style={[styles.wideTitle, { color: theme.text }]}>Daily Goal (50 Cards)</Text>
                            <Text style={[styles.wideValue, { color: theme.secondary }]}>{systemStats?.todayCardsServed || 0} Cards</Text>
                        </View>
                        <View style={[styles.progressBarBg, { backgroundColor: theme.secondary + '10' }]}>
                            <LinearGradient
                                colors={[theme.secondary, theme.primary]}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={[styles.progressBarFill, { width: `${Math.min(100, ((systemStats?.todayCardsServed || 0) / 50) * 100)}%` }]}
                            />
                        </View>
                    </Animated.View>
                </View>
            ) : (
                <View style={styles.dashboardSection}>
                    <View style={styles.statsGrid}>
                        <StatCard
                            title="Today's Sales"
                            value={`$${(systemStats?.todayPaymentTotal || 0).toFixed(2)}`}
                            icon="finance"
                            color={theme.primary}
                            delay={100}
                            subtitle="Total Income"
                        />
                        <StatCard
                            title="Number of Sales"
                            value={systemStats?.todayPaymentCount || 0}
                            icon="check-decagram"
                            color={theme.success}
                            delay={200}
                            subtitle="Confirmed"
                        />
                    </View>
                    <Animated.View entering={FadeInDown.delay(300)} style={[styles.wideCard, { backgroundColor: theme.cardBg, borderColor: theme.glassBorder }]}>
                        <View style={styles.wideHeader}>
                            <Text style={[styles.wideTitle, { color: theme.text }]}>Sales Goal ($2,500)</Text>
                            <Text style={[styles.wideValue, { color: theme.primary }]}>${(systemStats?.todayPaymentTotal || 0).toFixed(0)}</Text>
                        </View>
                        <View style={[styles.progressBarBg, { backgroundColor: theme.primary + '10' }]}>
                            <LinearGradient
                                colors={[theme.primary, '#E65100']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={[styles.progressBarFill, { width: `${Math.min(100, ((systemStats?.todayPaymentTotal || 0) / 2500) * 100)}%` }]}
                            />
                        </View>
                    </Animated.View>
                </View>
            )}

            <View style={styles.dividerBox}>
                <View style={[styles.divider, { backgroundColor: theme.glassBorder }]} />
                <Text style={[styles.dividerText, { color: theme.textMuted }]}>GLOBAL SYSTEM STATS</Text>
                <View style={[styles.divider, { backgroundColor: theme.glassBorder }]} />
            </View>

            <View style={styles.statsGrid}>
                <StatCard
                    title="Total Cards Registered"
                    value={systemStats?.totalCards || 0}
                    icon="chip"
                    color={theme.textMuted}
                    delay={400}
                />
                <StatCard
                    title="Total Money in System"
                    value={`$${(systemStats?.totalBalance || 0).toFixed(2)}`}
                    icon="safe-square"
                    color={theme.textMuted}
                    delay={500}
                />
            </View>


            <View style={styles.infoBox}>
                <BlurView intensity={20} tint={darkTheme ? "dark" : "light"} style={styles.infoBlur}>
                    <Ionicons name="information-circle-outline" size={20} color={theme.text} />
                    <Text style={[styles.infoText, { color: theme.text }]}>
                        Data updated automatically via <Text style={{ fontWeight: '800', color: theme.primary }}>TapLine</Text>
                    </Text>
                </BlurView>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    content: { padding: 24, paddingTop: 60, paddingBottom: 120 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 40 },
    title: { fontSize: 32, fontWeight: '900', letterSpacing: -1 },
    subtitle: { fontSize: 14, marginTop: 6, fontWeight: '600', opacity: 0.6 },
    liveBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
    liveText: { fontSize: 10, fontWeight: '900', letterSpacing: 1 },

    statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 20 },
    statCard: { padding: 24, borderRadius: 32, borderWidth: 1, elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, marginBottom: 10 },
    statHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
    statIconBox: { width: 54, height: 54, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
    statusDotBox: { width: 24, height: 24, justifyContent: 'center', alignItems: 'center' },
    pulseDot: { width: 6, height: 6, borderRadius: 3, opacity: 0.8 },
    statValue: { fontSize: 28, fontWeight: '900', marginBottom: 6 },
    statTitle: { fontSize: 14, fontWeight: '700', opacity: 0.8 },
    statSub: { fontSize: 11, fontWeight: '800', marginTop: 10, textTransform: 'uppercase', letterSpacing: 0.5 },

    dividerBox: { flexDirection: 'row', alignItems: 'center', gap: 15, marginVertical: 35 },
    divider: { flex: 1, height: 1, opacity: 0.5 },
    dividerText: { fontSize: 10, fontWeight: '900', letterSpacing: 2 },

    infoBox: { marginTop: 40, borderRadius: 24, overflow: 'hidden' },
    infoBlur: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 20 },
    infoText: { fontSize: 13, fontWeight: '600', flex: 1, opacity: 0.8 },

    dashboardSection: { gap: 20 },
    wideCard: { padding: 24, borderRadius: 32, borderWidth: 1, marginTop: 10 },
    wideHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
    wideTitle: { fontSize: 16, fontWeight: '800' },
    wideValue: { fontSize: 16, fontWeight: '900' },
    progressBarBg: { height: 12, borderRadius: 6, overflow: 'hidden' },
    progressBarFill: { height: '100%', borderRadius: 6 }
});
