import { Alert, Image, Modal, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { styles } from '../styles';

const accountSettings = [
  { id: '1', label: 'Personal Information', icon: 'person', tab: 'personalInfo' },
  { id: '2', label: 'Payment Methods', icon: 'card' },
  { id: '3', label: 'Notification Settings', icon: 'notifications' },
];

const supportItems = [
  { id: '1', label: 'Help Center', icon: 'help-circle' },
  { id: '2', label: 'Terms of Service', icon: 'document-text' },
];

export default function ProfileScreen({
  activeTab,
  currentUser,
  vehicles = [],
  isVehiclesLoading,
  onRefreshVehicles,
  onUpdateVehicle,
  onDeleteVehicle,
  onSelectTab,
  onLogout,
}) {
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const handlePress = (title, message) => Alert.alert(title, message);
  const isTabActive = (tab) => activeTab === tab;
  const profileName = currentUser?.fullName || currentUser?.name || currentUser?.username || 'User';

  const handleVehicleActions = (vehicle) => {
    const nextStatus = vehicle.status === 'Active' ? 'Inactive' : 'Active';
    Alert.alert(
      `${vehicle.brand || 'Vehicle'} ${vehicle.model || ''}`.trim(),
      'Choose an action for this vehicle.',
      [
        {
          text: `Set ${nextStatus}`,
          onPress: async () => {
            if (!onUpdateVehicle) {
              return;
            }

            try {
              await onUpdateVehicle(vehicle.vehicle_id, { status: nextStatus });
            } catch (error) {
              const serverMessage =
                error?.response?.data?.message || error?.response?.data || 'Unable to update vehicle.';
              Alert.alert('Update Failed', String(serverMessage));
            }
          },
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!onDeleteVehicle) {
              return;
            }

            try {
              await onDeleteVehicle(vehicle.vehicle_id);
            } catch (error) {
              const serverMessage =
                error?.response?.data?.message || error?.response?.data || 'Unable to delete vehicle.';
              Alert.alert('Delete Failed', String(serverMessage));
            }
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handleLogout = () => {
    setShowLogoutModal(true);
  };

  const handleConfirmLogout = () => {
    setShowLogoutModal(false);
    if (onLogout) {
      onLogout();
    }
  };

  const handleCancelLogout = () => {
    setShowLogoutModal(false);
  };

  return (
    <View style={styles.profileContainer}>
      <ScrollView contentContainerStyle={styles.profileScrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.profileHeaderRow}>
          <TouchableOpacity
            style={styles.profileBackButton}
            onPress={() => onSelectTab && onSelectTab('home')}
            activeOpacity={0.85}
          >
            <Ionicons name="arrow-back" size={24} color="#0F1F3A" />
          </TouchableOpacity>
          <Text style={styles.profileHeaderTitle}>Profile</Text>
          <View style={styles.profileBackButtonSpacer} />
        </View>

        <View style={styles.profileDivider} />

        <View style={styles.profileIdentitySection}>
          <View style={styles.profileAvatarWrap}>
            <Image
              source={{ uri: 'https://i.pravatar.cc/280?img=12' }}
              style={styles.profileAvatar}
            />
            <TouchableOpacity
              style={styles.profileAvatarEdit}
              onPress={() => handlePress('Edit Avatar', 'Avatar editing can be connected here.')}
              activeOpacity={0.85}
            >
              <Ionicons name="create-outline" size={13} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <Text style={styles.profileName}>{profileName}</Text>
          <View style={styles.profileMembershipRow}>
            <Ionicons name="star" size={14} color="#F59E0B" />
            <Text style={styles.profileMembershipText}>Gold Member</Text>
          </View>
          <Text style={styles.profileMeta}>Joined January 2021</Text>
        </View>

        <View style={styles.profileSectionHeaderRow}>
          <Text style={styles.profileSectionTitle}>MY VEHICLES</Text>
          <View style={styles.profileVehicleHeaderActions}>
            <TouchableOpacity
              style={styles.profileAddNewButton}
              onPress={() => {
                if (onSelectTab) {
                  onSelectTab('addVehicle');
                  return;
                }

                handlePress('Add New Vehicle', 'Vehicle form can be connected here.');
              }}
              activeOpacity={0.85}
            >
              <Ionicons name="add-circle" size={17} color="#0F1F3A" />
              <Text style={styles.profileAddNewText}>Add New</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.profileVehiclesRefreshButton}
              onPress={onRefreshVehicles || (() => handlePress('Vehicles', 'Refresh action can be connected here.'))}
              activeOpacity={0.85}
            >
              <Ionicons name="refresh" size={16} color="#0F1F3A" />
            </TouchableOpacity>
          </View>
        </View>

        {isVehiclesLoading ? (
          <Text style={styles.profileVehicleMeta}>Loading vehicles...</Text>
        ) : null}

        {vehicles.length === 0 ? (
          <View style={styles.profileVehicleCard}>
            <View style={styles.profileVehicleIconWrap}>
              <Ionicons name="car-outline" size={22} color="#0F1F3A" />
            </View>
            <View style={styles.profileVehicleTextWrap}>
              <Text style={styles.profileVehicleTitle}>No vehicles registered yet</Text>
              <Text style={styles.profileVehicleMeta}>Tap Add New to register your first vehicle.</Text>
            </View>
          </View>
        ) : (
          vehicles.map((vehicle) => (
            <TouchableOpacity
              key={String(vehicle.vehicle_id)}
              style={styles.profileVehicleCard}
              onPress={() => handleVehicleActions(vehicle)}
              activeOpacity={0.9}
            >
              <View style={styles.profileVehicleIconWrap}>
                <Ionicons name="car-outline" size={22} color="#0F1F3A" />
              </View>

              <View style={styles.profileVehicleTextWrap}>
                <Text style={styles.profileVehicleTitle}>{`${vehicle.brand} ${vehicle.model}`.trim()}</Text>
                <Text style={styles.profileVehicleMeta}>
                  {`Plate: ${vehicle.plate_number || 'N/A'} • ${vehicle.color || 'No color'} • ${vehicle.status || 'Active'}`}
                </Text>
              </View>

              <Ionicons name="chevron-forward" size={20} color="#94A3B8" />
            </TouchableOpacity>
          ))
        )}

        <Text style={styles.profileSectionTitle}>ACCOUNT SETTINGS</Text>
        <View style={styles.profileListCard}>
          {accountSettings.map((item, index) => (
            <TouchableOpacity
              key={item.id}
              style={[
                styles.profileListRow,
                index < accountSettings.length - 1 && styles.profileListRowBorder,
              ]}
              onPress={() => {
                if (item.tab && onSelectTab) {
                  onSelectTab(item.tab);
                  return;
                }

                handlePress(item.label, `${item.label} is ready to be connected.`);
              }}
              activeOpacity={0.85}
            >
              <View style={styles.profileListLeft}>
                <Ionicons name={item.icon} size={20} color="#64748B" />
                <Text style={styles.profileListLabel}>{item.label}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.profileSectionTitle}>SUPPORT & INFO</Text>
        <View style={styles.profileListCard}>
          {supportItems.map((item, index) => (
            <TouchableOpacity
              key={item.id}
              style={[
                styles.profileListRow,
                index < supportItems.length - 1 && styles.profileListRowBorder,
              ]}
              onPress={() => handlePress(item.label, `${item.label} is ready to be connected.`)}
              activeOpacity={0.85}
            >
              <View style={styles.profileListLeft}>
                <Ionicons name={item.icon} size={20} color="#64748B" />
                <Text style={styles.profileListLabel}>{item.label}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={styles.profileLogoutButton}
          onPress={handleLogout}
          activeOpacity={0.85}
        >
          <Ionicons name="log-out-outline" size={21} color="#EF4444" />
          <Text style={styles.profileLogoutText}>Logout</Text>
        </TouchableOpacity>

        <Text style={styles.profileVersionText}>Rapid Repair Version 2.4.1 (Build 402)</Text>
      </ScrollView>

      <Modal
        transparent
        visible={showLogoutModal}
        animationType="fade"
        onRequestClose={handleCancelLogout}
      >
        <View style={styles.logoutModalOverlay}>
          <View style={styles.logoutModalContent}>
            <View style={styles.logoutModalIconWrap}>
              <Ionicons name="log-out-outline" size={40} color="#EF4444" />
            </View>
            <Text style={styles.logoutModalTitle}>Logout</Text>
            <Text style={styles.logoutModalMessage}>Are you sure you want to logout?</Text>
            
            <View style={styles.logoutModalButtonsRow}>
              <TouchableOpacity
                style={styles.logoutModalCancelButton}
                onPress={handleCancelLogout}
                activeOpacity={0.8}
              >
                <Text style={styles.logoutModalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.logoutModalConfirmButton}
                onPress={handleConfirmLogout}
                activeOpacity={0.8}
              >
                <Text style={styles.logoutModalConfirmButtonText}>Yes, Logout</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

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
          >
            <Ionicons name="person-outline" size={22} color={isTabActive('profile') ? '#0F172A' : '#94A3B8'} />
            <Text style={[styles.navLabel, isTabActive('profile') && styles.navLabelActive]}>Profile</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
