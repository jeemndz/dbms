import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
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
import VerificationScreen from './screens/VerificationScreen';
import { styles } from './styles';
import {
  createVehicle,
  deleteVehicle,
  fetchVehicles,
  fetchVehiclesByUser,
  updateVehicle,
} from './services/vehicleApi';

const API_BASE_URL = 'https://rapidrepair-gygpcbczgyg0czek.southeastasia-01.azurewebsites.net';
const SEND_VERIFICATION_ENDPOINTS = [
  `${API_BASE_URL}/mobileapis/send_verification_code.php`,
  `${API_BASE_URL}/send_verification_code.php`,
];
const VERIFY_CODE_ENDPOINTS = [
  `${API_BASE_URL}/mobileapis/verify_verification_code.php`,
  `${API_BASE_URL}/verify_verification_code.php`,
];

const normalizeTenantId = (tenantId) => String(tenantId || '001').replace(/\D/g, '').slice(-3).padStart(3, '0');

const isNotFoundError = (error) => Number(error?.response?.status || 0) === 404;

const normalizeServerMessage = (error, fallbackMessage) => {
  const status = Number(error?.response?.status || 0);
  const responseData = error?.response?.data;

  if (typeof responseData === 'string') {
    const withoutHtml = responseData.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    if (withoutHtml && !withoutHtml.toLowerCase().includes('404 not found')) {
      return withoutHtml;
    }
  }

  if (status === 404) {
    return 'API endpoint not found (404). Please check server deployment path.';
  }

  return (
    error?.response?.data?.message ||
    error?.message ||
    fallbackMessage
  );
};

const postWithFallback = async (endpoints, payload) => {
  let lastError = null;

  for (const endpoint of endpoints) {
    try {
      return await axios.post(endpoint, payload);
    } catch (error) {
      lastError = error;
      if (!isNotFoundError(error)) {
        throw error;
      }
    }
  }

  throw lastError || new Error('API endpoint not found.');
};

