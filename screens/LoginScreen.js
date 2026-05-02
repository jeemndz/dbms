import { useState } from 'react';
import axios from 'axios';
import {
  Alert,
  ImageBackground,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  View,
} from 'react-native';
import { FontAwesome, Ionicons } from '@expo/vector-icons';
import { styles } from '../styles';

const HEADER_IMAGE = {
  uri: 'https://images.unsplash.com/photo-1525609004556-c46c7d6cf023?auto=format&fit=crop&w=1200&q=80',
};

export default function LoginScreen({
  showPassword,
  onTogglePassword,
  onCreateAccount,
  onLogin,
  onForgotPassword,
}) {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [forgotModalVisible, setForgotModalVisible] = useState(false);
  const [forgotIdentifier, setForgotIdentifier] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);

  const handleLogin = async () => {
    const normalizedIdentifier = identifier.trim();
    const rawPassword = password;

    if (!normalizedIdentifier || !rawPassword) {
      Alert.alert('Error', 'Please enter email/username and password');
      return;
    }

    try {
      const normalizedEmail = normalizedIdentifier.toLowerCase();

      const payload = new URLSearchParams();
      // Send multiple common key names to match different PHP handlers.
      payload.append('email', normalizedIdentifier);
      payload.append('username', normalizedIdentifier);
      payload.append('identifier', normalizedIdentifier);
      payload.append('login', normalizedIdentifier);
      payload.append('password', rawPassword);

      const requests = [
        {
          data: payload,
          config: {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
          },
        },
        {
          data: {
            email: normalizedIdentifier,
            emailLower: normalizedEmail,
            username: normalizedIdentifier,
            identifier: normalizedIdentifier,
            login: normalizedIdentifier,
            password: rawPassword,
          },
          config: {
            headers: {
              'Content-Type': 'application/json',
            },
          },
        },
      ];

      let lastMessage = 'Login failed. Please try again.';
      for (const request of requests) {
        const response = await axios.post(
          'https://rapidrepair-gygpcbczgyg0czek.southeastasia-01.azurewebsites.net/userlogin.php',
          request.data,
          request.config
        );

        const status = String(response?.data?.status || '').trim().toLowerCase();
        const message = response?.data?.message || lastMessage;

        if (status === 'success') {
          const firstRow = Array.isArray(response?.data?.data) ? response.data.data[0] : null;
          const resolvedTenantID =
            response?.data?.tenantID ||
            response?.data?.tenantId ||
            response?.data?.tenant_id ||
            response?.data?.tenantid ||
            response?.data?.TenantID ||
            response?.data?.user?.tenantID ||
            response?.data?.user?.tenantId ||
            response?.data?.user?.tenant_id ||
            response?.data?.user?.tenantid ||
            firstRow?.tenantID ||
            firstRow?.tenantId ||
            firstRow?.tenant_id ||
            firstRow?.tenantid ||
            1;

          const fullName =
            response?.data?.fullName ||
            response?.data?.name ||
            response?.data?.user?.fullName ||
            response?.data?.user?.name ||
            response?.data?.username ||
            normalizedIdentifier;

          const loggedInUser = {
            fullName,
            email:
              response?.data?.email || response?.data?.user?.email || normalizedEmail,
            username:
              response?.data?.username || response?.data?.user?.username || normalizedIdentifier,
            user_id:
              response?.data?.user_id || response?.data?.user?.user_id || response?.data?.id || response?.data?.user?.id || 0,
            tenantID: Number(resolvedTenantID) || 1,
          };

          Alert.alert('Login Successful', `Welcome ${fullName}`);
          onLogin && onLogin(loggedInUser);
          return;
        }

        lastMessage = message;
      }

      Alert.alert('Login Failed', lastMessage);
    } catch (error) {
      console.log(error);
      const serverMessage =
        error?.response?.data?.message || error?.response?.data || 'Unable to connect to server';
      Alert.alert('Error', String(serverMessage));
    }
  };

  const openForgotModal = () => {
    setForgotIdentifier('');
    setForgotModalVisible(true);
  };

  const closeForgotModal = () => {
    setForgotModalVisible(false);
    setForgotLoading(false);
  };

  const handleForgotSubmit = async () => {
    const normalized = (forgotIdentifier || '').trim();
    if (!normalized) {
      Alert.alert('Error', 'Please enter your email or username');
      return;
    }

    setForgotLoading(true);
    try {
      const payload = new URLSearchParams();
      payload.append('email', normalized);
      payload.append('username', normalized);
      payload.append('identifier', normalized);
      payload.append('login', normalized);

      // Attempt form-encoded first, then JSON if needed
      const endpoints = [
        'https://rapidrepair-gygpcbczgyg0czek.southeastasia-01.azurewebsites.net/userforgot.php',
        'https://rapidrepair-gygpcbczgyg0czek.southeastasia-01.azurewebsites.net/forgot.php',
      ];

      let lastMessage = 'Unable to process password reset.';
      for (const ep of endpoints) {
        try {
          const resp = await axios.post(ep, payload, {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          });

          const status = String(resp?.data?.status || '').trim().toLowerCase();
          const message = resp?.data?.message || lastMessage;
          if (status === 'success') {
            Alert.alert('Password Reset', message || 'Check your email for reset instructions');
            closeForgotModal();
            return;
          }

          lastMessage = message;
        } catch (err) {
          // Try the JSON variant below if this fails for this endpoint
        }
      }

      // Try a JSON POST to the primary endpoint as a fallback
      try {
        const respJson = await axios.post(endpoints[0], {
          email: normalized,
          username: normalized,
          identifier: normalized,
        }, {
          headers: { 'Content-Type': 'application/json' },
        });

        const status = String(respJson?.data?.status || '').trim().toLowerCase();
        const message = respJson?.data?.message || lastMessage;
        if (status === 'success') {
          Alert.alert('Password Reset', message || 'Check your email for reset instructions');
          closeForgotModal();
          return;
        }

        Alert.alert('Password Reset', message || lastMessage);
      } catch (err) {
        const serverMessage = err?.response?.data?.message || err?.response?.data || 'Unable to contact server';
        Alert.alert('Error', String(serverMessage));
      }
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <>
      <Text style={styles.pageTitle}>Welcome</Text>
      <Text style={styles.pageSubtitle}>Log in to manage your repairs</Text>

      {/* Header Card with Image */}
      <View style={styles.headerCard}>
        <ImageBackground source={HEADER_IMAGE} style={styles.headerImage}>
          <View style={styles.headerOverlay} />
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>Expert Car Care</Text>
            <Text style={styles.headerSubtitle}>Fast, reliable, and professional</Text>
          </View>
        </ImageBackground>
      </View>

      {/* Form Fields */}
      <View style={styles.form}>
        {/* Email / Username */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Email or Username</Text>
          <TextInput
            value={identifier}
            onChangeText={setIdentifier}
            placeholder="Email or Username"
            placeholderTextColor="#9AA3B1"
            style={styles.input}
            autoCapitalize="none"
            keyboardType="default"
            textContentType="username"
          />
        </View>

        {/* Password */}
        <View style={styles.fieldGroup}>
          <View style={styles.fieldLabelRow}>
            <Text style={styles.fieldLabel}>Password</Text>
            <TouchableOpacity
                onPress={onForgotPassword || openForgotModal}
            >
              <Text style={styles.forgotText}>Forgot Password?</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.passwordRow}>
            <View style={[styles.inputWithIcon, styles.passwordInputWrapper]}>
              <FontAwesome name="lock" size={18} color="#9AA3B1" style={styles.inputIcon} />
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="Enter your password"
                placeholderTextColor="#9AA3B1"
                style={styles.inputWithIconField}
                secureTextEntry={!showPassword}
                textContentType="password"
              />
            </View>
            <TouchableOpacity onPress={onTogglePassword} style={styles.eyeButtonRegister}>
              <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={20} color="#6B7280" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Login Button (uses API) */}
        <TouchableOpacity style={styles.primaryButton} activeOpacity={0.85} onPress={handleLogin}>
          <Text style={styles.primaryButtonText}>Login</Text>
          <Ionicons name="arrow-forward" size={18} color="white" style={styles.buttonIcon} />
        </TouchableOpacity>



        {/* Create Account */}
        <View style={styles.bottomRow}>
          <Text style={styles.bottomText}>Don't have an account? </Text>
          <TouchableOpacity onPress={onCreateAccount}>
            <Text style={styles.bottomLink}>Create Account</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Modal visible={forgotModalVisible} animationType="slide" transparent>
        <View style={[styles.modalOverlay || {flex:1, backgroundColor:'rgba(0,0,0,0.4)', justifyContent:'center', padding:20}]}> 
          <View style={[styles.form, {maxHeight:320, borderRadius:8, backgroundColor:'#fff'}]}>
            <Text style={[styles.pageTitle, {marginBottom:8}]}>Reset Password</Text>
            <Text style={[styles.pageSubtitle, {marginBottom:12}]}>Enter your email or username</Text>

            <View style={styles.fieldGroup}>
              <TextInput
                value={forgotIdentifier}
                onChangeText={setForgotIdentifier}
                placeholder="Email or Username"
                placeholderTextColor="#9AA3B1"
                style={styles.input}
                autoCapitalize="none"
                keyboardType="default"
              />
            </View>

            <View style={{flexDirection:'row', justifyContent:'flex-end', gap:8}}>
              <TouchableOpacity onPress={closeForgotModal} style={[styles.secondaryButton || styles.primaryButton, {marginRight:8}]}> 
                <Text style={styles.primaryButtonText || {color:'#000'}}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleForgotSubmit} style={styles.primaryButton} disabled={forgotLoading}>
                {forgotLoading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={styles.primaryButtonText}>Send</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}
