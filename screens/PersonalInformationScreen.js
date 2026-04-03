import { Alert, Image, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { styles } from '../styles';

const DEFAULT_PERSONAL_INFO = {
  fullName: 'Alex Johnson',
  email: 'alex.j@rapidrepair.com',
  phone: '+1 (555) 000-1234',
  address: '123 Tech Lane, Silicon Valley, CA 94025, United States',
  joinedOn: 'Member since Oct 2023',
};

export default function PersonalInformationScreen({ currentUser, onSelectTab }) {
  const profileName = currentUser?.fullName || currentUser?.name || DEFAULT_PERSONAL_INFO.fullName;
  const email = currentUser?.email || DEFAULT_PERSONAL_INFO.email;

  return (
    <View style={styles.personalInfoContainer}>
      <ScrollView
        contentContainerStyle={styles.personalInfoScrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.personalInfoHeaderRow}>
          <TouchableOpacity
            style={styles.personalInfoBackButton}
            onPress={() => onSelectTab && onSelectTab('profile')}
            activeOpacity={0.85}
          >
            <Ionicons name="arrow-back" size={24} color="#0F1F3A" />
          </TouchableOpacity>

          <Text style={styles.personalInfoHeaderTitle}>Personal Information</Text>

          <TouchableOpacity
            style={styles.personalInfoInfoButton}
            onPress={() => Alert.alert('Information', 'This screen can be connected to an edit form.')}
            activeOpacity={0.85}
          >
            <Ionicons name="information" size={16} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <View style={styles.personalInfoDivider} />

        <View style={styles.personalInfoIdentitySection}>
          <View style={styles.personalInfoAvatarWrap}>
            <Image
              source={{ uri: 'https://i.pravatar.cc/360?img=59' }}
              style={styles.personalInfoAvatar}
            />
            <TouchableOpacity
              style={styles.personalInfoAvatarEdit}
              onPress={() => Alert.alert('Edit Avatar', 'Avatar update can be connected here.')}
              activeOpacity={0.85}
            >
              <Ionicons name="create" size={12} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <Text style={styles.personalInfoName}>{profileName}</Text>
          <Text style={styles.personalInfoMemberMeta}>{DEFAULT_PERSONAL_INFO.joinedOn}</Text>
        </View>

        <View style={styles.personalInfoFieldGroup}>
          <Text style={styles.personalInfoFieldLabel}>Full Name</Text>
          <View style={styles.personalInfoFieldCard}>
            <Ionicons name="person" size={20} color="#8FA0B7" />
            <Text style={styles.personalInfoFieldValue}>{profileName}</Text>
          </View>
        </View>

        <View style={styles.personalInfoFieldGroup}>
          <Text style={styles.personalInfoFieldLabel}>Email Address</Text>
          <View style={styles.personalInfoFieldCard}>
            <Ionicons name="mail" size={20} color="#8FA0B7" />
            <Text style={styles.personalInfoFieldValue}>{email}</Text>
          </View>
        </View>

        <View style={styles.personalInfoFieldGroup}>
          <Text style={styles.personalInfoFieldLabel}>Phone Number</Text>
          <View style={styles.personalInfoFieldCard}>
            <Ionicons name="call" size={20} color="#8FA0B7" />
            <Text style={styles.personalInfoFieldValue}>{DEFAULT_PERSONAL_INFO.phone}</Text>
          </View>
        </View>

        <View style={styles.personalInfoFieldGroupLast}>
          <Text style={styles.personalInfoFieldLabel}>Default Service Address</Text>
          <View style={styles.personalInfoFieldCardLarge}>
            <Ionicons name="location" size={20} color="#8FA0B7" style={styles.personalInfoLocationIcon} />
            <Text style={styles.personalInfoFieldValueAddress}>{DEFAULT_PERSONAL_INFO.address}</Text>
          </View>
        </View>
      </ScrollView>

      <View style={styles.personalInfoFooter}>
        <TouchableOpacity
          style={styles.personalInfoSaveButton}
          onPress={() => Alert.alert('Saved', 'Personal information has been updated.')}
          activeOpacity={0.9}
        >
          <Ionicons name="save" size={20} color="#FFFFFF" />
          <Text style={styles.personalInfoSaveButtonText}>Save Changes</Text>
        </TouchableOpacity>
        <Text style={styles.personalInfoUpdatedText}>Last updated 2 days ago</Text>
      </View>
    </View>
  );
}
