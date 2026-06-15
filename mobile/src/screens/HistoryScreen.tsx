import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, FlatList, ActivityIndicator, Image } from 'react-native';

interface HistoryScreenProps {
  token: string;
}

export default function HistoryScreen({ token }: HistoryScreenProps) {
  const [reports, setReports] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    setIsLoading(true);
    try {
      // Intentar cargar del backend local
      const res = await fetch('http://localhost:3001/api/reports');
      if (res.ok) {
        const data = await res.json();
        // Filtramos para ver los del ciudadano mock o los mostramos todos en modo demo
        setReports(data);
      } else {
        throw new Error();
      }
    } catch {
      // Fallback a datos mock localizados
      setReports([
        {
          id: 'mock-1',
          category: 'BASURAL',
          description: 'Cúmulo de botellas y plástico frente a mi casa.',
          status: 'PENDIENTE',
          createdAt: new Date().toISOString(),
          imageUrl: 'https://images.unsplash.com/photo-1611284446314-60a58ac0deb9?w=600&auto=format&fit=crop'
        },
        {
          id: 'mock-2',
          category: 'ALCANTARILLA',
          description: 'Rejilla tapada inundando la acera.',
          status: 'RESUELTO',
          createdAt: new Date(Date.now() - 86400000).toISOString(),
          imageUrl: 'https://images.unsplash.com/photo-1542060748-10c28b629f6f?w=600&auto=format&fit=crop'
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'RESUELTO': return '#10b981';
      case 'RECHAZADO': return '#ef4444';
      case 'ASIGNADO': return '#8b5cf6';
      case 'EN_PROCESO': return '#f59e0b';
      default: return '#9ca3af';
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Mis Reportes Enviados</Text>

      {isLoading ? (
        <ActivityIndicator size="large" color="#10b981" style={styles.loader} />
      ) : (
        <FlatList
          data={reports}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.category}>{item.category}</Text>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '15' }]}>
                  <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>{item.status}</Text>
                </View>
              </View>

              <Text style={styles.description}>{item.description || 'Sin descripción.'}</Text>
              
              <Text style={styles.date}>
                Enviado el: {new Date(item.createdAt).toLocaleDateString()}
              </Text>
            </View>
          )}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No has realizado reportes ambientales aún.</Text>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b0f19',
    padding: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 15,
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
  },
  listContainer: {
    gap: 12,
  },
  card: {
    backgroundColor: '#151b2c',
    borderRadius: 12,
    padding: 15,
    borderWidth: 1,
    borderColor: '#1e263d',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  category: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  description: {
    fontSize: 12,
    color: '#9ca3af',
    lineHeight: 18,
    marginBottom: 10,
  },
  date: {
    fontSize: 10,
    color: '#4b5563',
  },
  emptyText: {
    textAlign: 'center',
    color: '#4b5563',
    fontSize: 13,
    marginTop: 40,
  },
});
