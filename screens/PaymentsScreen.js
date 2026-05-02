import { useEffect, useMemo, useState, useCallback } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
  RefreshControl,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { styles } from '../styles';
import {
  fetchPendingPayments,
  fetchPaymentHistory,
  payPayment,
} from '../services/paymentApi';

const formatDate = (dateString) => {
  if (!dateString) return 'N/A';

  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return 'N/A';

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  }).toUpperCase();
};

const money = (value) => `₱${Number(value || 0).toFixed(2)}`;

const parseServiceList = (payment) => {
  if (payment?.remarks) {
    try {
      const parsed = JSON.parse(payment.remarks);

      if (Array.isArray(parsed)) {
        return parsed.map((service, index) => ({
          service_id: service.service_id || `json-${index}`,
          service_name:
            service.service_name ||
            service.title ||
            service.name ||
            `Service #${service.service_id || index + 1}`,
          service_price: Number(service.service_price || service.price || service.amount || 0),
          duration_minutes:
            Number(service.duration_minutes || service.estimated_duration_minutes || 0) || null,
        }));
      }
    } catch (error) {}
  }

  if (Array.isArray(payment?.services)) return payment.services;
  if (Array.isArray(payment?.service_list)) return payment.service_list;
  if (Array.isArray(payment?.availed_services)) return payment.availed_services;

  return [];
};

const getGrandTotal = (payment) => {
  const grandTotal = Number(payment?.grand_total || 0);

  if (Number.isFinite(grandTotal) && grandTotal > 0) {
    return grandTotal;
  }

  return Number(payment?.paymentAmount || 0);
};

const getServiceTitle = (payment) => {
  const services = parseServiceList(payment);

  if (services.length > 0) {
    if (services.length === 1) {
      return services[0].service_name || services[0].title || 'Vehicle Service';
    }

    return `${services.length} Services Availed`;
  }

  return `Invoice ${payment?.referenceNumber || payment?.appointment_id || ''}`.trim();
};

const getVehicleInfo = (payment) => {
  const vehicleText = [payment?.year_model, payment?.brand, payment?.model]
    .filter(Boolean)
    .join(' ')
    .trim();

  if (vehicleText) return vehicleText;

  if (payment?.appointment_date && payment?.appointment_time) {
    return `${formatDate(payment.appointment_date)} • ${payment.appointment_time}`;
  }

  if (payment?.appointment_date) return formatDate(payment.appointment_date);

  return 'Vehicle Service';
};

