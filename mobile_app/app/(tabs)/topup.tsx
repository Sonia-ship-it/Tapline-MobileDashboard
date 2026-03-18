import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator, ScrollView, useWindowDimensions, Pressable, Modal } from 'react-native';
import { useAppContext } from '@/components/AppContext';
import { getColors } from '@/constants/theme';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import axios from 'axios';
import * as Haptics from 'expo-haptics';
import Animated, { FadeIn, FadeInDown, Layout, ZoomIn } from 'react-native-reanimated';

export default function TopUp() {
    const { backendUrl, currentCardData, cardPresent, refreshTransactions, darkTheme, terminalId, lastScan } = useAppContext();
    const [amount, setAmount] = useState('');
    const [holderName, setHolderName] = useState('');
    const [passcode, setPasscode] = useState('');
    const [loading, setLoading] = useState(false);
    const [isConfirming, setIsConfirming] = useState(false);
    const [startScanTime, setStartScanTime] = useState(0);
    const [scannedUid, setScannedUid] = useState<string | null>(null);
    const [focusedInput, setFocusedInput] = useState<string | null>(null);
    const nameInputRef = React.useRef<TextInput>(null);
    const pinInputRef = React.useRef<TextInput>(null);

    const theme = getColors(darkTheme);
    const { width: screenWidth } = useWindowDimensions();
    const isTablet = screenWidth > 600;

    const handleTopup = async () => {
        const targetUid = scannedUid || currentCardData?.uid;
        if (!targetUid) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            Alert.alert('Error', 'Please scan a card first');
            return;
        }

        if (!isConfirming) {
            setStartScanTime(Date.now());
            setIsConfirming(true);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            return;
        }

        const numAmount = parseFloat(amount);
        if (isNaN(numAmount) || numAmount <= 0) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            Alert.alert('Error', 'Please enter a valid amount');
            return;
        }

        if (currentCardData?.isNew && !holderName.trim()) {
            Alert.alert('Error', 'Please enter a card holder name for this new card');
            return;
        }

        if (currentCardData?.isNew && (!passcode || passcode.length !== 6)) {
            Alert.alert('Error', 'Please enter a 6-digit passcode for this new card');
            return;
        }

        setLoading(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        try {
            await axios.post(`${backendUrl}/topup`, {
                uid: targetUid,
                amount: numAmount,
                holderName: currentCardData?.isNew ? holderName : undefined,
                passcode: currentCardData?.isNew ? passcode : undefined,
                terminalId
            });

            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Alert.alert('Success', `Card topped up by $${numAmount.toFixed(2)}`);
            setAmount('');
            setHolderName('');
            setPasscode('');
            setIsConfirming(false);
            setScannedUid(null);
            refreshTransactions();
        } catch (err: any) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            Alert.alert('Top Up Failed', err.response?.data?.error || err.message);
        } finally {
            setLoading(false);
        }
    };

    // Auto-advance top-up when a new scan is detected during confirmation
    useEffect(() => {
        if (isConfirming && lastScan > startScanTime && cardPresent && currentCardData?.uid) {
            setScannedUid(currentCardData.uid);
            handleTopup();
        }
    }, [isConfirming, lastScan, cardPresent, currentCardData, startScanTime]);

    const quickAmounts = [10, 20, 50, 100, 200, 500];

    const onQuickPress = (val: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setAmount(val);
    };

    return (
        <ScrollView
            style={[styles.container, { backgroundColor: theme.background }]}
            contentContainerStyle={isTablet ? styles.tabletContent : styles.content}
            showsVerticalScrollIndicator={false}
        >
            <Animated.View entering={FadeInDown.duration(800)} style={styles.header}>
                <View>
                    <Text style={[styles.title, { color: theme.text }]}>Card Refill</Text>
                    <Text style={[styles.subtitle, { color: theme.textMuted }]}>
                        {cardPresent ? 'Add money to your scanned card' : 'Waiting for a card to tap...'}
                    </Text>
                </View>
                <TouchableOpacity
                    style={[styles.themeToggle, { backgroundColor: theme.cardBg, borderColor: theme.glassBorder }]}
                    onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
                >
                    <Ionicons name={darkTheme ? "moon" : "sunny"} size={20} color={theme.primary} />
                </TouchableOpacity>
            </Animated.View>

            {!cardPresent ? (
                <Animated.View entering={FadeIn.delay(200)} style={styles.emptyContainer}>
                    <View style={styles.radarContainer}>
                        <Animated.View
                            entering={FadeIn.delay(300).duration(2000)}
                            style={[styles.radarCircle, { borderColor: theme.primary + '40', width: 240, height: 240, borderRadius: 120 }]}
                        />
                        <Animated.View
                            entering={FadeIn.delay(600).duration(2500)}
                            style={[styles.radarCircle, { borderColor: theme.primary + '20', width: 300, height: 300, borderRadius: 150 }]}
                        />
                        <View style={[styles.emptyIconContainer, { backgroundColor: theme.cardBg + '80', borderColor: theme.glassBorder }]}>
                            <MaterialCommunityIcons name="nfc" size={72} color={theme.primary} />
                            <BlurView intensity={5} style={StyleSheet.absoluteFill} />
                        </View>
                        <View style={[styles.pulseCircle, { backgroundColor: theme.primary + '05', width: 200, height: 200, borderRadius: 100 }]} />
                    </View>
                    <Text style={[styles.emptyText, { color: theme.text }]}>Scanner Active</Text>
                    <Text style={[styles.emptySub, { color: theme.textMuted }]}>Please place your contactless card against the terminal to begin a new refill session.</Text>
                </Animated.View>
            ) : (
                <Animated.View layout={Layout.springify()} style={styles.activeContent}>
                    <Animated.View entering={ZoomIn.springify()} style={styles.cardWrapper}>
                        <LinearGradient
                            colors={currentCardData?.isNew ? ['#FFB300', '#FF8F00'] : [theme.primary, '#E65100']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.cardGradient}
                        >
                            <View style={styles.cardHeader}>
                                <View style={styles.chipContainer}>
                                    <LinearGradient colors={['#FFD700', '#DAA520']} style={styles.chip} />
                                    <MaterialCommunityIcons name="wifi" size={28} color="white" style={{ transform: [{ rotate: '90deg' }], opacity: 0.8 }} />
                                </View>
                                <Text style={styles.cardType}>{currentCardData?.isNew ? 'NEW CARD' : 'PLATINUM'}</Text>
                            </View>

                            <View style={styles.cardBody}>
                                <Text style={styles.cardLabel}>IDENTIFIER</Text>
                                <Text style={styles.cardUid}>{currentCardData?.uid.toUpperCase().match(/.{1,4}/g)?.join(' ') || currentCardData?.uid}</Text>
                            </View>

                            <View style={styles.cardFooter}>
                                <View>
                                    <Text style={styles.cardLabel}>STATUS</Text>
                                    <View style={styles.statusBadge}>
                                        <View style={[styles.statusDot, { backgroundColor: currentCardData?.isNew ? '#fff' : '#4ADE80' }]} />
                                        <Text style={styles.statusText}>{currentCardData?.isNew ? 'Unregistered Link' : 'Secure Connection'}</Text>
                                    </View>
                                </View>
                                <MaterialCommunityIcons name="contactless-payment" size={38} color="rgba(255,255,255,0.4)" />
                            </View>
                            <BlurView intensity={10} tint="light" style={styles.cardOverlay} />
                        </LinearGradient>
                    </Animated.View>

                    <View style={styles.form}>
                        <View style={styles.sectionHeader}>
                            <Text style={[styles.sectionTitle, { color: theme.text }]}>Amount to Add</Text>
                            <Text style={[styles.sectionSub, { color: theme.textMuted }]}>How much money would you like to load?</Text>
                        </View>

                        <View style={[
                            styles.amountContainer,
                            {
                                backgroundColor: theme.cardBg,
                                borderColor: focusedInput === 'amount' ? theme.primary : theme.glassBorder
                            }
                        ]}>
                            <Text style={[styles.currency, { color: theme.primary }]}>$</Text>
                            <TextInput
                                style={[styles.amountInput, { color: theme.text }]}
                                keyboardType="decimal-pad"
                                value={amount}
                                onChangeText={setAmount}
                                placeholder="0.00"
                                placeholderTextColor={theme.textMuted + '40'}
                                onFocus={() => setFocusedInput('amount')}
                                onBlur={() => setFocusedInput(null)}
                                returnKeyType={currentCardData?.isNew ? "next" : "done"}
                                onSubmitEditing={() => {
                                    if (currentCardData?.isNew) {
                                        nameInputRef.current?.focus();
                                    } else {
                                        handleTopup();
                                    }
                                }}
                            />
                            {currentCardData?.isNew && (
                                <TouchableOpacity
                                    onPress={() => nameInputRef.current?.focus()}
                                    style={styles.nextIconBtn}
                                >
                                    <Ionicons name="arrow-forward-circle" size={32} color={theme.primary} />
                                </TouchableOpacity>
                            )}
                        </View>

                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickScroll}>
                            {quickAmounts.map(val => (
                                <Pressable
                                    key={val}
                                    onPress={() => onQuickPress(val.toString())}
                                    style={({ pressed }) => [
                                        styles.quickPill,
                                        {
                                            backgroundColor: amount === val.toString() ? theme.primary : theme.cardBg,
                                            borderColor: amount === val.toString() ? theme.primary : theme.glassBorder,
                                            opacity: pressed ? 0.7 : 1
                                        }
                                    ]}
                                >
                                    <Text style={[
                                        styles.quickPillText,
                                        { color: amount === val.toString() ? '#fff' : theme.text }
                                    ]}>
                                        +${val}
                                    </Text>
                                </Pressable>
                            ))}
                        </ScrollView>

                        {currentCardData?.isNew && (
                            <Animated.View entering={FadeInDown} style={styles.registrationContainer}>
                                <View style={[styles.divider, { backgroundColor: theme.glassBorder }]} />
                                <View style={styles.sectionHeader}>
                                    <Text style={[styles.sectionTitle, { color: theme.text }]}>Card Set Up</Text>
                                    <Text style={[styles.sectionSub, { color: theme.textMuted }]}>Fill in these details for the new user</Text>
                                </View>

                                <View style={styles.inputGroup}>
                                    <Text style={[styles.label, { color: theme.text }]}>Full Name</Text>
                                    <View style={[
                                        styles.inputWrapper,
                                        {
                                            backgroundColor: theme.cardBg,
                                            borderColor: focusedInput === 'name' ? theme.primary : theme.glassBorder
                                        }
                                    ]}>
                                        <Ionicons name="person-outline" size={20} color={theme.textMuted} style={styles.inputIcon} />
                                        <TextInput
                                            ref={nameInputRef}
                                            style={[styles.input, { color: theme.text }]}
                                            value={holderName}
                                            onChangeText={setHolderName}
                                            placeholder="John Doe"
                                            placeholderTextColor={theme.textMuted + '40'}
                                            onFocus={() => setFocusedInput('name')}
                                            onBlur={() => setFocusedInput(null)}
                                            returnKeyType="next"
                                            onSubmitEditing={() => pinInputRef.current?.focus()}
                                        />
                                        <TouchableOpacity
                                            onPress={() => pinInputRef.current?.focus()}
                                            style={styles.fieldNextBtn}
                                        >
                                            <Ionicons name="chevron-forward" size={20} color={theme.primary} />
                                        </TouchableOpacity>
                                    </View>
                                </View>

                                <View style={styles.inputGroup}>
                                    <Text style={[styles.label, { color: theme.text }]}>Set 6-Digit PIN</Text>
                                    <View style={[
                                        styles.inputWrapper,
                                        {
                                            backgroundColor: theme.cardBg,
                                            borderColor: focusedInput === 'pin' ? theme.primary : theme.glassBorder
                                        }
                                    ]}>
                                        <Ionicons name="lock-closed-outline" size={20} color={theme.textMuted} style={styles.inputIcon} />
                                        <TextInput
                                            ref={pinInputRef}
                                            style={[styles.input, { color: theme.text }]}
                                            keyboardType="number-pad"
                                            secureTextEntry
                                            maxLength={6}
                                            value={passcode}
                                            onChangeText={setPasscode}
                                            placeholder="000000"
                                            placeholderTextColor={theme.textMuted + '40'}
                                            onFocus={() => setFocusedInput('pin')}
                                            onBlur={() => setFocusedInput(null)}
                                            returnKeyType="done"
                                            onSubmitEditing={handleTopup}
                                        />
                                    </View>
                                </View>
                            </Animated.View>
                        )}

                        <TouchableOpacity
                            style={[
                                styles.submitButton,
                                { backgroundColor: theme.primary },
                                (!amount || (currentCardData?.isNew && !holderName)) && styles.submitDisabled
                            ]}
                            onPress={handleTopup}
                            disabled={loading || !amount}
                            activeOpacity={0.8}
                        >
                            {loading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <View style={styles.submitContent}>
                                    <Text style={styles.submitBtnText}>
                                        {currentCardData?.isNew ? 'Register & Add Money' : 'Add Money Now'}
                                    </Text>
                                    <View style={styles.submitIconBg}>
                                        <Ionicons name="shield-checkmark" size={20} color="#fff" />
                                    </View>
                                </View>
                            )}
                        </TouchableOpacity>
                    </View>
                </Animated.View>
            )}

            <Modal
                visible={isConfirming}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setIsConfirming(false)}
            >
                <BlurView intensity={80} tint={darkTheme ? "dark" : "light"} style={styles.modalOverlay}>
                    <Animated.View entering={FadeInDown.duration(600)} style={styles.modalContainer}>
                        <View style={[styles.modalContent, { backgroundColor: theme.cardBg, borderColor: theme.glassBorder }]}>
                            <View style={styles.scanningIndicator}>
                                <View style={[styles.pPulse, { backgroundColor: theme.primary + '20' }]} />
                                <View style={[styles.pPulseInner, { backgroundColor: theme.primary + '40' }]} />
                                <MaterialCommunityIcons name="nfc" size={80} color={theme.primary} />
                            </View>

                            <Text style={[styles.modalTitle, { color: theme.text }]}>Confirm with Tap</Text>
                            <Text style={[styles.modalSub, { color: theme.textMuted }]}>
                                Please place the RFID card against the <Text style={{ fontWeight: '800' }}>RFID Terminal / Reader</Text> to complete the ${amount} refill.
                            </Text>

                            <TouchableOpacity
                                style={[styles.cancelBtn, { borderColor: theme.glassBorder }]}
                                onPress={() => setIsConfirming(false)}
                            >
                                <Text style={[styles.cancelBtnText, { color: theme.textMuted }]}>Cancel Transaction</Text>
                            </TouchableOpacity>
                        </View>
                    </Animated.View>
                </BlurView>
            </Modal>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    content: { paddingBottom: 40 },
    tabletContent: { maxWidth: 600, alignSelf: 'center', width: '100%', paddingBottom: 40 },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingTop: 60,
        marginBottom: 30
    },
    title: { fontSize: 32, fontWeight: '800', letterSpacing: -0.5 },
    subtitle: { fontSize: 15, marginTop: 4, fontWeight: '500', opacity: 0.7 },
    themeToggle: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
    },

    emptyContainer: {
        flex: 1,
        height: 500,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40
    },
    radarContainer: {
        width: 200,
        height: 200,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 40,
    },
    radarCircle: {
        position: 'absolute',
        width: 140,
        height: 140,
        borderRadius: 70,
        borderWidth: 1,
    },
    emptyIconContainer: {
        width: 120,
        height: 120,
        borderRadius: 60,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
    },
    emptyText: { fontSize: 24, fontWeight: '800', marginBottom: 8 },
    emptySub: { fontSize: 16, fontWeight: '500', textAlign: 'center' },

    activeContent: { flex: 1 },
    cardWrapper: {
        paddingHorizontal: 24,
        marginBottom: 35
    },
    cardGradient: {
        height: 220,
        borderRadius: 32,
        padding: 28,
        justifyContent: 'space-between',
        elevation: 15,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start'
    },
    chipContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    chip: {
        width: 45,
        height: 35,
        backgroundColor: 'rgba(255,255,255,0.25)',
        borderRadius: 8,
        marginRight: 10,
    },
    cardType: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '800',
        letterSpacing: 1,
        opacity: 0.9
    },
    cardBody: { marginTop: 10 },
    cardLabel: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 1.5,
        marginBottom: 4
    },
    cardUid: {
        color: '#fff',
        fontSize: 22,
        fontWeight: '700',
        fontFamily: 'monospace',
        letterSpacing: 3
    },
    cardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end'
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: 6,
    },
    statusText: {
        color: '#fff',
        fontSize: 13,
        fontWeight: '700',
    },

    form: { paddingHorizontal: 24 },
    sectionHeader: { marginBottom: 20 },
    sectionTitle: { fontSize: 22, fontWeight: '800' },
    sectionSub: { fontSize: 14, marginTop: 4, opacity: 0.6 },

    amountContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 24,
        paddingHorizontal: 20,
        borderWidth: 2,
        height: 90,
        marginBottom: 20
    },
    currency: { fontSize: 28, fontWeight: '600', marginRight: 15 },
    amountInput: { flex: 1, fontSize: 36, fontWeight: '800' },

    quickScroll: {
        paddingVertical: 10,
        gap: 12,
        marginBottom: 35
    },
    quickPill: {
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 16,
        borderWidth: 1.5,
        minWidth: 80,
        alignItems: 'center'
    },
    quickPillText: { fontSize: 16, fontWeight: '700' },

    registrationContainer: { marginTop: 10 },
    divider: { height: 1, width: '100%', marginBottom: 35, opacity: 0.5 },
    inputGroup: { marginBottom: 20 },
    label: { fontSize: 14, fontWeight: '700', marginBottom: 10, marginLeft: 4 },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 64,
        borderRadius: 18,
        borderWidth: 1.5,
        paddingHorizontal: 16,
    },
    inputIcon: { marginRight: 12 },
    input: { flex: 1, fontSize: 16, fontWeight: '600' },

    submitButton: {
        height: 72,
        borderRadius: 24,
        justifyContent: 'center',
        paddingHorizontal: 24,
        marginTop: 20,
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.25,
        shadowRadius: 15,
    },
    submitContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    submitBtnText: { color: '#fff', fontSize: 18, fontWeight: '800' },
    submitIconBg: {
        width: 40,
        height: 40,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden'
    },
    submitDisabled: { opacity: 0.4 },
    nextIconBtn: { marginLeft: 10 },
    fieldNextBtn: { padding: 4 },

    modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    modalContainer: { width: '85%', maxWidth: 400 },
    modalContent: { padding: 40, borderRadius: 40, borderWidth: 1.5, alignItems: 'center', elevation: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 15 }, shadowOpacity: 0.3, shadowRadius: 30 },
    scanningIndicator: { width: 140, height: 140, borderRadius: 70, justifyContent: 'center', alignItems: 'center', marginBottom: 30 },
    pPulse: { position: 'absolute', width: 130, height: 130, borderRadius: 65 },
    pPulseInner: { position: 'absolute', width: 100, height: 100, borderRadius: 50 },
    modalTitle: { fontSize: 24, fontWeight: '900', marginBottom: 12, textAlign: 'center' },
    modalSub: { fontSize: 16, fontWeight: '500', lineHeight: 24, textAlign: 'center', opacity: 0.8, marginBottom: 40 },
    cancelBtn: { paddingVertical: 18, paddingHorizontal: 30, borderRadius: 20, borderWidth: 1.5 },
    cancelBtnText: { fontSize: 14, fontWeight: '800', letterSpacing: 0.5 },
    pulseCircle: { position: 'absolute', borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)' },
    cardOverlay: { ...StyleSheet.absoluteFillObject, opacity: 0.1 }
});


