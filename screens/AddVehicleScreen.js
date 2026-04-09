import { Alert, Modal, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { styles } from '../styles';

const fuelTypes = ['Gasoline', 'Diesel', 'Electric', 'Hybrid'];
const transmissionTypes = ['Manual', 'Automatic', 'CVT', 'DCT', 'AMT'];
const statuses = ['Active', 'Inactive'];

const phBrandsModels = {
  Toyota: ['Vios', 'Wigo', 'Raize', 'Rush', 'Yaris Cross', 'Corolla Altis', 'Corolla Cross', 'Camry', 'Innova', 'Fortuner', 'Hilux', 'Land Cruiser Prado'],
  Mitsubishi: ['Mirage G4', 'Xpander', 'Xpander Cross', 'Montero Sport', 'Strada', 'L300', 'Outlander PHEV'],
  Nissan: ['Almera', 'Navara', 'Terra', 'Kicks e-POWER', 'Urvan', 'Patrol', 'Z'],
  Honda: ['Brio', 'City', 'Civic', 'Accord', 'HR-V', 'CR-V', 'BR-V'],
  Suzuki: ['S-Presso', 'Celerio', 'Dzire', 'Ertiga', 'XL7', 'Jimny', 'Carry'],
  Isuzu: ['D-MAX', 'mu-X', 'Traviz'],
  Ford: ['Ranger', 'Everest', 'Territory', 'Mustang'],
  Hyundai: ['Reina', 'Accent', 'Stargazer', 'Staria', 'Tucson', 'Santa Fe', 'Creta', 'Ioniq 5'],
  Kia: ['Soluto', 'Sonet', 'Seltos', 'Sportage', 'Carnival', 'EV6'],
  Mazda: ['Mazda2', 'Mazda3', 'CX-3', 'CX-30', 'CX-5', 'CX-8', 'BT-50', 'MX-5'],
  Subaru: ['Forester', 'Outback', 'XV', 'WRX', 'BRZ', 'Evoltis'],
  Chevrolet: ['Tracker', 'Trailblazer', 'Suburban', 'Tahoe'],
  Geely: ['Coolray', 'Okavango', 'Azkarra', 'Emgrand', 'GX3 Pro'],
  MG: ['MG5', 'ZS', 'HS', 'RX5', 'GT', 'One', 'Marvel R', '4 EV'],
  Changan: ['Alsvin', 'CS35 Plus', 'CS55 Plus', 'CS75 Plus', 'UNI-T', 'UNI-K'],
  GAC: ['Empow', 'Emzoom', 'GS3 Emzoom', 'GS8', 'M6 Pro', 'M8'],
  Chery: ['Tiggo 2 Pro', 'Tiggo 5X Pro', 'Tiggo 7 Pro', 'Tiggo 8 Pro'],
  Jetour: ['Ice Cream EV', 'X70', 'X70 Plus', 'Dashing', 'T2'],
  BYD: ['Seagull', 'Dolphin', 'Atto 3', 'Seal', 'Han EV', 'Tang EV'],
  Foton: ['Toplander', 'Thunder', 'Transvan', 'Traveller', 'Harabas'],
  Volkswagen: ['Santana', 'Lavida', 'T-Cross', 'Tharu', 'Tiguan', 'Lamando'],
  Peugeot: ['2008', '3008', '5008', 'Landtrek'],
  BMW: ['2 Series', '3 Series', '5 Series', 'X1', 'X3', 'X5', 'iX', 'i4'],
  'Mercedes-Benz': ['A-Class', 'C-Class', 'E-Class', 'GLA', 'GLC', 'GLE', 'EQE', 'EQS'],
  Audi: ['A3', 'A4', 'A6', 'Q2', 'Q3', 'Q5', 'Q7', 'e-tron'],
  Lexus: ['IS', 'ES', 'LS', 'UX', 'NX', 'RX', 'GX', 'LX'],
  Volvo: ['S60', 'S90', 'XC40', 'XC60', 'XC90', 'C40 Recharge'],
  Mini: ['3-Door', '5-Door', 'Clubman', 'Countryman', 'Cooper SE'],
  'Land Rover': ['Range Rover Evoque', 'Range Rover Velar', 'Range Rover Sport', 'Defender', 'Discovery'],
  Jaguar: ['XE', 'XF', 'F-PACE', 'E-PACE', 'I-PACE'],
  Porsche: ['Macan', 'Cayenne', 'Panamera', 'Taycan', '911'],
  'Lynk and Co': ['01', '03', '05', '06', '09'],
  Omoda: ['C5', 'E5'],
  Jaecoo: ['J7', 'J8'],
  JMC: ['Vigus', 'Grand Avenue', 'EV Pickup'],
  Maxus: ['T60', 'T90', 'G10', 'V80', 'Mifa 9'],
};

const getToday = () => new Date().toISOString().slice(0, 10);

export default function AddVehicleScreen({ onCreateVehicle, onSelectTab }) {
  const [vehicleForm, setVehicleForm] = useState({
    make: '',
    model: '',
    year: '',
    fuelType: fuelTypes[0],
    transmissionType: transmissionTypes[0],
    engineNumber: '',
    mileage: '',
    licensePlate: '',
    color: '',
    vin: '',
    status: statuses[0],
    dateAdded: getToday(),
  });

  const [isSaving, setIsSaving] = useState(false);
  const [openDropdown, setOpenDropdown] = useState(null);

  const brandOptions = useMemo(() => Object.keys(phBrandsModels), []);
  const modelOptions = useMemo(
    () => (vehicleForm.make ? phBrandsModels[vehicleForm.make] || [] : []),
    [vehicleForm.make]
  );

  const yearIsValid = useMemo(() => /^\d{4}$/.test(vehicleForm.year), [vehicleForm.year]);

  const isValid = useMemo(
    () =>
      vehicleForm.make.trim() &&
      vehicleForm.model.trim() &&
      yearIsValid &&
      vehicleForm.licensePlate.trim(),
    [vehicleForm.make, vehicleForm.model, vehicleForm.licensePlate, yearIsValid]
  );

  const updateField = (field, value) => {
    setVehicleForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const cycleOption = (field, options) => {
    const currentIndex = options.indexOf(vehicleForm[field]);
    const nextIndex = currentIndex >= options.length - 1 ? 0 : currentIndex + 1;
    updateField(field, options[nextIndex]);
  };

  const selectOption = (field, value) => {
    updateField(field, value);
    setOpenDropdown(null);
  };

  const selectBrand = (brand) => {
    setVehicleForm((prev) => ({
      ...prev,
      make: brand,
      model: '',
    }));
    setOpenDropdown(null);
  };

  const selectModel = (model) => {
    updateField('model', model);
    setOpenDropdown(null);
  };

  const handleSaveVehicle = async () => {
    if (!vehicleForm.make.trim() || !vehicleForm.model.trim() || !vehicleForm.licensePlate.trim()) {
      Alert.alert('Missing Required Fields', 'Please fill in Make, Model, and License Plate.');
      return;
    }

    if (!yearIsValid) {
      Alert.alert('Invalid Year', 'Please enter a valid 4-digit year.');
      return;
    }

    if (!onCreateVehicle) {
      Alert.alert('Vehicle Saved', `${vehicleForm.make} ${vehicleForm.model} has been added.`);
      if (onSelectTab) {
        onSelectTab('profile');
      }
      return;
    }

    setIsSaving(true);

    try {
      await onCreateVehicle(vehicleForm);
      Alert.alert('Vehicle Saved', `${vehicleForm.make} ${vehicleForm.model} has been added.`);
      if (onSelectTab) {
        onSelectTab('profile');
      }
    } catch (error) {
      const serverMessage =
        error?.response?.data?.message ||
        error?.response?.data ||
        error?.message ||
        'Unable to save vehicle.';

      Alert.alert('Save Failed', String(serverMessage));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View style={styles.addVehicleContainer}>
      <ScrollView contentContainerStyle={styles.addVehicleScrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.addVehicleHeaderRow}>
          <TouchableOpacity
            style={styles.addVehicleBackButton}
            onPress={() => onSelectTab && onSelectTab('profile')}
            activeOpacity={0.85}
          >
            <Ionicons name="arrow-back" size={24} color="#0F1F3A" />
          </TouchableOpacity>

          <Text style={styles.addVehicleHeaderTitle}>Vehicle Registration</Text>
          <View style={styles.addVehicleHeaderSpacer} />
        </View>

        <View style={styles.addVehicleDivider} />

        <Text style={styles.addVehicleFieldLabel}>Make</Text>
        <TouchableOpacity
          style={styles.addVehicleSelectRow}
          onPress={() => setOpenDropdown('brand')}
          activeOpacity={0.85}
        >
          <Text
            style={[
              styles.addVehicleSelectText,
              !vehicleForm.make && styles.addVehicleSelectPlaceholder,
            ]}
          >
            {vehicleForm.make || 'Select vehicle make'}
          </Text>
          <Ionicons name="chevron-down" size={22} color="#5D6A7F" />
        </TouchableOpacity>

        <Text style={styles.addVehicleFieldLabel}>Model</Text>
        <TouchableOpacity
          style={[styles.addVehicleSelectRow, !vehicleForm.make && styles.addVehicleSelectRowDisabled]}
          onPress={() => {
            if (!vehicleForm.make) {
              Alert.alert('Select Make First', 'Please select a vehicle make before choosing a model.');
              return;
            }
            setOpenDropdown('model');
          }}
          activeOpacity={0.85}
        >
          <Text
            style={[
              styles.addVehicleSelectText,
              !vehicleForm.model && styles.addVehicleSelectPlaceholder,
            ]}
          >
            {vehicleForm.model || 'Select vehicle model'}
          </Text>
          <Ionicons name="chevron-down" size={22} color="#5D6A7F" />
        </TouchableOpacity>

        <Text style={styles.addVehicleFieldLabel}>Year *</Text>
        <TextInput
          value={vehicleForm.year}
          onChangeText={(value) => updateField('year', value.replace(/[^0-9]/g, '').slice(0, 4))}
          placeholder="e.g. 2022"
          placeholderTextColor="#8A9AB0"
          keyboardType="number-pad"
          style={styles.addVehicleInput}
          maxLength={4}
        />
        {!!vehicleForm.year && !yearIsValid && (
          <Text style={{ color: '#C62828', marginTop: 6, marginBottom: 8 }}>
            Year must be 4 digits.
          </Text>
        )}

        <Text style={styles.addVehicleFieldLabel}>Fuel Type</Text>
        <TouchableOpacity
          style={styles.addVehicleSelectRow}
          onPress={() => setOpenDropdown('fuelType')}
          activeOpacity={0.85}
        >
          <Text style={styles.addVehicleSelectText}>{vehicleForm.fuelType}</Text>
          <Ionicons name="chevron-down" size={22} color="#5D6A7F" />
        </TouchableOpacity>

        <Text style={styles.addVehicleFieldLabel}>Transmission Type</Text>
        <TouchableOpacity
          style={styles.addVehicleSelectRow}
          onPress={() => setOpenDropdown('transmissionType')}
          activeOpacity={0.85}
        >
          <Text style={styles.addVehicleSelectText}>{vehicleForm.transmissionType}</Text>
          <Ionicons name="chevron-down" size={22} color="#5D6A7F" />
        </TouchableOpacity>

        <Text style={styles.addVehicleFieldLabel}>Engine Number</Text>
        <TextInput
          value={vehicleForm.engineNumber}
          onChangeText={(value) => updateField('engineNumber', value.toUpperCase())}
          placeholder="e.g. ABC123456"
          placeholderTextColor="#8A9AB0"
          autoCapitalize="characters"
          style={styles.addVehicleInput}
        />

        <Text style={styles.addVehicleFieldLabel}>Mileage (km)</Text>
        <TextInput
          value={vehicleForm.mileage}
          onChangeText={(value) => updateField('mileage', value.replace(/[^0-9]/g, ''))}
          placeholder="e.g. 15000"
          placeholderTextColor="#8A9AB0"
          keyboardType="number-pad"
          style={styles.addVehicleInput}
        />

        <Text style={styles.addVehicleFieldLabel}>License Plate *</Text>
        <TextInput
          value={vehicleForm.licensePlate}
          onChangeText={(value) => updateField('licensePlate', value.toUpperCase())}
          placeholder="ABC-1234"
          placeholderTextColor="#8A9AB0"
          autoCapitalize="characters"
          style={styles.addVehicleInput}
        />

        <Text style={styles.addVehicleFieldLabel}>Color</Text>
        <TextInput
          value={vehicleForm.color}
          onChangeText={(value) => updateField('color', value)}
          placeholder="e.g. Silver"
          placeholderTextColor="#8A9AB0"
          style={styles.addVehicleInput}
        />

        <Text style={styles.addVehicleFieldLabel}>VIN (optional)</Text>
        <View style={styles.addVehicleVinWrap}>
          <TextInput
            value={vehicleForm.vin}
            onChangeText={(value) =>
              updateField('vin', value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 17))
            }
            placeholder="17-digit VIN"
            placeholderTextColor="#8A9AB0"
            autoCapitalize="characters"
            style={styles.addVehicleVinInput}
            maxLength={17}
          />
          <TouchableOpacity
            style={styles.addVehicleVinScanButton}
            onPress={() => Alert.alert('Scan VIN', 'VIN scanner can be connected here.')}
            activeOpacity={0.85}
          >
            <Ionicons name="camera" size={20} color="#10253F" />
          </TouchableOpacity>
        </View>

        <Text style={styles.addVehicleFieldLabel}>Status</Text>
        <TouchableOpacity
          style={styles.addVehicleSelectRow}
          onPress={() => setOpenDropdown('status')}
          activeOpacity={0.85}
        >
          <Text style={styles.addVehicleSelectText}>{vehicleForm.status}</Text>
          <Ionicons name="chevron-down" size={22} color="#5D6A7F" />
        </TouchableOpacity>

        <Text style={styles.addVehicleFieldLabel}>Date Added</Text>
        <TextInput
          value={vehicleForm.dateAdded}
          onChangeText={(value) => updateField('dateAdded', value)}
          placeholder="YYYY-MM-DD"
          placeholderTextColor="#8A9AB0"
          style={styles.addVehicleInput}
        />

        <View style={styles.addVehicleInfoCard}>
          <Ionicons
            name="information-circle"
            size={22}
            color="#6A7788"
            style={styles.addVehicleInfoIcon}
          />
          <Text style={styles.addVehicleInfoText}>
            Adding your VIN helps us identify parts specifically for your vehicle, ensuring more accurate
            repair estimates and maintenance schedules.
          </Text>
        </View>
      </ScrollView>

      <View style={styles.addVehicleFooter}>
        <TouchableOpacity
          style={[styles.addVehicleSaveButton, (!isValid || isSaving) && styles.addVehicleSaveButtonDisabled]}
          onPress={handleSaveVehicle}
          disabled={!isValid || isSaving}
          activeOpacity={0.9}
        >
          <Text style={styles.addVehicleSaveButtonText}>{isSaving ? 'Saving...' : 'Save Vehicle'}</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={!!openDropdown} transparent animationType="fade" onRequestClose={() => setOpenDropdown(null)}>
        <TouchableOpacity
          style={styles.addVehicleDropdownOverlay}
          activeOpacity={1}
          onPress={() => setOpenDropdown(null)}
        >
          <TouchableOpacity activeOpacity={1} style={styles.addVehicleDropdownCard} onPress={() => {}}>
            <Text style={styles.addVehicleDropdownTitle}>
              {openDropdown === 'brand' && 'Select Make'}
              {openDropdown === 'model' && 'Select Model'}
              {openDropdown === 'fuelType' && 'Select Fuel Type'}
              {openDropdown === 'transmissionType' && 'Select Transmission Type'}
              {openDropdown === 'status' && 'Select Status'}
            </Text>

            <ScrollView style={styles.addVehicleDropdownList} showsVerticalScrollIndicator={false}>
              {openDropdown === 'brand' &&
                brandOptions.map((option) => (
                  <TouchableOpacity
                    key={option}
                    style={styles.addVehicleDropdownItem}
                    onPress={() => selectBrand(option)}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.addVehicleDropdownItemText}>{option}</Text>
                  </TouchableOpacity>
                ))}

              {openDropdown === 'model' &&
                modelOptions.map((option) => (
                  <TouchableOpacity
                    key={option}
                    style={styles.addVehicleDropdownItem}
                    onPress={() => selectModel(option)}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.addVehicleDropdownItemText}>{option}</Text>
                  </TouchableOpacity>
                ))}

              {openDropdown === 'fuelType' &&
                fuelTypes.map((option) => (
                  <TouchableOpacity
                    key={option}
                    style={styles.addVehicleDropdownItem}
                    onPress={() => selectOption('fuelType', option)}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.addVehicleDropdownItemText}>{option}</Text>
                  </TouchableOpacity>
                ))}

              {openDropdown === 'transmissionType' &&
                transmissionTypes.map((option) => (
                  <TouchableOpacity
                    key={option}
                    style={styles.addVehicleDropdownItem}
                    onPress={() => selectOption('transmissionType', option)}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.addVehicleDropdownItemText}>{option}</Text>
                  </TouchableOpacity>
                ))}

              {openDropdown === 'status' &&
                statuses.map((option) => (
                  <TouchableOpacity
                    key={option}
                    style={styles.addVehicleDropdownItem}
                    onPress={() => selectOption('status', option)}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.addVehicleDropdownItemText}>{option}</Text>
                  </TouchableOpacity>
                ))}
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}