import { useMemo, useRef, useState } from 'react';
import {
  Alert,
  Pressable,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { styles } from '../styles';

const CODE_LENGTH = 6;

const maskEmail = (email) => {
  const value = String(email || '').trim();
  const atIndex = value.indexOf('@');

  if (atIndex <= 1) {
    return value || 'your email';
  }

  const name = value.slice(0, atIndex);
  const domain = value.slice(atIndex);
  const visibleName = `${name[0]}${'*'.repeat(Math.max(name.length - 2, 1))}${name[name.length - 1]}`;

  return `${visibleName}${domain}`;
};

export default function VerificationScreen({
  email,
  tenantId,
  onBack,
  onVerify,
  onResend,
  isVerifying,
}) {
  const [code, setCode] = useState('');
  const otpInputRef = useRef(null);

  const maskedEmail = useMemo(() => maskEmail(email), [email]);

  const handleCodeChange = (value) => {
    const digitsOnly = value.replace(/\D/g, '').slice(0, CODE_LENGTH);
    setCode(digitsOnly);
  };

  const handleVerify = async () => {
    if (code.length !== CODE_LENGTH) {
      Alert.alert('Invalid Code', 'Please enter the full 6-digit verification code.');
      return;
    }

    if (onVerify) {
      await onVerify(code);
    }
  };

  const handleResend = () => {
    setCode('');
    if (onResend) {
      onResend();
    }
    otpInputRef.current?.focus();
  };

  return (
    <View style={styles.verifyContainer}>
      <View style={styles.verifyHeader}>
        <TouchableOpacity style={styles.verifyBackButton} onPress={onBack} activeOpacity={0.85}>
          <Ionicons name="arrow-back" size={28} color="#0B1A37" />
        </TouchableOpacity>
        <Text style={styles.verifyHeaderTitle}>Verify Your Account</Text>
        <View style={styles.verifyHeaderSpacer} />
      </View>

      <View style={styles.verifyDivider} />

      <Text style={styles.verifyTitle}>Almost there.</Text>
      <Text style={styles.verifySubtitle}>
        We've sent a 6-digit verification code to {maskedEmail}. Please enter it below to complete
        your sign-up.
      </Text>
      <Text style={styles.verifyTenantMeta}>Tenant ID: {tenantId}</Text>

      <Pressable style={styles.otpBoxesRow} onPress={() => otpInputRef.current?.focus()}>
        {Array.from({ length: CODE_LENGTH }).map((_, index) => {
          const char = code[index] || '';
          const isFocused = code.length === index;

          return (
            <View
              key={`otp-cell-${index}`}
              style={[
                styles.otpCell,
                isFocused && styles.otpCellFocused,
                char ? styles.otpCellFilled : null,
              ]}
            >
              <Text style={styles.otpCellText}>{char}</Text>
            </View>
          );
        })}
      </Pressable>

      <TextInput
        ref={otpInputRef}
        value={code}
        onChangeText={handleCodeChange}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        maxLength={CODE_LENGTH}
        style={styles.otpHiddenInput}
        autoFocus
      />

      <TouchableOpacity
        style={styles.verifyButton}
        onPress={handleVerify}
        activeOpacity={0.88}
        disabled={isVerifying}
      >
        <Text style={styles.verifyButtonText}>{isVerifying ? 'Verifying...' : 'Verify Account'}</Text>
      </TouchableOpacity>

      <Text style={styles.verifyResendLabel}>Didn't receive the code?</Text>
      <TouchableOpacity onPress={handleResend} activeOpacity={0.85}>
        <Text style={styles.verifyResendLink}>Resend</Text>
      </TouchableOpacity>
    </View>
  );
}
