import { useSyncExternalStore, useMemo } from 'react'
import { StyleSheet } from 'react-native'
import { subscribeToTheme, getThemeSnapshot } from '../context/ThemeContext'
import { colors } from '../theme/colors'

export function useThemedStyles(factory) {
  const version = useSyncExternalStore(
    subscribeToTheme,
    () => getThemeSnapshot().version,
    () => getThemeSnapshot().version,
  )
  return useMemo(() => StyleSheet.create(factory(colors)), [version])
}
