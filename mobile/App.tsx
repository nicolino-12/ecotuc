import React, { useState } from 'react';
import { StyleSheet, View, Text, SafeAreaView, TouchableOpacity } from 'react-native';
import { StatusBar } from 'expo-status-bar';

// Pantallas del celular
import LoginScreen from './src/screens/LoginScreen';
import ReportFormScreen from './src/screens/ReportFormScreen';
import HistoryScreen from './src/screens/HistoryScreen';

export default function App() {
  const [userToken, setUserToken] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'report' | 'history'>('report');

  if (!userToken) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />
        <LoginScreen onLoginSuccess={(token) => setUserToken(token)} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      
      {/* Header móvil */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>EcoTuc Ciudadano</Text>
        <TouchableOpacity style={styles.logoutBtn} onPress={() => setUserToken(null)}>
          <Text style={styles.logoutText}>Salir</Text>
        </TouchableOpacity>
      </View>

      {/* Pantalla Activa */}
      <View style={styles.content}>
        {activeTab === 'report' ? (
          <ReportFormScreen token={userToken} />
        ) : (
          <HistoryScreen token={userToken} />
        )}
      </View>

      {/* Barra de Navegación Inferior Móvil (Bottom Tabs) */}
      <View style={styles.tabBar}>
        <TouchableOpacity 
          style={[styles.tabItem, activeTab === 'report' && styles.tabActive]}
          onPress={() => setActiveTab('report')}
        >
          <Text style={[styles.tabText, activeTab === 'report' && styles.tabTextActive]}>
            Reportar
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.tabItem, activeTab === 'history' && styles.tabActive]}
          onPress={() => setActiveTab('history')}
        >
          <Text style={[styles.tabText, activeTab === 'history' && styles.tabTextActive]}>
            Mis Reportes
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b0f19',
  },
  header: {
    height: 60,
    backgroundColor: '#151b2c',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'between',
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#1e263d',
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  logoutBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  logoutText: {
    color: '#ef4444',
    fontSize: 12,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
  tabBar: {
    height: 65,
    backgroundColor: '#151b2c',
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#1e263d',
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabActive: {
    borderTopWidth: 2,
    borderTopColor: '#10b981',
  },
  tabText: {
    color: '#9ca3af',
    fontSize: 12,
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#10b981',
  },
});
