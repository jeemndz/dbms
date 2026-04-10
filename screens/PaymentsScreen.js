import { useEffect, useMemo, useState } from 'react';
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

const getServiceTitle = (payment) => {
  return payment.remarks || `Service Ref ${payment.referenceNumber || payment.appointment_id || ''}`.trim();
};

const getVehicleInfo = (payment) => {
  if (payment.appointment_date && payment.appointment_time) {
    return `${formatDate(payment.appointment_date)} • ${payment.appointment_time}`;
  }

  if (payment.appointment_date) {
    return formatDate(payment.appointment_date);
  }

  return 'Vehicle Service';
};

const isConfirmedAppointment = (item) =>
  String(item?.appointment_status || '').trim().toLowerCase() === 'confirmed';

function PaymentCard({ item, onPayNow, onViewInvoice, disabledPay = false }) {
  const isPending = String(item.paymentStatus || '').trim().toLowerCase() === 'pending';
  const isPaid = String(item.paymentStatus || '').trim().toLowerCase() === 'paid';
  const isOverdue =
    isPending &&
    item.appointment_date &&
    new Date(item.appointment_date) < new Date(new Date().toDateString());

  // Job status for display only
  const jobStatus = String(item.job_status || '').trim();

  return (
    <View style={[paymentStyles.card, (isOverdue || isPaid) && paymentStyles.cardOverdue]}>
      <View style={paymentStyles.cardTopRow}>
        <Text style={paymentStyles.cardDate}>{formatDate(item.appointment_date)}</Text>
        <Text
          style={[
            paymentStyles.cardStatus,
            isOverdue && !isPaid && paymentStyles.cardStatusOverdue,
          ]}
        >
          {isOverdue && !isPaid
            ? 'OVERDUE'
            : String(item.paymentStatus || 'Pending').toUpperCase()}
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
          <Text style={paymentStyles.amountText}>₱{Number(item.paymentAmount || 0).toFixed(2)}</Text>
        </View>

        {Number(item.amountPaid || 0) > 0 ? (
          <View>
            <Text style={paymentStyles.labelText}>Paid</Text>
            <Text style={paymentStyles.paidText}>₱{Number(item.amountPaid || 0).toFixed(2)}</Text>
          </View>
        ) : null}

        {Number(item.balance || 0) > 0 ? (
          <View>
            <Text style={paymentStyles.labelText}>Balance</Text>
            <Text style={paymentStyles.balanceText}>₱{Number(item.balance || 0).toFixed(2)}</Text>
          </View>
        ) : null}
      </View>

      <View style={paymentStyles.cardBottomRow}>
        {!isPaid ? (
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
                {disabledPay ? 'Processing...' : 'Pay Now'}
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

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={invoiceModalStyles.overlay}>
        <View style={invoiceModalStyles.modal}>
          <View style={invoiceModalStyles.header}>
            <Text style={invoiceModalStyles.title}>Invoice Details</Text>
            <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
              <Ionicons name="close" size={28} color="#0F1F3A" />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={invoiceModalStyles.content}
            showsVerticalScrollIndicator={false}
          >
            {/* Service Info */}
            <View style={invoiceModalStyles.section}>
              <Text style={invoiceModalStyles.sectionTitle}>Service Information</Text>
              <View style={invoiceModalStyles.infoRow}>
                <Text style={invoiceModalStyles.label}>Service</Text>
                <Text style={invoiceModalStyles.value}>{getServiceTitle(item)}</Text>
              </View>
              <View style={invoiceModalStyles.infoRow}>
                <Text style={invoiceModalStyles.label}>Date</Text>
                <Text style={invoiceModalStyles.value}>{formatDate(item.appointment_date)}</Text>
              </View>
              {item.appointment_time ? (
                <View style={invoiceModalStyles.infoRow}>
                  <Text style={invoiceModalStyles.label}>Time</Text>
                  <Text style={invoiceModalStyles.value}>{item.appointment_time}</Text>
                </View>
              ) : null}
            </View>

            {/* Reference */}
            <View style={invoiceModalStyles.section}>
              <Text style={invoiceModalStyles.sectionTitle}>Reference</Text>
              <View style={invoiceModalStyles.infoRow}>
                <Text style={invoiceModalStyles.label}>Reference #</Text>
                <Text style={[invoiceModalStyles.value, invoiceModalStyles.refValue]}>
                  {item.referenceNumber || 'N/A'}
                </Text>
              </View>
            </View>

            {/* Amount Breakdown */}
            <View style={invoiceModalStyles.section}>
              <Text style={invoiceModalStyles.sectionTitle}>Amount Breakdown</Text>
              <View style={[invoiceModalStyles.infoRow, invoiceModalStyles.amountRow]}>
                <Text style={invoiceModalStyles.label}>Amount Due</Text>
                <Text style={invoiceModalStyles.amountValue}>
                  ₱{Number(item.paymentAmount || 0).toFixed(2)}
                </Text>
              </View>
              {Number(item.amountPaid || 0) > 0 ? (
                <View style={[invoiceModalStyles.infoRow, invoiceModalStyles.amountRow]}>
                  <Text style={invoiceModalStyles.label}>Amount Paid</Text>
                  <Text style={invoiceModalStyles.paidValue}>
                    ₱{Number(item.amountPaid || 0).toFixed(2)}
                  </Text>
                </View>
              ) : null}
              {Number(item.balance || 0) > 0 ? (
                <View style={[invoiceModalStyles.infoRow, invoiceModalStyles.balanceRow]}>
                  <Text style={invoiceModalStyles.label}>Balance</Text>
                  <Text style={invoiceModalStyles.balanceValue}>
                    ₱{Number(item.balance || 0).toFixed(2)}
                  </Text>
                </View>
              ) : null}
            </View>

            {/* Status */}
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
              <View style={invoiceModalStyles.infoRow}>
                <Text style={invoiceModalStyles.label}>Job Repair Status</Text>
                <Text
                  style={[
                    invoiceModalStyles.statusBadge,
                    item.job_status === 'Completed'
                      ? invoiceModalStyles.statusJobCompleted
                      : item.job_status === 'Cancelled'
                      ? invoiceModalStyles.statusJobCancelled
                      : invoiceModalStyles.statusJobInProgress,
                  ]}
                >
                  {String(item.job_status || 'N/A').toUpperCase()}
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

  const balanceToPay =
    Number(item.balance || 0) > 0 ? Number(item.balance || 0) : Number(item.paymentAmount || 0);

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
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={paymentMethodModalStyles.overlay}>
        <View style={paymentMethodModalStyles.modal}>
          <View style={paymentMethodModalStyles.header}>
            <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
              <Ionicons name="close" size={28} color="#0F1F3A" />
            </TouchableOpacity>
            <Text style={paymentMethodModalStyles.title}>Payment Method</Text>
            <View style={{ width: 28 }} />
          </View>

          <ScrollView
            style={paymentMethodModalStyles.content}
            showsVerticalScrollIndicator={false}
          >
            {/* Amount Section */}
            <View style={paymentMethodModalStyles.amountSection}>
              <Text style={paymentMethodModalStyles.amountLabel}>Amount to Pay</Text>
              <Text style={paymentMethodModalStyles.amountValue}>
                ₱{balanceToPay.toFixed(2)}
              </Text>
              <Text style={paymentMethodModalStyles.serviceTitle}>{getServiceTitle(item)}</Text>
            </View>

            {/* Payment Methods */}
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
                    <Ionicons
                      name={method.icon}
                      size={32}
                      color={method.color}
                    />
                  </View>
                  <Text style={paymentMethodModalStyles.methodName}>{method.name}</Text>
                  <Text style={paymentMethodModalStyles.methodDescription}>
                    {method.description}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Info */}
            <View style={paymentMethodModalStyles.infoBox}>
              <Ionicons
                name="shield-checkmark-outline"
                size={20}
                color="#10B981"
              />
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

function PaymentDetailsModal({ visible, paymentMethod, amount, onConfirm, onClose, isProcessing }) {
  const getDetailsForMethod = (method) => {
    switch (method) {
      case 'GCash':
        return {
          icon: 'phone-portrait-outline',
          color: '#0066FF',
          title: 'GCash Payment',
          steps: [
            { number: '1', text: 'Open your GCash app' },
            { number: '2', text: 'Go to "Send Money" section' },
            { number: '3', text: 'Enter the merchant account details' },
            { number: '4', text: 'Enter amount: ₱' + amount?.toFixed(2) },
            { number: '5', text: 'Confirm and complete the transaction' },
          ],
          instruction: 'Send payment to our GCash account and keep the reference number.',
          referencePrefix: 'GCASH',
        };
      case 'PayMaya':
        return {
          icon: 'card-outline',
          color: '#FF6B00',
          title: 'PayMaya Payment',
          steps: [
            { number: '1', text: 'Open your PayMaya app or website' },
            { number: '2', text: 'Select "Pay Bills" or "Send Money"' },
            { number: '3', text: 'Enter recipient account details' },
            { number: '4', text: 'Enter amount: ₱' + amount?.toFixed(2) },
            { number: '5', text: 'Authorize with your password/fingerprint' },
          ],
          instruction: 'Complete the payment using your PayMaya account.',
          referencePrefix: 'MAYA',
        };
      case 'Debit/Credit Card':
        return {
          icon: 'card-sharp',
          color: '#1F2937',
          title: 'Card Payment',
          steps: [
            { number: '1', text: 'Provide your card information below' },
            { number: '2', text: 'Card number, expiry date, and CVV' },
            { number: '3', text: 'Billing address verification' },
            { number: '4', text: 'Review payment amount: ₱' + amount?.toFixed(2) },
            { number: '5', text: 'Complete the transaction securely' },
          ],
          instruction: 'Your card payment is processed with industry-standard encryption.',
          referencePrefix: 'CARD',
        };
      case 'Bank Transfer':
        return {
          icon: 'business-outline',
          color: '#0EA5E9',
          title: 'Bank Transfer',
          steps: [
            { number: '1', text: 'Log in to your online banking' },
            { number: '2', text: 'Select "Fund Transfer" option' },
            { number: '3', text: 'Enter our bank account details' },
            { number: '4', text: 'Enter amount: ₱' + amount?.toFixed(2) },
            { number: '5', text: 'Confirm and submit the transfer' },
          ],
          instruction: 'Bank transfer typically takes 1-2 business days to process.',
          referencePrefix: 'BANK',
        };
      default:
        return null;
    }
  };

  const details = getDetailsForMethod(paymentMethod);

  if (!details) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={paymentDetailsModalStyles.overlay}>
        <View style={paymentDetailsModalStyles.modal}>
          <View style={paymentDetailsModalStyles.header}>
            <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
              <Ionicons name="close" size={28} color="#0F1F3A" />
            </TouchableOpacity>
            <Text style={paymentDetailsModalStyles.title}>{details.title}</Text>
            <View style={{ width: 28 }} />
          </View>

          <ScrollView
            style={paymentDetailsModalStyles.content}
            showsVerticalScrollIndicator={false}
          >
            {/* Method Icon Section */}
            <View style={paymentDetailsModalStyles.iconSection}>
              <View
                style={[
                  paymentDetailsModalStyles.iconContainer,
                  { backgroundColor: `${details.color}15` },
                ]}
              >
                <Ionicons name={details.icon} size={48} color={details.color} />
              </View>
              <Text style={paymentDetailsModalStyles.amountText}>₱{amount?.toFixed(2)}</Text>
              <Text style={paymentDetailsModalStyles.instructionText}>
                {details.instruction}
              </Text>
            </View>

            {/* Steps */}
            <View style={paymentDetailsModalStyles.stepsSection}>
              <Text style={paymentDetailsModalStyles.stepsTitle}>Payment Steps</Text>
              {details.steps.map((step, index) => (
                <View key={index} style={paymentDetailsModalStyles.stepItem}>
                  <View
                    style={[
                      paymentDetailsModalStyles.stepNumber,
                      { backgroundColor: details.color },
                    ]}
                  >
                    <Text style={paymentDetailsModalStyles.stepNumberText}>{step.number}</Text>
                  </View>
                  <Text style={paymentDetailsModalStyles.stepText}>{step.text}</Text>
                </View>
              ))}
            </View>

            {/* Info Box */}
            <View style={paymentDetailsModalStyles.infoBox}>
              <Ionicons name="information-circle" size={20} color="#0066FF" />
              <Text style={paymentDetailsModalStyles.infoText}>
                Keep your reference number safe for record purposes. Support team can use it to
                verify your payment.
              </Text>
            </View>
          </ScrollView>

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

  const normalizedTenantID =
    Number(tenantID) > 0 ? Number(tenantID) : null;

  const normalizedUserId =
    Number(user_id) > 0 ? Number(user_id) : null;

  const loadPayments = async (isRefresh = false) => {
    try {
      if (!isRefresh) setLoading(true);
      setRefreshing(isRefresh);
      setError(null);

      if (!normalizedTenantID || !normalizedUserId) {
        console.warn('Missing tenantID or user_id', {
          tenantID,
          user_id,
        });
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

      console.log('Raw pending payments:', pending);

      const filteredPending = (Array.isArray(pending) ? pending : []).filter(
        (item) => {
          // Filter payments that have:
          // 1. An appointment_id (links to repair_jobs)
          // 2. Pending payment status
          const hasAppointmentId = !!item?.appointment_id;
          const paymentStatus = String(item?.paymentStatus || '').trim().toLowerCase();
          const isPending = paymentStatus === 'pending';
          
          console.log('Checking payment:', {
            payment_id: item.payment_id,
            appointment_id: item.appointment_id,
            job_status: item.job_status,
            hasAppointmentId,
            paymentStatus,
            isPending,
            shouldDisplay: hasAppointmentId && isPending,
          });
          
          return hasAppointmentId && isPending;
        }
      );

      console.log('Filtered pending payments count:', filteredPending.length);

      const filteredHistory = (Array.isArray(history) ? history : []).filter(
        (item) => isConfirmedAppointment(item)
      );

      setPendingPayments(filteredPending);
      setHistoryPayments(filteredHistory);
    } catch (err) {
      console.error('Error loading payments:', err);
      setError(err?.message || 'Failed to load payments');
      setPendingPayments([]);
      setHistoryPayments([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadPayments();
  }, [tenantID, user_id]);

  useEffect(() => {
    if (activeTab === 'history') {
      setSegment('history');
    } else if (activeTab === 'payments') {
      setSegment('pending');
    }
  }, [activeTab]);

  const data = useMemo(() => {
    return segment === 'pending' ? pendingPayments : historyPayments;
  }, [segment, pendingPayments, historyPayments]);

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

  const handleConfirmPayment = async () => {
    if (selectedPaymentItem && selectedPaymentMethod) {
      await handlePaymentMethod(selectedPaymentItem, selectedPaymentMethod);
      setPaymentDetailsModalVisible(false);
    }
  };

  const handlePaymentMethod = async (item, method) => {
    try {
      if (!normalizedTenantID || !normalizedUserId) {
        Alert.alert('Error', 'Missing account information. Please log in again.');
        return;
      }

      const balanceToPay =
        Number(item.balance || 0) > 0 ? Number(item.balance || 0) : Number(item.paymentAmount || 0);

      setPayingId(item.payment_id);

      let referenceNumber = `${Date.now()}`;

      if (method === 'GCash') {
        referenceNumber = `GCASH-${Date.now()}`;
      } else if (method === 'PayMaya') {
        referenceNumber = `MAYA-${Date.now()}`;
      } else if (method === 'Debit/Credit Card') {
        referenceNumber = `CARD-${Date.now()}`;
      } else if (method === 'Bank Transfer') {
        referenceNumber = `BANK-${Date.now()}`;
      }

      await payPayment({
        payment_id: item.payment_id,
        tenantID: normalizedTenantID,
        user_id: normalizedUserId,
        amountPaid: balanceToPay,
        gcashReferenceNumber: referenceNumber,
        remarks: `Paid via ${method}`,
      });

      Alert.alert(
        'Success',
        `Payment of ₱${balanceToPay.toFixed(2)} recorded via ${method}`
      );

      await loadPayments(true);
    } catch (err) {
      Alert.alert('Error', 'Failed to process payment: ' + (err?.message || 'Unknown error'));
    } finally {
      setPayingId(null);
    }
  };

  const handleViewInvoice = (item) => {
    setSelectedInvoice(item);
    setInvoiceModalVisible(true);
  };

  if (error && !loading) {
    return (
      <View style={paymentStyles.container}>
        <ScrollView
          contentContainerStyle={paymentStyles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
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
            <Ionicons name="wallet-outline" size={24} color="#0F1F3A" />
          </TouchableOpacity>
        </View>

        <Text style={paymentStyles.pageTitle}>Pending Actions</Text>
        <Text style={paymentStyles.pageSubtitle}>
          Review and complete payments for your confirmed vehicle services.
        </Text>

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
                ? 'No payments for confirmed appointments.'
                : 'No payment history for confirmed appointments yet'}
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
            Payments are processed securely. Only confirmed appointments are shown here.
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
            style={[styles.navItem, isTabActive('appointments') && styles.navItemSelected]}
            onPress={() => onSelectTab && onSelectTab('appointments')}
          >
            <Ionicons
              name="calendar-outline"
              size={22}
              color={isTabActive('appointments') ? '#0F172A' : '#94A3B8'}
            />
            <Text style={[styles.navLabel, isTabActive('appointments') && styles.navLabelActive]}>
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
        amount={selectedPaymentItem?.balance || selectedPaymentItem?.paymentAmount}
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
  jobStatusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#D97706',
  },
  jobStatusText: {
    flex: 1,
    marginLeft: 10,
    fontSize: 12,
    fontWeight: '600',
    color: '#92400E',
    lineHeight: 16,
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
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
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
    fontSize: 14,
    color: '#0F1F3A',
    fontWeight: '600',
  },
  refValue: {
    fontFamily: 'Courier New',
    fontSize: 12,
    fontWeight: '700',
    color: '#2D3748',
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
  statusConfirmed: {
    backgroundColor: '#DBEAFE',
    color: '#1E40AF',
  },
  statusOther: {
    backgroundColor: '#F3F4F6',
    color: '#374151',
  },
  statusJobCompleted: {
    backgroundColor: '#DCFCE7',
    color: '#166534',
  },
  statusJobCancelled: {
    backgroundColor: '#FEE2E2',
    color: '#991B1B',
  },
  statusJobInProgress: {
    backgroundColor: '#DBEAFE',
    color: '#1E40AF',
  },
  balanceRow: {
    borderBottomColor: '#FFE2E2',
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
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
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
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '90%',
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
  content: {
    paddingBottom: 20,
  },
  iconSection: {
    alignItems: 'center',
    marginBottom: 32,
    paddingVertical: 20,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  amountText: {
    fontSize: 36,
    fontWeight: '800',
    color: '#132B46',
    marginBottom: 12,
  },
  instructionText: {
    fontSize: 14,
    color: '#4A5A73',
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 20,
  },
  stepsSection: {
    marginBottom: 28,
  },
  stepsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F1F3A',
    marginBottom: 16,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  stepNumber: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    minWidth: 36,
  },
  stepNumberText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  stepText: {
    flex: 1,
    fontSize: 14,
    color: '#334A66',
    fontWeight: '500',
    lineHeight: 20,
    paddingTop: 8,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    padding: 14,
    alignItems: 'flex-start',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: '#1E40AF',
    fontWeight: '500',
    marginLeft: 10,
    lineHeight: 18,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
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