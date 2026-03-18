import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, Text, FlatList, ActivityIndicator, useWindowDimensions, TouchableOpacity } from 'react-native';
import { useAppContext } from '@/components/AppContext';
import { getColors } from '@/constants/theme';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import axios from 'axios';
import * as Haptics from 'expo-haptics';
import Animated, { FadeIn, FadeInDown, Layout } from 'react-native-reanimated';

export default function History() {
    const { backendUrl, darkTheme, userRole } = useAppContext();
    const [transactions, setTransactions] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [timeframe, setTimeframe] = useState<'all' | 'today'>('all');

    const theme = getColors(darkTheme);
    const { width: screenWidth } = useWindowDimensions();
    const isTablet = screenWidth > 600;

    const txType = userRole === 'agent' ? 'topup' : 'debit';

    useEffect(() => {
        fetchGlobalTransactions();
    }, [userRole, timeframe]);

    const fetchGlobalTransactions = async () => {
        if (!backendUrl) return;
        setLoading(true);
        try {
            const res = await axios.get(`${backendUrl}/transactions/all`, {
                params: {
                    type: txType,
                    timeframe: timeframe
                }
            });
            setTransactions(res.data || []);
        } catch (err) {
            console.log('Failed to fetch global transactions');
        } finally {
            setLoading(false);
        }
    };

    const onRefresh = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        fetchGlobalTransactions();
    }, [userRole, timeframe]);

    const renderItem = ({ item, index }: { item: any, index: number }) => (
        <Animated.View
            entering={FadeInDown.delay(index * 20).duration(300)}
            layout={Layout.springify()}
            style={[styles.txRow, { backgroundColor: theme.cardBg, borderColor: theme.glassBorder }]}
        >
            <View style={[styles.txIconContainer, { backgroundColor: txType === 'topup' ? theme.success + '15' : theme.primary + '15' }]}>
                <Ionicons
                    name={txType === 'topup' ? 'arrow-up-circle' : 'cart'}
                    size={26}
                    color={txType === 'topup' ? theme.success : theme.primary}
                />
            </View>
            <View style={styles.txLeft}>
                <Text style={[styles.txDesc, { color: theme.text }]}>
                    {item.description || (txType === 'topup' ? 'Wallet Top-Up' : 'Sales Payment')}
                </Text>
                <View style={styles.txMeta}>
                    <Text style={[styles.txDate, { color: theme.textMuted }]}>
                        UID: {item.uid?.slice(-8).toUpperCase()} • {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                </View>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
                <Text style={[styles.txAmount, { color: txType === 'topup' ? theme.success : theme.text }]}>
                    {txType === 'topup' ? '+' : '-'}${item.amount.toFixed(2)}
                </Text>
                <Text style={[styles.txStatus, { color: theme.textMuted }]}>Terminal: {item.terminalId || 'N/A'}</Text>
            </View>
        </Animated.View>
    );

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <View style={[styles.header, isTablet && styles.tabletHeader]}>
                <View style={styles.headerTop}>
                    <View>
                        <Text style={[styles.title, { color: theme.text }]}>
                            {userRole === 'agent' ? 'Add History' : 'Payment History'}
                        </Text>
                        <Text style={[styles.subtitle, { color: theme.textMuted }]}>
                            View all past card activity
                        </Text>
                    </View>
                    <View style={styles.filterContainer}>
                        <TouchableOpacity
                            style={[styles.filterBtn, timeframe === 'today' && { backgroundColor: theme.primary }]}
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                setTimeframe('today');
                            }}
                        >
                            <Text style={[styles.filterText, { color: timeframe === 'today' ? '#fff' : theme.textMuted }]}>Today</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.filterBtn, timeframe === 'all' && { backgroundColor: theme.primary }]}
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                setTimeframe('all');
                            }}
                        >
                            <Text style={[styles.filterText, { color: timeframe === 'all' ? '#fff' : theme.textMuted }]}>All</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>

            <FlatList
                data={transactions}
                renderItem={renderItem}
                keyExtractor={item => item._id}
                contentContainerStyle={[styles.list, isTablet && styles.tabletList]}
                refreshing={loading}
                onRefresh={onRefresh}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <MaterialCommunityIcons name="file-search-outline" size={64} color={theme.textMuted + '40'} />
                        <Text style={[styles.emptyStateText, { color: theme.textMuted }]}>No history found yet.</Text>
                    </View>
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { paddingHorizontal: 24, paddingTop: 60, marginBottom: 10 },
    headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    tabletHeader: { maxWidth: 800, alignSelf: 'center', width: '100%' },
    title: { fontSize: 30, fontWeight: '900', letterSpacing: -1 },
    subtitle: { fontSize: 14, marginTop: 4, fontWeight: '600', opacity: 0.6 },

    filterContainer: { flexDirection: 'row', gap: 8, backgroundColor: 'rgba(0,0,0,0.05)', padding: 4, borderRadius: 12 },
    filterBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
    filterText: { fontSize: 12, fontWeight: '800' },

    list: { padding: 24, paddingBottom: 100 },
    tabletList: { maxWidth: 800, alignSelf: 'center', width: '100%' },
    txRow: { flexDirection: 'row', alignItems: 'center', padding: 18, borderRadius: 28, marginBottom: 16, borderWidth: 1, elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10 },
    txIconContainer: { width: 54, height: 54, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
    txLeft: { flex: 1, justifyContent: 'center' },
    txDesc: { fontSize: 17, fontWeight: '700', marginBottom: 2 },
    txMeta: { flexDirection: 'row', alignItems: 'center' },
    txDate: { fontSize: 12, fontWeight: '500' },
    txAmount: { fontSize: 18, fontWeight: '800', marginBottom: 2 },
    txStatus: { fontSize: 9, fontWeight: '800', textTransform: 'uppercase', opacity: 0.5 },
    emptyState: { padding: 60, alignItems: 'center', justifyContent: 'center' },
    emptyStateText: { fontSize: 16, fontWeight: '600', marginTop: 16, textAlign: 'center' }
});
