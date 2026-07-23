import React from 'react';
import { Platform } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

const IconSet = Platform.OS === 'android' ? MaterialCommunityIcons : Ionicons;

const MCI_NAMES = {
  home: 'home-outline', products: 'cube-outline',
  movements: 'swap-vertical-bold', alerts: 'bell-outline',
  admin: 'shield-check-outline', profile: 'account-outline',
  categories: 'tag-outline', suppliers: 'truck-outline',
  customers: 'account-group-outline', transfers: 'repeat',
  inventory: 'clipboard-outline', cash: 'wallet-outline',
  users: 'account-group-outline',
  recurring: 'sync', settings: 'cog-outline',
  shops: 'store-outline', printer: 'printer-outline',
  language: 'translate', password: 'key-outline',
  logout: 'logout', appearance: 'palette-outline',
  sale: 'receipt-outline', receipt: 'file-document-outline',
  stats: 'chart-bar', success: 'check-circle-outline',
  scanner: 'line-scan', search: 'magnify',
  close: 'close', plus: 'plus', csv: 'file-delimited-outline',
  label: 'label-outline', warning: 'bell-outline',
  arrowDown: 'arrow-down-bold', arrowUp: 'arrow-up-bold',
  refresh: 'refresh', clock: 'clock-outline',
  alertCircle: 'alert-circle-outline', closeCircle: 'close-circle-outline',
  arrowRight: 'chevron-right',
};

const ION_NAMES = {
  home: 'home-outline', products: 'cube-outline',
  movements: 'swap-vertical-outline', alerts: 'notifications-outline',
  admin: 'shield-checkmark-outline', profile: 'person-outline',
  categories: 'pricetag-outline', suppliers: 'truck-outline',
  customers: 'people-outline', transfers: 'repeat-outline',
  inventory: 'clipboard-outline', cash: 'wallet-outline',
  users: 'people-outline',
  recurring: 'refresh-outline', settings: 'settings-outline',
  shops: 'business-outline', printer: 'print-outline',
  language: 'globe-outline', password: 'key-outline',
  logout: 'log-out-outline', appearance: 'color-palette-outline',
  sale: 'receipt-outline', receipt: 'document-text-outline',
  stats: 'bar-chart-outline', success: 'checkmark-circle-outline',
  scanner: 'scan-outline', search: 'search-outline',
  close: 'close-outline', plus: 'add', csv: 'document-text-outline',
  label: 'pricetag-outline', warning: 'warning-outline',
  arrowDown: 'arrow-down', arrowUp: 'arrow-up',
  refresh: 'refresh', clock: 'time-outline',
  alertCircle: 'alert-circle-outline', closeCircle: 'close-circle-outline',
  arrowRight: 'chevron-forward',
};

const ICONS = Platform.OS === 'android' ? MCI_NAMES : ION_NAMES;

export default function Icon({ name, size = 20, color = colors.text, focused = false, style }) {
  const iconName = ICONS[name] ?? name;
  const finalName = focused && iconName.endsWith('-outline') ? iconName.replace('-outline', '') : iconName;
  return <IconSet name={finalName} size={size} color={color} style={style} />;
}
