import React, { useMemo, useState, useEffect } from 'react';
import { Alert, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { styles } from '../styles.js';
import { fetchServices } from '../services/serviceApi';

const vehicles = [
  {
    id: 'v1',
    name: 'Primary',
    model: '2018 Honda Civic',
    license: 'ABC-1234',
    icon: 'car-sport-outline',
  },
  {
    id: 'v2',
    name: 'Secondary',
    model: '2022 Toyota Camry',
    license: 'XYZ-9876',
    icon: 'car-outline',
  },
];

// Services are loaded from the backend for the active tenant

const weekDays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

const addMonths = (date, monthsToAdd) => new Date(date.getFullYear(), date.getMonth() + monthsToAdd, 1);

const isSameDay = (leftDate, rightDate) =>
  leftDate.getFullYear() === rightDate.getFullYear() &&
  leftDate.getMonth() === rightDate.getMonth() &&
  leftDate.getDate() === rightDate.getDate();

const getCalendarCells = (visibleMonth) => {
  const year = visibleMonth.getFullYear();
  const month = visibleMonth.getMonth();
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInCurrentMonth = new Date(year, month + 1, 0).getDate();
  const daysInPreviousMonth = new Date(year, month, 0).getDate();

  const cells = [];

  for (let index = firstDayOfMonth - 1; index >= 0; index -= 1) {
    const day = daysInPreviousMonth - index;
    cells.push({
      date: new Date(year, month - 1, day),
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

export default function BookServiceScreen({ activeTab, tenantID = 1, onSelectTab, onLogout }) {
    const [services, setServices] = useState([]);
    const [servicesLoading, setServicesLoading] = useState(true);
    const [servicesError, setServicesError] = useState(null);
  const today = useMemo(() => new Date(), []);
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedVehicleId, setSelectedVehicleId] = useState(vehicles[0].id);
  const [selectedServiceIds, setSelectedServiceIds] = useState([]);
    // Fetch services for the active tenant
    useEffect(() => {
      let isMounted = true;
      setServicesLoading(true);
      setServicesError(null);

      if (!Number.isFinite(Number(tenantID)) || Number(tenantID) <= 0) {
        setServices([]);
        setServicesError('Invalid tenantID. Please log in again.');
        setServicesLoading(false);
        return () => {
          isMounted = false;
        };
      }

      fetchServices({ tenantID })
        .then((data) => {
          if (isMounted) {
            setServices(data.map((s) => ({
              id: String(s.service_id),
              title: s.service_name,
              description: s.description,
              price: Number(s.price),
            })));
            setSelectedServiceIds([]);
          }
        })
        .catch((err) => {
          if (isMounted) setServicesError(err.message || 'Failed to load services.');
        })
        .finally(() => {
          if (isMounted) setServicesLoading(false);
        });
      return () => { isMounted = false; };
    }, [tenantID]);
  const [visibleMonth, setVisibleMonth] = useState(
    () => new Date(today.getFullYear(), today.getMonth(), 1)
  );
  const [selectedDate, setSelectedDate] = useState(today);
  const [selectedTime, setSelectedTime] = useState('10:30 AM');
  const [notes, setNotes] = useState('');
  const [confirmationNumber, setConfirmationNumber] = useState('RR-98421');

  const isTabActive = (tab) => activeTab === tab;

  const toggleService = (serviceId) => {
    setSelectedServiceIds((previousIds) => {
      if (previousIds.includes(serviceId)) {
        return previousIds.filter((id) => id !== serviceId);
      }

      return [...previousIds, serviceId];
    });
  };

  const total = useMemo(
    () =>
      services
        .filter((service) => selectedServiceIds.includes(service.id))
        .reduce((runningTotal, service) => runningTotal + (service.price || 0), 0),
    [selectedServiceIds, services]
  );

  const handleNextStep = () => {
    if (selectedServiceIds.length === 0) {
      Alert.alert('Select a Service', 'Please pick at least one service before continuing.');
      return;
    }

    setCurrentStep(2);
  };

  const handleConfirmBooking = () => {
    if (!selectedTime) {
      Alert.alert('Select a Time', 'Please choose an available time slot before confirming.');
      return;
    }

    const generatedNumber = `RR-${Math.floor(10000 + Math.random() * 90000)}`;
    setConfirmationNumber(generatedNumber);
    setCurrentStep(3);
  };

  const selectedCount = selectedServiceIds.length;
  const selectedLabel = `${selectedCount} Service${selectedCount === 1 ? '' : 's'} Selected`;
  const monthLabel = visibleMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const calendarCells = useMemo(() => getCalendarCells(visibleMonth), [visibleMonth]);
  const selectedVehicle = useMemo(
    () => vehicles.find((vehicle) => vehicle.id === selectedVehicleId) || vehicles[0],
    [selectedVehicleId]
  );
  const selectedServices = useMemo(
    () => services.filter((service) => selectedServiceIds.includes(service.id)),
    [selectedServiceIds, services]
  );
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
    setSelectedDate(date);
    setVisibleMonth(new Date(date.getFullYear(), date.getMonth(), 1));
  };

  const renderStepOne = () => (
    <>
      <View style={styles.bookServiceStepRow}>
        <Text style={styles.bookServiceStepText}>STEP 1 OF 3</Text>
        <Text style={styles.bookServiceStepPercent}>33% COMPLETE</Text>
      </View>
      <View style={styles.bookServiceProgressTrack}>
        <View style={styles.bookServiceProgressFill} />
      </View>

      <View style={styles.bookServiceSectionHeader}>
        <Text style={styles.bookServiceSectionTitle}>Select Vehicle</Text>
        <TouchableOpacity
          onPress={() => Alert.alert('Add Vehicle', 'Vehicle creation can be connected here.')}
          activeOpacity={0.85}
        >
          <Text style={styles.bookServiceAddNew}>ADD NEW</Text>
        </TouchableOpacity>
      </View>

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


      <Text style={styles.bookServiceSectionTitle}>Select Services</Text>
      {servicesLoading ? (
        <Text style={{ marginVertical: 12, color: '#64748B' }}>Loading services...</Text>
      ) : servicesError ? (
        <Text style={{ marginVertical: 12, color: 'red' }}>{servicesError}</Text>
      ) : services.length === 0 ? (
        <Text style={{ marginVertical: 12, color: '#64748B' }}>No services available.</Text>
      ) : (
        services.map((service) => {
          const isSelected = selectedServiceIds.includes(service.id);
          return (
            <TouchableOpacity
              key={service.id}
              style={styles.bookServiceServiceCard}
              onPress={() => toggleService(service.id)}
              activeOpacity={0.9}
            >
              <View style={[styles.bookServiceCheckBox, isSelected && styles.bookServiceCheckBoxSelected]}>
                {isSelected ? <Ionicons name="checkmark" size={17} color="#FFFFFF" /> : null}
              </View>

              <View style={styles.bookServiceServiceTextWrap}>
                <Text style={styles.bookServiceServiceTitle}>{service.title}</Text>
                <Text style={styles.bookServiceServiceDescription}>{service.description}</Text>
              </View>

              <Text style={styles.bookServiceServicePrice}>${service.price}</Text>
            </TouchableOpacity>
          );
        })
      )}

      <View style={styles.bookServiceTotalCard}>
        <View>
          <Text style={styles.bookServiceTotalLabel}>ESTIMATED TOTAL</Text>
          <Text style={styles.bookServiceTotalValue}>${total.toFixed(2)}</Text>
        </View>
        <View style={styles.bookServiceTotalMetaWrap}>
          <Text style={styles.bookServiceTotalMeta}>{selectedLabel}</Text>
          <Text style={styles.bookServiceTotalSubMeta}>Excl. taxes & fees</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.bookServiceNextButton} onPress={handleNextStep} activeOpacity={0.9}>
        <Text style={styles.bookServiceNextButtonText}>Next Step</Text>
        <Ionicons name="arrow-forward" size={22} color="#FFFFFF" style={styles.bookServiceNextIcon} />
      </TouchableOpacity>
    </>
  );

  const renderStepTwo = () => (
    <>
      <View style={styles.bookServiceStepRowStepTwo}>
        <Text style={styles.bookServiceStepText}>STEP 2 OF 3</Text>
      </View>
      <Text style={styles.bookServiceStepTitle}>Schedule Appointment</Text>

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
            const dayLabel = String(cell.date.getDate());

            return (
              <TouchableOpacity
                key={`day-${cell.date.toISOString()}`}
                style={[styles.bookServiceCalendarCell, isSelected && styles.bookServiceCalendarCellSelected]}
                onPress={() => handleSelectDate(cell.date)}
                activeOpacity={0.85}
              >
                <Text
                  style={[
                    cell.isCurrentMonth ? styles.bookServiceCalendarDay : styles.bookServiceCalendarDayMuted,
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

      <TouchableOpacity style={styles.bookServiceNextButton} onPress={handleConfirmBooking} activeOpacity={0.9}>
        <Text style={styles.bookServiceNextButtonText}>Confirm Booking</Text>
        <Ionicons name="arrow-forward" size={22} color="#FFFFFF" style={styles.bookServiceNextIcon} />
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
          <Text style={styles.bookServiceBreakdownValue}>{selectedVehicle.model}</Text>
        </View>
      </View>

      <View style={[styles.bookServiceBreakdownCard, styles.bookServiceBreakdownCardDark]}>
        <View style={[styles.bookServiceBreakdownIconWrap, styles.bookServiceBreakdownIconWrapDark]}>
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
        onPress={() => Alert.alert('Calendar', 'Add to calendar integration can be connected here.')}
        activeOpacity={0.9}
      >
        <Ionicons name="calendar-outline" size={20} color="#FFFFFF" />
        <Text style={[styles.bookServiceNextButtonText, styles.bookServiceStepThreePrimaryButtonText]}>
          Add to Calendar
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.bookServiceStepThreeSecondaryButton}
        onPress={() => onSelectTab && onSelectTab('home')}
        activeOpacity={0.9}
      >
        <Ionicons name="grid-outline" size={20} color="#0F1F3A" />
        <Text style={styles.bookServiceStepThreeSecondaryButtonText}>Back to Dashboard</Text>
      </TouchableOpacity>
    </>
  );

  return (
    <View style={styles.bookServiceContainer}>
      <ScrollView contentContainerStyle={styles.bookServiceScrollContent} showsVerticalScrollIndicator={false}>
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

        {currentStep === 1 ? renderStepOne() : currentStep === 2 ? renderStepTwo() : renderStepThree()}
      </ScrollView>

      {currentStep !== 3 ? (
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
              <Text style={[styles.navLabel, isTabActive('appointments') && styles.navLabelActive]}>
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
              onLongPress={onLogout}
            >
              <Ionicons name="person-outline" size={22} color={isTabActive('profile') ? '#0F172A' : '#94A3B8'} />
              <Text style={[styles.navLabel, isTabActive('profile') && styles.navLabelActive]}>Profile</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}
    </View>
  );
}
