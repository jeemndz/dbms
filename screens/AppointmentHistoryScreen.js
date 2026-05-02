import { useEffect, useMemo, useState, useCallback } from 'react';
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { styles } from '../styles';
import { fetchAppointmentHistory } from '../services/appointmenthistoryApi';

const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  const date = new Date(`${dateString}T00:00:00`);
  if (Number.isNaN(date.getTime())) return 'N/A';
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  }).toUpperCase();
};

const formatTime = (timeString) => {
  if (!timeString) return 'N/A';
  const [hour, minute] = String(timeString).split(':');
  const date = new Date();
  date.setHours(Number(hour || 0), Number(minute || 0), 0, 0);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
};

const peso = (value) => `₱${Number(value || 0).toFixed(2)}`;

const getServiceIcon = (serviceName) => {
  const lowerName = (serviceName || '').toLowerCase();
  if (lowerName.includes('oil') || lowerName.includes('change')) return 'water-outline';
  if (lowerName.includes('tire') || lowerName.includes('rotation')) return 'settings-outline';
  if (lowerName.includes('inspection') || lowerName.includes('diagnostic')) return 'checkmark-circle-outline';
  if (lowerName.includes('brake')) return 'alert-circle-outline';
  if (lowerName.includes('battery')) return 'flash-outline';
  if (lowerName.includes('filter')) return 'funnel-outline';
  return 'wrench-outline';
};

const getStatusBadgeColor = (status) => {
  const lowerStatus = (status || '').toLowerCase();
  if (lowerStatus === 'completed') return '#10B981';
  if (lowerStatus === 'cancelled') return '#EF4444';
  return '#6B7280';
};

const getServiceStatusColor = (status) => {
  const lowerStatus = (status || '').toLowerCase();
  if (lowerStatus === 'completed') return '#10B981';
  if (lowerStatus === 'cancelled') return '#EF4444';
  if (lowerStatus === 'in progress') return '#3B82F6';
  if (lowerStatus === 'paused') return '#F59E0B';
  return '#64748B';
};

const getVehicleDisplay = (item) =>
  item?.vehicle ||
  item?.vehicle_display ||
  [
    item?.year_model,
    item?.brand,
    item?.model,
    item?.plate_number ? `(${item.plate_number})` : '',
  ].filter(Boolean).join(' ') ||
  `Vehicle #${item?.vehicle_id || 'N/A'}`;

const getAppointmentTotal = (item) =>
  Number(item?.total_amount || 0) > 0 ? item.total_amount : item?.services_total;

const normalizeAppointment = (apt) => {
  const services = (Array.isArray(apt.services) ? apt.services : [])
    .filter(service => 
        String(service.service_status || '').toLowerCase() === 'completed'
    );

  const serviceNames =
    Array.isArray(apt.service_names)
      ? apt.service_names
      : services.map((service) => service.service_name).filter(Boolean);

  const serviceTotal =
    services.length > 0
      ? services.reduce((sum, service) => sum + Number(service.service_price || service.price || 0), 0)
      : Number(apt.services_total || apt.total_amount || 0);

  return {
    ...apt,
    appointment_status: apt.appointment_status || apt.status,
    service_names: serviceNames,
    services,
    services_total: serviceTotal,
  };
};

