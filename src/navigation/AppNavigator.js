import React, { useSyncExternalStore } from 'react';
import { ActivityIndicator, Platform, StatusBar, Text, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '../context/AuthContext';
import { useLocale } from '../context/LocaleContext';
import { subscribeToTheme, getThemeSnapshot } from '../context/ThemeContext';
import { colors, navTheme } from '../theme/colors';
import OfflineBanner from '../components/OfflineBanner';

import LoginScreen from '../screens/LoginScreen';
import ClientAccountScreen from '../screens/ClientAccountScreen'; // 👤 v25 : espace abonnement du client
import DashboardScreen from '../screens/DashboardScreen';
import ProductsScreen from '../screens/ProductsScreen';
import ProductDetailScreen from '../screens/ProductDetailScreen';
import ProductFormScreen from '../screens/ProductFormScreen';
import MovementFormScreen from '../screens/MovementFormScreen';
import MovementsScreen from '../screens/MovementsScreen';
import AlertsScreen from '../screens/AlertsScreen';
import CategoriesScreen from '../screens/CategoriesScreen';
import SuppliersScreen from '../screens/SuppliersScreen';
import UsersScreen from '../screens/UsersScreen';
import ProfileScreen from '../screens/ProfileScreen';
import ScannerScreen from '../screens/ScannerScreen';
import AdminScreen from '../screens/AdminScreen';
import NewSaleScreen from '../screens/NewSaleScreen';
import StatsScreen from '../screens/StatsScreen';
import PurchaseOrdersScreen from '../screens/PurchaseOrdersScreen';
import PrinterSettingsScreen from '../screens/PrinterSettingsScreen';
import LabelsScreen from '../screens/LabelsScreen';
import ReturnsScreen from '../screens/ReturnsScreen';
import BulkPriceScreen from '../screens/BulkPriceScreen';
import PriceHistoryScreen from '../screens/PriceHistoryScreen';
import InventoriesScreen from '../screens/InventoriesScreen';
import InventoryCountScreen from '../screens/InventoryCountScreen';
import CustomersScreen from '../screens/CustomersScreen';
import CustomerDetailScreen from '../screens/CustomerDetailScreen';
import CashScreen from '../screens/CashScreen';
import RecurringSalesScreen from '../screens/RecurringSalesScreen';
import ShopsScreen from '../screens/ShopsScreen';
import ShopSettingsScreen from '../screens/ShopSettingsScreen';
import AppearanceScreen from '../screens/AppearanceScreen';
import TransfersScreen from '../screens/TransfersScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const TAB_ICONS = Platform.select({
  android: {
    Dashboard: { focused: 'home', outline: 'home-outline' },
    Products: { focused: 'cube', outline: 'cube-outline' },
    Movements: { focused: 'swap-vertical', outline: 'swap-vertical-bold' },
    Alerts: { focused: 'bell', outline: 'bell-outline' },
    Admin: { focused: 'shield-check', outline: 'shield-check-outline' },
    Profile: { focused: 'account', outline: 'account-outline' },
  },
  default: {
    Dashboard: { focused: 'home', outline: 'home-outline' },
    Products: { focused: 'cube', outline: 'cube-outline' },
    Movements: { focused: 'swap-vertical', outline: 'swap-vertical-outline' },
    Alerts: { focused: 'notifications', outline: 'notifications-outline' },
    Admin: { focused: 'shield-checkmark', outline: 'shield-checkmark-outline' },
    Profile: { focused: 'person', outline: 'person-outline' },
  },
});

function MainTabs() {
  const { hasRole } = useAuth();
  const { t } = useLocale();
  const insets = useSafeAreaInsets();
  const IconSet = Platform.OS === 'android' ? MaterialCommunityIcons : Ionicons;
  const themeVer = useSyncExternalStore(subscribeToTheme, () => getThemeSnapshot().version, () => getThemeSnapshot().version);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          position: 'absolute',
          backgroundColor: colors.bgAlt,
          borderTopWidth: 0,
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: 24,
          marginHorizontal: 14,
          bottom: insets.bottom + 8,
          height: 62,
          paddingTop: 8,
          paddingBottom: 8,
          elevation: 10,
          shadowColor: '#000',
          shadowOpacity: 0.45,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: 8 },
        },
        tabBarHideOnKeyboard: true,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        tabBarIcon: ({ focused, color, size }) => {
          const icon = TAB_ICONS[route.name] ?? TAB_ICONS.Dashboard;
          return <IconSet name={focused ? icon.focused : icon.outline} size={size ?? 22} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Dashboard" options={{ title: t('tab_home') }}>
        {(props) => <View key={themeVer} style={{ flex: 1, paddingTop: insets.top }}><DashboardScreen {...props} /></View>}
      </Tab.Screen>
      <Tab.Screen name="Products" options={{ title: t('tab_products') }}>
        {(props) => <View key={themeVer} style={{ flex: 1, paddingTop: insets.top }}><ProductsScreen {...props} /></View>}
      </Tab.Screen>
      <Tab.Screen name="Movements" options={{ title: t('tab_movements') }}>
        {(props) => <View key={themeVer} style={{ flex: 1, paddingTop: insets.top }}><MovementsScreen {...props} /></View>}
      </Tab.Screen>
      <Tab.Screen name="Alerts" options={{ title: t('tab_alerts') }}>
        {(props) => <View key={themeVer} style={{ flex: 1, paddingTop: insets.top }}><AlertsScreen {...props} /></View>}
      </Tab.Screen>
      {hasRole('admin') ? (
        <Tab.Screen name="Admin" options={{ title: t('tab_admin') }}>
          {(props) => <View key={themeVer} style={{ flex: 1, paddingTop: insets.top }}><AdminScreen {...props} /></View>}
        </Tab.Screen>
      ) : null}
      <Tab.Screen name="Profile" options={{ title: t('tab_profile') }}>
        {(props) => <View key={themeVer} style={{ flex: 1, paddingTop: insets.top }}><ProfileScreen {...props} /></View>}
      </Tab.Screen>
    </Tab.Navigator>
  );
}

