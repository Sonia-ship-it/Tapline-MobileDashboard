import React, { useCallback } from 'react';
import { StyleSheet, View, Text, ScrollView, RefreshControl, useWindowDimensions, Platform, TouchableOpacity } from 'react-native';
import { useAppContext } from '@/components/AppContext';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { getColors } from '@/constants/theme';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import Animated, { FadeIn, FadeInDown, FadeInRight, Layout } from 'react-native-reanimated';

export default function Index() {
  const { currentCardData, cardPresent, socketConnected, recentPurchases, refreshTransactions, darkTheme, cardStats, userRole, mqttConnected, requirePhysicalTap } = useAppContext();
  const theme = getColors(darkTheme);
  const { width: screenWidth } = useWindowDimensions();
  const isTablet = screenWidth > 600;

  const onRefresh = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    refreshTransactions();
  }, [refreshTransactions]);

  const filteredPurchases = recentPurchases.filter(tx => {
    if (userRole === 'sales') return tx.type === 'debit';
    if (userRole === 'agent') return tx.type === 'topup';
    return true;
  });

  const getTxDetails = (type: string) => {
    switch (type) {
      case 'topup': return { icon: 'arrow-up-circle', color: theme.success, label: 'Wallet Top Up' };
      case 'debit': return { icon: 'cart', color: theme.primary, label: 'Store Purchase' };
      default: return { icon: 'swap-horizontal', color: theme.textMuted, label: 'Transaction' };
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      {/* Dynamic Background */}
      <View style={StyleSheet.absoluteFill}>
        <LinearGradient
          colors={[theme.background, theme.primary + '10', theme.background]}
          style={StyleSheet.absoluteFill}
        />
        <Animated.View
          entering={FadeIn.delay(300).duration(2000)}
          style={[styles.glowPoint, { top: -50, right: -50, backgroundColor: theme.primary + '15', width: 300, height: 300, borderRadius: 150 }]}
        />
        <Animated.View
          entering={FadeIn.delay(800).duration(2500)}
          style={[styles.glowPoint, { bottom: 100, left: -100, backgroundColor: theme.primary + '10', width: 400, height: 400, borderRadius: 200 }]}
        />
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={isTablet ? styles.tabletContainer : styles.content}
        refreshControl={<RefreshControl refreshing={false} onRefresh={onRefresh} tintColor={theme.primary} />}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInDown.duration(600)} style={styles.header}>
          <View>
            <Text style={[styles.title, { color: theme.text }]}>TapLine</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
              <View style={[styles.roleBadge, { backgroundColor: theme.primary + '20' }]}>
                <Text style={[styles.roleText, { color: theme.primary }]}>
                  {userRole?.toUpperCase() || 'USER'}
                </Text>
              </View>
              <Text style={[styles.subtitle, { color: theme.textMuted }]}>
                {cardPresent ? (
                  `• AUTH SESSION: ${currentCardData?.holderName?.substring(0, 15) || 'CONNECTED'}`
                ) : (
                  mqttConnected ? (
                    requirePhysicalTap ? '• RESET REQUIRED • RE-TAP CARD' : '• TERMINAL READY • SCAN CARD'
                  ) : '• HARDWARE DISCONNECTED'
                )}
              </Text>
            </View>
          </View>
          <View style={styles.headerStatusContainer}>
            <TouchableOpacity
              style={[styles.statusBadge, { backgroundColor: theme.cardBg + '80', borderColor: theme.glassBorder }]}
              onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
            >
              <View style={[styles.statusDot, socketConnected ? { backgroundColor: theme.success } : { backgroundColor: theme.danger }]} />
              <Text style={[styles.statusText, { color: theme.text }]}>LINK</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.statusBadge, { backgroundColor: theme.cardBg + '80', borderColor: theme.glassBorder }]}
              onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
            >
              <View style={[styles.statusDot, mqttConnected ? { backgroundColor: theme.success } : { backgroundColor: '#FFB300' }]} />
              <Text style={[styles.statusText, { color: theme.text }]}>RFID</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>

        <View style={[styles.cardWrapper, isTablet && styles.cardWrapperTablet]}>
          {cardPresent ? (
            <Animated.View entering={FadeInDown.delay(200).springify()} layout={Layout.springify()}>
              <LinearGradient
                colors={currentCardData?.isNew ? ['#FFB300', '#FF8F00'] : [theme.primary, '#E65100']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.cardVisual}
              >
                <View style={styles.cardTop}>
                  <View style={styles.chipContainer}>
                    <LinearGradient colors={['#FFD700', '#DAA520']} style={styles.chip} />
                    <MaterialCommunityIcons name="wifi" size={28} color="white" style={{ transform: [{ rotate: '90deg' }], opacity: 0.8 }} />
                  </View>
                  <Text style={styles.cardBrand}>{currentCardData?.isNew ? 'NEW CARD' : 'NFC PLATINUM'}</Text>
                </View>

                <View style={styles.cardMiddle}>
                  <Text style={styles.cardNumber}>
                    {currentCardData?.isNew ? '•••• •••• •••• ••••' : `**** **** **** ${currentCardData?.uid?.slice(-4) || '••••'}`}
                  </Text>
                </View>

                <View style={styles.cardBottom}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardLabel}>CARD HOLDER</Text>
                    <Text style={styles.cardValue} numberOfLines={1}>
                      {currentCardData?.holderName?.toUpperCase() || (currentCardData?.isNew ? 'WAITING FOR NAME' : 'GUEST USER')}
                    </Text>
                  </View>
                  {!currentCardData?.isNew && (
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={styles.cardLabel}>AVAIL. BALANCE</Text>
                      <Text style={styles.cardBalance}>${currentCardData?.balance?.toFixed(2) || '0.00'}</Text>
                    </View>
                  )}
                </View>
                <BlurView intensity={10} tint="light" style={styles.cardOverlay} />
              </LinearGradient>
            </Animated.View>
          ) : (
            <Animated.View entering={FadeInDown.delay(200)} style={[styles.cardInactive, { backgroundColor: theme.cardBg + '80', borderColor: theme.glassBorder }]}>
              <View style={[styles.inactiveCircle, { backgroundColor: theme.primary + '10' }]}>
                <MaterialCommunityIcons
                  name="nfc"
                  size={72}
                  color={requirePhysicalTap ? theme.textMuted + '50' : theme.primary}
                />
              </View>
              <Text style={[styles.inactiveTitle, { color: theme.text }]}>
                {requirePhysicalTap ? 'Hardware Lock' : 'Terminal Ready'}
              </Text>
              <Text style={[styles.inactiveSub, { color: theme.textMuted }]}>
                {requirePhysicalTap
                  ? 'A card was detected on login. For security, please remove and re-tap card to begin.'
                  : 'Place contactless card near the sensor for authentication and balance check.'}
              </Text>
              <View style={[styles.pulseCircle, { backgroundColor: theme.primary + '03', width: 220, height: 220, borderRadius: 110, position: 'absolute' }]} />
            </Animated.View>
          )}
        </View>

        {(cardStats?.totalTransactions || 0) > 0 && (
          <View style={[styles.statsContainer, isTablet && styles.sectionTablet]}>
            <Animated.View entering={FadeInRight.delay(400)} style={[styles.statBox, { backgroundColor: theme.cardBg + '80', borderColor: theme.glassBorder }]}>
              <Text style={[styles.statLabel, { color: theme.textMuted }]}>Usage/Month</Text>
              <Text style={[styles.statValue, { color: theme.text }]}>${(cardStats?.monthlySpend || 0).toFixed(2)}</Text>
              <View style={[styles.statBar, { backgroundColor: theme.primary + '20' }]}>
                <View style={[styles.statFill, { backgroundColor: theme.primary, width: '65%' }]} />
              </View>
            </Animated.View>
            <Animated.View entering={FadeInRight.delay(500)} style={[styles.statBox, { backgroundColor: theme.cardBg + '80', borderColor: theme.glassBorder }]}>
              <Text style={[styles.statLabel, { color: theme.textMuted }]}>Growth Rate</Text>
              <Text style={[styles.statValue, { color: theme.primary }]}>
                {cardStats ? `+${cardStats.savingRate}%` : '--'}
              </Text>
              <View style={[styles.statBar, { backgroundColor: theme.success + '20' }]}>
                <View style={[styles.statFill, { backgroundColor: theme.primary, width: '40%' }]} />
              </View>
            </Animated.View>
          </View>
        )}

        <Animated.View entering={FadeIn.delay(600)} style={[styles.section, isTablet && styles.sectionTablet]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Internal Audit</Text>
            <TouchableOpacity onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}>
              <Text style={[styles.viewAll, { color: theme.primary }]}>Full Journal</Text>
            </TouchableOpacity>
          </View>

          {filteredPurchases.length === 0 ? (
            <View style={[styles.emptyActivity, { backgroundColor: theme.cardBg + '50', borderColor: theme.glassBorder, borderWidth: 1 }]}>
              <Ionicons name="documents-outline" size={48} color={theme.textMuted + '30'} />
              <Text style={[styles.emptyActivityText, { color: theme.textMuted }]}>
                Waiting for the first transaction...
              </Text>
            </View>
          ) : (
            filteredPurchases.slice(0, 8).map((tx, idx) => {
              const details = getTxDetails(tx.type);
              return (
                <Animated.View
                  entering={FadeInDown.delay(700 + idx * 50)}
                  key={idx}
                  style={[styles.txRow, { backgroundColor: theme.cardBg + '80', borderColor: theme.glassBorder }]}
                >
                  <View style={[styles.txIconContainer, { backgroundColor: theme.primary + '10' }]}>
                    <Ionicons name={details.icon as any} size={24} color={theme.primary} />
                  </View>
                  <View style={styles.txMain}>
                    <Text style={[styles.txDesc, { color: theme.text }]}>{tx.description || 'System Audit Log'}</Text>
                    <Text style={[styles.txDate, { color: theme.textMuted }]}>
                      {new Date(tx.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {new Date(tx.timestamp).toLocaleDateString()}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[styles.txAmount, { color: tx.type === 'topup' ? theme.success : theme.text }]}>
                      {tx.type === 'topup' ? '+' : '-'}${tx.amount.toFixed(2)}
                    </Text>
                    <View style={[styles.statusPill, { backgroundColor: theme.success + '15' }]}>
                      <Text style={[styles.statusPillText, { color: theme.success }]}>SETTLED</Text>
                    </View>
                  </View>
                </Animated.View>
              );
            })
          )}
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 24, paddingBottom: 120 },
  tabletContainer: { maxWidth: 850, alignSelf: 'center', width: '100%', paddingBottom: 60 },

  glowPoint: { position: 'absolute', opacity: 0.5 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 40, marginTop: 40, paddingHorizontal: 24 },
  title: { fontSize: 38, fontWeight: '900', letterSpacing: -2 },
  subtitle: { fontSize: 13, fontWeight: '700', opacity: 0.7 },
  roleBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  roleText: { fontSize: 10, fontWeight: '900', letterSpacing: 1 },

  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 24, borderWidth: 1, gap: 8, elevation: 5 },
  headerStatusContainer: { alignItems: 'flex-end', gap: 10 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: 10, fontWeight: '900', letterSpacing: 1.2 },

  cardWrapper: { marginBottom: 32, paddingHorizontal: 24 },
  cardWrapperTablet: { maxWidth: 520, alignSelf: 'center', width: '100%' },
  cardVisual: { height: 280, borderRadius: 48, padding: 36, justifyContent: 'space-between', overflow: 'hidden', elevation: 25, shadowColor: '#000', shadowOffset: { width: 0, height: 20 }, shadowOpacity: 0.4, shadowRadius: 30 },
  cardOverlay: { ...StyleSheet.absoluteFillObject, opacity: 0.1 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  chipContainer: { flexDirection: 'row', gap: 16, alignItems: 'center' },
  chip: { width: 54, height: 40, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  cardBrand: { color: 'white', fontSize: 13, fontWeight: '900', letterSpacing: 3, opacity: 0.9 },
  cardMiddle: { marginVertical: 24 },
  cardNumber: { color: 'white', fontSize: 26, fontWeight: '700', letterSpacing: 5, textShadowColor: 'rgba(0,0,0,0.4)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 6 },
  cardBottom: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  cardLabel: { color: 'white', fontSize: 9, fontWeight: '900', letterSpacing: 2, opacity: 0.7, marginBottom: 6 },
  cardValue: { color: 'white', fontSize: 18, fontWeight: '800', letterSpacing: 1 },
  cardBalance: { color: 'white', fontSize: 28, fontWeight: '900' },

  cardInactive: { height: 280, borderRadius: 48, borderWidth: 2, borderStyle: 'dotted', justifyContent: 'center', alignItems: 'center', padding: 40, overflow: 'hidden' },
  inactiveCircle: { width: 120, height: 120, borderRadius: 60, justifyContent: 'center', alignItems: 'center', marginBottom: 24, elevation: 10 },
  inactiveTitle: { fontSize: 24, fontWeight: '900', marginBottom: 10 },
  inactiveSub: { fontSize: 15, fontWeight: '600', textAlign: 'center', lineHeight: 22, opacity: 0.6 },
  pulseCircle: { borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)' },

  statsContainer: { flexDirection: 'row', gap: 16, marginBottom: 40, paddingHorizontal: 24 },
  statBox: { flex: 1, padding: 24, borderRadius: 36, borderWidth: 1, elevation: 5 },
  statLabel: { fontSize: 11, fontWeight: '900', letterSpacing: 1.5, marginBottom: 12, textTransform: 'uppercase' },
  statValue: { fontSize: 24, fontWeight: '900', marginBottom: 12 },
  statBar: { height: 6, borderRadius: 3, width: '100%', overflow: 'hidden' },
  statFill: { height: '100%', borderRadius: 3 },

  section: { paddingHorizontal: 24 },
  sectionTablet: { maxWidth: 850, alignSelf: 'center', width: '100%' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  sectionTitle: { fontSize: 22, fontWeight: '900', letterSpacing: -1 },
  viewAll: { fontSize: 14, fontWeight: '800', opacity: 0.8 },

  txRow: { flexDirection: 'row', alignItems: 'center', padding: 20, borderRadius: 32, marginBottom: 14, borderWidth: 1, elevation: 2 },
  txIconContainer: { width: 64, height: 64, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 18 },
  txMain: { flex: 1 },
  txDesc: { fontSize: 17, fontWeight: '800', marginBottom: 4 },
  txDate: { fontSize: 13, fontWeight: '600', opacity: 0.5 },
  txAmount: { fontSize: 18, fontWeight: '900', marginBottom: 4 },
  statusPill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  statusPillText: { fontSize: 9, fontWeight: '900', letterSpacing: 0.5 },

  emptyActivity: { padding: 60, alignItems: 'center', borderRadius: 40, borderStyle: 'dotted' },
  emptyActivityText: { fontSize: 15, fontWeight: '700', marginTop: 16, opacity: 0.5 }
});
