import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  SafeAreaView,
  ScrollView,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text, TouchableOpacity } from 'react-native';

import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import HomeScreen from './screens/HomeScreen';
import { styles } from './styles';

import {
  createVehicle,
  deleteVehicle,
  fetchVehicles,
  fetchVehiclesByUser,
  updateVehicle,
} from './services/vehicleApi';

const API_BASE_URL = 'https://rapidrepair-gygpcbczgyg0czek.southeastasia-01.azurewebsites.net';

export default function App() {
  const [screen, setScreen] = useState('login');
  const [showPassword, setShowPassword] = useState(false);
  const [homeTab, setHomeTab] = useState('home');
  const [currentUser, setCurrentUser] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [isVehiclesLoading, setIsVehiclesLoading] = useState(false);

  const tenantID = Number(
    currentUser?.tenantID ||
      currentUser?.tenantId ||
      currentUser?.tenant_id ||
      currentUser?.tenantid ||
      currentUser?.TenantID ||
      currentUser?.tenant ||
      1
  );

  const user_id = Number(currentUser?.user_id || currentUser?.userId || 0);

  const headerTitle = useMemo(() => 'Rapid Repair', []);

  const handleHomeAction = (title, message) => {
    Alert.alert(title, message);
  };

  const handleQuickActionPress = (actionName) => {
    if (actionName === 'Book Service') {
      setHomeTab('appointments');
      return;
    }

    if (actionName === 'Payments') {
      setHomeTab('payments');
      return;
    }

    if (actionName === 'Service History') {
      setHomeTab('history');
      return;
    }

    if (actionName === 'Vehicle List') {
      setHomeTab('vehicleList');
      return;
    }

    handleHomeAction(actionName, `${actionName} is ready to be connected to its screen.`);
  };

  const handleRegisterSuccess = async (registrationData) => {
    try {
      const response = await fetch(`${API_BASE_URL}/userregister.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(registrationData),
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok || String(payload?.status || '').toLowerCase() !== 'success') {
        throw new Error(payload?.message || 'Registration failed.');
      }

      Alert.alert(
        'Registered',
        payload?.message || 'Your account has been created successfully.'
      );

      setScreen('login');
    } catch (error) {
      Alert.alert(
        'Registration Failed',
        String(error?.message || 'Unable to create account right now.')
      );
    }
  };

  const loadVehicles = async () => {
    if (!currentUser) {
      setVehicles([]);
      return;
    }

    setIsVehiclesLoading(true);

    try {
      const canUseUserScopedFetch = Number.isFinite(user_id) && user_id > 0;

      const list = canUseUserScopedFetch
        ? await fetchVehiclesByUser({ tenantID, user_id })
        : await fetchVehicles(tenantID);

      setVehicles(list);
    } catch (error) {
      const serverMessage =
        error?.response?.data?.message ||
        error?.response?.data ||
        'Unable to load vehicles.';

      Alert.alert('Vehicles', String(serverMessage));
    } finally {
      setIsVehiclesLoading(false);
    }
  };

  const handleCreateVehicle = async (vehicleForm) => {
    if (
      !Number.isFinite(tenantID) ||
      tenantID <= 0 ||
      !Number.isFinite(user_id) ||
      user_id <= 0
    ) {
      throw new Error('Missing tenantID or user_id. Please log in again before saving a vehicle.');
    }

    const created = await createVehicle({
      vehicleForm,
      tenantID,
      user_id,
    });

    setVehicles((prev) => [created, ...prev]);

    return created;
  };

  const handleUpdateVehicle = async (vehicle_id, updates) => {
    const updated = await updateVehicle({
      vehicle_id,
      updates,
      tenantID,
      user_id,
    });

    setVehicles((prev) =>
      prev.map((vehicle) =>
        String(vehicle.vehicle_id) === String(vehicle_id)
          ? {
              ...vehicle,
              ...updated,
              ...updates,
            }
          : vehicle
      )
    );

    return updated;
  };

  const handleDeleteVehicle = async (vehicle_id) => {
    await deleteVehicle({
      vehicle_id,
      tenantID,
      user_id,
    });

    setVehicles((prev) =>
      prev.filter((vehicle) => String(vehicle.vehicle_id) !== String(vehicle_id))
    );
  };

  useEffect(() => {
    loadVehicles();
  }, [currentUser?.email, tenantID, user_id]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />

      {screen === 'home' ? (
        <HomeScreen
          activeTab={homeTab}
          currentUser={currentUser}
          vehicles={vehicles}
          isVehiclesLoading={isVehiclesLoading}
          onRefreshVehicles={loadVehicles}
          onCreateVehicle={handleCreateVehicle}
          onUpdateVehicle={handleUpdateVehicle}
          onDeleteVehicle={handleDeleteVehicle}
          onLogout={() => {
            setCurrentUser(null);
            setHomeTab('home');
            setScreen('login');
          }}
          onNotifications={() =>
            handleHomeAction('Notifications', 'No new alerts at the moment.')
          }
          onLiveDetails={() =>
            handleHomeAction(
              'Live Service Details',
              'Technician is currently working on your vehicle.'
            )
          }
          onQuickAction={handleQuickActionPress}
          onCallShop={() =>
            handleHomeAction(
              'Calling Shop',
              'This can open your dialer when running on a device.'
            )
          }
          onSelectTab={(tab) => setHomeTab(tab)}
        />
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.headerRow}>
            {screen === 'register' ? (
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => setScreen('login')}
              >
                <Ionicons name="chevron-back" size={22} color="#0F172A" />
              </TouchableOpacity>
            ) : (
              <View style={styles.backButtonPlaceholder} />
            )}

            <Text style={styles.headerTitleLarge}>{headerTitle}</Text>

            <View style={styles.backButtonPlaceholder} />
          </View>

          {screen === 'login' ? (
            <LoginScreen
              showPassword={showPassword}
              onTogglePassword={() => setShowPassword((prev) => !prev)}
              onCreateAccount={() => setScreen('register')}
              onLogin={(user) => {
                setCurrentUser(user || null);
                setHomeTab('home');
                setScreen('home');
              }}
              onForgotPassword={() =>
                handleHomeAction(
                  'Reset Password',
                  'Password reset is not connected yet. Please contact support for now.'
                )
              }
              onGoogleLogin={() =>
                handleHomeAction(
                  'Google Login',
                  'Google sign-in will be available in a future update.'
                )
              }
              onAppleLogin={() =>
                handleHomeAction(
                  'Apple Login',
                  'Apple sign-in will be available in a future update.'
                )
              }
            />
          ) : (
            <RegisterScreen
              showPassword={showPassword}
              onTogglePassword={() => setShowPassword((prev) => !prev)}
              onHaveAccount={() => setScreen('login')}
              onRegister={handleRegisterSuccess}
              onOpenTerms={() =>
                handleHomeAction(
                  'Terms of Service',
                  'Terms page will be connected in a future update.'
                )
              }
              onOpenPrivacy={() =>
                handleHomeAction(
                  'Privacy Policy',
                  'Privacy page will be connected in a future update.'
                )
              }
            />
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}