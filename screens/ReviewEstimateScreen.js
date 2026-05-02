import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const API_URL =
  'https://rapidrepair-gygpcbczgyg0czek.southeastasia-01.azurewebsites.net';

const TAX_AND_FEES_RATE = 0.1871;
const money = (value) => `₱${Number(value || 0).toFixed(2)}`;

const isSuccessResponse = (data) =>
  data?.success === true || String(data?.status || '').toLowerCase() === 'success';

export default function ReviewEstimateScreen({
  route = {},
  navigation,
  onSelectTab,
  tenantID,
  user_id,
  userId,
}) {
  const params = route?.params || {};

  const routeDiagnosticId =
    params.diagnostic_id ||
    params.diagnosticId ||
    params.diagnosticID ||
    null;

  const resolvedTenantID = params.tenantID || params.tenantId || tenantID || null;
  const resolvedUserID = params.user_id || params.userId || user_id || userId || null;

  const [diagnosticId, setDiagnosticId] = useState(routeDiagnosticId);
  const [recommendedServices, setRecommendedServices] = useState([]);
  const [bookedServices, setBookedServices] = useState([]);
  const [diagnosticInfo, setDiagnosticInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [debugMessage, setDebugMessage] = useState('');

  const goHome = useCallback(() => {
    if (onSelectTab) {
      onSelectTab('home');
      return;
    }

    if (navigation?.navigate) {
      navigation.navigate('Home');
      return;
    }

    if (navigation?.replace) {
      navigation.replace('HomeScreen');
      return;
    }

    if (navigation?.goBack) {
      navigation.goBack();
    }
  }, [navigation, onSelectTab]);

  const fetchJson = async (url, options = {}) => {
    const res = await fetch(url, options);
    const text = await res.text();

    try {
      return JSON.parse(text);
    } catch (error) {
      throw new Error(`Invalid JSON response: ${text.slice(0, 180)}`);
    }
  };

  const fetchLatestDiagnosticId = useCallback(async () => {
    if (!resolvedTenantID || !resolvedUserID) {
      return null;
    }

    const url = `${API_URL}/get_latest_diagnostic_estimate.php?tenantID=${encodeURIComponent(
      resolvedTenantID
    )}&user_id=${encodeURIComponent(resolvedUserID)}`;

    const data = await fetchJson(url);

    if (!isSuccessResponse(data)) {
      throw new Error(data?.message || 'Failed to load latest diagnostic estimate.');
    }

    if (!data.has_estimate) {
      return null;
    }

    return data.diagnostic_id || data.diagnostic?.diagnostic_id || null;
  }, [resolvedTenantID, resolvedUserID]);

  const fetchEstimate = useCallback(async () => {
    try {
      setLoading(true);
      setDebugMessage('');

      let activeDiagnosticId = diagnosticId;

      if (!activeDiagnosticId) {
        activeDiagnosticId = await fetchLatestDiagnosticId();

        if (activeDiagnosticId) {
          setDiagnosticId(activeDiagnosticId);
        }
      }

      if (!activeDiagnosticId) {
        setRecommendedServices([]);
        setBookedServices([]);
        setDiagnosticInfo(null);
        setDebugMessage(
          'No pending diagnostic estimate found. All recommended services may already be reviewed and confirmed.'
        );
        return;
      }

      const url = `${API_URL}/get_diagnostic_services.php?diagnostic_id=${encodeURIComponent(
        activeDiagnosticId
      )}`;

      const data = await fetchJson(url);

      if (!isSuccessResponse(data)) {
        throw new Error(data?.message || 'Failed to load estimate.');
      }

      const recommended =
        data.recommended_services ||
        data.services ||
        data.diagnostic_services ||
        [];

      const booked =
        data.booked_services ||
        data.appointment_services ||
        data.bookedServices ||
        [];

      setRecommendedServices(Array.isArray(recommended) ? recommended : []);
      setBookedServices(Array.isArray(booked) ? booked : []);
      setDiagnosticInfo(data.diagnostic_report || data.diagnostic || data.report || null);
    } catch (err) {
      const message = String(err?.message || err);
      setDebugMessage(message);
      Alert.alert('Error', message);
    } finally {
      setLoading(false);
    }
  }, [diagnosticId, fetchLatestDiagnosticId]);

  useEffect(() => {
    fetchEstimate();
  }, [fetchEstimate]);

  const updateStatus = async (reportServiceId, status) => {
    if (!reportServiceId || String(reportServiceId).startsWith('recommended-')) {
      Alert.alert('Error', 'Missing report_service_id for this recommendation.');
      return;
    }

    try {
      const res = await fetch(`${API_URL}/update_service_status.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ report_service_id: reportServiceId, status }),
      });

      const text = await res.text();
      let data = null;

      try {
        data = JSON.parse(text);
      } catch (error) {
        throw new Error(`Invalid JSON response: ${text.slice(0, 180)}`);
      }

      if (isSuccessResponse(data)) {
        fetchEstimate();
      } else {
        Alert.alert('Error', data?.message || 'Failed to update.');
      }
    } catch (err) {
      Alert.alert('Error', String(err?.message || 'Network error.'));
    }
  };

  const pendingServices = useMemo(
    () =>
      recommendedServices.filter(
        (service) => String(service.approval_status || 'Pending') === 'Pending'
      ),
    [recommendedServices]
  );

  const approvedServices = useMemo(
    () =>
      recommendedServices.filter(
        (service) => String(service.approval_status) === 'Approved'
      ),
    [recommendedServices]
  );

  const isDiagnosticConfirmed = useMemo(() => {
    const customerApproval = String(diagnosticInfo?.customer_approval || '');
    const diagnosisStatus = String(diagnosticInfo?.diagnosis_status || '');

    return (
      customerApproval === 'Approved' ||
      customerApproval === 'Declined' ||
      diagnosisStatus === 'Approved' ||
      diagnosisStatus === 'Declined'
    );
  }, [diagnosticInfo]);

  const bookedTotal = useMemo(
    () =>
      bookedServices.reduce(
        (sum, service) =>
          sum + Number(service.service_price || service.price || 0),
        0
      ),
    [bookedServices]
  );

  const subtotal = useMemo(
    () =>
      approvedServices.reduce(
        (sum, service) => sum + Number(service.service_price || 0),
        0
      ),
    [approvedServices]
  );

  const tax = useMemo(() => subtotal * TAX_AND_FEES_RATE, [subtotal]);
  const total = useMemo(() => subtotal + tax, [subtotal, tax]);

  const confirmWork = async () => {
    if (!diagnosticId) {
      Alert.alert('Missing Estimate', 'No diagnostic report was selected.');
      return;
    }

    if (approvedServices.length === 0) {
      Alert.alert('No Services Approved', 'Please approve at least one service.');
      return;
    }

    try {
      const res = await fetch(`${API_URL}/confirm_diagnostic.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ diagnostic_id: diagnosticId }),
      });

      const text = await res.text();
      let data = null;

      try {
        data = JSON.parse(text);
      } catch (error) {
        throw new Error(`Invalid JSON response: ${text.slice(0, 180)}`);
      }

      if (isSuccessResponse(data)) {
        Alert.alert('Success', 'Work approved and started.', [
          { text: 'OK', onPress: goHome },
        ]);
      } else {
        Alert.alert('Error', data?.message || 'Failed to confirm.');
      }
    } catch (err) {
      Alert.alert('Error', String(err?.message || 'Server error.'));
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Loading estimate...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={goHome} activeOpacity={0.85}>
          <Ionicons name="arrow-back" size={22} color="#0B1A31" />
        </TouchableOpacity>

        <Text style={styles.title}>Review Estimate</Text>
      </View>

      {diagnosticInfo ? (
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Diagnostic Report</Text>

          {!!diagnosticInfo.problem_description && (
            <Text style={styles.infoText}>
              Problem: {diagnosticInfo.problem_description}
            </Text>
          )}

          {!!diagnosticInfo.findings && (
            <Text style={styles.infoText}>Findings: {diagnosticInfo.findings}</Text>
          )}

          {!!diagnosticInfo.recommended_action && (
            <Text style={styles.infoText}>
              Recommendation: {diagnosticInfo.recommended_action}
            </Text>
          )}
        </View>
      ) : null}

      {debugMessage ? (
        <View style={styles.debugCard}>
          <Text style={styles.debugTitle}>Notice</Text>
          <Text style={styles.debugText}>{debugMessage}</Text>
        </View>
      ) : null}

      <Text style={styles.sectionTitle}>Booked Services</Text>

      {bookedServices.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>No booked services found</Text>
          <Text style={styles.emptyText}>
            Your original appointment services will appear here.
          </Text>
        </View>
      ) : (
        <View style={styles.listCard}>
          {bookedServices.map((service, index) => {
            const id =
              service.appointment_service_id ||
              service.service_id ||
              `booked-${index}`;

            return (
              <View key={String(id)} style={styles.bookedRow}>
                <View style={styles.bookedIcon}>
                  <Ionicons name="construct-outline" size={18} color="#0B1A31" />
                </View>

                <View style={styles.bookedTextWrap}>
                  <Text style={styles.bookedTitle}>
                    {service.service_name || service.title || 'Booked Service'}
                  </Text>

                  {!!service.parent_service_name && (
                    <Text style={styles.bookedDesc}>
                      Main Service: {service.parent_service_name}
                    </Text>
                  )}

                  {!!service.notes && (
                    <Text style={styles.bookedDesc}>{service.notes}</Text>
                  )}

                  {!!service.duration_minutes && (
                    <Text style={styles.bookedMeta}>
                      {service.duration_minutes} mins
                    </Text>
                  )}
                </View>

                <Text style={styles.bookedPrice}>
                  {money(service.service_price || service.price)}
                </Text>
              </View>
            );
          })}

          <View style={styles.bookedTotalRow}>
            <Text style={styles.bookedTotalLabel}>Booked Total</Text>
            <Text style={styles.bookedTotalValue}>{money(bookedTotal)}</Text>
          </View>
        </View>
      )}

      {!isDiagnosticConfirmed && (
        <>
          <Text style={styles.sectionTitle}>Recommended Services</Text>

          {pendingServices.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>All services reviewed</Text>
              <Text style={styles.emptyText}>
                You have already approved or declined all recommended services.
              </Text>
            </View>
          ) : (
            pendingServices.map((service, index) => {
              const reportServiceId =
                service.report_service_id ||
                service.diagnostic_report_service_id ||
                null;

              const status = String(service.approval_status || 'Pending');

              return (
                <View
                  key={String(reportServiceId || `recommended-${index}`)}
                  style={styles.card}
                >
                  <View style={styles.cardHeader}>
                    <Text style={styles.serviceTitle}>
                      {service.service_name || 'Recommended Service'}
                    </Text>

                    <Text style={[styles.badge, getBadgeStyle(status)]}>{status}</Text>
                  </View>

                  {!!service.parent_service_name && (
                    <Text style={styles.parentService}>
                      Under: {service.parent_service_name}
                    </Text>
                  )}

                  <Text style={styles.desc}>
                    {service.description ||
                      service.recommended_action ||
                      'Recommended service'}
                  </Text>

                  {!!service.duration_minutes && (
                    <Text style={styles.duration}>{service.duration_minutes} mins</Text>
                  )}

                  <Text style={styles.price}>{money(service.service_price)}</Text>

                  <View style={styles.row}>
                    <TouchableOpacity
                      style={styles.approve}
                      onPress={() => updateStatus(reportServiceId, 'Approved')}
                    >
                      <Text style={styles.approveText}>Approve</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.decline}
                      onPress={() => updateStatus(reportServiceId, 'Declined')}
                    >
                      <Text style={styles.declineText}>Decline</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}

          <View style={styles.summary}>
            <Text style={styles.summaryTitle}>Pricing Summary</Text>

            <View style={styles.summaryRow}>
              <Text>Approved Recommended Services</Text>
              <Text>{money(subtotal)}</Text>
            </View>

            <View style={styles.summaryRow}>
              <Text>Tax / Fees</Text>
              <Text>{money(tax)}</Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.summaryRow}>
              <Text style={styles.totalLabel}>Total to Approve</Text>
              <Text style={styles.total}>{money(total)}</Text>
            </View>
          </View>

          {approvedServices.length > 0 && (
            <TouchableOpacity style={styles.confirmBtn} onPress={confirmWork}>
              <Text style={styles.confirmText}>Confirm & Start Work</Text>
            </TouchableOpacity>
          )}
        </>
      )}

      {isDiagnosticConfirmed && (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>Estimate already confirmed</Text>
          <Text style={styles.emptyText}>
            The recommended services have already been reviewed and confirmed.
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

function getBadgeStyle(status) {
  if (status === 'Approved') return styles.badgeApproved;
  if (status === 'Declined') return styles.badgeDeclined;
  return styles.badgePending;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F4F8' },
  content: { padding: 16, paddingBottom: 32 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  title: { fontSize: 24, fontWeight: '800', color: '#0B1A31' },

  sectionTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#0B1A31',
    marginTop: 14,
    marginBottom: 10,
  },

  debugCard: {
    backgroundColor: '#FEF3C7',
    borderColor: '#F59E0B',
    borderWidth: 1,
    padding: 12,
    borderRadius: 12,
    marginBottom: 10,
  },
  debugTitle: {
    fontWeight: '900',
    color: '#92400E',
    marginBottom: 4,
  },
  debugText: {
    color: '#92400E',
    fontSize: 12,
    lineHeight: 18,
  },

  infoCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 10,
  },
  infoTitle: {
    fontWeight: '900',
    color: '#0B1A31',
    marginBottom: 8,
  },
  infoText: {
    color: '#475569',
    lineHeight: 20,
    marginTop: 4,
  },

  listCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
  },
  bookedRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  bookedIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  bookedTextWrap: { flex: 1 },
  bookedTitle: {
    fontWeight: '800',
    color: '#0B1A31',
    fontSize: 14,
  },
  bookedDesc: {
    color: '#64748B',
    fontSize: 12,
    marginTop: 3,
  },
  bookedMeta: {
    color: '#64748B',
    fontSize: 12,
    marginTop: 4,
    fontWeight: '700',
  },
  bookedPrice: {
    fontWeight: '900',
    color: '#0B1A31',
  },
  bookedTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 14,
    backgroundColor: '#F8FAFC',
  },
  bookedTotalLabel: { fontWeight: '800', color: '#475569' },
  bookedTotalValue: { fontWeight: '900', color: '#0B1A31' },

  card: {
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  serviceTitle: { flex: 1, fontWeight: '800', color: '#0B1A31', fontSize: 15 },
  parentService: {
    marginTop: 6,
    color: '#2563EB',
    fontSize: 12,
    fontWeight: '800',
  },
  desc: { fontSize: 13, marginVertical: 8, color: '#475569', lineHeight: 19 },
  duration: { fontSize: 12, color: '#64748B', fontWeight: '700' },
  price: { fontWeight: '800', marginTop: 2, color: '#0B1A31', fontSize: 17 },

  badge: {
    overflow: 'hidden',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    fontSize: 11,
    fontWeight: '800',
  },
  badgePending: { backgroundColor: '#E2E8F0', color: '#334155' },
  badgeApproved: { backgroundColor: '#DCFCE7', color: '#15803D' },
  badgeDeclined: { backgroundColor: '#FEE2E2', color: '#B91C1C' },

  row: { flexDirection: 'row', marginTop: 12, gap: 10 },
  approve: {
    flex: 1,
    backgroundColor: '#0B1A31',
    padding: 11,
    borderRadius: 10,
    alignItems: 'center',
  },
  approveText: { color: '#fff', fontWeight: '800' },

  decline: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    padding: 11,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  declineText: { color: '#334155', fontWeight: '800' },

  summary: {
    marginTop: 14,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  summaryTitle: {
    fontWeight: '800',
    marginBottom: 10,
    color: '#0B1A31',
    textTransform: 'uppercase',
    fontSize: 12,
    letterSpacing: 1,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 4,
    gap: 10,
  },
  divider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 10,
  },
  totalLabel: { fontWeight: '800', fontSize: 16 },
  total: { fontWeight: '900', fontSize: 18, color: '#0B1A31' },

  confirmBtn: {
    backgroundColor: '#0B1A31',
    padding: 15,
    marginTop: 16,
    borderRadius: 12,
  },
  confirmText: { color: '#fff', textAlign: 'center', fontWeight: '800' },

  emptyCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 10,
  },
  emptyTitle: { fontWeight: '800', color: '#0B1A31', marginBottom: 6 },
  emptyText: { color: '#64748B', lineHeight: 20 },

  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 10, color: '#64748B' },
});