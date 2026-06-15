import React, { useState } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, Alert } from 'react-native';

interface LoginScreenProps {
  onLoginSuccess: (token: string) => void;
}

export default function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  const [email, setEmail] = useState('ciudadano1@gmail.com');
  const [password, setPassword] = useState('password123');

  const handleLogin = () => {
    // Validación básica y simulador local
    if (email && password) {
      onLoginSuccess('mock-jwt-token-citizen-2026');
    } else {
      Alert.alert('Error', 'Por favor ingresa correo y contraseña.');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        <Text style={styles.logoEmoji}>♻️</Text>
        <Text style={styles.logoText}>EcoTuc</Text>
        <Text style={styles.subtitle}>Reportes Urbanos Ciudadanos</Text>
      </View>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Correo Electrónico"
          placeholderTextColor="#9ca3af"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <TextInput
          style={styles.input}
          placeholder="Contraseña"
          placeholderTextColor="#9ca3af"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
      </View>

      <TouchableOpacity style={styles.loginBtn} onPress={handleLogin}>
        <Text style={styles.loginBtnText}>Ingresar</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 30,
    backgroundColor: '#0b0f19',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoEmoji: {
    fontSize: 50,
    marginBottom: 10,
  },
  logoText: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: 'bold',
  },
  subtitle: {
    color: '#9ca3af',
    fontSize: 14,
    marginTop: 5,
  },
  inputContainer: {
    gap: 15,
    marginBottom: 25,
  },
  input: {
    height: 55,
    backgroundColor: '#151b2c',
    borderRadius: 12,
    paddingHorizontal: 15,
    color: '#ffffff',
    borderWidth: 1,
    borderColor: '#1e263d',
    fontSize: 14,
  },
  loginBtn: {
    height: 55,
    backgroundColor: '#10b981',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
  },
  loginBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
