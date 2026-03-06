import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { theme } from '../Components/theme';
import { Icon } from '../Components/icons';

const BASE_URL = 'https://gaslevel-alfanar.soniciot.com';

export default function Login({ navigation }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const canSubmit = useMemo(() => {
    const u = username.trim();
    return !!u && !!password && !submitting;
  }, [password, submitting, username]);

  async function onSubmit() {
    const u = username.trim();
    const p = password;

    if (!u || !p) {
      setError('Please enter username and password.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const resp = await fetch(`${BASE_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: u, password: p }),
      });

      const json = await resp.json().catch(() => ({}));

      if (!resp.ok || !json.ok) {
        setError(json.error || 'Invalid username or password.');
        setPassword('');
        return;
      }

      navigation.replace('Dashboard', {
        username: json.username || u,
        role: json.role || '',
      });
    } catch (e) {
      setError('Login failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <LinearGradient colors={[theme.colors.bgA, theme.colors.bgB]} style={styles.bg}>
        <View style={styles.shell}>
          <View style={styles.brandRow}>
            <View style={styles.brandIcon}>
              <Icon name="gas-cylinder" size={22} color={theme.colors.blue} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.brandTitle}>ALFANAR Gas Level</Text>
              <Text style={styles.brandSub}>Control Center</Text>
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.title}>Sign in</Text>
            <Text style={styles.subtitle}>Use your assigned credentials to continue.</Text>

            <Text style={styles.label}>Username</Text>
            <View style={styles.inputWrap}>
              <Icon name="account" size={20} color={theme.colors.textMuted} />
              <TextInput
                value={username}
                onChangeText={(t) => {
                  setUsername(t);
                  if (error) setError('');
                }}
                autoCapitalize="none"
                autoCorrect={false}
                style={styles.input}
                placeholder="Enter username"
                placeholderTextColor={theme.colors.textMuted}
                editable={!submitting}
                returnKeyType="next"
              />
            </View>

            <Text style={styles.label}>Password</Text>
            <View style={styles.inputWrap}>
              <Icon name="lock" size={20} color={theme.colors.textMuted} />
              <TextInput
                value={password}
                onChangeText={(t) => {
                  setPassword(t);
                  if (error) setError('');
                }}
                secureTextEntry
                style={styles.input}
                placeholder="Enter password"
                placeholderTextColor={theme.colors.textMuted}
                editable={!submitting}
                returnKeyType="done"
                onSubmitEditing={() => {
                  if (canSubmit) onSubmit();
                }}
              />
            </View>

            {!!error && <Text style={styles.error}>{error}</Text>}

            <Pressable
              style={[styles.btn, !canSubmit && styles.btnDisabled]}
              onPress={onSubmit}
              disabled={!canSubmit}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Icon name="login" size={20} color="#fff" />
                  <Text style={styles.btnText}>Sign in</Text>
                </>
              )}
            </Pressable>

            <Text style={styles.footerHint}>
              Tip: If you can’t sign in, verify network access to the server.
            </Text>
          </View>
        </View>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  bg: {
    flex: 1,
    justifyContent: 'center',
  },
  shell: {
    padding: 18,
    gap: 14,
  },

  brandRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  brandIcon: {
    width: 44,
    height: 44,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(214,235,255,0.32)',
    borderWidth: 1,
    borderColor: 'rgba(22,119,200,0.18)',
    ...theme.shadow.soft,
  },
  brandTitle: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '900',
    color: theme.colors.text,
  },
  brandSub: {
    marginTop: 2,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
    color: theme.colors.textMuted,
  },

  card: {
    backgroundColor: theme.colors.card,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: theme.radius.xl,
    padding: 18,
    ...theme.shadow.soft,
  },
  title: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '900',
    color: theme.colors.text,
  },
  subtitle: {
    marginTop: 6,
    marginBottom: 16,
    color: theme.colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
  },
  label: {
    marginTop: 12,
    marginBottom: 8,
    color: theme.colors.textMuted,
    fontWeight: '900',
    fontSize: 13,
    lineHeight: 18,
  },

  inputWrap: {
    minHeight: 48,
    borderRadius: 16,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: theme.colors.stroke,
    backgroundColor: 'rgba(255,255,255,0.78)',
  },
  input: {
    flex: 1,
    paddingVertical: 10,
    color: theme.colors.text,
    fontWeight: '800',
    fontSize: 15,
    lineHeight: 22,
  },

  error: {
    marginTop: 12,
    color: theme.colors.danger,
    fontWeight: '900',
    fontSize: 13,
    lineHeight: 18,
  },

  btn: {
    marginTop: 16,
    backgroundColor: theme.colors.blue,
    paddingVertical: 13,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
    flexDirection: 'row',
    gap: 10,
    ...theme.shadow.hard,
  },
  btnDisabled: {
    opacity: 0.55,
  },
  btnText: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 15,
    lineHeight: 22,
  },

  footerHint: {
    marginTop: 14,
    color: theme.colors.textMuted,
    fontWeight: '700',
    fontSize: 13,
    lineHeight: 18,
  },
});