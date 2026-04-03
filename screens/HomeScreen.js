import {
  Alert,
  ImageBackground,
  Linking,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { styles } from '../styles';
import ProfileScreen from './ProfileScreen';
import BookServiceScreen from './BookServiceScreen';
import PaymentsScreen from './PaymentsScreen';
import HistoryScreen from './HistoryScreen';
import PersonalInformationScreen from './PersonalInformationScreen';
import AddVehicleScreen from './AddVehicleScreen';
import VehicleListScreen from './VehicleListScreen';

export default function HomeScreen({
  activeTab = 'home',
  currentUser,
  vehicles,
  isVehiclesLoading,
  onRefreshVehicles,
  onCreateVehicle,
  onUpdateVehicle,
  onDeleteVehicle,
  onLogout,
  onNotifications,
  onLiveDetails,
  onQuickAction,
  onCallShop,
  onSelectTab,
}) {
  const handleQuickAction = (actionName) => {
    if (onQuickAction) {
      onQuickAction(actionName);
      return;
    }

    Alert.alert(actionName, `${actionName} is not connected yet.`);
  };

  const handleCallShop = async () => {
    if (onCallShop) {
      onCallShop();
      return;
    }

    const phoneUrl = 'tel:+15550000000';
    const canOpen = await Linking.canOpenURL(phoneUrl);
    if (canOpen) {
      await Linking.openURL(phoneUrl);
      return;
    }

    Alert.alert('Call Shop', 'Unable to open the phone dialer on this device.');
  };

  const handleTabSelect = (tab) => {
    if (onSelectTab) {
      onSelectTab(tab);
      return;
    }

    if (tab === 'profile' && onLogout) {
      onLogout();
      return;
    }

    Alert.alert('Navigation', `Switched to ${tab}.`);
  };

  const isTabActive = (tab) => activeTab === tab;
  const displayName = currentUser?.fullName || currentUser?.name || currentUser?.username || 'User';
  const resolvedTenantID = Number(
    currentUser?.tenantID ||
      currentUser?.tenantId ||
      currentUser?.tenant_id ||
      currentUser?.tenantid ||
      currentUser?.TenantID ||
      currentUser?.tenant ||
      1
  );

  if (activeTab === 'profile') {
    return (
      <ProfileScreen
        activeTab={activeTab}
        currentUser={currentUser}
        vehicles={vehicles}
        isVehiclesLoading={isVehiclesLoading}
        onRefreshVehicles={onRefreshVehicles}
        onUpdateVehicle={onUpdateVehicle}
        onDeleteVehicle={onDeleteVehicle}
        onSelectTab={handleTabSelect}
        onLogout={onLogout}
      />
    );
  }

  if (activeTab === 'personalInfo') {
    return (
      <PersonalInformationScreen
        currentUser={currentUser}
        onSelectTab={handleTabSelect}
      />
    );
  }

  if (activeTab === 'addVehicle') {
    return (
      <AddVehicleScreen
        currentUser={currentUser}
        onCreateVehicle={onCreateVehicle}
        onSelectTab={handleTabSelect}
      />
    );
  }

  if (activeTab === 'appointments') {
    return (
      <BookServiceScreen
        activeTab={activeTab}
        tenantID={resolvedTenantID}
        onSelectTab={handleTabSelect}
        onLogout={onLogout}
      />
    );
  }

  if (activeTab === 'payments') {
    return (
      <PaymentsScreen
        activeTab={activeTab}
        onSelectTab={handleTabSelect}
      />
    );
  }

  if (activeTab === 'history') {
    return (
      <HistoryScreen
        activeTab={activeTab}
        onSelectTab={handleTabSelect}
      />
    );
  }

  if (activeTab === 'vehicleList') {
    return (
      <VehicleListScreen
        currentUser={currentUser}
        vehicles={vehicles}
        isVehiclesLoading={isVehiclesLoading}
        tenantID={resolvedTenantID}
        onRefreshVehicles={onRefreshVehicles}
        onCreateVehicle={onCreateVehicle}
        onSelectTab={handleTabSelect}
      />
    );
  }

  return (
    <View style={styles.homeContainer}>
      <ScrollView contentContainerStyle={styles.homeScrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.homeHeader}>
          <View style={styles.homeBrand}>
            <View style={styles.homeBrandIcon}>
              <Ionicons name="ios-build" size={18} color="#0F172A" />
            </View>
            <Text style={styles.homeBrandText}>Rapid Repair</Text>
          </View>
          <TouchableOpacity
            style={styles.notificationButton}
            onPress={onNotifications || (() => Alert.alert('Notifications', 'No new notifications.'))}
            activeOpacity={0.85}
          >
            <Ionicons name="notifications-outline" size={22} color="#0F172A" />
          </TouchableOpacity>
        </View>

        <Text style={styles.homeGreeting}>Welcome back, {displayName}</Text>
        <Text style={styles.homeTitle}>Current Progress</Text>

        <View style={styles.card}>
          <ImageBackground
            source={{
              uri: 'https://images.unsplash.com/photo-1598032893045-e4568fa2bd5f?auto=format&fit=crop&w=1200&q=80',
            }}
            style={styles.cardImage}
          >
            <View style={styles.cardOverlay} />
            <View style={styles.cardStatus}> 
              <Text style={styles.cardStatusText}>IN PROGRESS</Text>
            </View>
          </ImageBackground>

        <View style={styles.cardBody}>
          <View style={styles.cardRow}>
            <View>
              <Text style={styles.cardTitle}>2018 Honda Civic</Text>
              <Text style={styles.cardSubtitle}>Oil Change & Full Vehicle Inspection</Text>
            </View>
            <View style={styles.cardCost}> 
              <Text style={styles.cardCostLabel}>EST. COST</Text>
              <Text style={styles.cardCostValue}>₱185.00</Text>
            </View>
          </View>

          <View style={styles.progressRow}>
            <View style={[styles.progressSegment, styles.progressActive]} />
            <View style={[styles.progressSegment, styles.progressActive]} />
            <View style={[styles.progressSegment, styles.progressActive]} />
            <View style={[styles.progressSegment, styles.progressInactive]} />
          </View>

          <View style={styles.statusRow}>
            <View style={styles.statusItem}>
              <Ionicons name="document-text-outline" size={18} color="#0F172A" />
              <Text style={styles.statusLabel}>Diag</Text>
            </View>
            <View style={styles.statusItem}>
              <Ionicons name="cart-outline" size={18} color="#0F172A" />
              <Text style={styles.statusLabel}>Parts</Text>
            </View>
            <View style={styles.statusItem}>
              <Ionicons name="hammer-outline" size={18} color="#0F172A" />
              <Text style={styles.statusLabelActive}>Active</Text>
            </View>
            <View style={styles.statusItem}>
              <Ionicons name="construct-outline" size={18} color="#94A3B8" />
              <Text style={styles.statusLabelInactive}>Testing</Text>
            </View>
            <View style={styles.statusItem}>
              <Ionicons name="checkmark-done-outline" size={18} color="#94A3B8" />
              <Text style={styles.statusLabelInactive}>Ready</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.primaryButton}
            activeOpacity={0.85}
            onPress={onLiveDetails || (() => Alert.alert('Live Service Details', 'Tracking details are loading.'))}
          >
            <Ionicons name="eye" size={18} color="white" style={styles.buttonIcon} />
            <Text style={styles.primaryButtonText}>Live Service Details</Text>
          </TouchableOpacity>
        </View>
      </View>

        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickActionsRow}>
        <TouchableOpacity
          style={styles.actionCard}
          activeOpacity={0.85}
          onPress={() => handleTabSelect('appointments')}
        >
          <View style={styles.actionIcon}> 
            <Ionicons name="calendar-outline" size={20} color="#0F172A" />
          </View>
          <Text style={styles.actionTitle}>Book Service</Text>
          <Text style={styles.actionSubtitle}>Schedule maintenance</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionCard}
          activeOpacity={0.85}
          onPress={() => handleQuickAction('Vehicle List')}
        >
          <View style={styles.actionIcon}> 
            <Ionicons name="car-outline" size={20} color="#0F172A" />
          </View>
          <Text style={styles.actionTitle}>Vehicle List</Text>
          <Text style={styles.actionSubtitle}>Manage your cars</Text>
        </TouchableOpacity>
        </View>

        <View style={styles.quickActionsRow}>
        <TouchableOpacity
          style={styles.actionCard}
          activeOpacity={0.85}
          onPress={() => handleQuickAction('Service History')}
        >
          <View style={styles.actionIcon}> 
            <Ionicons name="time-outline" size={20} color="#0F172A" />
          </View>
          <Text style={styles.actionTitle}>Service History</Text>
          <Text style={styles.actionSubtitle}>Records & Receipts</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionCard}
          activeOpacity={0.85}
          onPress={() => handleTabSelect('payments')}
        >
          <View style={styles.actionIcon}> 
            <Ionicons name="card-outline" size={20} color="#0F172A" />
          </View>
          <Text style={styles.actionTitle}>Payments</Text>
          <Text style={styles.actionSubtitle}>Pay bills & balances</Text>
        </TouchableOpacity>
        </View>

        <View style={styles.shopCard}>
          <View>
            <Text style={styles.shopName}>Elite Auto Downtown</Text>
            <Text style={styles.shopSubtitle}>Your preferred service center</Text>
            <Text style={styles.shopMeta}>2.4 miles away • Open until 7 PM</Text>
          </View>
          <TouchableOpacity style={styles.callButton} activeOpacity={0.85} onPress={handleCallShop}>
            <Text style={styles.callButtonText}>CALL SHOP</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <View style={styles.homeBottomNavWrapper}>
        <View style={styles.bottomNav}>
        <TouchableOpacity
          style={[styles.navItem, isTabActive('home') && styles.navItemSelected]}
          onPress={() => handleTabSelect('home')}
        >
          <Ionicons name="home" size={22} color={isTabActive('home') ? '#0F172A' : '#94A3B8'} />
          <Text style={[styles.navLabel, isTabActive('home') && styles.navLabelActive]}>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.navItem, isTabActive('appointments') && styles.navItemSelected]}
          onPress={() => handleTabSelect('appointments')}
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
          onPress={() => handleTabSelect('history')}
        >
          <Ionicons name="time-outline" size={22} color={isTabActive('history') ? '#0F172A' : '#94A3B8'} />
          <Text style={[styles.navLabel, isTabActive('history') && styles.navLabelActive]}>History</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.navItem, isTabActive('payments') && styles.navItemSelected]}
          onPress={() => handleTabSelect('payments')}
        >
          <Ionicons name="card-outline" size={22} color={isTabActive('payments') ? '#0F172A' : '#94A3B8'} />
          <Text style={[styles.navLabel, isTabActive('payments') && styles.navLabelActive]}>Payments</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.navItem, isTabActive('profile') && styles.navItemSelected]}
          onPress={() => handleTabSelect('profile')}
          onLongPress={onLogout}
        >
          <Ionicons name="person-outline" size={22} color={isTabActive('profile') ? '#0F172A' : '#94A3B8'} />
          <Text style={[styles.navLabel, isTabActive('profile') && styles.navLabelActive]}>Profile</Text>
        </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