function AppointmentCard({ item, onViewDetails }) {
  const vehicleDisplay = getVehicleDisplay(item);

  const status = item.appointment_status || item.status || 'N/A';
  const statusColor = getStatusBadgeColor(status);
  const serviceList = item.service_names || [];
  const mainService = serviceList[0] || 'Service';
  const otherServicesCount = Math.max(serviceList.length - 1, 0);
  const displayTotal = Number(item.total_amount || 0) > 0 ? item.total_amount : item.services_total;

  return (
    <View style={appointmentHistoryStyles.card}>
      <View style={appointmentHistoryStyles.cardTopRow}>
        <View style={appointmentHistoryStyles.cardHeadLeft}>
          <Text style={appointmentHistoryStyles.cardDate}>
            {formatDate(item.appointment_date)} • {formatTime(item.appointment_time)}
          </Text>

          <Text style={appointmentHistoryStyles.cardVehicle}>{vehicleDisplay}</Text>

          <View style={appointmentHistoryStyles.serviceRow}>
            <Ionicons name={getServiceIcon(mainService)} size={16} color="#8FA0B8" />
            <Text style={appointmentHistoryStyles.cardService} numberOfLines={1}>
              {mainService}
              {otherServicesCount > 0 ? ` +${otherServicesCount} more` : ''}
            </Text>
          </View>
        </View>

        <View style={appointmentHistoryStyles.cardHeadRight}>
          <View style={[appointmentHistoryStyles.statusPill, { backgroundColor: statusColor }]}>
            <Text style={appointmentHistoryStyles.statusPillText}>{String(status).toUpperCase()}</Text>
          </View>
        </View>
      </View>

      {serviceList.length > 1 && (
        <View style={appointmentHistoryStyles.servicesWrap}>
          {serviceList.slice(0, 3).map((name, index) => (
            <View key={`${name}-${index}`} style={appointmentHistoryStyles.serviceChip}>
              <Text style={appointmentHistoryStyles.serviceChipText}>{name}</Text>
            </View>
          ))}
          {serviceList.length > 3 && (
            <View style={appointmentHistoryStyles.serviceChip}>
              <Text style={appointmentHistoryStyles.serviceChipText}>+{serviceList.length - 3}</Text>
            </View>
          )}
        </View>
      )}

      <View style={appointmentHistoryStyles.cardDivider} />

      <View style={appointmentHistoryStyles.cardBottomRow}>
        <View style={appointmentHistoryStyles.amountWrap}>
          <Text style={appointmentHistoryStyles.amountLabel}>
            {String(status).toLowerCase() === 'cancelled' ? 'ESTIMATED TOTAL' : 'TOTAL AMOUNT'}
          </Text>
          <Text style={appointmentHistoryStyles.amountValue}>{peso(displayTotal)}</Text>
        </View>

        <TouchableOpacity
          style={appointmentHistoryStyles.detailsButton}
          onPress={onViewDetails}
          activeOpacity={0.85}
        >
          <Text style={appointmentHistoryStyles.detailsButtonText}>View Details</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}


function InfoTile({ icon, label, value }) {
  return (
    <View style={appointmentHistoryStyles.infoTile}>
      <View style={appointmentHistoryStyles.infoIconWrap}>
        <Ionicons name={icon} size={18} color="#0F1F3A" />
      </View>
      <View style={appointmentHistoryStyles.infoTextWrap}>
        <Text style={appointmentHistoryStyles.infoLabel}>{label}</Text>
        <Text style={appointmentHistoryStyles.infoValue} numberOfLines={2}>
          {value || 'N/A'}
        </Text>
      </View>
    </View>
  );
}

function AppointmentDetailsModal({ visible, appointment, onClose }) {
  if (!appointment) return null;

  const status = appointment.appointment_status || appointment.status || 'N/A';
  const statusColor = getStatusBadgeColor(status);
  const vehicleDisplay = getVehicleDisplay(appointment);
  const services = Array.isArray(appointment.services) ? appointment.services : [];
  const serviceNames = Array.isArray(appointment.service_names) ? appointment.service_names : [];
  const totalAmount = getAppointmentTotal(appointment);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={appointmentHistoryStyles.modalOverlay}>
        <View style={appointmentHistoryStyles.modalSheet}>
          <View style={appointmentHistoryStyles.modalHandle} />

          <View style={appointmentHistoryStyles.modalHeader}>
            <View>
              <Text style={appointmentHistoryStyles.modalEyebrow}>APPOINTMENT DETAILS</Text>
              <Text style={appointmentHistoryStyles.modalTitle}>Service Summary</Text>
            </View>

            <TouchableOpacity
              style={appointmentHistoryStyles.modalCloseButton}
              onPress={onClose}
              activeOpacity={0.85}
            >
              <Ionicons name="close" size={22} color="#0F172A" />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={appointmentHistoryStyles.modalScrollContent}
          >
            <View style={appointmentHistoryStyles.heroCard}>
              <View style={appointmentHistoryStyles.heroTopRow}>
                <View style={appointmentHistoryStyles.heroIcon}>
                  <Ionicons name="car-sport-outline" size={28} color="#FFFFFF" />
                </View>

                <View style={[appointmentHistoryStyles.modalStatusPill, { backgroundColor: statusColor }]}>
                  <Text style={appointmentHistoryStyles.modalStatusText}>{String(status).toUpperCase()}</Text>
                </View>
              </View>

              <Text style={appointmentHistoryStyles.heroVehicle}>{vehicleDisplay}</Text>

              <View style={appointmentHistoryStyles.heroMetaRow}>
                <Ionicons name="calendar-outline" size={15} color="#CBD5E1" />
                <Text style={appointmentHistoryStyles.heroMetaText}>
                  {formatDate(appointment.appointment_date)} • {formatTime(appointment.appointment_time)}
                </Text>
              </View>
            </View>

            <View style={appointmentHistoryStyles.detailsGrid}>
              <InfoTile icon="receipt-outline" label="Appointment ID" value={`#${appointment.appointment_id}`} />
              <InfoTile icon="construct-outline" label="Repair Job ID" value={appointment.repair_job_id ? `#${appointment.repair_job_id}` : 'N/A'} />
              <InfoTile icon="color-palette-outline" label="Color" value={appointment.color || 'N/A'} />
              <InfoTile icon="pricetag-outline" label="Plate Number" value={appointment.plate_number || 'N/A'} />
            </View>

            <View style={appointmentHistoryStyles.modalSection}>
              <View style={appointmentHistoryStyles.sectionHeaderRow}>
                <Text style={appointmentHistoryStyles.sectionTitle}>Services Used</Text>
                <Text style={appointmentHistoryStyles.sectionCount}>
                 {services.length} item{(services.length || serviceNames.length) !== 1 ? 's' : ''}
                </Text>
              </View>

              {services.length > 0 ? (
                services.map((service, index) => {
                  const serviceStatus = service.service_status || 'N/A';
                  const serviceStatusColor = getServiceStatusColor(serviceStatus);

                  return (
                    <View
                      key={`${service.repair_job_service_id || service.service_id || index}`}
                      style={appointmentHistoryStyles.serviceDetailCard}
                    >
                      <View style={appointmentHistoryStyles.serviceDetailIcon}>
                        <Ionicons name={getServiceIcon(service.service_name)} size={18} color="#0F1F3A" />
                      </View>

                      <View style={appointmentHistoryStyles.serviceDetailBody}>
                        <Text style={appointmentHistoryStyles.serviceDetailName}>
                          {service.service_name || `Service #${service.service_id || index + 1}`}
                        </Text>

                        <View style={appointmentHistoryStyles.serviceMetaRow}>
                          {!!service.category && (
                            <Text style={appointmentHistoryStyles.serviceMetaText}>{service.category}</Text>
                          )}

                          {!!service.technician_name && (
                            <Text style={appointmentHistoryStyles.serviceMetaText}>
                              • {service.technician_name}
                            </Text>
                          )}
                        </View>

                        {!!service.remarks && (
                          <Text style={appointmentHistoryStyles.serviceRemarks}>{service.remarks}</Text>
                        )}

                        <View style={appointmentHistoryStyles.serviceFooterRow}>
                          <View style={[appointmentHistoryStyles.serviceStatusMiniPill, { backgroundColor: serviceStatusColor }]}>
                            <Text style={appointmentHistoryStyles.serviceStatusMiniText}>
                              {String(serviceStatus).toUpperCase()}
                            </Text>
                          </View>

                          <Text style={appointmentHistoryStyles.servicePrice}>
                            {peso(service.service_price || service.price)}
                          </Text>
                        </View>
                      </View>
                    </View>
                  );
                })
              ) : serviceNames.length > 0 ? (
                serviceNames.map((name, index) => (
                  <View key={`${name}-${index}`} style={appointmentHistoryStyles.serviceDetailCard}>
                    <View style={appointmentHistoryStyles.serviceDetailIcon}>
                      <Ionicons name={getServiceIcon(name)} size={18} color="#0F1F3A" />
                    </View>
                    <View style={appointmentHistoryStyles.serviceDetailBody}>
                      <Text style={appointmentHistoryStyles.serviceDetailName}>{name}</Text>
                    </View>
                  </View>
                ))
              ) : (
                <View style={appointmentHistoryStyles.emptyServiceBox}>
                  <Ionicons name="document-text-outline" size={30} color="#CBD5E1" />
                  <Text style={appointmentHistoryStyles.emptyServiceText}>No services listed for this appointment.</Text>
                </View>
              )}
            </View>

            {!!appointment.notes && (
              <View style={appointmentHistoryStyles.modalSection}>
                <Text style={appointmentHistoryStyles.sectionTitle}>Customer Notes</Text>
                <View style={appointmentHistoryStyles.notesBox}>
                  <Text style={appointmentHistoryStyles.notesText}>{appointment.notes}</Text>
                </View>
              </View>
            )}

            <View style={appointmentHistoryStyles.totalCard}>
              <View>
                <Text style={appointmentHistoryStyles.totalLabel}>
                  {String(status).toLowerCase() === 'cancelled' ? 'Estimated Total' : 'Total Amount'}
                </Text>
                <Text style={appointmentHistoryStyles.totalSubLabel}>
                  Based on selected services
                </Text>
              </View>

              <Text style={appointmentHistoryStyles.totalValue}>{peso(totalAmount)}</Text>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}


export default function AppointmentHistoryScreen({
  currentUser,
  activeTab = 'history',
  onSelectTab,
  onViewAppointmentDetails,
}) {
  const [appointments, setAppointments] = useState([]);
  const [filteredAppointments, setFilteredAppointments] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [searchText, setSearchText] = useState('');
  const [filterTab, setFilterTab] = useState('All');
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [detailsVisible, setDetailsVisible] = useState(false);

  const tenantID = Number(
    currentUser?.tenantID ??
    currentUser?.tenantId ??
    currentUser?.tenant_id ??
    currentUser?.tenantid ??
    currentUser?.TenantID ??
    currentUser?.tenant ??
    0
  );

  const user_id = Number(currentUser?.user_id ?? currentUser?.userId ?? currentUser?.id ?? 0);

  const filterAppointments = useCallback((list, search, tab) => {
    let filtered = Array.isArray(list) ? list : [];

    if (tab !== 'All') {
      const tabLower = tab.toLowerCase();

      filtered = filtered.filter((apt) => {
        const status = String(apt.appointment_status || apt.status || '').toLowerCase();

        if (tabLower === 'completed' || tabLower === 'cancelled') {
          return status === tabLower;
        }

        const services = (apt.service_names || []).join(' ').toLowerCase();
        return services.includes(tabLower);
      });
    }

    if (search.trim()) {
      const searchLower = search.toLowerCase();

      filtered = filtered.filter((apt) => {
        const vehicle = String(
          apt.vehicle ||
          apt.vehicle_display ||
          [apt.brand, apt.model, apt.plate_number].filter(Boolean).join(' ')
        ).toLowerCase();

        const services = (apt.service_names || []).join(' ').toLowerCase();
        const date = formatDate(apt.appointment_date).toLowerCase();
        const time = formatTime(apt.appointment_time).toLowerCase();
        const status = String(apt.appointment_status || apt.status || '').toLowerCase();

        return (
          vehicle.includes(searchLower) ||
          services.includes(searchLower) ||
          date.includes(searchLower) ||
          time.includes(searchLower) ||
          status.includes(searchLower)
        );
      });
    }

    setFilteredAppointments(filtered);
  }, []);

  const loadAppointments = useCallback(async () => {
    try {
      setError(null);

      if (!tenantID || !user_id) {
        throw new Error('Missing tenant or user account information.');
      }

      const data = await fetchAppointmentHistory({
        tenantID,
        user_id,
      });

      const appointmentsList = Array.isArray(data) ? data.map(normalizeAppointment) : [];

      setAppointments(appointmentsList);
      filterAppointments(appointmentsList, searchText, filterTab);
    } catch (err) {
      setError(err.message || 'Failed to load appointment history');
      console.log('Error loading appointment history:', err);
    }
  }, [tenantID, user_id, filterAppointments, searchText, filterTab]);

  useEffect(() => {
    setIsLoading(true);
    loadAppointments().finally(() => setIsLoading(false));
  }, [loadAppointments]);

  const handleSearch = useCallback((text) => {
    setSearchText(text);
    filterAppointments(appointments, text, filterTab);
  }, [appointments, filterTab, filterAppointments]);

  const handleFilterTab = useCallback((tab) => {
    setFilterTab(tab);
    filterAppointments(appointments, searchText, tab);
  }, [appointments, searchText, filterAppointments]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadAppointments();
    setIsRefreshing(false);
  }, [loadAppointments]);

  const handleOpenDetails = useCallback((appointment) => {
    setSelectedAppointment(appointment);
    setDetailsVisible(true);
  }, []);

  const handleCloseDetails = useCallback(() => {
    setDetailsVisible(false);
    setSelectedAppointment(null);
  }, []);

  const isTabActive = (tab) => activeTab === tab;

  const completedCount = useMemo(
    () => appointments.filter((apt) => String(apt.appointment_status || apt.status).toLowerCase() === 'completed').length,
    [appointments]
  );

  const cancelledCount = useMemo(
    () => appointments.filter((apt) => String(apt.appointment_status || apt.status).toLowerCase() === 'cancelled').length,
    [appointments]
  );

  return (
    <View style={appointmentHistoryStyles.container}>
      <ScrollView
        contentContainerStyle={appointmentHistoryStyles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />}
      >
        <View style={appointmentHistoryStyles.headerRow}>
          <TouchableOpacity style={appointmentHistoryStyles.iconButton} activeOpacity={0.85}>
            <Ionicons name="menu-outline" size={28} color="#111827" />
          </TouchableOpacity>

          <Text style={appointmentHistoryStyles.headerTitle}>History</Text>

          <TouchableOpacity style={appointmentHistoryStyles.iconButton} activeOpacity={0.85} />
        </View>

        <View style={appointmentHistoryStyles.descriptionWrapper}>
          <Text style={appointmentHistoryStyles.descriptionTitle}>Appointment History</Text>
          <Text style={appointmentHistoryStyles.descriptionText}>
            View your completed and cancelled appointments, including the services used.
          </Text>
        </View>

        <View style={appointmentHistoryStyles.summaryRow}>
          <View style={appointmentHistoryStyles.summaryBox}>
            <Text style={appointmentHistoryStyles.summaryValue}>{completedCount}</Text>
            <Text style={appointmentHistoryStyles.summaryLabel}>Completed</Text>
          </View>

          <View style={appointmentHistoryStyles.summaryBox}>
            <Text style={appointmentHistoryStyles.summaryValue}>{cancelledCount}</Text>
            <Text style={appointmentHistoryStyles.summaryLabel}>Cancelled</Text>
          </View>
        </View>

        <View style={appointmentHistoryStyles.searchRow}>
          <View style={appointmentHistoryStyles.searchInputWrap}>
            <Ionicons name="search-outline" size={20} color="#9AA8BA" />
            <TextInput
              style={appointmentHistoryStyles.searchInput}
              placeholder="Search service, vehicle, date, or status..."
              placeholderTextColor="#6E7D92"
              value={searchText}
              onChangeText={handleSearch}
            />
          </View>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={appointmentHistoryStyles.filterTabsRow}
        >
          {['All', 'Completed', 'Cancelled', 'Maintenance', 'Diagnostics', 'Brakes', 'Engine'].map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[
                appointmentHistoryStyles.filterTab,
                filterTab === tab && appointmentHistoryStyles.filterTabActive,
              ]}
              onPress={() => handleFilterTab(tab)}
              activeOpacity={0.85}
            >
              <Text
                style={[
                  appointmentHistoryStyles.filterTabText,
                  filterTab === tab && appointmentHistoryStyles.filterTabTextActive,
                ]}
              >
                {tab}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {isLoading ? (
          <View style={appointmentHistoryStyles.centerContent}>
            <ActivityIndicator size="large" color="#0F1F3A" />
          </View>
        ) : error ? (
          <View style={appointmentHistoryStyles.centerContent}>
            <Text style={appointmentHistoryStyles.errorText}>{error}</Text>
            <TouchableOpacity
              style={appointmentHistoryStyles.retryButton}
              onPress={handleRefresh}
              activeOpacity={0.85}
            >
              <Text style={appointmentHistoryStyles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : filteredAppointments.length === 0 ? (
          <View style={appointmentHistoryStyles.centerContent}>
            <Ionicons name="calendar-clear-outline" size={64} color="#CBD5E1" />
            <Text style={appointmentHistoryStyles.emptyText}>No appointments found</Text>
            <Text style={appointmentHistoryStyles.emptySubtext}>
              {searchText ? 'Try a different search' : 'Completed and cancelled appointments will appear here.'}
            </Text>
          </View>
        ) : (
          <>
            <View style={appointmentHistoryStyles.resultCount}>
              <Text style={appointmentHistoryStyles.resultCountText}>
                {filteredAppointments.length} appointment{filteredAppointments.length !== 1 ? 's' : ''}
              </Text>
            </View>

            {filteredAppointments.map((appointment) => (
              <AppointmentCard
                key={appointment.appointment_id}
                item={appointment}
                onViewDetails={() => {
                  if (onViewAppointmentDetails) {
                    onViewAppointmentDetails(appointment);
                  } else {
                    handleOpenDetails(appointment);
                  }
                }}
              />
            ))}
          </>
        )}

        <View style={{ height: 80 }} />
      </ScrollView>

      <AppointmentDetailsModal
        visible={detailsVisible}
        appointment={selectedAppointment}
        onClose={handleCloseDetails}
      />

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
            <Ionicons name="time-outline" size={22} color={isTabActive('history') ? '#0F172A' : '#94A3B8'} />
            <Text style={[styles.navLabel, isTabActive('history') && styles.navLabelActive]}>History</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.navItem, isTabActive('payments') && styles.navItemSelected]}
            onPress={() => onSelectTab && onSelectTab('payments')}
          >
            <Ionicons name="card-outline" size={22} color={isTabActive('payments') ? '#0F172A' : '#94A3B8'} />
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

const appointmentHistoryStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F6FA',
  },
  scrollContent: {
    paddingTop: 8,
    paddingHorizontal: 22,
    paddingBottom: 20,
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
  descriptionWrapper: {
    marginBottom: 14,
  },
  descriptionTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#0F1F3A',
    marginBottom: 6,
  },
  descriptionText: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 20,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  summaryBox: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: '900',
    color: '#0F1F3A',
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    marginTop: 2,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  searchInputWrap: {
    flex: 1,
    minHeight: 50,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    color: '#0F1F3A',
    fontSize: 14,
  },
  filterTabsRow: {
    flexDirection: 'row',
    gap: 10,
    paddingBottom: 20,
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterTabActive: {
    backgroundColor: '#0F1F3A',
    borderColor: '#0F1F3A',
  },
  filterTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  filterTabTextActive: {
    color: '#FFFFFF',
  },
  centerContent: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 300,
    paddingHorizontal: 20,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F1F3A',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
  },
  errorText: {
    fontSize: 14,
    color: '#EF4444',
    marginBottom: 16,
    textAlign: 'center',
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#0F1F3A',
    marginTop: 12,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  resultCount: {
    marginBottom: 12,
  },
  resultCountText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardHeadLeft: {
    flex: 1,
    marginRight: 12,
  },
  cardHeadRight: {
    alignItems: 'flex-end',
  },
  cardDate: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
    marginBottom: 4,
  },
  cardVehicle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F1F3A',
    marginBottom: 8,
  },
  serviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cardService: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    color: '#64748B',
  },
  servicesWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  serviceChip: {
    backgroundColor: '#F1F5F9',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  serviceChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  statusPill: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  statusPillText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 12,
  },
  cardBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  amountWrap: {
    flex: 1,
  },
  amountLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94A3B8',
    marginBottom: 2,
  },
  amountValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F1F3A',
  },
  detailsButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#F0F4F8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailsButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F1F3A',
    textDecorationLine: 'underline',
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    maxHeight: '92%',
    backgroundColor: '#F8FAFC',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingTop: 10,
    overflow: 'hidden',
  },
  modalHandle: {
    width: 46,
    height: 5,
    borderRadius: 999,
    backgroundColor: '#CBD5E1',
    alignSelf: 'center',
    marginBottom: 12,
  },
  modalHeader: {
    paddingHorizontal: 22,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalEyebrow: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 1,
    marginBottom: 4,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#0F172A',
  },
  modalCloseButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  modalScrollContent: {
    paddingHorizontal: 22,
    paddingBottom: 34,
  },
  heroCard: {
    backgroundColor: '#0F1F3A',
    borderRadius: 24,
    padding: 18,
    marginBottom: 16,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  heroIcon: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalStatusPill: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  modalStatusText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  heroVehicle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: 10,
  },
  heroMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  heroMetaText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#CBD5E1',
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 18,
  },
  infoTile: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 13,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  infoIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 13,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoTextWrap: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94A3B8',
    marginBottom: 3,
    textTransform: 'uppercase',
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalSection: {
    marginBottom: 18,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 10,
  },
  sectionCount: {
    fontSize: 12,
    fontWeight: '800',
    color: '#64748B',
    marginBottom: 10,
  },
  serviceDetailCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    gap: 12,
  },
  serviceDetailIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  serviceDetailBody: {
    flex: 1,
  },
  serviceDetailName: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 4,
  },
  serviceMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 6,
  },
  serviceMetaText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  serviceRemarks: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 18,
    marginBottom: 8,
  },
  serviceFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  serviceStatusMiniPill: {
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  serviceStatusMiniText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  servicePrice: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0F172A',
  },
  emptyServiceBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyServiceText: {
    marginTop: 8,
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
    textAlign: 'center',
  },
  notesBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  notesText: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 20,
  },
  totalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  totalLabel: {
    fontSize: 13,
    fontWeight: '900',
    color: '#64748B',
    textTransform: 'uppercase',
  },
  totalSubLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
    marginTop: 3,
  },
  totalValue: {
    fontSize: 24,
    fontWeight: '900',
    color: '#0F1F3A',
  },

});
