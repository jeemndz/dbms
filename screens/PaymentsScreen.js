import { useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View, ActivityIndicator, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { styles } from '../styles';
import { fetchPayments, fetchPaymentHistory, recordPayment } from '../services/paymentApi';

// Helper to format date
const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  }).toUpperCase();
};

// Helper to get service title from appointment notes (placeholder)
const getServiceTitle = (payment) => {
  return payment.remarks || 'Vehicle Service';
};

// Helper to get vehicle info (placeholder - would need vehicle data)
const getVehicleInfo = (payment) => {
  return 'Vehicle Service';
};

const summaryText =
  'Payments are processed securely via encrypted channels. Unpaid services may delay your next appointment booking. For billing disputes, please contact our support desk.';

const formatPaymentMessage = (item) =>
  `${item.title}\n${item.vehicle}\nAmount: ${item.amount}`;

function PaymentCard({ item, onPayNow, onViewInvoice }) {
  const isOverdue = item.paymentStatus === 'Pending' && 
    new Date(item.appointment_date) < new Date();
  const isPaid = item.paymentStatus === 'Paid';

  return (
    <View style={[paymentStyles.card, (isOverdue || isPaid) && paymentStyles.cardOverdue]}>
      <View style={paymentStyles.cardTopRow}>
        <Text style={paymentStyles.cardDate}>{formatDate(item.appointment_date)}</Text>
        <Text style={[paymentStyles.cardStatus, (isOverdue && !isPaid) && paymentStyles.cardStatusOverdue]}>
          {isOverdue && !isPaid ? 'OVERDUE' : item.paymentStatus.toUpperCase()}
        </Text>
      </View>

      <Text style={paymentStyles.cardTitle}>{getServiceTitle(item)}</Text>
      <View style={paymentStyles.vehicleRow}>
        <Ionicons name="car-outline" size={16} color="#4A5A73" />
        <Text style={paymentStyles.vehicleText}>{getVehicleInfo(item)}</Text>
      </View>

      <View style={paymentStyles.amountRow}>
        <View>
          <Text style={paymentStyles.labelText}>Amount Due</Text>
          <Text style={paymentStyles.amountText}>${item.paymentAmount.toFixed(2)}</Text>
        </View>
        {item.amountPaid > 0 && (
          <View>
            <Text style={paymentStyles.labelText}>Paid</Text>
            <Text style={paymentStyles.paidText}>${item.amountPaid.toFixed(2)}</Text>
          </View>
        )}
        {item.balance > 0 && (
          <View>
            <Text style={paymentStyles.labelText}>Balance</Text>
            <Text style={paymentStyles.balanceText}>${item.balance.toFixed(2)}</Text>
          </View>
        )}
      </View>

      <View style={paymentStyles.cardBottomRow}>
        {item.paymentStatus !== 'Paid' ? (
          <>
            <TouchableOpacity style={paymentStyles.payNowButton} onPress={onPayNow} activeOpacity={0.88}>
              <Text style={paymentStyles.payNowText}>Pay Now</Text>
            </TouchableOpacity>

            <TouchableOpacity style={paymentStyles.invoiceButton} onPress={onViewInvoice} activeOpacity={0.88}>
              <Ionicons name="document-text-outline" size={22} color="#0F1F3A" />
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity style={[paymentStyles.payNowButton, paymentStyles.paidButton]} onPress={onViewInvoice} activeOpacity={0.88}>
            <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
            <Text style={paymentStyles.payNowText}>View Invoice</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

export default function PaymentsScreen({
  activeTab = 'payments',
  initialSegment = 'pending',
  onSelectTab,
  tenantID = 1,
  user_id,
}) {
  const [segment, setSegment] = useState(initialSegment);
  const [pendingPayments, setPendingPayments] = useState([]);
  const [historyPayments, setHistoryPayments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  // Load payments data
  const loadPayments = async (isRefresh = false) => {
    try {
      if (!isRefresh) setLoading(true);
      setRefreshing(isRefresh);
      setError(null);

      const normalizedTenantID = Number(tenantID) > 0 ? tenantID : 1;
      const normalizedUserId = Number(user_id) > 0 ? user_id : undefined;

      // Fetch pending and history payments
      const [pending, history] = await Promise.all([
        fetchPayments({
          tenantID: normalizedTenantID,
          user_id: normalizedUserId,
          paymentStatus: 'Pending',
        }),
        fetchPaymentHistory({
          tenantID: normalizedTenantID,
          user_id: normalizedUserId,
          limit: 50,
        }),
      ]);

      setPendingPayments(pending || []);
      setHistoryPayments(history || []);
    } catch (err) {
      console.error('Error loading payments:', err);
      setError(err.message || 'Failed to load payments');
      setPendingPayments([]);
      setHistoryPayments([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Initial load and refresh when user changes
  useEffect(() => {
    loadPayments();
  }, [tenantID, user_id]);

  // Handle tab changes from parent
  useEffect(() => {
    if (activeTab === 'history') {
      setSegment('history');
    } else if (activeTab === 'payments') {
      setSegment('pending');
    }
  }, [activeTab]);

  const data = useMemo(
    () => (segment === 'pending' ? pendingPayments : historyPayments),
    [segment, pendingPayments, historyPayments]
  );

  const isTabActive = (tab) => activeTab === tab;

  const handlePayNow = (item) => {
    Alert.alert(
      'Pay Now',
      `Amount Due: $${item.paymentAmount.toFixed(2)}\n\n${getServiceTitle(item)}`,
      [
        {
          text: 'Cancel',
          onPress: () => {},
          style: 'cancel',
        },
        {
          text: 'GCash',
          onPress: () => handlePaymentMethod(item, 'GCash'),
        },
        {
          text: 'Card',
          onPress: () => handlePaymentMethod(item, 'Card'),
        },
      ]
    );
  };

  const handlePaymentMethod = async (item, method) => {
    try {
      // For demo, just update the status to Paid
      // In production, integrate with payment gateway
      await recordPayment(item.payment_id, item.paymentAmount);
      
      Alert.alert(
        'Success',
        `Payment of $${item.paymentAmount.toFixed(2)} recorded via ${method}`
      );
      
      // Refresh payments
      loadPayments(true);
    } catch (err) {
      Alert.alert('Error', 'Failed to process payment: ' + err.message);
    }
  };

  const handleViewInvoice = (item) => {
    Alert.alert(
      'Invoice',
      `Reference: ${item.referenceNumber || 'N/A'}\n` +
      `Amount: $${item.paymentAmount.toFixed(2)}\n` +
      `Status: ${item.paymentStatus}\n` +
      `Date: ${formatDate(item.appointment_date)}`
    );
  };

  if (error && !loading) {
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

          <View style={paymentStyles.errorContainer}>
            <Ionicons name="alert-circle" size={48} color="#B91C1C" />
            <Text style={paymentStyles.errorText}>{error}</Text>
            <TouchableOpacity
              style={paymentStyles.retryButton}
              onPress={() => loadPayments()}
              activeOpacity={0.85}
            >
              <Text style={paymentStyles.retryButtonText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={paymentStyles.container}>
      <ScrollView
        contentContainerStyle={paymentStyles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadPayments(true)}
          />
        }
      >
        <View style={paymentStyles.headerRow}>
          <View style={paymentStyles.iconButton} />

          <Text style={paymentStyles.headerTitle}>Payments</Text>

          <TouchableOpacity style={paymentStyles.iconButton} activeOpacity={0.85} onPress={() => loadPayments(true)}>
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
              Pending ({pendingPayments.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[paymentStyles.segmentButton, segment === 'history' && paymentStyles.segmentButtonActive]}
            onPress={() => setSegment('history')}
            activeOpacity={0.9}
          >
            <Text style={[paymentStyles.segmentText, segment === 'history' && paymentStyles.segmentTextActive]}>
              History ({historyPayments.length})
            </Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={paymentStyles.loadingContainer}>
            <ActivityIndicator size="large" color="#0F1F3A" />
            <Text style={paymentStyles.loadingText}>Loading payments...</Text>
          </View>
        ) : data.length > 0 ? (
          data.map((item) => (
            <PaymentCard
              key={item.payment_id}
              item={item}
              onPayNow={() => handlePayNow(item)}
              onViewInvoice={() => handleViewInvoice(item)}
            />
          ))
        ) : (
          <View style={paymentStyles.emptyContainer}>
            <Ionicons name="checkmark-circle" size={48} color="#10B981" />
            <Text style={paymentStyles.emptyText}>No {segment} payments</Text>
            <Text style={paymentStyles.emptySubtext}>
              {segment === 'pending' ? 'All your payments are up to date!' : 'No payment history yet'}
            </Text>
          </View>
        )}

        <View style={paymentStyles.infoCard}>
          <Ionicons name="information-circle" size={24} color="#42546D" style={paymentStyles.infoIcon} />
          <Text style={paymentStyles.infoText}>
            Payments are processed securely. Unpaid services may delay your next appointment booking.
          </Text>
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
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  labelText: {
    color: '#7A8DAA',
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 4,
  },
  amountText: {
    color: '#0F1F3A',
    fontSize: 18,
    fontWeight: '700',
  },
  paidText: {
    color: '#10B981',
    fontSize: 16,
    fontWeight: '700',
  },
  balanceText: {
    color: '#B91C1C',
    fontSize: 16,
    fontWeight: '700',
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
    flexDirection: 'row',
  },
  paidButton: {
    backgroundColor: '#10B981',
    marginRight: 0,
  },
  payNowText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
    marginLeft: 8,
  },
  invoiceButton: {
    width: 64,
    minHeight: 58,
    borderRadius: 16,
    backgroundColor: '#EEF2F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  loadingText: {
    color: '#334A66',
    fontSize: 14,
    marginTop: 12,
    fontWeight: '500',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    color: '#0F1F3A',
    fontSize: 18,
    fontWeight: '700',
    marginTop: 12,
  },
  emptySubtext: {
    color: '#7A8DAA',
    fontSize: 14,
    marginTop: 6,
  },
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  errorText: {
    color: '#B91C1C',
    fontSize: 14,
    marginTop: 12,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#132B46',
    borderRadius: 12,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
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
