import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, FlatList, Alert, ActivityIndicator, TextInput, Modal, useWindowDimensions, Platform, ScrollView, Pressable } from 'react-native';
import { useAppContext } from '@/components/AppContext';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { getColors } from '@/constants/theme';
import axios from 'axios';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import Animated, { FadeIn, FadeInDown, FadeOut, Layout, SlideInDown, SlideOutDown } from 'react-native-reanimated';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

export default function Marketplace() {
    const { backendUrl, currentCardData, cardPresent, cart, addToCart, removeFromCart, changeCartQty, cartTotal, clearCart, refreshTransactions, darkTheme, terminalId, lastScan } = useAppContext();
    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [checkoutLoading, setCheckoutLoading] = useState(false);

    const [selectedCategory, setSelectedCategory] = useState('all');
    const [cartExpanded, setCartExpanded] = useState(false);

    const theme = getColors(darkTheme);

    const [passcodeModal, setPasscodeModal] = useState(false);
    const [passcode, setPasscode] = useState('');
    const [checkoutStep, setCheckoutStep] = useState<'idle' | 'scanning' | 'pin' | 'success'>('idle');
    const [startScanTime, setStartScanTime] = useState(0);
    const [latestOrder, setLatestOrder] = useState<any>(null);
    const [scannedUid, setScannedUid] = useState<string | null>(null);

    const { width: screenWidth } = useWindowDimensions();
    const isTablet = screenWidth > 600;
    const numColumns = screenWidth > 900 ? 4 : (screenWidth > 600 ? 3 : 2);

    useEffect(() => {
        if (backendUrl) fetchProducts();
    }, [backendUrl]);

    const fetchProducts = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`${backendUrl}/products`);
            setProducts(res.data);
        } catch (err) {
            console.log('Failed to fetch products');
        } finally {
            setLoading(false);
        }
    };

    const categories = [
        { id: 'all', label: 'Store', icon: 'grid-outline' },
        { id: 'food', label: 'Eats', icon: 'fast-food-outline' },
        { id: 'rwandan', label: 'Local', icon: 'leaf-outline' },
        { id: 'drinks', label: 'Brews', icon: 'wine-outline' },
        { id: 'domains', label: 'Web', icon: 'globe-outline' },
        { id: 'services', label: 'Cloud', icon: 'cloud-done-outline' }
    ];

    const filteredProducts = selectedCategory === 'all'
        ? products
        : products.filter(p => p.category === selectedCategory);

    const handleAddToCart = (product: any) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        addToCart(product);
        if (checkoutStep === 'idle' && !cartExpanded && cart.length === 0) {
            // Optional: expand cart on first item
        }
    };

    const startCheckoutFlow = () => {
        if (cart.length === 0) return;
        setStartScanTime(Date.now());
        setCheckoutStep('scanning');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    };

    // Auto-advance from scanning to pin when card is detected (MUST be a new tap)
    useEffect(() => {
        if (checkoutStep === 'scanning' && lastScan > startScanTime && cardPresent && currentCardData?.uid) {
            setScannedUid(currentCardData.uid);
            setCheckoutStep('pin');
            setPasscodeModal(true);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }
    }, [checkoutStep, lastScan, cardPresent, currentCardData, startScanTime]);

    // Safety: if card is removed while scanning, we stay in scanning mode waiting for it

    const processCheckout = async (enteredPasscode?: string) => {
        const targetUid = scannedUid || currentCardData?.uid;
        if (!targetUid) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            Alert.alert('Scan Required', 'Please tap your card to continue payment.');
            setCheckoutStep('scanning');
            return;
        }

        if (cart.length === 0) return;

        const descriptions = cart.map(item => item.qty > 1 ? `${item.product.name} x${item.qty}` : item.product.name);
        const description = `Purchase: ${descriptions.join(', ')}`;

        setCheckoutLoading(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

        try {
            const res = await axios.post(`${backendUrl}/pay`, {
                uid: targetUid,
                amount: cartTotal,
                description,
                passcode: enteredPasscode,
                terminalId
            });

            const orderData = {
                receiptId: res.data.transaction?.id || `TL-${Math.floor(Math.random() * 1000000)}`,
                items: [...cart],
                total: cartTotal,
                date: new Date().toLocaleString(),
                cardUid: currentCardData.uid,
                holderName: currentCardData.holderName || 'Card Holder',
                terminal: terminalId
            };
            setLatestOrder(orderData);

            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

            clearCart();
            setPasscodeModal(false);
            setPasscode('');
            setCheckoutStep('success');
            setScannedUid(null);
            setCartExpanded(false);
            refreshTransactions();
        } catch (err: any) {
            const errData = err.response?.data;
            if (errData?.passcodeRequired) {
                setCheckoutStep('pin');
                setPasscodeModal(true);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            } else {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                Alert.alert('Payment Failed', errData?.error || err.message);
                setCheckoutStep('idle');
            }
        } finally {
            setCheckoutLoading(false);
        }
    };

    const downloadReceipt = async () => {
        if (!latestOrder) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        try {
            const html = generateReceiptHTML(latestOrder);
            const { uri } = await Print.printToFileAsync({ html });
            await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
        } catch (error) {
            Alert.alert('Error', 'Failed to generate PDF');
        }
    };

    const renderProduct = ({ item, index }: { item: any, index: number }) => (
        <Animated.View
            entering={FadeInDown.delay(index * 40).duration(400)}
            layout={Layout.springify()}
            style={[styles.productCard, { width: (screenWidth - 64) / numColumns, backgroundColor: theme.cardBg, borderColor: theme.glassBorder }]}
        >
            <View style={[styles.productIconContainer, { backgroundColor: theme.primary + '10' }]}>
                <Text style={styles.productIcon}>{item.icon}</Text>
                <BlurView intensity={10} style={styles.iconGloss} />
            </View>
            <View style={styles.productInfo}>
                <Text style={[styles.productName, { color: theme.text }]} numberOfLines={1}>{item.name}</Text>
                <View style={styles.priceRow}>
                    <Text style={[styles.productPrice, { color: theme.primary }]}>${item.price.toFixed(2)}</Text>
                    <Text style={[styles.productUnit, { color: theme.textMuted }]}>/ unit</Text>
                </View>
            </View>
            <TouchableOpacity
                style={[styles.addBtn, { backgroundColor: theme.primary }]}
                onPress={() => handleAddToCart(item)}
                activeOpacity={0.8}
            >
                <LinearGradient
                    colors={[theme.primary, '#E65100']}
                    style={[StyleSheet.absoluteFill, { borderRadius: 22 }]}
                />
                <Ionicons name="add" size={24} color="#fff" />
            </TouchableOpacity>
        </Animated.View>
    );

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <View style={styles.header}>
                <View>
                    <Text style={[styles.title, { color: theme.text }]}>Store</Text>
                    <Text style={[styles.subtitle, { color: theme.textMuted }]}>Shop for products and digital tools</Text>
                </View>
                {cart.length > 0 && (
                    <TouchableOpacity
                        style={[styles.cartBadge, { backgroundColor: theme.primary }]}
                        onPress={() => setCartExpanded(true)}
                    >
                        <Ionicons name="cart" size={20} color="#fff" />
                        <View style={styles.badgeCount}>
                            <Text style={styles.badgeText}>{cart.reduce((a, c) => a + c.qty, 0)}</Text>
                        </View>
                    </TouchableOpacity>
                )}
            </View>

            <View style={styles.categoryContainer}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>
                    {categories.map(item => (
                        <TouchableOpacity
                            key={item.id}
                            style={[
                                styles.categoryBtn,
                                { backgroundColor: theme.cardBg, borderColor: theme.glassBorder },
                                selectedCategory === item.id && { backgroundColor: theme.primary, borderColor: theme.primary }
                            ]}
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                setSelectedCategory(item.id);
                            }}
                        >
                            <Ionicons name={item.icon as any} size={18} color={selectedCategory === item.id ? '#fff' : theme.textMuted} />
                            <Text style={[styles.categoryBtnText, { color: theme.textMuted }, selectedCategory === item.id && { color: '#fff' }]}>
                                {item.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            <FlatList
                data={filteredProducts}
                renderItem={renderProduct}
                keyExtractor={item => item.id}
                numColumns={numColumns}
                key={`${numColumns}-${selectedCategory}`}
                contentContainerStyle={styles.list}
                showsVerticalScrollIndicator={false}
                refreshing={loading}
                onRefresh={fetchProducts}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        {loading ? (
                            <ActivityIndicator size="large" color={theme.primary} />
                        ) : (
                            <>
                                <MaterialCommunityIcons name="tag-off-outline" size={64} color={theme.textMuted + '30'} />
                                <Text style={[styles.emptyText, { color: theme.textMuted }]}>No items found in this section.</Text>
                            </>
                        )}
                    </View>
                }
            />

            {cart.length > 0 && checkoutStep === 'idle' && (
                <View style={[styles.checkoutBarWrapper, cartExpanded && styles.checkoutBarExpanded]}>
                    <BlurView intensity={Platform.OS === 'ios' ? 60 : 100} tint={darkTheme ? "dark" : "light"} style={styles.checkoutBarContainer}>
                        <Pressable onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            setCartExpanded(!cartExpanded);
                        }} style={styles.checkoutBarHeader}>
                            <View style={styles.cartHeaderInfo}>
                                <View style={[styles.cartIconWrapper, { backgroundColor: theme.primary }]}>
                                    <Ionicons name="bag-handle" size={24} color="#fff" />
                                    <View style={styles.cartBadgeDot}>
                                        <Text style={styles.cartBadgeText}>{cart.reduce((a, c) => a + c.qty, 0)}</Text>
                                    </View>
                                </View>
                                <View>
                                    <Text style={[styles.cartSummaryTitle, { color: theme.text }]}>Your Items</Text>
                                    <Text style={[styles.cartSummarySub, { color: theme.textMuted }]}>
                                        {cart.length} unique products • <Text style={{ color: theme.primary, fontWeight: '800' }}>${cartTotal.toFixed(2)}</Text>
                                    </Text>
                                </View>
                            </View>
                            <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                                <TouchableOpacity
                                    onPress={() => {
                                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                                        clearCart();
                                    }}
                                    style={[styles.expandIconBox, { backgroundColor: theme.danger + '15' }]}
                                >
                                    <Ionicons name="trash-outline" size={18} color={theme.danger} />
                                </TouchableOpacity>
                                <View style={[styles.expandIconBox, { backgroundColor: theme.textMuted + '15' }]}>
                                    <Ionicons name={cartExpanded ? "chevron-down" : "chevron-up"} size={22} color={theme.text} />
                                </View>
                            </View>
                        </Pressable>

                        {cartExpanded && (
                            <Animated.View entering={FadeIn} exiting={FadeOut} style={styles.cartItemsScrollContainer}>
                                <ScrollView style={styles.cartItemsScroll} showsVerticalScrollIndicator={false}>
                                    {cart.map((item, idx) => (
                                        <Animated.View
                                            entering={FadeInDown.delay(idx * 40)}
                                            key={item.product.id}
                                            style={[styles.cartItemRow, { borderBottomColor: theme.glassBorder }]}
                                        >
                                            <View style={[styles.cartItemIconBox, { backgroundColor: theme.primary + '10' }]}>
                                                <Text style={styles.cartItemIconEmoji}>{item.product.icon}</Text>
                                            </View>
                                            <View style={styles.cartItemContent}>
                                                <Text style={[styles.cartItemName, { color: theme.text }]}>{item.product.name}</Text>
                                                <Text style={[styles.cartItemPriceLabel, { color: theme.primary }]}>${(item.product.price * item.qty).toFixed(2)}</Text>
                                            </View>
                                            <View style={styles.cartItemActions}>
                                                <TouchableOpacity
                                                    style={[styles.qtyControlBtn, { backgroundColor: theme.primary + '15' }]}
                                                    onPress={() => changeCartQty(item.product.id, -1)}
                                                >
                                                    <Ionicons name="remove" size={16} color={theme.primary} />
                                                </TouchableOpacity>
                                                <Text style={[styles.qtyValueText, { color: theme.text }]}>{item.qty}</Text>
                                                <TouchableOpacity
                                                    style={[styles.qtyControlBtn, { backgroundColor: theme.primary + '15' }]}
                                                    onPress={() => changeCartQty(item.product.id, 1)}
                                                >
                                                    <Ionicons name="add" size={16} color={theme.primary} />
                                                </TouchableOpacity>
                                            </View>
                                        </Animated.View>
                                    ))}
                                    <View style={{ height: 20 }} />
                                </ScrollView>
                            </Animated.View>
                        )}

                        <TouchableOpacity
                            style={[styles.mainPayBtn, { backgroundColor: theme.primary }]}
                            onPress={startCheckoutFlow}
                            activeOpacity={0.9}
                        >
                            <LinearGradient
                                colors={[theme.primary, '#E65100']}
                                style={[StyleSheet.absoluteFill, { borderRadius: 24 }]}
                            />
                            <View style={styles.payBtnInnerContent}>
                                <Text style={styles.payBtnText}>PROCEED TO PAY</Text>
                                <View style={styles.payTotalBox}>
                                    <Text style={styles.payTotalText}>${cartTotal.toFixed(2)}</Text>
                                </View>
                            </View>
                        </TouchableOpacity>
                    </BlurView>
                </View>
            )}

            {/* SCANNING MODAL */}
            <Modal visible={checkoutStep === 'scanning'} transparent animationType="fade">
                <BlurView intensity={90} tint="dark" style={styles.scanningOverlay}>
                    <Animated.View entering={FadeInDown} style={styles.scanningContent}>
                        <View style={styles.nfcAnimationContainer}>
                            <View style={[styles.nfcRing, { borderColor: theme.primary + '40', width: 220, height: 220, borderRadius: 110 }]} />
                            <View style={[styles.nfcRing, { borderColor: theme.primary + '20', width: 280, height: 280, borderRadius: 140 }]} />
                            <View style={[styles.nfcIconBox, { backgroundColor: theme.primary }]}>
                                <MaterialCommunityIcons name="nfc" size={80} color="#fff" />
                            </View>
                        </View>
                        <Text style={styles.scanningTitle}>Ready to Pay</Text>
                        <Text style={styles.scanningSub}>Please place your RFID Card against the <Text style={{ fontWeight: '800' }}>RFID Terminal / Reader</Text> to proceed.</Text>

                        <TouchableOpacity
                            style={styles.cancelScanBtn}
                            onPress={() => setCheckoutStep('idle')}
                        >
                            <Text style={styles.cancelScanText}>Cancel Order</Text>
                        </TouchableOpacity>
                    </Animated.View>
                </BlurView>
            </Modal>

            <Modal visible={checkoutStep === 'pin' && passcodeModal} transparent animationType="slide">
                <BlurView intensity={80} style={styles.modalOverlay}>
                    <Animated.View entering={SlideInDown} exiting={SlideOutDown} style={[styles.modalBox, { backgroundColor: theme.cardBg, borderColor: theme.glassBorder }]}>
                        <View style={styles.modalHeader}>
                            <View style={[styles.securityIconBox, { backgroundColor: theme.primary + '10' }]}>
                                <Ionicons name="lock-closed" size={32} color={theme.primary} />
                            </View>
                            <Text style={[styles.modalHeading, { color: theme.text }]}>Confirm Payment</Text>
                            <Text style={[styles.modalSubheading, { color: theme.textMuted }]}>Enter your 6-digit PIN to pay ${cartTotal.toFixed(2)} securely.</Text>
                        </View>

                        <TextInput
                            style={[styles.modalPinInput, { borderBottomColor: theme.primary, color: theme.text }]}
                            secureTextEntry
                            keyboardType="number-pad"
                            maxLength={6}
                            value={passcode}
                            onChangeText={setPasscode}
                            placeholder="000000"
                            placeholderTextColor={theme.textMuted + '40'}
                            autoFocus
                            returnKeyType="done"
                            onSubmitEditing={() => processCheckout(passcode)}
                        />

                        <View style={styles.modalActions}>
                            <TouchableOpacity
                                style={[styles.modalPayBtn, { backgroundColor: theme.primary }]}
                                onPress={() => processCheckout(passcode)}
                            >
                                <Text style={styles.modalPayBtnText}>Confirm & Pay</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.modalCancelBtn} onPress={() => {
                                setPasscodeModal(false);
                                setCheckoutStep('idle');
                                setPasscode('');
                            }}>
                                <Text style={[styles.modalCancelText, { color: theme.textMuted }]}>Cancel</Text>
                            </TouchableOpacity>
                        </View>
                    </Animated.View>
                </BlurView>
            </Modal>
            <Modal visible={checkoutStep === 'success'} transparent animationType="fade">
                <BlurView intensity={90} tint="dark" style={styles.scanningOverlay}>
                    <Animated.View entering={FadeInDown} style={styles.scanningContent}>
                        <View style={[styles.successIconBox, { backgroundColor: '#4ADE80' }]}>
                            <Ionicons name="checkmark-circle" size={100} color="#fff" />
                        </View>
                        <Text style={styles.scanningTitle}>Payment Done!</Text>
                        <Text style={styles.scanningSub}>Transaction completed and settled. Your digital bill is ready.</Text>

                        <TouchableOpacity
                            style={[styles.receiptBtn, { backgroundColor: theme.primary }]}
                            onPress={downloadReceipt}
                        >
                            <Ionicons name="document-text" size={20} color="#fff" />
                            <Text style={styles.receiptBtnText}>DOWNLOAD RECEIPT (PDF)</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.cancelScanBtn}
                            onPress={() => {
                                setCheckoutStep('idle');
                                setLatestOrder(null);
                            }}
                        >
                            <Text style={styles.cancelScanText}>Back to Store</Text>
                        </TouchableOpacity>
                    </Animated.View>
                </BlurView>
            </Modal>
        </View>
    );
}