export default function App() {
  const [screen, setScreen] = useState('login');
  const [showPassword, setShowPassword] = useState(false);
  const [homeTab, setHomeTab] = useState('home');
  const [currentUser, setCurrentUser] = useState(null);
  const [verificationSession, setVerificationSession] = useState({
    email: '',
    tenantId: '001',
  });
  const [vehicles, setVehicles] = useState([]);
  const [isVehiclesLoading, setIsVehiclesLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSendingCode, setIsSendingCode] = useState(false);

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

  const handleRegisterSuccess = async ({ email, tenantId }) => {
    const normalizedTenantId = normalizeTenantId(tenantId);

    setVerificationSession({
      email,
      tenantId: normalizedTenantId,
    });

    setIsSendingCode(true);
    try {
      const response = await postWithFallback(SEND_VERIFICATION_ENDPOINTS, {
        email,
        tenantId: normalizedTenantId,
      });

      const status = String(response?.data?.status || '').trim().toLowerCase();
      if (status !== 'success') {
        Alert.alert('Verification Failed', response?.data?.message || 'Unable to send verification email.');
        return;
      }

      Alert.alert('Verification Code Sent', `A verification code was sent to ${email}.`);
      setScreen('verify');
    } catch (error) {
      const serverMessage = normalizeServerMessage(error, 'Unable to send verification email.');
      if (isNotFoundError(error)) {
        Alert.alert('Account Created', 'Your account was created, but verification API is not deployed yet. Please contact support/admin to deploy verification endpoints.');
        setScreen('login');
        return;
      }
      Alert.alert('Verification Failed', String(serverMessage));
    } finally {
      setIsSendingCode(false);
    }
  };

  const handleVerifyAccount = async (enteredCode) => {
    setIsVerifying(true);
    try {
      const response = await postWithFallback(VERIFY_CODE_ENDPOINTS, {
        email: verificationSession.email,
        tenantId: verificationSession.tenantId,
        code: enteredCode,
      });

      const status = String(response?.data?.status || '').trim().toLowerCase();
      if (status !== 'success') {
        Alert.alert('Invalid Code', response?.data?.message || 'Verification code is incorrect or expired.');
        return;
      }

      Alert.alert('Verified', 'Your account has been verified successfully.');
      setScreen('home');
    } catch (error) {
      const serverMessage = normalizeServerMessage(error, 'Unable to verify code right now.');
      Alert.alert('Verification Failed', String(serverMessage));
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResendCode = async () => {
    setIsSendingCode(true);
    try {
      const response = await postWithFallback(SEND_VERIFICATION_ENDPOINTS, {
        email: verificationSession.email,
        tenantId: verificationSession.tenantId,
      });

      const status = String(response?.data?.status || '').trim().toLowerCase();
      if (status !== 'success') {
        Alert.alert('Resend Failed', response?.data?.message || 'Unable to resend verification email.');
        return;
      }

      Alert.alert('Code Resent', `A new verification code was sent to ${verificationSession.email}.`);
    } catch (error) {
      const serverMessage = normalizeServerMessage(error, 'Unable to resend verification email.');
      Alert.alert('Resend Failed', String(serverMessage));
    } finally {
      setIsSendingCode(false);
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
        error?.response?.data?.message || error?.response?.data || 'Unable to load vehicles.';
      Alert.alert('Vehicles', String(serverMessage));
    } finally {
      setIsVehiclesLoading(false);
    }
  };

  const handleCreateVehicle = async (vehicleForm) => {
    if (!Number.isFinite(tenantID) || tenantID <= 0 || !Number.isFinite(user_id) || user_id <= 0) {
      throw new Error('Missing tenantID or user_id. Please log in again before saving a vehicle.');
    }

    const created = await createVehicle({ vehicleForm, tenantID, user_id });
    setVehicles((prev) => [created, ...prev]);
    return created;
  };

  const handleUpdateVehicle = async (vehicle_id, updates) => {
    const updated = await updateVehicle({ vehicle_id, updates, tenantID, user_id });
    setVehicles((prev) =>
      prev.map((vehicle) =>
        String(vehicle.vehicle_id) === String(vehicle_id)
          ? { ...vehicle, ...updated, ...updates }
          : vehicle
      )
    );
    return updated;
  };

  const handleDeleteVehicle = async (vehicle_id) => {
    await deleteVehicle({ vehicle_id, tenantID, user_id });
    setVehicles((prev) => prev.filter((vehicle) => String(vehicle.vehicle_id) !== String(vehicle_id)));
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
            handleHomeAction('Live Service Details', 'Technician is currently working on your vehicle.')
          }
          onQuickAction={handleQuickActionPress}
          onCallShop={() =>
            handleHomeAction('Calling Shop', 'This can open your dialer when running on a device.')
          }
          onSelectTab={(tab) => setHomeTab(tab)}
        />
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          {screen !== 'verify' && (
            <View style={styles.headerRow}>
              {screen === 'register' ? (
                <TouchableOpacity style={styles.backButton} onPress={() => setScreen('login')}>
                  <Ionicons name="chevron-back" size={22} color="#0F172A" />
                </TouchableOpacity>
              ) : (
                <View style={styles.backButtonPlaceholder} />
              )}
              <Text style={styles.headerTitleLarge}>{headerTitle}</Text>
              <View style={styles.backButtonPlaceholder} />
            </View>
          )}

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
                handleHomeAction('Google Login', 'Google sign-in will be available in a future update.')
              }
              onAppleLogin={() =>
                handleHomeAction('Apple Login', 'Apple sign-in will be available in a future update.')
              }
            />
          ) : screen === 'register' ? (
            <RegisterScreen
              showPassword={showPassword}
              onTogglePassword={() => setShowPassword((prev) => !prev)}
              onHaveAccount={() => setScreen('login')}
              onRegister={handleRegisterSuccess}
              onOpenTerms={() =>
                handleHomeAction('Terms of Service', 'Terms page will be connected in a future update.')
              }
              onOpenPrivacy={() =>
                handleHomeAction('Privacy Policy', 'Privacy page will be connected in a future update.')
              }
            />
          ) : (
            <VerificationScreen
              email={verificationSession.email}
              tenantId={verificationSession.tenantId}
              onBack={() => setScreen('register')}
              onVerify={handleVerifyAccount}
              onResend={handleResendCode}
              isVerifying={isVerifying || isSendingCode}
            />
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