function PaymentCard({ item, onPayNow, onViewInvoice, disabledPay = false }) {
  const paymentStatus = String(item.paymentStatus || 'Pending').trim();
  const isPending = paymentStatus.toLowerCase() === 'pending';
  const isPaid = paymentStatus.toLowerCase() === 'paid';
  const isPartial = paymentStatus.toLowerCase() === 'partial';

  const grandTotal = getGrandTotal(item);
  const amountPaid = Number(item.amountPaid || 0);
  const balance = Math.max(0, grandTotal - amountPaid);

  const isOverdue =
    isPending &&
    item.appointment_date &&
    new Date(item.appointment_date) < new Date(new Date().toDateString());

  const services = parseServiceList(item);

  return (
    <View style={[paymentStyles.card, isOverdue && paymentStyles.cardOverdue]}>
      <View style={paymentStyles.cardTopRow}>
        <Text style={paymentStyles.cardDate}>
          {formatDate(item.paymentDate || item.appointment_date)}
        </Text>

        <Text
          style={[
            paymentStyles.cardStatus,
            isOverdue && paymentStyles.cardStatusOverdue,
            isPaid && paymentStyles.cardStatusPaid,
            isPartial && paymentStyles.cardStatusPartial,
          ]}
        >
          {isOverdue && !isPaid ? 'OVERDUE' : paymentStatus.toUpperCase()}
        </Text>
      </View>

      <Text style={paymentStyles.cardTitle}>{getServiceTitle(item)}</Text>

      <View style={paymentStyles.vehicleRow}>
        <Ionicons name="car-outline" size={16} color="#4A5A73" />
        <Text style={paymentStyles.vehicleText}>{getVehicleInfo(item)}</Text>
      </View>

      {services.length > 0 ? (
        <View style={paymentStyles.servicesPreview}>
          {services.slice(0, 3).map((service, index) => (
            <View
              key={String(service.report_service_id || service.service_id || index)}
              style={paymentStyles.servicePill}
            >
              <Text style={paymentStyles.servicePillText}>
                {service.service_name || service.title || 'Service'}
              </Text>
            </View>
          ))}

          {services.length > 3 ? (
            <View style={paymentStyles.servicePill}>
              <Text style={paymentStyles.servicePillText}>
                +{services.length - 3} more
              </Text>
            </View>
          ) : null}
        </View>
      ) : null}

      <View style={paymentStyles.amountRow}>
        <View>
          <Text style={paymentStyles.labelText}>Grand Total</Text>
          <Text style={paymentStyles.amountText}>{money(grandTotal)}</Text>
        </View>

        <View>
          <Text style={paymentStyles.labelText}>Paid</Text>
          <Text style={paymentStyles.paidText}>{money(amountPaid)}</Text>
        </View>

        <View>
          <Text style={paymentStyles.labelText}>Balance</Text>
          <Text style={balance > 0 ? paymentStyles.balanceText : paymentStyles.zeroBalanceText}>
            {money(balance)}
          </Text>
        </View>
      </View>

      <View style={paymentStyles.cardBottomRow}>
        {!isPaid && balance > 0 ? (
          <>
            <TouchableOpacity
              style={[
                paymentStyles.payNowButton,
                disabledPay && paymentStyles.payNowButtonDisabled,
              ]}
              onPress={onPayNow}
              activeOpacity={0.88}
              disabled={disabledPay}
            >
              <Text style={paymentStyles.payNowText}>
                {disabledPay ? 'Processing...' : 'Pay Balance'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={paymentStyles.invoiceButton}
              onPress={onViewInvoice}
              activeOpacity={0.88}
            >
              <Ionicons name="document-text-outline" size={22} color="#0F1F3A" />
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity
            style={[paymentStyles.payNowButton, paymentStyles.paidButton]}
            onPress={onViewInvoice}
            activeOpacity={0.88}
          >
            <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
            <Text style={paymentStyles.payNowText}>View Invoice</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

function InvoiceModal({ visible, item, onClose }) {
  if (!item) return null;

  const services = parseServiceList(item);
  const grandTotal = getGrandTotal(item);
  const amountPaid = Number(item.amountPaid || 0);
  const balance = Math.max(0, grandTotal - amountPaid);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={invoiceModalStyles.overlay}>
        <View style={invoiceModalStyles.modal}>
          <View style={invoiceModalStyles.header}>
            <Text style={invoiceModalStyles.title}>Invoice Details</Text>
            <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
              <Ionicons name="close" size={28} color="#0F1F3A" />
            </TouchableOpacity>
          </View>

          <ScrollView style={invoiceModalStyles.content} showsVerticalScrollIndicator={false}>
            <View style={invoiceModalStyles.section}>
              <Text style={invoiceModalStyles.sectionTitle}>Service Information</Text>

              <View style={invoiceModalStyles.infoRow}>
                <Text style={invoiceModalStyles.label}>Service</Text>
                <Text style={invoiceModalStyles.value}>{getServiceTitle(item)}</Text>
              </View>

              <View style={invoiceModalStyles.infoRow}>
                <Text style={invoiceModalStyles.label}>Date</Text>
                <Text style={invoiceModalStyles.value}>
                  {formatDate(item.paymentDate || item.appointment_date)}
                </Text>
              </View>

              {item.appointment_time ? (
                <View style={invoiceModalStyles.infoRow}>
                  <Text style={invoiceModalStyles.label}>Time</Text>
                  <Text style={invoiceModalStyles.value}>{item.appointment_time}</Text>
                </View>
              ) : null}

              {item.job_status ? (
                <View style={invoiceModalStyles.infoRow}>
                  <Text style={invoiceModalStyles.label}>Repair Status</Text>
                  <Text style={invoiceModalStyles.value}>{item.job_status}</Text>
                </View>
              ) : null}
            </View>

            <View style={invoiceModalStyles.section}>
              <Text style={invoiceModalStyles.sectionTitle}>Services Availed</Text>

              {services.length === 0 ? (
                <View style={invoiceModalStyles.infoRow}>
                  <Text style={invoiceModalStyles.label}>Grand Total</Text>
                  <Text style={invoiceModalStyles.amountValue}>{money(grandTotal)}</Text>
                </View>
              ) : (
                services.map((service, index) => (
                  <View
                    key={String(service.report_service_id || service.service_id || index)}
                    style={invoiceModalStyles.serviceRow}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={invoiceModalStyles.serviceName}>
                        {service.service_name || service.title || 'Service'}
                      </Text>
                      {service.duration_minutes ? (
                        <Text style={invoiceModalStyles.serviceMeta}>
                          {service.duration_minutes} mins
                        </Text>
                      ) : null}
                    </View>

                    <Text style={invoiceModalStyles.servicePrice}>
                      {money(service.service_price || service.price || service.amount || 0)}
                    </Text>
                  </View>
                ))
              )}
            </View>

            <View style={invoiceModalStyles.section}>
              <Text style={invoiceModalStyles.sectionTitle}>Reference</Text>

              <View style={invoiceModalStyles.infoRow}>
                <Text style={invoiceModalStyles.label}>Reference #</Text>
                <Text style={[invoiceModalStyles.value, invoiceModalStyles.refValue]}>
                  {item.gcashReferenceNumber || item.referenceNumber || 'N/A'}
                </Text>
              </View>
            </View>

            <View style={invoiceModalStyles.section}>
              <Text style={invoiceModalStyles.sectionTitle}>Amount Breakdown</Text>

              <View style={[invoiceModalStyles.infoRow, invoiceModalStyles.amountRow]}>
                <Text style={invoiceModalStyles.label}>Grand Total</Text>
                <Text style={invoiceModalStyles.amountValue}>{money(grandTotal)}</Text>
              </View>

              <View style={[invoiceModalStyles.infoRow, invoiceModalStyles.amountRow]}>
                <Text style={invoiceModalStyles.label}>Amount Paid</Text>
                <Text style={invoiceModalStyles.paidValue}>{money(amountPaid)}</Text>
              </View>

              <View style={[invoiceModalStyles.infoRow, invoiceModalStyles.balanceRow]}>
                <Text style={invoiceModalStyles.label}>Balance</Text>
                <Text style={invoiceModalStyles.balanceValue}>{money(balance)}</Text>
              </View>
            </View>

            <View style={invoiceModalStyles.section}>
              <Text style={invoiceModalStyles.sectionTitle}>Status</Text>

              <View style={invoiceModalStyles.infoRow}>
                <Text style={invoiceModalStyles.label}>Payment Status</Text>
                <Text
                  style={[
                    invoiceModalStyles.statusBadge,
                    String(item.paymentStatus || '').trim().toLowerCase() === 'paid'
                      ? invoiceModalStyles.statusPaid
                      : invoiceModalStyles.statusPending,
                  ]}
                >
                  {String(item.paymentStatus || 'Pending').toUpperCase()}
                </Text>
              </View>
            </View>
          </ScrollView>

          <TouchableOpacity
            style={invoiceModalStyles.closeButton}
            onPress={onClose}
            activeOpacity={0.85}
          >
            <Text style={invoiceModalStyles.closeButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function PaymentMethodModal({ visible, item, onSelectMethod, onClose, isProcessing }) {
  if (!item) return null;

  const grandTotal = getGrandTotal(item);
  const amountPaid = Number(item.amountPaid || 0);
  const balanceToPay = Math.max(0, grandTotal - amountPaid);

  const paymentMethods = [
    {
      id: 'gcash',
      name: 'GCash',
      icon: 'phone-portrait-outline',
      description: 'Mobile wallet',
      color: '#0066FF',
    },
    {
      id: 'paymaya',
      name: 'PayMaya',
      icon: 'card-outline',
      description: 'Digital wallet',
      color: '#FF6B00',
    },
    {
      id: 'card',
      name: 'Debit/Credit Card',
      icon: 'card-sharp',
      description: 'Visa, Mastercard',
      color: '#1F2937',
    },
    {
      id: 'bank',
      name: 'Bank Transfer',
      icon: 'business-outline',
      description: 'Direct bank transfer',
      color: '#0EA5E9',
    },
  ];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={paymentMethodModalStyles.overlay}>
        <View style={paymentMethodModalStyles.modal}>
          <View style={paymentMethodModalStyles.header}>
            <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
              <Ionicons name="close" size={28} color="#0F1F3A" />
            </TouchableOpacity>
            <Text style={paymentMethodModalStyles.title}>Payment Method</Text>
            <View style={{ width: 28 }} />
          </View>

          <ScrollView style={paymentMethodModalStyles.content} showsVerticalScrollIndicator={false}>
            <View style={paymentMethodModalStyles.amountSection}>
              <Text style={paymentMethodModalStyles.amountLabel}>Balance to Pay</Text>
              <Text style={paymentMethodModalStyles.amountValue}>{money(balanceToPay)}</Text>
              <Text style={paymentMethodModalStyles.serviceTitle}>{getServiceTitle(item)}</Text>
            </View>

            <Text style={paymentMethodModalStyles.methodsTitle}>Select a payment method</Text>

            <View style={paymentMethodModalStyles.methodsGrid}>
              {paymentMethods.map((method) => (
                <TouchableOpacity
                  key={method.id}
                  style={paymentMethodModalStyles.methodCard}
                  onPress={() => onSelectMethod(method.name)}
                  activeOpacity={0.8}
                  disabled={isProcessing}
                >
                  <View
                    style={[
                      paymentMethodModalStyles.methodIconContainer,
                      { backgroundColor: `${method.color}15` },
                    ]}
                  >
                    <Ionicons name={method.icon} size={32} color={method.color} />
                  </View>
                  <Text style={paymentMethodModalStyles.methodName}>{method.name}</Text>
                  <Text style={paymentMethodModalStyles.methodDescription}>
                    {method.description}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={paymentMethodModalStyles.infoBox}>
              <Ionicons name="shield-checkmark-outline" size={20} color="#10B981" />
              <Text style={paymentMethodModalStyles.infoText}>
                Your payment is secured and encrypted for your protection.
              </Text>
            </View>
          </ScrollView>

          <TouchableOpacity
            style={[
              paymentMethodModalStyles.cancelButton,
              isProcessing && paymentMethodModalStyles.buttonDisabled,
            ]}
            onPress={onClose}
            activeOpacity={0.85}
            disabled={isProcessing}
          >
            <Text style={paymentMethodModalStyles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function PaymentDetailsModal({
  visible,
  paymentMethod,
  amount,
  onConfirm,
  onClose,
  isProcessing,
}) {
  if (!paymentMethod) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={paymentDetailsModalStyles.overlay}>
        <View style={paymentDetailsModalStyles.modal}>
          <View style={paymentDetailsModalStyles.header}>
            <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
              <Ionicons name="close" size={28} color="#0F1F3A" />
            </TouchableOpacity>
            <Text style={paymentDetailsModalStyles.title}>{paymentMethod}</Text>
            <View style={{ width: 28 }} />
          </View>

          <View style={paymentDetailsModalStyles.iconSection}>
            <Ionicons name="card-outline" size={54} color="#132B46" />
            <Text style={paymentDetailsModalStyles.amountText}>{money(amount)}</Text>
            <Text style={paymentDetailsModalStyles.instructionText}>
              Confirm this payment to record it in your account.
            </Text>
          </View>

          <View style={paymentDetailsModalStyles.buttonContainer}>
            <TouchableOpacity
              style={paymentDetailsModalStyles.cancelBtn}
              onPress={onClose}
              activeOpacity={0.85}
              disabled={isProcessing}
            >
              <Text style={paymentDetailsModalStyles.cancelBtnText}>Back</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                paymentDetailsModalStyles.confirmBtn,
                isProcessing && paymentDetailsModalStyles.buttonDisabled,
              ]}
              onPress={onConfirm}
              activeOpacity={0.85}
              disabled={isProcessing}
            >
              <Text style={paymentDetailsModalStyles.confirmBtnText}>
                {isProcessing ? 'Processing...' : 'Confirm Payment'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default function PaymentsScreen({
  activeTab = 'payments',
  initialSegment = 'pending',
  onSelectTab,
  tenantID,
  user_id,
}) {
  const [segment, setSegment] = useState(initialSegment);
  const [pendingPayments, setPendingPayments] = useState([]);
  const [historyPayments, setHistoryPayments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [payingId, setPayingId] = useState(null);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const [invoiceModalVisible, setInvoiceModalVisible] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  const [paymentMethodModalVisible, setPaymentMethodModalVisible] = useState(false);
  const [selectedPaymentItem, setSelectedPaymentItem] = useState(null);

  const [paymentDetailsModalVisible, setPaymentDetailsModalVisible] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(null);

  const normalizedTenantID = Number(tenantID) > 0 ? Number(tenantID) : null;
  const normalizedUserId = Number(user_id) > 0 ? Number(user_id) : null;

  const loadPayments = useCallback(
    async (isRefresh = false) => {
      try {
        if (!isRefresh) setLoading(true);
        setRefreshing(isRefresh);
        setError(null);

        if (!normalizedTenantID || !normalizedUserId) {
          setPendingPayments([]);
          setHistoryPayments([]);
          setError('Missing account information. Please log in again.');
          return;
        }

        const [pending, history] = await Promise.all([
          fetchPendingPayments({
            tenantID: normalizedTenantID,
            user_id: normalizedUserId,
            limit: 50,
          }),
          fetchPaymentHistory({
            tenantID: normalizedTenantID,
            user_id: normalizedUserId,
            limit: 50,
          }),
        ]);

        setPendingPayments(Array.isArray(pending) ? pending : []);
        setHistoryPayments(Array.isArray(history) ? history : []);
      } catch (err) {
        setError(err?.message || 'Failed to load payments');
        setPendingPayments([]);
        setHistoryPayments([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [normalizedTenantID, normalizedUserId]
  );

  useEffect(() => {
    loadPayments();
  }, [loadPayments]);

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

  const totalBalance = useMemo(
    () =>
      pendingPayments.reduce((sum, item) => {
        const grandTotal = getGrandTotal(item);
        const amountPaid = Number(item.amountPaid || 0);
        const balance = Math.max(0, grandTotal - amountPaid);

        return sum + balance;
      }, 0),
    [pendingPayments]
  );

  const isTabActive = (tab) => activeTab === tab;

  const handlePayNow = (item) => {
    setSelectedPaymentItem(item);
    setPaymentMethodModalVisible(true);
  };

  const handleSelectPaymentMethod = (method) => {
    setSelectedPaymentMethod(method);
    setPaymentMethodModalVisible(false);
    setPaymentDetailsModalVisible(true);
  };

  const normalizeDbPaymentMethod = (method) => {
    if (method === 'Debit/Credit Card') return 'Card';
    if (method === 'PayMaya') return 'GCash';
    if (method === 'Bank Transfer') return 'Bank Transfer';
    return 'GCash';
  };

  const handlePaymentMethod = async (item, method) => {
    try {
      if (!normalizedTenantID || !normalizedUserId) {
        Alert.alert('Error', 'Missing account information. Please log in again.');
        return;
      }

      const grandTotal = getGrandTotal(item);
      const amountPaid = Number(item.amountPaid || 0);
      const balanceToPay = Math.max(0, grandTotal - amountPaid);

      if (balanceToPay <= 0) {
        Alert.alert('No Balance', 'This payment has no remaining balance.');
        return;
      }

      setPayingId(item.payment_id);

      let referenceNumber = `${Date.now()}`;
      if (method === 'GCash') referenceNumber = `GCASH-${Date.now()}`;
      if (method === 'PayMaya') referenceNumber = `MAYA-${Date.now()}`;
      if (method === 'Debit/Credit Card') referenceNumber = `CARD-${Date.now()}`;
      if (method === 'Bank Transfer') referenceNumber = `BANK-${Date.now()}`;

      await payPayment({
        payment_id: item.payment_id,
        tenantID: normalizedTenantID,
        user_id: normalizedUserId,
        amountPaid: balanceToPay,
        paymentMethod: normalizeDbPaymentMethod(method),
        gcashReferenceNumber: referenceNumber,
      });

      Alert.alert('Success', `Payment of ${money(balanceToPay)} recorded via ${method}`);
      await loadPayments(true);
    } catch (err) {
      Alert.alert('Error', `Failed to process payment: ${err?.message || 'Unknown error'}`);
    } finally {
      setPayingId(null);
    }
  };

  const handleConfirmPayment = async () => {
    if (!selectedPaymentItem || !selectedPaymentMethod) return;

    await handlePaymentMethod(selectedPaymentItem, selectedPaymentMethod);
    setPaymentDetailsModalVisible(false);
    setSelectedPaymentMethod(null);
    setSelectedPaymentItem(null);
  };

  const handleViewInvoice = (item) => {
    setSelectedInvoice(item);
    setInvoiceModalVisible(true);
  };

  if (error && !loading) {
    return (
      <View style={paymentStyles.container}>
        <ScrollView contentContainerStyle={paymentStyles.scrollContent}>
          <View style={paymentStyles.headerRow}>
            <View style={paymentStyles.iconButton} />
            <Text style={paymentStyles.headerTitle}>Payments</Text>
            <TouchableOpacity style={paymentStyles.iconButton} onPress={() => loadPayments(true)}>
              <Ionicons name="refresh" size={24} color="#0F1F3A" />
            </TouchableOpacity>
          </View>

          <View style={paymentStyles.errorContainer}>
            <Ionicons name="alert-circle" size={48} color="#B91C1C" />
            <Text style={paymentStyles.errorText}>{error}</Text>
            <TouchableOpacity style={paymentStyles.retryButton} onPress={() => loadPayments()}>
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
          <RefreshControl refreshing={refreshing} onRefresh={() => loadPayments(true)} />
        }
      >
        <View style={paymentStyles.headerRow}>
          <View style={paymentStyles.iconButton} />

          <Text style={paymentStyles.headerTitle}>Payments</Text>

          <TouchableOpacity
            style={paymentStyles.iconButton}
            activeOpacity={0.85}
            onPress={() => loadPayments(true)}
          >
            <Ionicons name="refresh" size={24} color="#0F1F3A" />
          </TouchableOpacity>
        </View>

        <Text style={paymentStyles.pageTitle}>Pending Actions</Text>
        <Text style={paymentStyles.pageSubtitle}>
          Review and complete payments based on your completed repair job total.
        </Text>

        <View style={paymentStyles.balanceSummaryCard}>
          <Text style={paymentStyles.balanceSummaryLabel}>TOTAL BALANCE</Text>
          <Text style={paymentStyles.balanceSummaryValue}>{money(totalBalance)}</Text>
          <Text style={paymentStyles.balanceSummarySubtext}>
            From {pendingPayments.length} pending payment
            {pendingPayments.length === 1 ? '' : 's'}
          </Text>
        </View>

        <View style={paymentStyles.segmentWrap}>
          <TouchableOpacity
            style={[
              paymentStyles.segmentButton,
              segment === 'pending' && paymentStyles.segmentButtonActive,
            ]}
            onPress={() => setSegment('pending')}
            activeOpacity={0.9}
          >
            <Text
              style={[
                paymentStyles.segmentText,
                segment === 'pending' && paymentStyles.segmentTextActive,
              ]}
            >
              Pending ({pendingPayments.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              paymentStyles.segmentButton,
              segment === 'history' && paymentStyles.segmentButtonActive,
            ]}
            onPress={() => setSegment('history')}
            activeOpacity={0.9}
          >
            <Text
              style={[
                paymentStyles.segmentText,
                segment === 'history' && paymentStyles.segmentTextActive,
              ]}
            >
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
              key={String(item.payment_id)}
              item={item}
              disabledPay={payingId === item.payment_id}
              onPayNow={() => {
                if (payingId === item.payment_id) return;
                handlePayNow(item);
              }}
              onViewInvoice={() => handleViewInvoice(item)}
            />
          ))
        ) : (
          <View style={paymentStyles.emptyContainer}>
            <Ionicons
              name={segment === 'pending' ? 'checkmark-circle' : 'receipt-outline'}
              size={48}
              color="#10B981"
            />
            <Text style={paymentStyles.emptyText}>No {segment} payments</Text>
            <Text style={paymentStyles.emptySubtext}>
              {segment === 'pending'
                ? 'No completed repair job payments yet.'
                : 'No payment history yet.'}
            </Text>
          </View>
        )}

        <View style={paymentStyles.infoCard}>
          <Ionicons
            name="information-circle"
            size={24}
            color="#42546D"
            style={paymentStyles.infoIcon}
          />
          <Text style={paymentStyles.infoText}>
            Payments are created only after the repair job is completed.
          </Text>
        </View>
      </ScrollView>

      <View style={styles.homeBottomNavWrapper}>
        <View style={styles.bottomNav}>
          <TouchableOpacity
            style={[styles.navItem, isTabActive('home') && styles.navItemSelected]}
            onPress={() => onSelectTab && onSelectTab('home')}
          >
            <Ionicons
              name="home"
              size={22}
              color={isTabActive('home') ? '#0F172A' : '#94A3B8'}
            />
            <Text style={[styles.navLabel, isTabActive('home') && styles.navLabelActive]}>
              Home
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.navItem, isTabActive('bookService') && styles.navItemSelected]}
            onPress={() => onSelectTab && onSelectTab('bookService')}
          >
            <Ionicons
              name="calendar-outline"
              size={22}
              color={isTabActive('bookService') ? '#0F172A' : '#94A3B8'}
            />
            <Text style={[styles.navLabel, isTabActive('bookService') && styles.navLabelActive]}>
              Bookings
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.navItem, isTabActive('history') && styles.navItemSelected]}
            onPress={() => onSelectTab && onSelectTab('history')}
          >
            <Ionicons
              name="time-outline"
              size={22}
              color={isTabActive('history') ? '#0F172A' : '#94A3B8'}
            />
            <Text style={[styles.navLabel, isTabActive('history') && styles.navLabelActive]}>
              History
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.navItem, isTabActive('payments') && styles.navItemSelected]}
            onPress={() => onSelectTab && onSelectTab('payments')}
          >
            <Ionicons
              name="card"
              size={22}
              color={isTabActive('payments') ? '#0F172A' : '#94A3B8'}
            />
            <Text style={[styles.navLabel, isTabActive('payments') && styles.navLabelActive]}>
              Payments
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.navItem, isTabActive('profile') && styles.navItemSelected]}
            onPress={() => onSelectTab && onSelectTab('profile')}
          >
            <Ionicons
              name="person-outline"
              size={22}
              color={isTabActive('profile') ? '#0F172A' : '#94A3B8'}
            />
            <Text style={[styles.navLabel, isTabActive('profile') && styles.navLabelActive]}>
              Profile
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <InvoiceModal
        visible={invoiceModalVisible}
        item={selectedInvoice}
        onClose={() => {
          setInvoiceModalVisible(false);
          setSelectedInvoice(null);
        }}
      />

      <PaymentMethodModal
        visible={paymentMethodModalVisible}
        item={selectedPaymentItem}
        onSelectMethod={handleSelectPaymentMethod}
        onClose={() => {
          setPaymentMethodModalVisible(false);
          setSelectedPaymentItem(null);
        }}
        isProcessing={payingId !== null}
      />

      <PaymentDetailsModal
        visible={paymentDetailsModalVisible}
        paymentMethod={selectedPaymentMethod}
        amount={
          selectedPaymentItem
            ? Math.max(
                0,
                getGrandTotal(selectedPaymentItem) -
                  Number(selectedPaymentItem.amountPaid || 0)
              )
            : 0
        }
        onConfirm={handleConfirmPayment}
        onClose={() => {
          setPaymentDetailsModalVisible(false);
          setSelectedPaymentMethod(null);
        }}
        isProcessing={payingId !== null}
      />
    </View>
  );
}

/* Keep your existing style blocks:
   paymentStyles
   invoiceModalStyles
   paymentMethodModalStyles
   paymentDetailsModalStyles
*/

const paymentStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F6FA',
  },
  scrollContent: {
    paddingTop: 8,
    paddingHorizontal: 22,
    paddingBottom: 120,
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
    marginBottom: 16,
    color: '#334A66',
    fontSize: 13,
    lineHeight: 21,
  },
  creatingInvoiceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2F7',
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
  },
  creatingInvoiceText: {
    marginLeft: 10,
    color: '#0F1F3A',
    fontSize: 13,
    fontWeight: '700',
  },
  balanceSummaryCard: {
    backgroundColor: '#132B46',
    borderRadius: 18,
    padding: 18,
    marginBottom: 16,
  },
  balanceSummaryLabel: {
    color: '#CBD5E1',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
  },
  balanceSummaryValue: {
    color: '#FFFFFF',
    fontSize: 34,
    fontWeight: '900',
    marginTop: 6,
  },
  balanceSummarySubtext: {
    color: '#DDE7F5',
    marginTop: 5,
    fontSize: 13,
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
  cardStatusPaid: {
    color: '#15803D',
  },
  cardStatusPartial: {
    color: '#B45309',
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
    marginBottom: 12,
  },
  vehicleText: {
    marginLeft: 8,
    color: '#4A5A73',
    fontSize: 15,
  },
  servicesPreview: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 14,
  },
  servicePill: {
    backgroundColor: '#EEF2F7',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  servicePillText: {
    color: '#334A66',
    fontSize: 11,
    fontWeight: '700',
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
    fontSize: 16,
    fontWeight: '800',
  },
  paidText: {
    color: '#10B981',
    fontSize: 16,
    fontWeight: '800',
  },
  balanceText: {
    color: '#B91C1C',
    fontSize: 16,
    fontWeight: '800',
  },
  zeroBalanceText: {
    color: '#10B981',
    fontSize: 16,
    fontWeight: '800',
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
  payNowButtonDisabled: {
    opacity: 0.6,
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
    textAlign: 'center',
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

const invoiceModalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    paddingTop: 20,
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F1F3A',
  },
  content: {
    paddingBottom: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334A66',
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5FB',
  },
  label: {
    fontSize: 14,
    color: '#7A8DAA',
    fontWeight: '500',
  },
  value: {
    flex: 1,
    textAlign: 'right',
    fontSize: 14,
    color: '#0F1F3A',
    fontWeight: '600',
  },
  refValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2D3748',
  },
  serviceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5FB',
  },
  serviceName: {
    color: '#0F1F3A',
    fontWeight: '700',
    fontSize: 14,
  },
  serviceMeta: {
    color: '#7A8DAA',
    fontSize: 12,
    marginTop: 3,
  },
  servicePrice: {
    color: '#0F1F3A',
    fontWeight: '800',
  },
  amountRow: {
    paddingVertical: 12,
  },
  amountValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F1F3A',
  },
  paidValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#10B981',
  },
  balanceValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#B91C1C',
  },
  balanceRow: {
    borderBottomColor: '#FFE2E2',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    fontSize: 12,
    fontWeight: '700',
    overflow: 'hidden',
  },
  statusPaid: {
    backgroundColor: '#DCFCE7',
    color: '#166534',
  },
  statusPending: {
    backgroundColor: '#FEF3C7',
    color: '#B45309',
  },
  closeButton: {
    backgroundColor: '#132B46',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 20,
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});

const paymentMethodModalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '85%',
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F1F3A',
  },
  content: {
    paddingBottom: 20,
  },
  amountSection: {
    backgroundColor: '#F0F4FA',
    borderRadius: 16,
    padding: 20,
    marginBottom: 28,
    alignItems: 'center',
  },
  amountLabel: {
    fontSize: 14,
    color: '#7A8DAA',
    fontWeight: '600',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  amountValue: {
    fontSize: 32,
    fontWeight: '800',
    color: '#132B46',
    marginBottom: 8,
  },
  serviceTitle: {
    fontSize: 14,
    color: '#4A5A73',
    fontWeight: '600',
    textAlign: 'center',
  },
  methodsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F1F3A',
    marginBottom: 16,
  },
  methodsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 24,
  },
  methodCard: {
    width: '48%',
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    padding: 16,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  methodIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  methodName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F1F3A',
    marginBottom: 4,
    textAlign: 'center',
  },
  methodDescription: {
    fontSize: 12,
    color: '#7A8DAA',
    fontWeight: '500',
    textAlign: 'center',
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#ECFDF5',
    borderRadius: 12,
    padding: 14,
    alignItems: 'flex-start',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#D1F0DC',
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: '#047857',
    fontWeight: '500',
    marginLeft: 10,
    lineHeight: 18,
  },
  cancelButton: {
    backgroundColor: '#F3F4F6',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 16,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
  },
  cancelButtonText: {
    color: '#6B7280',
    fontSize: 16,
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});

const paymentDetailsModalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F1F3A',
  },
  iconSection: {
    alignItems: 'center',
    marginBottom: 24,
    paddingVertical: 20,
  },
  amountText: {
    fontSize: 36,
    fontWeight: '800',
    color: '#132B46',
    marginTop: 12,
    marginBottom: 12,
  },
  instructionText: {
    fontSize: 14,
    color: '#4A5A73',
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  cancelBtnText: {
    color: '#6B7280',
    fontSize: 16,
    fontWeight: '700',
  },
  confirmBtn: {
    flex: 1,
    backgroundColor: '#132B46',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  confirmBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});