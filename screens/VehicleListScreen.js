import { useState, useEffect } from 'react';
import {
  Alert,
  ImageBackground,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { styles } from '../styles';

export default function VehicleListScreen({
  currentUser,
  vehicles: vehiclesProp = [],
  isVehiclesLoading: loadingProp,
  tenantID = 1,
  onRefreshVehicles,
  onCreateVehicle,
  onSelectTab,
}) {
  const [vehicles, setVehicles] = useState(Array.isArray(vehiclesProp) ? vehiclesProp : []);
  const [isLoading, setIsLoading] = useState(Boolean(loadingProp));

  useEffect(() => {
    setVehicles(Array.isArray(vehiclesProp) ? vehiclesProp : []);
  }, [vehiclesProp]);

  useEffect(() => {
    setIsLoading(Boolean(loadingProp));
  }, [loadingProp]);

  useEffect(() => {
    if (onRefreshVehicles) {
      onRefreshVehicles();
    }
  }, [tenantID]);

  const displayName = currentUser?.fullName || currentUser?.name || currentUser?.username || 'User';

  const getVehicleImage = (vehicle) => {
    const brand = String(vehicle?.brand || '').toLowerCase();

    if (brand === 'tesla') {
      return 'https://images.unsplash.com/photo-1605559424843-9e4c3ca4b786?auto=format&fit=crop&w=1200&q=80';
    }

    if (brand === 'toyota') {
      return 'https://images.unsplash.com/photo-1552820728-8ac41f1ce891?auto=format&fit=crop&w=1200&q=80';
    }

    return 'https://images.unsplash.com/photo-1598032893045-e4568fa2bd5f?auto=format&fit=crop&w=1200&q=80';
  };

  const getVehicleYear = (vehicle) => vehicle?.year_model || vehicle?.year || 'N/A';
  const getVehicleName = (vehicle) => `${vehicle?.brand || ''} ${vehicle?.model || ''}`.trim() || 'Vehicle';

  const handleVehiclePress = (vehicle) => {
    Alert.alert(
      getVehicleName(vehicle),
      `Plate: ${vehicle?.plate_number || 'N/A'}\nColor: ${vehicle?.color || 'N/A'}\nStatus: ${vehicle?.status || 'Active'}`,
      [{ text: 'Close', style: 'cancel' }]
    );
  };

  const handleAddVehicle = () => {
    if (onSelectTab) {
      onSelectTab('addVehicle');
      return;
    }

    if (onCreateVehicle) {
      Alert.alert('Add Vehicle', 'Use the Add Vehicle screen to register a car.');
      return;
    }

    Alert.alert('Add Vehicle', 'Add Vehicle screen is not connected yet.');
  };

  return (
    <View style={styles.vehicleListContainer}>
      <ScrollView contentContainerStyle={styles.vehicleListScrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.vehicleListHeaderRow}>
          <TouchableOpacity
            style={styles.vehicleListBackButton}
            onPress={() => onSelectTab && onSelectTab('home')}
            activeOpacity={0.85}
          >
            <Ionicons name="arrow-back" size={22} color="#0F172A" />
          </TouchableOpacity>

          <Text style={styles.vehicleListHeaderTitle}>My Vehicles</Text>
          <View style={styles.vehicleListBackButtonSpacer} />
        </View>

        <View style={styles.vehicleListHero}>
          <Text style={styles.vehicleListTitle}>Garage</Text>
          <Text style={styles.vehicleListSubtitle}>Manage your registered vehicles and maintenance schedules.</Text>
        </View>

        {isLoading ? (
          <View style={styles.vehicleListLoadingCard}>
            <Text style={styles.vehicleListLoadingText}>Loading vehicles...</Text>
          </View>
        ) : vehicles.length === 0 ? (
          <TouchableOpacity style={styles.vehicleListAddCard} onPress={handleAddVehicle} activeOpacity={0.88}>
            <View style={styles.vehicleListAddIconWrap}>
              <Ionicons name="add" size={38} color="#FFFFFF" />
            </View>
            <Text style={styles.vehicleListAddTitle}>Add New Vehicle</Text>
            <Text style={styles.vehicleListAddSubtitle}>
              Register another car to your digital garage for easy booking.
            </Text>
          </TouchableOpacity>
        ) : (
          vehicles.map((vehicle) => (
            <TouchableOpacity
              key={String(vehicle.vehicle_id)}
              style={styles.vehicleListCard}
              onPress={() => handleVehiclePress(vehicle)}
              activeOpacity={0.88}
            >
              <ImageBackground source={{ uri: getVehicleImage(vehicle) }} style={styles.vehicleListImage}>
                <View style={styles.vehicleListImageOverlay} />
                <TouchableOpacity
                  style={styles.vehicleListMenuButton}
                  activeOpacity={0.7}
                  onPress={() => handleVehiclePress(vehicle)}
                >
                  <Ionicons name="ellipsis-vertical" size={14} color="#FFFFFF" />
                </TouchableOpacity>
              </ImageBackground>

              <View style={styles.vehicleListContent}>
                <View style={styles.vehicleListTopRow}>
                  <Text style={styles.vehicleListYear}>{getVehicleYear(vehicle)}</Text>
                  <View style={styles.vehicleListStatusBadge}>
                    <Text style={styles.vehicleListStatusText}>{String(vehicle?.status || 'Active').toUpperCase()}</Text>
                  </View>
                </View>

                <Text style={styles.vehicleListName}>{getVehicleName(vehicle)}</Text>

                <View style={styles.vehicleListMetaRow}>
                  <View style={styles.vehicleListMetaItem}>
                    <Ionicons name="id-card-outline" size={16} color="#475569" />
                    <Text style={styles.vehicleListMetaText}>{vehicle?.plate_number || 'N/A'}</Text>
                  </View>

                  <View style={styles.vehicleListMetaItem}>
                    <Ionicons name="color-fill" size={16} color="#475569" />
                    <Text style={styles.vehicleListMetaText}>{vehicle?.color || 'No color'}</Text>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}

        <TouchableOpacity style={styles.vehicleListAddCard} onPress={handleAddVehicle} activeOpacity={0.88}>
          <View style={styles.vehicleListAddIconWrap}>
            <Ionicons name="add" size={38} color="#FFFFFF" />
          </View>
          <Text style={styles.vehicleListAddTitle}>Add New Vehicle</Text>
          <Text style={styles.vehicleListAddSubtitle}>
            Register another car to your digital garage for easy booking.
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
