import { useState } from 'react';
import axios from 'axios';
import {
  Alert,
  ImageBackground,
  Text,
  TextInput,
  TouchableOpacity,
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
              onPress={
                onForgotPassword ||
                (() => Alert.alert('Forgot Password', 'Password recovery is not available yet.'))
              }
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
    </>
  );
}
