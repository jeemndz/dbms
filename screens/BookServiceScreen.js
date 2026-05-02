import React, { useMemo, useState, useEffect } from 'react';
import { Alert, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { styles } from '../styles.js';
import { fetchServices } from '../services/serviceApi';
import { fetchVehiclesByUser } from '../services/vehicleApi';
import { createAppointment } from '../services/appointmentApi';
import { fetchPendingPayments } from '../services/paymentApi';

const weekDays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

const addMonths = (date, monthsToAdd) =>
  new Date(date.getFullYear(), date.getMonth() + monthsToAdd, 1);

const isSameDay = (leftDate, rightDate) =>
  leftDate.getFullYear() === rightDate.getFullYear() &&
  leftDate.getMonth() === rightDate.getMonth() &&
  leftDate.getDate() === rightDate.getDate();

const startOfDay = (date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate());

const isPastDate = (date, today) => startOfDay(date) < startOfDay(today);

const getCalendarCells = (visibleMonth) => {
  const year = visibleMonth.getFullYear();
  const month = visibleMonth.getMonth();
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInCurrentMonth = new Date(year, month + 1, 0).getDate();
  const daysInPreviousMonth = new Date(year, month, 0).getDate();

  const cells = [];

  for (let index = firstDayOfMonth - 1; index >= 0; index -= 1) {
    cells.push({
      date: new Date(year, month - 1, daysInPreviousMonth - index),
      isCurrentMonth: false,
    });
  }

  for (let day = 1; day <= daysInCurrentMonth; day += 1) {
    cells.push({
      date: new Date(year, month, day),
      isCurrentMonth: true,
    });
  }

  let nextMonthDay = 1;
  while (cells.length % 7 !== 0) {
    cells.push({
      date: new Date(year, month + 1, nextMonthDay),
      isCurrentMonth: false,
    });
    nextMonthDay += 1;
  }

  return cells;
};

const timeSlots = [
  { id: '09:00 AM', disabled: false },
  { id: '10:30 AM', disabled: false },
  { id: '01:00 PM', disabled: false },
  { id: '02:30 PM', disabled: false },
  { id: '04:00 PM', disabled: false },
  { id: '05:30 PM', disabled: true },
];

const formatVehicleForCard = (vehicle) => {
  const year = vehicle?.year_model || '';
  const brand = vehicle?.brand || '';
  const model = vehicle?.model || '';
  return `${year} ${brand} ${model}`.trim();
};

const getVehicleCardName = (vehicle, index) => {
  if (vehicle?.plate_number) {
    return vehicle.plate_number;
  }

  return `Vehicle ${index + 1}`;
};

const parsePositiveNumber = (value) => {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
};

const convertTo24HourFormat = (time12) => {
  const [time, period] = time12.split(' ');
  let [hours, minutes] = time.split(':').map(Number);

  if (period === 'PM' && hours !== 12) {
    hours += 12;
  } else if (period === 'AM' && hours === 12) {
    hours = 0;
  }

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`;
};

const hasOverduePayments = (payments) => {
  if (!Array.isArray(payments) || payments.length === 0) {
    return false;
  }

  const today = new Date(new Date().toDateString());

  return payments.some((payment) => {
    const jobStatus = String(payment?.job_status || '').trim().toLowerCase();
    const paymentStatus = String(payment?.paymentStatus || '').trim().toLowerCase();

    if (jobStatus !== 'completed' || paymentStatus !== 'pending') {
      return false;
    }

    const appointmentDate = payment.appointment_date
      ? new Date(payment.appointment_date)
      : null;

    if (!appointmentDate) {
      return false;
    }

    return appointmentDate < today;
  });
};

export default function BookServiceScreen({
  activeTab,
  tenantID,
  user_id,
  userId,
  onSelectTab,
  onLogout,
}) {
  const [services, setServices] = useState([]);
  const [servicesLoading, setServicesLoading] = useState(true);
  const [servicesError, setServicesError] = useState(null);

  const [vehicles, setVehicles] = useState([]);
  const [vehiclesLoading, setVehiclesLoading] = useState(true);
  const [vehiclesError, setVehiclesError] = useState(null);

  const [bookingSubmitting, setBookingSubmitting] = useState(false);
  const [bookingError, setBookingError] = useState(null);

  const today = useMemo(() => new Date(), []);
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedVehicleId, setSelectedVehicleId] = useState(null);

  const [bookingMode, setBookingMode] = useState(null);
  const [selectedMainServiceIds, setSelectedMainServiceIds] = useState([]);
  const [selectedSubServiceIds, setSelectedSubServiceIds] = useState([]);
  const [expandedMainServiceIds, setExpandedMainServiceIds] = useState([]);

  const [visibleMonth, setVisibleMonth] = useState(
    () => new Date(today.getFullYear(), today.getMonth(), 1)
  );
  const [selectedDate, setSelectedDate] = useState(today);
  const [selectedTime, setSelectedTime] = useState('10:30 AM');
  const [notes, setNotes] = useState('');
  const [confirmationNumber, setConfirmationNumber] = useState('RR-00000');

  const normalizedTenantID = parsePositiveNumber(tenantID);
  const resolvedUserId = user_id ?? userId;
  const normalizedUserId = parsePositiveNumber(resolvedUserId);

  useEffect(() => {
    let isMounted = true;

    setServicesLoading(true);
    setServicesError(null);

    if (!normalizedTenantID) {
      setServices([]);
      setServicesError('Missing tenant information. Please log in again.');
      setServicesLoading(false);
      return () => {
        isMounted = false;
      };
    }

    fetchServices({ tenantID: normalizedTenantID })
      .then((data) => {
        if (!isMounted) return;

        const mappedServices = Array.isArray(data)
          ? data.map((service) => ({
              id: String(service.id ?? service.service_id),
              service_id: String(service.service_id ?? service.id),
              parent_service_id:
                service.parent_service_id !== null &&
                service.parent_service_id !== undefined &&
                service.parent_service_id !== ''
                  ? String(service.parent_service_id)
                  : null,
              service_type: service.service_type || 'Main',
              title: service.service_name ?? service.title ?? 'Unnamed Service',
              description: service.description ?? '',
              price: Number(service.price || 0),
              duration_minutes: Number(service.duration_minutes || 0),
              category: service.category ?? '',
              status: service.status ?? 'Active',
            }))
          : [];

        setServices(mappedServices);
        setBookingMode(null);
        setSelectedMainServiceIds([]);
        setSelectedSubServiceIds([]);
        setExpandedMainServiceIds([]);
      })
      .catch((err) => {
        if (!isMounted) return;
        setServices([]);
        setServicesError(err?.message || 'Failed to load services.');
      })
      .finally(() => {
        if (isMounted) {
          setServicesLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [normalizedTenantID]);

  useEffect(() => {
    let isMounted = true;

    setVehiclesLoading(true);
    setVehiclesError(null);

    if (!normalizedTenantID) {
      setVehicles([]);
      setSelectedVehicleId(null);
      setVehiclesError('Missing tenant information. Please log in again.');
      setVehiclesLoading(false);
      return () => {
        isMounted = false;
      };
    }

    if (!normalizedUserId) {
      setVehicles([]);
      setSelectedVehicleId(null);
      setVehiclesError('Please log in to view your vehicles.');
      setVehiclesLoading(false);
      return () => {
        isMounted = false;
      };
    }

    fetchVehiclesByUser({
      tenantID: normalizedTenantID,
      user_id: normalizedUserId,
    })
      .then((data) => {
        if (!isMounted) return;

        const safeData = Array.isArray(data) ? data : [];

        const mappedVehicles = safeData.map((vehicle, index) => ({
          id: String(vehicle.vehicle_id),
          vehicle_id: String(vehicle.vehicle_id),
          name: getVehicleCardName(vehicle, index),
          model: formatVehicleForCard(vehicle),
          license: vehicle.plate_number || 'No plate number',
          icon: 'car-sport-outline',
          raw: vehicle,
        }));

        setVehicles(mappedVehicles);

        if (mappedVehicles.length > 0) {
          setSelectedVehicleId((prev) =>
            prev && mappedVehicles.some((vehicle) => vehicle.id === prev)
              ? prev
              : mappedVehicles[0].id
          );
          setVehiclesError(null);
        } else {
          setSelectedVehicleId(null);
          setVehiclesError('No vehicles found for this account.');
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        setVehicles([]);
        setSelectedVehicleId(null);
        setVehiclesError(err?.message || 'Failed to load vehicles.');
      })
      .finally(() => {
        if (isMounted) {
          setVehiclesLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [normalizedTenantID, normalizedUserId]);

  const isTabActive = (tab) => activeTab === tab;

  const activeServices = useMemo(
    () =>
      services.filter(
        (service) => String(service.status || '').toLowerCase() === 'active'
      ),
    [services]
  );

  const mainServices = useMemo(
    () =>
      activeServices.filter(
        (service) => String(service.service_type || '').toLowerCase() === 'main'
      ),
    [activeServices]
  );

  const diagnosticService = useMemo(
    () =>
      mainServices.find((service) => {
        const category = String(service.category || '').toLowerCase();
        const title = String(service.title || '').toLowerCase();

        return category === 'diagnostics' || title.includes('diagnostic');
      }),
    [mainServices]
  );

  const specificMainServices = useMemo(
    () =>
      mainServices.filter((service) => {
        const category = String(service.category || '').toLowerCase();
        const title = String(service.title || '').toLowerCase();

        return category !== 'diagnostics' && !title.includes('diagnostic');
      }),
    [mainServices]
  );

  const toggleExpandedMainService = (serviceId) => {
    setExpandedMainServiceIds((previousIds) => {
      if (previousIds.includes(serviceId)) {
        return previousIds.filter((id) => id !== serviceId);
      }

      return [...previousIds, serviceId];
    });
  };

  const toggleMainService = (serviceId) => {
    setSelectedMainServiceIds((previousIds) => {
      const isSelected = previousIds.includes(serviceId);

      if (isSelected) {
        setSelectedSubServiceIds((previousSubIds) =>
          previousSubIds.filter((subId) => {
            const subService = activeServices.find((service) => service.id === subId);
            return String(subService?.parent_service_id) !== String(serviceId);
          })
        );

        setExpandedMainServiceIds((previousExpandedIds) =>
          previousExpandedIds.filter((id) => id !== serviceId)
        );

        return previousIds.filter((id) => id !== serviceId);
      }

      setExpandedMainServiceIds((previousExpandedIds) =>
        previousExpandedIds.includes(serviceId)
          ? previousExpandedIds
          : [...previousExpandedIds, serviceId]
      );

      return [...previousIds, serviceId];
    });
  };

  const toggleSubService = (serviceId) => {
    setSelectedSubServiceIds((previousIds) => {
      if (previousIds.includes(serviceId)) {
        return previousIds.filter((id) => id !== serviceId);
      }

      return [...previousIds, serviceId];
    });
  };

  const total = useMemo(() => {
    if (bookingMode === 'diagnostic' && diagnosticService) {
      return diagnosticService.price || 0;
    }

    if (bookingMode === 'specific') {
      return activeServices
        .filter((service) => selectedSubServiceIds.includes(service.id))
        .reduce((runningTotal, service) => runningTotal + (service.price || 0), 0);
    }

    return 0;
  }, [bookingMode, diagnosticService, selectedSubServiceIds, activeServices]);

  const selectedVehicle = useMemo(
    () => vehicles.find((vehicle) => vehicle.id === selectedVehicleId) || null,
    [selectedVehicleId, vehicles]
  );

  const selectedServices = useMemo(() => {
    if (bookingMode === 'diagnostic' && diagnosticService) {
      return [diagnosticService];
    }

    if (bookingMode === 'specific') {
      return activeServices.filter((service) =>
        selectedSubServiceIds.includes(service.id)
      );
    }

    return [];
  }, [bookingMode, diagnosticService, selectedSubServiceIds, activeServices]);

  const canProceedStepOne =
    !vehiclesLoading &&
    !servicesLoading &&
    !!selectedVehicleId &&
    !!bookingMode &&
    !!normalizedTenantID &&
    !!normalizedUserId &&
    (bookingMode === 'diagnostic'
      ? !!diagnosticService
      : selectedMainServiceIds.length > 0 && selectedSubServiceIds.length > 0);

  const handleNextStep = () => {
    if (!normalizedTenantID || !normalizedUserId) {
      Alert.alert('Error', 'Missing account information. Please log in again.');
      return;
    }

    if (!selectedVehicleId) {
      Alert.alert('Select a Vehicle', 'Please choose a vehicle before continuing.');
      return;
    }

    if (!bookingMode) {
      Alert.alert('Select Service Type', 'Please choose Diagnostics or Specific Service.');
      return;
    }

    if (bookingMode === 'diagnostic' && !diagnosticService) {
      Alert.alert(
        'Diagnostics Not Available',
        'No active diagnostics service is available right now.'
      );
      return;
    }

    if (bookingMode === 'specific' && selectedMainServiceIds.length === 0) {
      Alert.alert('Select Main Service', 'Please choose at least one main service.');
      return;
    }

    if (bookingMode === 'specific' && selectedSubServiceIds.length === 0) {
      Alert.alert('Select Sub-Service', 'Please choose at least one sub-service.');
      return;
    }

    setCurrentStep(2);
  };

  const handleConfirmBooking = async () => {
    if (!selectedTime) {
      Alert.alert('Select a Time', 'Please choose an available time slot before confirming.');
      return;
    }

    if (!selectedVehicleId || !normalizedUserId || !normalizedTenantID) {
      Alert.alert('Error', 'Missing required booking information. Please try again.');
      return;
    }

    if (isPastDate(selectedDate, today)) {
      Alert.alert('Invalid Date', 'Please select today or a future date.');
      return;
    }

    const validSelectedServiceIds =
      bookingMode === 'diagnostic'
        ? diagnosticService
          ? [Number(diagnosticService.id)]
          : []
        : selectedSubServiceIds
            .filter((selectedId) =>
              activeServices.some((service) => service.id === selectedId)
            )
            .map((id) => Number(id));

    if (validSelectedServiceIds.length === 0) {
      Alert.alert('Select a Service', 'Please pick at least one valid service.');
      return;
    }

    try {
      const pendingPayments = await fetchPendingPayments({
        tenantID: normalizedTenantID,
        user_id: normalizedUserId,
        limit: 50,
      });

      if (hasOverduePayments(pendingPayments)) {
        Alert.alert(
          'Overdue Payments',
          'You have overdue payments. Please settle them before booking a new appointment.',
          [{ text: 'OK' }]
        );
        return;
      }
    } catch (error) {
      console.error('Error checking payments:', error);
    }

    setBookingSubmitting(true);
    setBookingError(null);

    try {
      const appointmentTime = convertTo24HourFormat(selectedTime);

      const year = selectedDate.getFullYear();
      const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const day = String(selectedDate.getDate()).padStart(2, '0');
      const appointmentDate = `${year}-${month}-${day}`;

      const payload = {
        tenantID: normalizedTenantID,
        user_id: normalizedUserId,
        vehicle_id: Number(selectedVehicleId),
        appointment_date: appointmentDate,
        appointment_time: appointmentTime,
        service_ids: validSelectedServiceIds,
        booking_type: bookingMode,
        selected_main_service_ids:
          bookingMode === 'specific'
            ? selectedMainServiceIds.map((id) => Number(id))
            : [],
        total_amount: Number(total),
        notes: String(notes || ''),
      };

      const response = await createAppointment(payload);

      setConfirmationNumber(
        response?.job_order_no ||
          response?.referenceNumber ||
          `RR-${String(response?.appointment_id || '00000').padStart(5, '0')}`
      );

      setCurrentStep(3);

      Alert.alert(
        'Appointment Submitted',
        'Your appointment has been submitted for review. You will receive confirmation once it is approved.'
      );
    } catch (error) {
      const errorMsg = error?.message || 'Failed to create booking. Please try again.';
      setBookingError(errorMsg);
      Alert.alert('Booking Error', errorMsg);
    } finally {
      setBookingSubmitting(false);
    }
  };

  const selectedCount = selectedServices.length;
  const selectedLabel = `${selectedCount} Service${selectedCount === 1 ? '' : 's'} Selected`;

  const monthLabel = visibleMonth.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  const calendarCells = useMemo(() => getCalendarCells(visibleMonth), [visibleMonth]);

  const selectedDateLabel = selectedDate.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const handleHeaderBack = () => {
    if (currentStep > 1) {
      setCurrentStep((previousStep) => previousStep - 1);
      return;
    }

    if (onSelectTab) {
      onSelectTab('home');
    }
  };

  const handlePreviousMonth = () => {
    setVisibleMonth((previousMonth) => addMonths(previousMonth, -1));
  };

  const handleNextMonth = () => {
    setVisibleMonth((previousMonth) => addMonths(previousMonth, 1));
  };

  const handleSelectDate = (date) => {
    if (isPastDate(date, today)) {
      Alert.alert('Invalid Date', 'Please select today or a future date.');
      return;
    }

    setSelectedDate(date);
    setVisibleMonth(new Date(date.getFullYear(), date.getMonth(), 1));
  };

  const renderStepOne = () => (
    <>
      <View style={styles.bookServiceStepRowStepTwo}>
        <Text style={styles.bookServiceStepText}>STEP 1 OF 3</Text>
      </View>

      <Text style={styles.bookServiceStepTitleCompact}>Select Service</Text>

      <View style={styles.bookServiceProgressSegmentsRow}>
        <View style={[styles.bookServiceProgressSegment, styles.bookServiceProgressSegmentActive]} />
        <View style={styles.bookServiceProgressSegment} />
        <View style={styles.bookServiceProgressSegment} />
      </View>

      <View style={styles.bookServiceSectionHeader}>
        <Text style={styles.bookServiceSectionTitle}>Select Vehicle</Text>
        <TouchableOpacity
          onPress={() => onSelectTab && onSelectTab('profile')}
          activeOpacity={0.85}
        >
          <Text style={styles.bookServiceAddNew}>ADD NEW</Text>
        </TouchableOpacity>
      </View>

      {vehiclesLoading ? (
        <Text style={{ marginVertical: 12, color: '#64748B' }}>Loading vehicles...</Text>
      ) : vehiclesError ? (
        <Text style={{ marginVertical: 12, color: 'red' }}>{vehiclesError}</Text>
      ) : vehicles.length === 0 ? (
        <View style={{ marginVertical: 12 }}>
          <Text style={{ color: '#64748B', marginBottom: 10 }}>No vehicles found.</Text>
          <TouchableOpacity
            onPress={() => onSelectTab && onSelectTab('profile')}
            activeOpacity={0.85}
          >
            <Text style={{ color: '#0F1F3A', fontWeight: '700' }}>
              Go to profile and add a vehicle
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.bookServiceVehicleList}
        >
          {vehicles.map((vehicle) => {
            const isSelected = vehicle.id === selectedVehicleId;

            return (
              <TouchableOpacity
                key={vehicle.id}
                style={[
                  styles.bookServiceVehicleCard,
                  isSelected && styles.bookServiceVehicleCardSelected,
                ]}
                onPress={() => setSelectedVehicleId(vehicle.id)}
                activeOpacity={0.9}
              >
                <View style={styles.bookServiceVehicleTopRow}>
                  <View style={styles.bookServiceVehicleIconWrap}>
                    <Ionicons name={vehicle.icon} size={21} color="#334155" />
                  </View>
                  {isSelected ? (
                    <View style={styles.bookServiceVehicleCheck}>
                      <Ionicons name="checkmark" size={15} color="#FFFFFF" />
                    </View>
                  ) : null}
                </View>

                <Text style={styles.bookServiceVehicleName}>{vehicle.name}</Text>
                <Text style={styles.bookServiceVehicleModel}>{vehicle.model}</Text>
                <Text style={styles.bookServiceVehicleLicense}>License: {vehicle.license}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      <View style={styles.bookServiceCalendarCard}>
        <View style={styles.bookServiceSectionHeader}>
          <Text style={styles.bookServiceSectionTitle}>Choose a Service</Text>
          <Text style={styles.bookServiceAddNew}>STEP 1</Text>
        </View>

        {servicesLoading ? (
          <Text style={{ marginVertical: 12, color: '#64748B' }}>Loading services...</Text>
        ) : servicesError ? (
          <Text style={{ marginVertical: 12, color: 'red' }}>{servicesError}</Text>
        ) : activeServices.length === 0 ? (
          <Text style={{ marginVertical: 12, color: '#64748B' }}>No services available.</Text>
        ) : (
          <>
            <TouchableOpacity
              style={[
                styles.bookServiceServiceCard,
                bookingMode === 'diagnostic' && styles.bookServiceVehicleCardSelected,
              ]}
              onPress={() => {
                setBookingMode('diagnostic');
                setSelectedMainServiceIds([]);
                setSelectedSubServiceIds([]);
                setExpandedMainServiceIds([]);
              }}
              activeOpacity={0.9}
            >
              <View
                style={[
                  styles.bookServiceCheckBox,
                  bookingMode === 'diagnostic' && styles.bookServiceCheckBoxSelected,
                ]}
              >
                {bookingMode === 'diagnostic' ? (
                  <Ionicons name="checkmark" size={17} color="#FFFFFF" />
                ) : null}
              </View>

              <View style={styles.bookServiceServiceTextWrap}>
                <Text style={styles.bookServiceServiceTitle}>I don’t know the problem</Text>
                <Text style={styles.bookServiceServiceDescription}>
                  Choose Diagnostics. The mechanic will inspect your vehicle first.
                </Text>
              </View>

              <Text style={styles.bookServiceServicePrice}>
                ₱{Number(diagnosticService?.price || 0).toFixed(2)}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.bookServiceServiceCard,
                bookingMode === 'specific' && styles.bookServiceVehicleCardSelected,
              ]}
              onPress={() => {
                setBookingMode('specific');
              }}
              activeOpacity={0.9}
            >
              <View
                style={[
                  styles.bookServiceCheckBox,
                  bookingMode === 'specific' && styles.bookServiceCheckBoxSelected,
                ]}
              >
                {bookingMode === 'specific' ? (
                  <Ionicons name="checkmark" size={17} color="#FFFFFF" />
                ) : null}
              </View>

              <View style={styles.bookServiceServiceTextWrap}>
                <Text style={styles.bookServiceServiceTitle}>I know the problem</Text>
                <Text style={styles.bookServiceServiceDescription}>
                  Select one or more main services, then choose the sub-services.
                </Text>
              </View>
            </TouchableOpacity>

            {bookingMode === 'specific' ? (
              <>
                <Text style={styles.bookServiceSectionTitle}>Select Main Services</Text>

                {specificMainServices.length === 0 ? (
                  <Text style={{ marginVertical: 12, color: '#64748B' }}>
                    No main services available.
                  </Text>
                ) : (
                  specificMainServices.map((service) => {
                    const isSelected = selectedMainServiceIds.includes(service.id);
                    const isExpanded = expandedMainServiceIds.includes(service.id);

                    return (
                      <View key={service.id}>
                        <TouchableOpacity
                          style={[
                            styles.bookServiceServiceCard,
                            isSelected && styles.bookServiceVehicleCardSelected,
                          ]}
                          onPress={() => toggleMainService(service.id)}
                          activeOpacity={0.9}
                        >
                          <View
                            style={[
                              styles.bookServiceCheckBox,
                              isSelected && styles.bookServiceCheckBoxSelected,
                            ]}
                          >
                            {isSelected ? (
                              <Ionicons name="checkmark" size={17} color="#FFFFFF" />
                            ) : null}
                          </View>

                          <View style={styles.bookServiceServiceTextWrap}>
                            <Text style={styles.bookServiceServiceTitle}>{service.title}</Text>
                            <Text style={styles.bookServiceServiceDescription}>
                              {service.description || 'Select this main service.'}
                            </Text>
                          </View>

                          <TouchableOpacity
                            onPress={() => toggleExpandedMainService(service.id)}
                            activeOpacity={0.85}
                            style={{
                              paddingHorizontal: 6,
                              paddingVertical: 6,
                            }}
                          >
                            <Ionicons
                              name={isExpanded ? 'chevron-up' : 'chevron-down'}
                              size={22}
                              color="#0F1F3A"
                            />
                          </TouchableOpacity>
                        </TouchableOpacity>

                        {isSelected && isExpanded ? (
                          <View style={{ marginLeft: 12, marginBottom: 8 }}>
                            {activeServices
                              .filter(
                                (subService) =>
                                  String(subService.service_type || '').toLowerCase() === 'sub' &&
                                  String(subService.parent_service_id) === String(service.id)
                              )
                              .map((subService) => {
                                const subSelected = selectedSubServiceIds.includes(subService.id);

                                return (
                                  <TouchableOpacity
                                    key={subService.id}
                                    style={styles.bookServiceServiceCard}
                                    onPress={() => toggleSubService(subService.id)}
                                    activeOpacity={0.9}
                                  >
                                    <View
                                      style={[
                                        styles.bookServiceCheckBox,
                                        subSelected && styles.bookServiceCheckBoxSelected,
                                      ]}
                                    >
                                      {subSelected ? (
                                        <Ionicons name="checkmark" size={17} color="#FFFFFF" />
                                      ) : null}
                                    </View>

                                    <View style={styles.bookServiceServiceTextWrap}>
                                      <Text style={styles.bookServiceServiceTitle}>
                                        {subService.title}
                                      </Text>
                                      <Text style={styles.bookServiceServiceDescription}>
                                        {subService.description || 'Specific service to be performed.'}
                                      </Text>
                                    </View>

                                    <Text style={styles.bookServiceServicePrice}>
                                      ₱{Number(subService.price || 0).toFixed(2)}
                                    </Text>
                                  </TouchableOpacity>
                                );
                              })}

                            {activeServices.filter(
                              (subService) =>
                                String(subService.service_type || '').toLowerCase() === 'sub' &&
                                String(subService.parent_service_id) === String(service.id)
                            ).length === 0 ? (
                              <Text style={{ marginVertical: 8, color: '#64748B' }}>
                                No sub-services available under this main service.
                              </Text>
                            ) : null}
                          </View>
                        ) : null}
                      </View>
                    );
                  })
                )}
              </>
            ) : null}
          </>
        )}
      </View>

      <View style={styles.bookServiceTotalCard}>
        <View>
          <Text style={styles.bookServiceTotalLabel}>ESTIMATED TOTAL</Text>
          <Text style={styles.bookServiceTotalValue}>₱{total.toFixed(2)}</Text>
        </View>
        <View style={styles.bookServiceTotalMetaWrap}>
          <Text style={styles.bookServiceTotalMeta}>{selectedLabel}</Text>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.bookServiceNextButton, !canProceedStepOne && { opacity: 0.6 }]}
        onPress={handleNextStep}
        activeOpacity={0.9}
        disabled={!canProceedStepOne}
      >
        <Text style={styles.bookServiceNextButtonText}>Next Step</Text>
        <Ionicons
          name="arrow-forward"
          size={22}
          color="#FFFFFF"
          style={styles.bookServiceNextIcon}
        />
      </TouchableOpacity>
    </>
  );

  const renderStepTwo = () => (
    <>
      <View style={styles.bookServiceStepRowStepTwo}>
        <Text style={styles.bookServiceStepText}>STEP 2 OF 3</Text>
      </View>

      <Text style={styles.bookServiceStepTitleCompact}>Schedule Appointment</Text>

      <View style={styles.bookServiceProgressSegmentsRow}>
        <View style={[styles.bookServiceProgressSegment, styles.bookServiceProgressSegmentActive]} />
        <View style={[styles.bookServiceProgressSegment, styles.bookServiceProgressSegmentActive]} />
        <View style={styles.bookServiceProgressSegment} />
      </View>

      <View style={styles.bookServiceCalendarCard}>
        <View style={styles.bookServiceCalendarHeader}>
          <Text style={styles.bookServiceCalendarMonth}>{monthLabel}</Text>
          <View style={styles.bookServiceCalendarArrows}>
            <TouchableOpacity
              onPress={handlePreviousMonth}
              style={styles.bookServiceCalendarArrowButton}
              activeOpacity={0.85}
            >
              <Ionicons name="chevron-back" size={17} color="#0F1F3A" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleNextMonth}
              style={styles.bookServiceCalendarArrowButton}
              activeOpacity={0.85}
            >
              <Ionicons name="chevron-forward" size={17} color="#0F1F3A" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.bookServiceCalendarWeekRow}>
          {weekDays.map((dayLabel, index) => (
            <Text key={`week-${index}-${dayLabel}`} style={styles.bookServiceCalendarWeekDay}>
              {dayLabel}
            </Text>
          ))}
        </View>

        <View style={styles.bookServiceCalendarDaysGrid}>
          {calendarCells.map((cell) => {
            const isSelected = isSameDay(cell.date, selectedDate);
            const isDisabledPastDate = isPastDate(cell.date, today);
            const dayLabel = String(cell.date.getDate());

            return (
              <TouchableOpacity
                key={`day-${cell.date.toISOString()}`}
                style={[
                  styles.bookServiceCalendarCell,
                  isSelected && styles.bookServiceCalendarCellSelected,
                  isDisabledPastDate && { opacity: 0.45 },
                ]}
                onPress={() => handleSelectDate(cell.date)}
                activeOpacity={0.85}
              >
                <Text
                  style={[
                    cell.isCurrentMonth
                      ? styles.bookServiceCalendarDay
                      : styles.bookServiceCalendarDayMuted,
                    isSelected && styles.bookServiceCalendarDaySelected,
                  ]}
                >
                  {dayLabel}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View style={styles.bookServiceInfoHeader}>
        <Ionicons name="time-outline" size={22} color="#0F1F3A" />
        <Text style={styles.bookServiceInfoTitle}>Available Time Slots</Text>
      </View>

      <View style={styles.bookServiceTimeSlotsGrid}>
        {timeSlots.map((slot) => {
          const isSelected = selectedTime === slot.id;

          return (
            <TouchableOpacity
              key={slot.id}
              style={[
                styles.bookServiceTimeSlot,
                isSelected && styles.bookServiceTimeSlotSelected,
                slot.disabled && styles.bookServiceTimeSlotDisabled,
              ]}
              onPress={() => !slot.disabled && setSelectedTime(slot.id)}
              activeOpacity={0.9}
              disabled={slot.disabled}
            >
              <Text
                style={[
                  styles.bookServiceTimeSlotText,
                  isSelected && styles.bookServiceTimeSlotTextSelected,
                  slot.disabled && styles.bookServiceTimeSlotTextDisabled,
                ]}
              >
                {slot.id}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.bookServiceInfoHeader}>
        <Ionicons name="create-outline" size={22} color="#0F1F3A" />
        <Text style={styles.bookServiceInfoTitle}>Additional Notes</Text>
      </View>

      <TextInput
        style={styles.bookServiceNotesInput}
        value={notes}
        onChangeText={setNotes}
        placeholder="Describe any specific issues or concerns with your vehicle..."
        placeholderTextColor="#6A7689"
        multiline
        textAlignVertical="top"
      />

      {bookingError ? (
        <Text style={{ color: 'red', marginBottom: 12 }}>{bookingError}</Text>
      ) : null}

      <TouchableOpacity
        style={[styles.bookServiceNextButton, bookingSubmitting && { opacity: 0.6 }]}
        onPress={handleConfirmBooking}
        activeOpacity={0.9}
        disabled={bookingSubmitting}
      >
        <Text style={styles.bookServiceNextButtonText}>
          {bookingSubmitting ? 'Submitting...' : 'Confirm Booking'}
        </Text>
        {!bookingSubmitting ? (
          <Ionicons
            name="arrow-forward"
            size={22}
            color="#FFFFFF"
            style={styles.bookServiceNextIcon}
          />
        ) : null}
      </TouchableOpacity>
    </>
  );

  const renderStepThree = () => (
    <>
      <View style={styles.bookServicePendingIconOuter}>
        <View style={styles.bookServicePendingIconInner}>
          <Ionicons name="ellipsis-horizontal" size={20} color="#F8FAFC" />
        </View>
      </View>

      <Text style={styles.bookServicePendingTitle}>Booking Pending Confirmation</Text>
      <Text style={styles.bookServicePendingSubtitle}>
        The shop will review your request and confirm shortly.
      </Text>

      <View style={styles.bookServiceConfirmCard}>
        <View>
          <Text style={styles.bookServiceConfirmLabel}>CONFIRMATION NUMBER</Text>
          <Text style={styles.bookServiceConfirmValue}>{confirmationNumber}</Text>
        </View>
        <TouchableOpacity
          style={styles.bookServiceCopyButton}
          onPress={() => Alert.alert('Copied', `${confirmationNumber} copied.`)}
          activeOpacity={0.85}
        >
          <Ionicons name="copy-outline" size={22} color="#0F1F3A" />
        </TouchableOpacity>
      </View>

      <Text style={styles.bookServiceBreakdownTitle}>Booking Breakdown</Text>

      <View style={styles.bookServiceBreakdownCard}>
        <View style={styles.bookServiceBreakdownIconWrap}>
          <Ionicons name="car-sport-outline" size={22} color="#0F1F3A" />
        </View>
        <View style={styles.bookServiceBreakdownContent}>
          <Text style={styles.bookServiceBreakdownLabel}>Selected Vehicle</Text>
          <Text style={styles.bookServiceBreakdownValue}>
            {selectedVehicle?.model || 'No vehicle selected'}
          </Text>
          {!!selectedVehicle?.license && (
            <Text style={{ color: '#64748B', marginTop: 4 }}>
              Plate: {selectedVehicle.license}
            </Text>
          )}
        </View>
      </View>

      <View style={[styles.bookServiceBreakdownCard, styles.bookServiceBreakdownCardDark]}>
        <View
          style={[
            styles.bookServiceBreakdownIconWrap,
            styles.bookServiceBreakdownIconWrapDark,
          ]}
        >
          <Ionicons name="cash-outline" size={20} color="#E2E8F0" />
        </View>
        <View style={styles.bookServiceBreakdownContent}>
          <Text style={styles.bookServiceBreakdownLabelDark}>Estimated Total</Text>
          <Text style={styles.bookServiceBreakdownValueDark}>₱{total.toFixed(2)}</Text>
        </View>
      </View>

      <View style={styles.bookServiceBreakdownCardColumn}>
        <View style={styles.bookServiceBreakdownRowTop}>
          <View style={styles.bookServiceBreakdownIconWrapMuted}>
            <Ionicons name="construct-outline" size={20} color="#475569" />
          </View>
          <View style={styles.bookServiceBreakdownContent}>
            <Text style={styles.bookServiceBreakdownLabel}>Selected Services</Text>
            <View style={styles.bookServiceServiceTagsWrap}>
              {selectedServices.map((service) => (
                <View key={`service-tag-${service.id}`} style={styles.bookServiceServiceTag}>
                  <Text style={styles.bookServiceServiceTagText}>{service.title}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      </View>

      <View style={styles.bookServiceDateTimeCard}>
        <View style={styles.bookServiceDateTimeBlock}>
          <Text style={styles.bookServiceBreakdownLabel}>Date</Text>
          <Text style={styles.bookServiceDateTimeValue}>{selectedDateLabel}</Text>
        </View>
        <View style={styles.bookServiceDateTimeDivider} />
        <View style={styles.bookServiceDateTimeBlock}>
          <Text style={styles.bookServiceBreakdownLabel}>Time</Text>
          <Text style={styles.bookServiceDateTimeValue}>{selectedTime}</Text>
        </View>
      </View>

      <View style={styles.bookServiceMapCard}>
        <Ionicons name="location-outline" size={70} color="rgba(15, 31, 58, 0.2)" />
      </View>

      <TouchableOpacity
        style={styles.bookServiceNextButton}
        onPress={() =>
          Alert.alert('Calendar', 'Add to calendar integration can be connected here.')
        }
        activeOpacity={0.9}
      >
        <Ionicons name="calendar-outline" size={20} color="#FFFFFF" />
        <Text
          style={[
            styles.bookServiceNextButtonText,
            styles.bookServiceStepThreePrimaryButtonText,
          ]}
        >
          Add to Calendar
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.bookServiceStepThreeSecondaryButton}
        onPress={() => onSelectTab && onSelectTab('home')}
        activeOpacity={0.9}
      >
        <Ionicons name="grid-outline" size={20} color="#0F1F3A" />
        <Text style={styles.bookServiceStepThreeSecondaryButtonText}>
          Back to Dashboard
        </Text>
      </TouchableOpacity>
    </>
  );

  return (
    <View style={styles.bookServiceContainer}>
      <ScrollView
        contentContainerStyle={styles.bookServiceScrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.bookServiceHeaderRow}>
          <TouchableOpacity
            style={styles.bookServiceBackButton}
            onPress={handleHeaderBack}
            activeOpacity={0.85}
          >
            <Ionicons name="arrow-back" size={24} color="#0F1F3A" />
          </TouchableOpacity>

          <Text style={styles.bookServiceHeaderTitle}>Book Service</Text>

          <TouchableOpacity
            style={styles.bookServiceMoreButton}
            onPress={() => Alert.alert('More', 'Additional options can be added here.')}
            activeOpacity={0.85}
          >
            <Ionicons name="ellipsis-vertical" size={20} color="#0F1F3A" />
          </TouchableOpacity>
        </View>

        <View style={styles.bookServiceDivider} />

        {currentStep === 1
          ? renderStepOne()
          : currentStep === 2
          ? renderStepTwo()
          : renderStepThree()}
      </ScrollView>

      {currentStep !== 3 ? (
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
              <Text
                style={[
                  styles.navLabel,
                  isTabActive('bookService') && styles.navLabelActive,
                ]}
              >
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
                name="card-outline"
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
              onLongPress={onLogout}
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
      ) : null}
    </View>
  );
}