function AppStack() {
  const { t } = useLocale();
  const themeVer = useSyncExternalStore(subscribeToTheme, () => getThemeSnapshot().version, () => getThemeSnapshot().version);

  return (
    <Stack.Navigator
      key={themeVer}
      screenOptions={{
        headerStyle: { backgroundColor: colors.bgAlt },
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: '700' },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.bg, paddingBottom: 0 },
      }}
    >
      <Stack.Screen name="Main" component={MainTabs} options={{ headerShown: false }} />
      <Stack.Screen name="ProductDetail" component={ProductDetailScreen} options={{ title: t('scr_product_detail') }} />
      <Stack.Screen
        name="ProductForm"
        component={ProductFormScreen}
        options={({ route }) => ({
          title: route.params?.product ? t('scr_product_edit') : t('scr_product_new'),
        })}
      />
      <Stack.Screen name="MovementForm" component={MovementFormScreen} options={{ title: t('scr_movement') }} />
      <Stack.Screen name="Categories" component={CategoriesScreen} options={{ title: t('scr_categories') }} />
      <Stack.Screen name="Suppliers" component={SuppliersScreen} options={{ title: t('scr_suppliers') }} />
      <Stack.Screen name="Users" component={UsersScreen} options={{ title: t('scr_users') }} />
      <Stack.Screen name="Scanner" component={ScannerScreen} options={{ title: t('scr_scanner') }} />
      <Stack.Screen name="NewSale" component={NewSaleScreen} options={{ title: t('scr_new_sale') }} />
      <Stack.Screen name="Stats" component={StatsScreen} options={{ title: t('scr_stats') }} />
      <Stack.Screen name="PurchaseOrders" component={PurchaseOrdersScreen} options={{ title: t('scr_purchase_orders') }} />
      <Stack.Screen name="PrinterSettings" component={PrinterSettingsScreen} options={{ title: t('scr_printer') }} />
      <Stack.Screen name="Inventories" component={InventoriesScreen} options={{ title: t('scr_inventories') }} />
      <Stack.Screen name="InventoryCount" component={InventoryCountScreen} options={{ title: t('scr_inventory_count') }} />
      <Stack.Screen name="Customers" component={CustomersScreen} options={{ title: t('scr_customers') }} />
      <Stack.Screen
        name="CustomerDetail"
        component={CustomerDetailScreen}
        options={({ route }) => ({ title: route.params?.name ?? t('scr_customer_detail') })}
      />
      <Stack.Screen name="Cash" component={CashScreen} options={{ title: t('scr_cash') }} />
      <Stack.Screen name="RecurringSales" component={RecurringSalesScreen} options={{ title: t('scr_recurring') }} />
      <Stack.Screen name="Shops" component={ShopsScreen} options={{ title: t('scr_shops') }} />
      <Stack.Screen name="Transfers" component={TransfersScreen} options={{ title: t('scr_transfers') }} />
      <Stack.Screen name="ShopSettings" component={ShopSettingsScreen} options={{ title: t('scr_settings') }} />
      <Stack.Screen name="Appearance" component={AppearanceScreen} options={{ title: 'Apparence' }} />
      <Stack.Screen name="Labels" component={LabelsScreen} options={{ title: 'Étiquettes code-barres' }} />
      <Stack.Screen name="Returns" component={ReturnsScreen} options={{ title: 'Avoirs et retours' }} />
      <Stack.Screen name="BulkPrice" component={BulkPriceScreen} options={{ title: 'Mise à jour prix en lot' }} />
      <Stack.Screen name="PriceHistory" component={PriceHistoryScreen} options={{ title: 'Historique des prix' }} />
    </Stack.Navigator>
  );
}

export default function AppNavigator() {
  const { user, initializing } = useAuth();
  const { t, ready } = useLocale();
  const themeVer = useSyncExternalStore(subscribeToTheme, () => getThemeSnapshot().version, () => getThemeSnapshot().version);

  if (initializing || !ready) {
    return (
      <>
        <StatusBar barStyle="light-content" backgroundColor={colors.bg} />
        <View key={themeVer} style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg }}>
          <Text style={{ fontSize: 44, marginBottom: 16, color: colors.primary }}>◆</Text>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </>
    );
  }

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg} />
      <NavigationContainer theme={navTheme}>
      {user ? <OfflineBanner /> : null}
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          user.role === 'client' ? (
            <Stack.Screen name="ClientHome" component={ClientAccountScreen} />
          ) : (
            <Stack.Screen name="Root" component={AppStack} />
          )
        ) : (
          <Stack.Screen name="Login" component={LoginScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
    </>
  );
}
