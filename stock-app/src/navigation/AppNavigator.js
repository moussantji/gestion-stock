import React from 'react';
import { ActivityIndicator, Platform, Text, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import { useAuth } from '../context/AuthContext';
import { useLocale } from '../context/LocaleContext';
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
import InventoriesScreen from '../screens/InventoriesScreen';
import InventoryCountScreen from '../screens/InventoryCountScreen';
import CustomersScreen from '../screens/CustomersScreen';
import CustomerDetailScreen from '../screens/CustomerDetailScreen';
import CashScreen from '../screens/CashScreen';
import RecurringSalesScreen from '../screens/RecurringSalesScreen';
import ShopsScreen from '../screens/ShopsScreen';
import ShopSettingsScreen from '../screens/ShopSettingsScreen';
import TransfersScreen from '../screens/TransfersScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const TAB_ICONS = {
  Dashboard: '🏠',
  Products: '📦',
  Movements: '🔄',
  Alerts: '🔔',
  Admin: '⚡',
  Profile: '👤',
};

function MainTabs() {
  const { hasRole } = useAuth();
  const { t } = useLocale();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerStyle: { backgroundColor: colors.bgAlt },
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: '700' },
        headerShadowVisible: false,
        // ===== Tab bar flottante premium =====
        tabBarStyle: {
          position: 'absolute',
          backgroundColor: colors.bgAlt,
          borderTopWidth: 0,
          borderRadius: 24,
          marginHorizontal: 14,
          bottom: Platform.OS === 'ios' ? 20 : 12,
          height: 66,
          paddingTop: 8,
          paddingBottom: 8,
          borderWidth: 1,
          borderColor: colors.border,
          elevation: 10,
          shadowColor: '#000',
          shadowOpacity: 0.45,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: 8 },
        },
        tabBarHideOnKeyboard: true,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: { fontSize: 10.5, fontWeight: '700' },
        tabBarIcon: ({ focused }) => (
          <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.45 }}>
            {TAB_ICONS[route.name]}
          </Text>
        ),
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} options={{ title: t('tab_home') }} />
      <Tab.Screen name="Products" component={ProductsScreen} options={{ title: t('tab_products') }} />
      <Tab.Screen name="Movements" component={MovementsScreen} options={{ title: t('tab_movements') }} />
      <Tab.Screen name="Alerts" component={AlertsScreen} options={{ title: t('tab_alerts') }} />
      {hasRole('admin') ? (
        <Tab.Screen name="Admin" component={AdminScreen} options={{ title: t('tab_admin') }} />
      ) : null}
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: t('tab_profile') }} />
    </Tab.Navigator>
  );
}

function AppStack() {
  const { t } = useLocale();

  return (
    <Stack.Navigator
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
    </Stack.Navigator>
  );
}

export default function AppNavigator() {
  const { user, initializing } = useAuth();
  const { t, ready } = useLocale();

  if (initializing || !ready) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg }}>
        <Text style={{ fontSize: 44, marginBottom: 16, color: colors.primary }}>◆</Text>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer theme={navTheme}>
      {user ? <OfflineBanner /> : null}
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          user.role === 'client' ? (
            // 👤 v25 : un compte CLIENT ne voit que son abonnement (portail d'app)
            <Stack.Screen name="ClientHome" component={ClientAccountScreen} />
          ) : (
            <Stack.Screen name="Root" component={AppStack} />
          )
        ) : (
          <Stack.Screen name="Login" component={LoginScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
