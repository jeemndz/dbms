import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { FontAwesome, Ionicons } from '@expo/vector-icons';
import { styles } from '../styles';

export default function RegisterScreen({
  showPassword,
  onTogglePassword,
  onHaveAccount,
  onRegister,
  onOpenTerms,
  onOpenPrivacy,
}) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const getErrorMessage = (error, fallbackMessage) => {
    const status = Number(error?.response?.status || 0);
    const responseData = error?.response?.data;

    if (typeof responseData === 'string') {
      const withoutHtml = responseData.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      if (withoutHtml && !withoutHtml.toLowerCase().includes('404 not found')) {
        return withoutHtml;
      }
    }

    if (status === 404) {
      return 'API endpoint not found (404). Please check deployment path.';
    }

    return (
      error?.response?.data?.message ||
      error?.message ||
      fallbackMessage
    );
  };

  const handleRegister = async () => {
    if (!firstName || !lastName || !username || !email || !address || !phone || !password || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields.');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      if (onRegister) {
        await onRegister({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          username: username.trim(),
          email: email.trim(),
          address: address.trim(),
          phone: phone.trim(),
          password,
        });
      } else {
        Alert.alert('Error', 'Registration flow is not connected.');
      }
    } catch (error) {
      console.log(error);
      const serverMessage = getErrorMessage(error, 'Unable to connect to server.');
      Alert.alert('Error', String(serverMessage));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.keyboardWrapper}
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
        <Text style={styles.pageTitle}>Create Account</Text>
        <Text style={styles.pageSubtitle}>
          Join Rapid Repair to get your devices fixed quickly and track your repairs.
        </Text>

        <View style={styles.form}>
        {/* Name Fields */}
        <View style={styles.rowGroup}>
          <View style={[styles.halfField, styles.halfFieldSpacing]}>
            <Text style={styles.fieldLabel}>First Name</Text>
            <View style={styles.inputWithIcon}>
              <FontAwesome name="user" size={18} color="#9AA3B1" style={styles.inputIcon} />
              <TextInput
                value={firstName}
                onChangeText={setFirstName}
                placeholder="First Name"
                placeholderTextColor="#9AA3B1"
                style={styles.inputWithIconField}
                autoCapitalize="words"
                textContentType="givenName"
              />
            </View>
          </View>

          <View style={styles.halfField}>
            <Text style={styles.fieldLabel}>Last Name</Text>
            <View style={styles.inputWithIcon}>
              <FontAwesome name="user" size={18} color="#9AA3B1" style={styles.inputIcon} />
              <TextInput
                value={lastName}
                onChangeText={setLastName}
                placeholder="Last Name"
                placeholderTextColor="#9AA3B1"
                style={styles.inputWithIconField}
                autoCapitalize="words"
                textContentType="familyName"
              />
            </View>
          </View>
        </View>

        {/* Email */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Email Address</Text>
          <View style={styles.inputWithIcon}>
            <FontAwesome name="envelope" size={18} color="#9AA3B1" style={styles.inputIcon} />
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="name@example.com"
              placeholderTextColor="#9AA3B1"
              style={styles.inputWithIconField}
              autoCapitalize="none"
              keyboardType="email-address"
              textContentType="emailAddress"
            />
          </View>
        </View>

        {/* Username */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Username</Text>
          <View style={styles.inputWithIcon}>
            <FontAwesome name="at" size={18} color="#9AA3B1" style={styles.inputIcon} />
            <TextInput
              value={username}
              onChangeText={setUsername}
              placeholder="username"
              placeholderTextColor="#9AA3B1"
              style={styles.inputWithIconField}
              autoCapitalize="none"
              textContentType="username"
            />
          </View>
        </View>

        {/* Address */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Address</Text>
          <View style={styles.inputWithIcon}>
            <FontAwesome name="map-marker" size={18} color="#9AA3B1" style={styles.inputIcon} />
            <TextInput
              value={address}
              onChangeText={setAddress}
              placeholder="House No, Street, Barangay, City"
              placeholderTextColor="#9AA3B1"
              style={styles.inputWithIconField}
              autoCapitalize="words"
              textContentType="fullStreetAddress"
            />
          </View>
        </View>

        {/* Phone */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Phone Number</Text>
          <View style={styles.inputWithIcon}>
            <FontAwesome name="phone" size={18} color="#9AA3B1" style={styles.inputIcon} />
            <TextInput
              value={phone}
              onChangeText={setPhone}
              placeholder="09XXXXXXXXX"
              placeholderTextColor="#9AA3B1"
              style={styles.inputWithIconField}
              keyboardType="phone-pad"
              textContentType="telephoneNumber"
            />
          </View>
        </View>

        {/* Password */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Password</Text>
          <View style={styles.passwordRow}>
            <View style={[styles.inputWithIcon, styles.passwordInputWrapper]}>
              <FontAwesome name="lock" size={18} color="#9AA3B1" style={styles.inputIcon} />
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="Create a password"
                placeholderTextColor="#9AA3B1"
                style={styles.inputWithIconField}
                secureTextEntry={!showPassword}
                textContentType="newPassword"
              />
            </View>
            <TouchableOpacity onPress={onTogglePassword} style={styles.eyeButtonRegister}>
              <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={20} color="#6B7280" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Confirm Password */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Confirm Password</Text>
          <View style={styles.passwordRow}>
            <View style={[styles.inputWithIcon, styles.passwordInputWrapper]}>
              <FontAwesome name="lock" size={18} color="#9AA3B1" style={styles.inputIcon} />
              <TextInput
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Re-enter your password"
                placeholderTextColor="#9AA3B1"
                style={styles.inputWithIconField}
                secureTextEntry={!showPassword}
                textContentType="newPassword"
              />
            </View>
            <TouchableOpacity onPress={onTogglePassword} style={styles.eyeButtonRegister}>
              <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={20} color="#6B7280" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Create Account Button */}
        <TouchableOpacity
          style={styles.primaryButton}
          activeOpacity={0.85}
          onPress={handleRegister}
          disabled={loading}
        >
          <Text style={styles.primaryButtonText}>
            {loading ? 'Creating Account...' : 'Continue'}
          </Text>
        </TouchableOpacity>

        <Text style={styles.termsText}>
          By signing up, you agree to our{' '}
          <Text
            style={styles.linkText}
            onPress={
              onOpenTerms ||
              (() => Alert.alert('Terms of Service', 'Terms page is not connected yet.'))
            }
          >
            Terms of Service
          </Text>{' '}
          and{' '}
          <Text
            style={styles.linkText}
            onPress={
              onOpenPrivacy ||
              (() => Alert.alert('Privacy Policy', 'Privacy page is not connected yet.'))
            }
          >
            Privacy Policy
          </Text>
          .
        </Text>

        {/* Already have account */}
        <View style={[styles.bottomRow, styles.bottomRowRegister]}>
          <Text style={styles.bottomText}>Already have an account? </Text>
          <TouchableOpacity onPress={onHaveAccount}>
            <Text style={styles.bottomLink}>Log in</Text>
          </TouchableOpacity>
        </View>
      </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
