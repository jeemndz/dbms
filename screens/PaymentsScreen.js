import { useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { styles } from '../styles';

const pendingPayments = [
  {
    id: 'p1',
    date: 'NOV 02, 2023',
    status: 'DUE',
    title: 'Brake Pad Replacement',
    vehicle: '2018 Honda Civic',
    amount: '$120.00',
  },
  {
    id: 'p2',
    date: 'OCT 28, 2023',
    status: 'DUE',
    title: 'Oil Change & Filter',
    vehicle: '2021 Toyota RAV4',
    amount: '$85.50',
  },
  {
    id: 'p3',
    date: 'OCT 15, 2023',
    status: 'OVERDUE',
    title: 'Transmission Flush',
    vehicle: '2018 Honda Civic',
    amount: '$245.00',
  },
];

const historyPayments = [
  {
    id: 'h1',
    date: 'SEP 18, 2023',
    status: 'PAID',
    title: 'Battery Replacement',
    vehicle: '2018 Honda Civic',
    amount: '$199.00',
  },
  {
    id: 'h2',
    date: 'AUG 09, 2023',
    status: 'PAID',
    title: 'Tire Rotation',
    vehicle: '2021 Toyota RAV4',
    amount: '$60.00',
  },
];

const summaryText =
  'Payments are processed securely via encrypted channels. Unpaid services may delay your next appointment booking. For billing disputes, please contact our support desk.';

const formatPaymentMessage = (item) =>
  `${item.title}\n${item.vehicle}\nAmount: ${item.amount}`;

function PaymentCard({ item, onPayNow, onViewInvoice }) {
  const isOverdue = item.status === 'OVERDUE';

  return (
    <View style={[paymentStyles.card, isOverdue && paymentStyles.cardOverdue]}>
      <View style={paymentStyles.cardTopRow}>
        <Text style={paymentStyles.cardDate}>{item.date}</Text>
        <Text style={[paymentStyles.cardStatus, isOverdue && paymentStyles.cardStatusOverdue]}>{item.status}</Text>
      </View>

      <Text style={paymentStyles.cardTitle}>{item.title}</Text>
      <View style={paymentStyles.vehicleRow}>
        <Ionicons name="car-outline" size={16} color="#4A5A73" />
        <Text style={paymentStyles.vehicleText}>{item.vehicle}</Text>
      </View>

      <View style={paymentStyles.cardBottomRow}>
        <TouchableOpacity style={paymentStyles.payNowButton} onPress={onPayNow} activeOpacity={0.88}>
          <Text style={paymentStyles.payNowText}>Pay Now</Text>
        </TouchableOpacity>

        <TouchableOpacity style={paymentStyles.invoiceButton} onPress={onViewInvoice} activeOpacity={0.88}>
          <Ionicons name="document-text-outline" size={22} color="#0F1F3A" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function PaymentsScreen({
  activeTab = 'payments',
  initialSegment = 'pending',
  onSelectTab,
}) {
  const [segment, setSegment] = useState(initialSegment);

  const data = useMemo(
    () => (segment === 'pending' ? pendingPayments : historyPayments),
    [segment]
  );

  const isTabActive = (tab) => activeTab === tab;

  useEffect(() => {
    if (activeTab === 'history') {
      setSegment('history');
      return;
    }

    if (activeTab === 'payments') {
      setSegment('pending');
    }
  }, [activeTab]);

  return (
    <View style={paymentStyles.container}>
      <ScrollView contentContainerStyle={paymentStyles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={paymentStyles.headerRow}>
          <View style={paymentStyles.iconButton} />

          <Text style={paymentStyles.headerTitle}>Payments</Text>

          <TouchableOpacity style={paymentStyles.iconButton} activeOpacity={0.85}>
            <Ionicons name="wallet-outline" size={24} color="#0F1F3A" />
          </TouchableOpacity>
        </View>

        <Text style={paymentStyles.pageTitle}>Pending Actions</Text>
        <Text style={paymentStyles.pageSubtitle}>Review and complete payments for your recent vehicle services.</Text>

        <View style={paymentStyles.segmentWrap}>
          <TouchableOpacity
            style={[paymentStyles.segmentButton, segment === 'pending' && paymentStyles.segmentButtonActive]}
            onPress={() => setSegment('pending')}
            activeOpacity={0.9}
          >
            <Text style={[paymentStyles.segmentText, segment === 'pending' && paymentStyles.segmentTextActive]}>
              Pending
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[paymentStyles.segmentButton, segment === 'history' && paymentStyles.segmentButtonActive]}
            onPress={() => setSegment('history')}
            activeOpacity={0.9}
          >
            <Text style={[paymentStyles.segmentText, segment === 'history' && paymentStyles.segmentTextActive]}>
              History
            </Text>
          </TouchableOpacity>
        </View>

        {data.map((item) => (
          <PaymentCard
            key={item.id}
            item={item}
            onPayNow={() => Alert.alert('Pay Now', formatPaymentMessage(item))}
            onViewInvoice={() => Alert.alert('Invoice', `Opening invoice for ${item.title}.`)}
          />
        ))}

        <View style={paymentStyles.infoCard}>
          <Ionicons name="information-circle" size={24} color="#42546D" style={paymentStyles.infoIcon} />
          <Text style={paymentStyles.infoText}>{summaryText}</Text>
        </View>
      </ScrollView>

      <View style={styles.homeBottomNavWrapper}>
        <View style={styles.bottomNav}>
          <TouchableOpacity
            style={[styles.navItem, isTabActive('home') && styles.navItemSelected]}
            onPress={() => onSelectTab && onSelectTab('home')}
          >
            <Ionicons name="home" size={22} color={isTabActive('home') ? '#0F172A' : '#94A3B8'} />
            <Text style={[styles.navLabel, isTabActive('home') && styles.navLabelActive]}>Home</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.navItem, isTabActive('appointments') && styles.navItemSelected]}
            onPress={() => onSelectTab && onSelectTab('appointments')}
          >
            <Ionicons
              name="calendar-outline"
              size={22}
              color={isTabActive('appointments') ? '#0F172A' : '#94A3B8'}
            />
            <Text style={[styles.navLabel, isTabActive('appointments') && styles.navLabelActive]}>Bookings</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.navItem, isTabActive('history') && styles.navItemSelected]}
            onPress={() => onSelectTab && onSelectTab('history')}
          >
            <Ionicons name="time-outline" size={22} color={isTabActive('history') ? '#0F172A' : '#94A3B8'} />
            <Text style={[styles.navLabel, isTabActive('history') && styles.navLabelActive]}>History</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.navItem, isTabActive('payments') && styles.navItemSelected]}
            onPress={() => onSelectTab && onSelectTab('payments')}
          >
            <Ionicons name="card" size={22} color={isTabActive('payments') ? '#0F172A' : '#94A3B8'} />
            <Text style={[styles.navLabel, isTabActive('payments') && styles.navLabelActive]}>Payments</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.navItem, isTabActive('profile') && styles.navItemSelected]}
            onPress={() => onSelectTab && onSelectTab('profile')}
          >
            <Ionicons name="person-outline" size={22} color={isTabActive('profile') ? '#0F172A' : '#94A3B8'} />
            <Text style={[styles.navLabel, isTabActive('profile') && styles.navLabelActive]}>Profile</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const paymentStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F6FA',
  },
  scrollContent: {
    paddingTop: 8,
    paddingHorizontal: 22,
    paddingBottom: 26,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F1F3A',
  },
  pageTitle: {
    marginTop: 14,
    color: '#0F1F3A',
    fontSize: 26,
    lineHeight: 34,
    fontWeight: '800',
  },
  pageSubtitle: {
    marginTop: 10,
    marginBottom: 20,
    color: '#334A66',
    fontSize: 13,
    lineHeight: 21,
  },
  segmentWrap: {
    flexDirection: 'row',
    backgroundColor: '#E7EAF0',
    borderRadius: 16,
    padding: 4,
    marginBottom: 16,
  },
  segmentButton: {
    flex: 1,
    minHeight: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentButtonActive: {
    backgroundColor: '#FFFFFF',
  },
  segmentText: {
    color: '#334A66',
    fontSize: 16,
    fontWeight: '500',
  },
  segmentTextActive: {
    color: '#0F1F3A',
    fontWeight: '700',
  },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#D7DEE8',
    backgroundColor: '#FFFFFF',
    padding: 16,
    marginBottom: 14,
  },
  cardOverdue: {
    borderColor: '#F4C4C4',
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardDate: {
    color: '#7A8DAA',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 1,
  },
  cardStatus: {
    color: '#273E5A',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  cardStatusOverdue: {
    color: '#B91C1C',
  },
  cardTitle: {
    color: '#0F1F3A',
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '800',
    marginBottom: 8,
  },
  vehicleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  vehicleText: {
    marginLeft: 8,
    color: '#4A5A73',
    fontSize: 15,
  },
  cardBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  payNowButton: {
    flex: 1,
    minHeight: 58,
    borderRadius: 16,
    backgroundColor: '#132B46',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  payNowText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
  },
  invoiceButton: {
    width: 64,
    minHeight: 58,
    borderRadius: 16,
    backgroundColor: '#EEF2F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 16,
    marginBottom: 8,
    paddingRight: 4,
  },
  infoIcon: {
    marginTop: 2,
  },
  infoText: {
    flex: 1,
    marginLeft: 12,
    color: '#334A66',
    fontSize: 12,
    lineHeight: 22,
  },
});