const generateReceiptHTML = (order: any) => `
<html>
<head>
  <style>
    body { font-family: 'Helvetica', sans-serif; padding: 40px; color: #333; }
    .header { text-align: center; border-bottom: 2px solid #f0f0f0; padding-bottom: 20px; margin-bottom: 30px; }
    .brand { font-size: 28px; font-weight: 800; color: #FF4D00; }
    .title { font-size: 18px; color: #666; margin-top: 5px; }
    .meta { display: flex; justify-content: space-between; margin-bottom: 30px; font-size: 14px; }
    .item { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #f9f9f9; }
    .item-name { font-weight: 600; }
    .total-row { display: flex; justify-content: space-between; margin-top: 30px; border-top: 2px solid #333; padding-top: 15px; font-size: 20px; font-weight: 800; }
    .footer { margin-top: 50px; text-align: center; font-size: 12px; color: #999; }
    .badge { background: #f0f0f0; padding: 4px 8px; border-radius: 4px; font-size: 10px; }
  </style>
</head>
<body>
  <div class="header">
    <div class="brand">TapLine Pay</div>
    <div class="title">Official Transaction Receipt</div>
  </div>
  <div class="meta">
    <div>
      <strong>Receipt ID:</strong> ${order.receiptId}<br>
      <strong>Date:</strong> ${order.date}
    </div>
    <div style="text-align: right">
      <strong>Terminal:</strong> ${order.terminal}<br>
      <strong>Customer:</strong> ${order.holderName}
    </div>
  </div>
  <div class="items">
    ${order.items.map((item: any) => `
      <div class="item">
        <span class="item-name">${item.product.name} x${item.qty}</span>
        <span>$${(item.product.price * item.qty).toFixed(2)}</span>
      </div>
    `).join('')}
  </div>
  <div class="total-row">
    <span>TOTAL PAID</span>
    <span>$${order.total.toFixed(2)}</span>
  </div>
  <div class="footer">
    <p>Auth via RFID: ${order.cardUid.substring(0, 8)}••••</p>
    <p>Thank you for shopping with TapLine Pay. All transactions are encrypted and secure.</p>
  </div>
</body>
</html>
`;

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { paddingHorizontal: 24, paddingTop: 60, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    title: { fontSize: 32, fontWeight: '800', letterSpacing: -1 },
    subtitle: { fontSize: 16, marginTop: 4, fontWeight: '500', opacity: 0.7 },
    cartBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 16, gap: 8 },
    badgeCount: { backgroundColor: '#fff', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 },
    badgeText: { color: '#000', fontSize: 12, fontWeight: '900' },

    categoryContainer: { marginBottom: 20 },
    categoryScroll: { paddingHorizontal: 24, gap: 12, paddingBottom: 10 },
    categoryBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 12, borderRadius: 16, borderWidth: 1, gap: 10 },
    categoryBtnText: { fontSize: 14, fontWeight: '700' },

    list: { paddingHorizontal: 24, paddingBottom: 220 },
    productCard: { borderRadius: 32, padding: 20, marginBottom: 16, marginRight: 16, borderWidth: 1, elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.1, shadowRadius: 12, justifyContent: 'space-between' },
    productIconContainer: { width: '100%', height: 100, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginBottom: 16, overflow: 'hidden' },
    iconGloss: { ...StyleSheet.absoluteFillObject, opacity: 0.05 },
    productIcon: { fontSize: 44 },
    productInfo: { marginBottom: 16 },
    productName: { fontSize: 16, fontWeight: '900', marginBottom: 4 },
    priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
    productPrice: { fontSize: 19, fontWeight: '900' },
    productUnit: { fontSize: 11, fontWeight: '700', opacity: 0.5 },
    addBtn: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', alignSelf: 'flex-end', position: 'absolute', bottom: 16, right: 16, overflow: 'hidden', elevation: 8 },

    emptyContainer: { flex: 1, height: 400, justifyContent: 'center', alignItems: 'center', opacity: 0.6 },
    emptyText: { marginTop: 16, fontSize: 16, fontWeight: '600' },

    checkoutBarWrapper: { position: 'absolute', bottom: 20, left: 16, right: 16, borderRadius: 36, overflow: 'hidden', elevation: 25, shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.4, shadowRadius: 24 },
    checkoutBarExpanded: { top: 120 },
    checkoutBarContainer: { padding: 20, flex: 1 },
    checkoutBarHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
    cartHeaderInfo: { flexDirection: 'row', alignItems: 'center', gap: 16 },
    cartIconWrapper: { width: 50, height: 50, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
    cartBadgeDot: { position: 'absolute', top: -5, right: -5, backgroundColor: '#fff', borderRadius: 10, minWidth: 20, height: 20, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#000' },
    cartBadgeText: { color: '#000', fontSize: 10, fontWeight: '900' },
    cartSummaryTitle: { fontSize: 18, fontWeight: '900' },
    cartSummarySub: { fontSize: 13, fontWeight: '600', marginTop: 2 },
    expandIconBox: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },

    cartItemsScrollContainer: { flex: 1, marginBottom: 20, maxHeight: 400 },
    cartItemsScroll: { flex: 1 },
    cartItemRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1 },
    cartItemIconBox: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
    cartItemIconEmoji: { fontSize: 20 },
    cartItemContent: { flex: 1 },
    cartItemName: { fontSize: 14, fontWeight: '700' },
    cartItemPriceLabel: { fontSize: 13, fontWeight: '800', marginTop: 2 },
    cartItemActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    qtyControlBtn: { width: 30, height: 30, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
    qtyValueText: { fontSize: 15, fontWeight: '800', minWidth: 18, textAlign: 'center' },

    mainPayBtn: { height: 68, borderRadius: 24, justifyContent: 'center', paddingHorizontal: 24, elevation: 5 },
    payBtnInnerContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    payBtnText: { color: '#fff', fontSize: 15, fontWeight: '900', letterSpacing: 1.5 },
    payTotalBox: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12 },
    payTotalText: { color: '#fff', fontSize: 16, fontWeight: '900' },

    scanningOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    scanningContent: { alignItems: 'center', padding: 40, width: '90%' },
    nfcAnimationContainer: { width: 300, height: 300, justifyContent: 'center', alignItems: 'center', marginBottom: 40 },
    nfcRing: { position: 'absolute', borderWidth: 2, borderStyle: 'dashed', opacity: 0.5 },
    nfcIconBox: { width: 140, height: 140, borderRadius: 70, justifyContent: 'center', alignItems: 'center', elevation: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.5, shadowRadius: 20 },
    scanningTitle: { color: '#fff', fontSize: 32, fontWeight: '900', marginBottom: 16 },
    scanningSub: { color: 'rgba(255,255,255,0.7)', fontSize: 16, textAlign: 'center', lineHeight: 24, paddingHorizontal: 20 },
    cancelScanBtn: { marginTop: 60, paddingVertical: 12, paddingHorizontal: 30, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)' },
    cancelScanText: { color: '#fff', fontSize: 14, fontWeight: '800' },

    modalOverlay: { flex: 1, justifyContent: 'flex-end' },
    modalBox: { padding: 40, borderTopLeftRadius: 48, borderTopRightRadius: 48, borderWidth: 1, width: '100%', elevation: 25 },
    modalHeader: { alignItems: 'center', marginBottom: 40 },
    securityIconBox: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
    modalHeading: { fontSize: 24, fontWeight: '800', textAlign: 'center' },
    modalSubheading: { fontSize: 15, textAlign: 'center', marginTop: 12, lineHeight: 22, fontWeight: '500', opacity: 0.7 },
    modalPinInput: { fontSize: 44, textAlign: 'center', letterSpacing: 10, paddingVertical: 10, borderBottomWidth: 2, marginBottom: 40, fontWeight: '800', width: 240, alignSelf: 'center' },
    modalActions: { gap: 12 },
    modalPayBtn: { height: 64, borderRadius: 20, justifyContent: 'center', alignItems: 'center', elevation: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 12 },
    modalPayBtnText: { color: '#fff', fontSize: 18, fontWeight: '800' },
    modalCancelBtn: { height: 50, justifyContent: 'center', alignItems: 'center' },
    modalCancelText: { fontSize: 16, fontWeight: '700' },

    successIconBox: { width: 140, height: 140, borderRadius: 70, justifyContent: 'center', alignItems: 'center', marginBottom: 30, elevation: 15 },
    receiptBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 20, paddingHorizontal: 30, borderRadius: 20, gap: 12, marginTop: 40, width: '100%', justifyContent: 'center' },
    receiptBtnText: { color: '#fff', fontSize: 14, fontWeight: '900', letterSpacing: 1 }
});
