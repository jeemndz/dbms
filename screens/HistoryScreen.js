import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { styles } from '../styles';

const historyItems = [
  {
    id: 'r1',
    date: 'OCT 24, 2023',
    title: 'Full Brake Replacement',
    vehicle: '2018 Honda Civic',
    amount: '$486.40',
    status: 'Paid',
  },
  {
    id: 'r2',
    date: 'SEP 12, 2023',
    title: 'Synthetic Oil Change & Filter',
    vehicle: '2022 Tesla Model 3',
    amount: '$89.00',
    status: 'Paid',
  },
  {
    id: 'r3',
    date: 'AUG 05, 2023',
    title: 'Tire Rotation & Balance',
    vehicle: '2018 Honda Civic',
    amount: '$120.50',
    status: 'Paid',
  },
];

function HistoryItemCard({ item, onReceipt }) {
  return (
    <View style={historyStyles.card}>
      <View style={historyStyles.cardTopRow}>
        <View style={historyStyles.cardHeadLeft}>
          <Text style={historyStyles.cardDate}>{item.date}</Text>
          <Text style={historyStyles.cardTitle}>{item.title}</Text>
          <Text style={historyStyles.cardVehicle}>{item.vehicle}</Text>
        </View>
        <View style={historyStyles.cardHeadRight}>
          <Text style={historyStyles.cardAmount}>{item.amount}</Text>
          <View style={historyStyles.paidPill}>
            <Text style={historyStyles.paidPillText}>{item.status}</Text>
          </View>
        </View>
      </View>

      <View style={historyStyles.cardDivider} />

      <TouchableOpacity style={historyStyles.receiptRow} onPress={onReceipt} activeOpacity={0.85}>
        <Ionicons name="document-text-outline" size={20} color="#8FA0B8" />
        <Text style={historyStyles.receiptText}>View Digital Receipt</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function HistoryScreen({ activeTab = 'history', onSelectTab }) {
  const isTabActive = (tab) => activeTab === tab;

  return (
    <View style={historyStyles.container}>
      <ScrollView contentContainerStyle={historyStyles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={historyStyles.headerRow}>
          <TouchableOpacity style={historyStyles.iconButton} activeOpacity={0.85}>
            <Ionicons name="menu-outline" size={28} color="#111827" />
          </TouchableOpacity>

          <Text style={historyStyles.headerTitle}>Payments</Text>

          <TouchableOpacity style={historyStyles.iconButton} activeOpacity={0.85}>
            <Ionicons name="wallet-outline" size={23} color="#0F1F3A" />
          </TouchableOpacity>
        </View>

        <View style={historyStyles.summaryCard}>
          <Text style={historyStyles.summaryLabel}>Total Spent This Year</Text>
          <Text style={historyStyles.summaryValue}>$2,482.50</Text>
          <View style={historyStyles.summaryBottomRow}>
            <View style={historyStyles.summaryPill}>
              <Text style={historyStyles.summaryPillText}>12 Services</Text>
            </View>
            <View style={historyStyles.summaryPill}>
              <Text style={historyStyles.summaryPillText}>3 Vehicles</Text>
            </View>
            <View style={historyStyles.summaryIconWrap}>
              <Ionicons name="receipt-outline" size={30} color="rgba(145, 167, 194, 0.6)" />
            </View>
          </View>
        </View>

        <View style={historyStyles.searchRow}>
          <View style={historyStyles.searchInputWrap}>
            <Ionicons name="search-outline" size={28} color="#9AA8BA" />
            <TextInput
              style={historyStyles.searchInput}
              placeholder="Search by service or vehicle..."
              placeholderTextColor="#6E7D92"
            />
          </View>
          <TouchableOpacity
            style={historyStyles.filterButton}
            activeOpacity={0.85}
            onPress={() => Alert.alert('Filters', 'Filter options can be connected here.')}
          >
            <Ionicons name="options-outline" size={26} color="#2B3E57" />
          </TouchableOpacity>
        </View>

        <Text style={historyStyles.sectionTitle}>Past Payments</Text>

        {historyItems.map((item) => (
          <HistoryItemCard
            key={item.id}
            item={item}
            onReceipt={() => Alert.alert('Receipt', `Opening receipt for ${item.title}.`)}
          />
        ))}

        <View style={historyStyles.taxCard}>
          <View style={historyStyles.taxTextWrap}>
            <Text style={historyStyles.taxTitle}>Need a tax summary?</Text>
            <Text style={historyStyles.taxSubtitle}>Download your full 2023 service history as a PDF.</Text>
          </View>
          <TouchableOpacity
            style={historyStyles.exportButton}
            activeOpacity={0.9}
            onPress={() => Alert.alert('Export PDF', 'Export generation can be connected here.')}
          >
            <Text style={historyStyles.exportButtonText}>Export</Text>
            <Text style={historyStyles.exportButtonText}>PDF</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

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

const historyStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F6FA',
  },
  scrollContent: {
    paddingTop: 8,
    paddingHorizontal: 22,
    paddingBottom: 20,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F1F3A',
  },
  summaryCard: {
    borderRadius: 18,
    backgroundColor: '#223A56',
    padding: 18,
    marginTop: 4,
    marginBottom: 18,
  },
  summaryLabel: {
    color: '#B9C7D7',
    fontSize: 13,
    marginBottom: 6,
  },
  summaryValue: {
    color: '#F3F7FC',
    fontSize: 44,
    fontWeight: '800',
    marginBottom: 12,
  },
  summaryBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryPill: {
    backgroundColor: '#3B536F',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginRight: 8,
  },
  summaryPillText: {
    color: '#E8EFF7',
    fontSize: 11,
    fontWeight: '700',
  },
  summaryIconWrap: {
    flex: 1,
    alignItems: 'flex-end',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  searchInputWrap: {
    flex: 1,
    minHeight: 56,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    color: '#0F1F3A',
    fontSize: 14,
  },
  filterButton: {
    width: 56,
    height: 56,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },
  sectionTitle: {
    color: '#0F1F3A',
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 12,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#DCE3ED',
    borderLeftWidth: 5,
    borderLeftColor: '#162E4B',
    padding: 16,
    marginBottom: 12,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cardHeadLeft: {
    flex: 1,
    marginRight: 8,
  },
  cardHeadRight: {
    alignItems: 'flex-end',
  },
  cardDate: {
    color: '#8A9DB7',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 6,
  },
  cardTitle: {
    color: '#0F1F3A',
    fontSize: 20,
    lineHeight: 28,
    fontWeight: '800',
    marginBottom: 4,
  },
  cardVehicle: {
    color: '#556A85',
    fontSize: 16,
  },
  cardAmount: {
    color: '#0F1F3A',
    fontSize: 20,
    fontWeight: '800',
    marginTop: 4,
    marginBottom: 12,
  },
  paidPill: {
    borderRadius: 999,
    backgroundColor: '#C7F0D8',
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  paidPillText: {
    color: '#118347',
    fontSize: 15,
    fontWeight: '700',
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginTop: 12,
    marginBottom: 12,
  },
  receiptRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  receiptText: {
    marginLeft: 8,
    color: '#2A405D',
    fontSize: 16,
    textDecorationLine: 'underline',
    fontWeight: '600',
  },
  taxCard: {
    marginTop: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#D8E0EB',
    backgroundColor: '#EEF2F7',
    padding: 16,
    marginBottom: 18,
    flexDirection: 'row',
    alignItems: 'center',
  },
  taxTextWrap: {
    flex: 1,
    marginRight: 10,
  },
  taxTitle: {
    color: '#0F1F3A',
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 6,
  },
  taxSubtitle: {
    color: '#576C86',
    fontSize: 16,
    lineHeight: 24,
  },
  exportButton: {
    minWidth: 118,
    minHeight: 58,
    borderRadius: 12,
    backgroundColor: '#132B46',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  exportButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 21,
  },
});
