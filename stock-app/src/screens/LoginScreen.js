import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useLocale } from '../context/LocaleContext';
import { getErrorMessage } from '../api/client';
import { SERVER_URL } from '../config';
import { colors } from '../theme/colors';
import Field from '../components/Field';
import PrimaryButton from '../components/PrimaryButton';

export default function LoginScreen() {
  const { login, loginWithGoogleCode } = useAuth();
  const { t } = useLocale();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  // 🇬 v25 : connexion Google via navigateur → code à coller (0 dépendance native)
  const [showCode, setShowCode] = useState(false);
  const [googleCode, setGoogleCode] = useState('');
  const [googleLoading, setGoogleLoading] = useState(false);

  const submit = async () => {
    if (!email.trim() || !password) {
      setError(t('login_empty'));
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await login(email.trim().toLowerCase(), password);
    } catch (e) {
      setError(getErrorMessage(e, t('error_generic')));
    } finally {
      setLoading(false);
    }
  };

  // 🇬 Ouvre le navigateur sur la page Google du serveur + affiche le champ code
  const startGoogle = async () => {
    setError(null);
    setShowCode(true);
    try {
      await Linking.openURL(`${SERVER_URL}/auth/google/app`);
    } catch (e) {
      setError(getErrorMessage(e, t('error_generic')));
    }
  };

  const submitGoogleCode = async () => {
    if (!googleCode.trim() || googleLoading) return;
    setError(null);
    setGoogleLoading(true);
    try {
      await loginWithGoogleCode(googleCode);
    } catch (e) {
      setError(getErrorMessage(e, t('error_generic')));
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Lueur décorative */}
        <View style={styles.glow} />

        <View style={styles.header}>
          <View style={styles.logoMark}>
            <Text style={{ fontSize: 26, color: '#fff' }}>◆</Text>
          </View>
          <Text style={styles.title}>{t('login_title')}</Text>
          <Text style={styles.subtitle}>{t('login_subtitle')}</Text>
        </View>

        <View style={styles.card}>
          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <Field
            label={t('login_email')}
            placeholder={t('login_email_ph')}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
          <Field
            label={t('login_password')}
            placeholder="••••••••"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          <PrimaryButton title={t('login_btn')} onPress={submit} loading={loading} style={{ marginTop: 6 }} />

          {/* 🇬 v25 : se connecter avec Google (compte client) */}
          <TouchableOpacity style={styles.googleBtn} onPress={startGoogle} disabled={googleLoading}>
            <Text style={styles.googleBtnText}>🔵 {t('lg_google')}</Text>
          </TouchableOpacity>
          {showCode ? (
            <View style={styles.codeBox}>
              <Text style={styles.codeHint}>{t('lg_google_hint')}</Text>
              <Field
                label={t('lg_code_label')}
                placeholder="XXXX-XXXX"
                autoCapitalize="characters"
                autoCorrect={false}
                value={googleCode}
                onChangeText={setGoogleCode}
              />
              <PrimaryButton title={t('lg_code_btn')} onPress={submitGoogleCode} loading={googleLoading} />
            </View>
          ) : null}

          <View style={styles.demo}>
            <Text style={styles.demoTitle}>{t('login_demo')}</Text>
            <Text style={styles.demoText}>admin@stock.com · manageur@stock.com · employe@stock.com</Text>
            <Text style={styles.demoText}>{t('login_demo_pwd')}</Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  glow: {
    position: 'absolute',
    top: -80,
    alignSelf: 'center',
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: 'rgba(124,92,255,0.14)',
  },
  header: { alignItems: 'center', marginBottom: 30 },
  logoMark: {
    width: 62,
    height: 62,
    borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    shadowColor: colors.primary,
    shadowOpacity: 0.5,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  title: { fontSize: 30, fontWeight: '800', color: colors.text },
  subtitle: { fontSize: 14, color: colors.muted, marginTop: 4 },
  card: {
    backgroundColor: colors.card,
    borderRadius: 22,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  errorBox: { backgroundColor: colors.dangerBg, borderRadius: 10, padding: 12, marginBottom: 14 },
  errorText: { color: colors.danger, fontSize: 13, textAlign: 'center' },
  demo: { marginTop: 18, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12 },
  googleBtn: {
    marginTop: 12, borderRadius: 12, paddingVertical: 13, alignItems: 'center',
    backgroundColor: colors.cardAlt, borderWidth: 1, borderColor: colors.border,
  },
  googleBtnText: { color: colors.text, fontWeight: '800', fontSize: 14 },
  codeBox: {
    marginTop: 12, borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: colors.border, backgroundColor: colors.cardAlt,
  },
  codeHint: { fontSize: 12, color: colors.muted, marginBottom: 10, textAlign: 'center', lineHeight: 17 },
  demoTitle: { fontSize: 12, fontWeight: '700', color: colors.muted, textTransform: 'uppercase', marginBottom: 4, textAlign: 'center' },
  demoText: { fontSize: 12, color: colors.muted, textAlign: 'center' },
});
