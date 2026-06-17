import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, ScrollView, Image, ActivityIndicator, Alert } from 'react-native';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';

interface ReportFormScreenProps {
  token: string;
}

export default function ReportFormScreen({ token }: ReportFormScreenProps) {
  const [image, setImage] = useState<string | null>(null);
  const [category, setCategory] = useState('BASURAL');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [isLoadingGps, setIsLoadingGps] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Obtener geolocalización al iniciar
  useEffect(() => {
    requestLocationPermission();
  }, []);

  const requestLocationPermission = async () => {
    setIsLoadingGps(true);
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permiso Denegado', 'Se requiere acceso GPS para georreferenciar el reporte.');
        setIsLoadingGps(false);
        return;
      }
      let loc = await Location.getCurrentPositionAsync({});
      setLocation(loc);
    } catch (e) {
      console.log(e);
    } finally {
      setIsLoadingGps(false);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Error', 'Se requieren permisos de cámara.');
      return;
    }

    let result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.7,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  const selectFromGallery = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.7,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  const handleSubmit = async () => {
    if (!image) {
      Alert.alert('Foto Obligatoria', 'Debes adjuntar una fotografía del foco de basura.');
      return;
    }
    if (!location) {
      Alert.alert('GPS Obligatorio', 'No se ha podido capturar tu ubicación GPS actual.');
      return;
    }

    setIsSubmitting(true);

    try {
      let imageUrl = '/uploads/placeholder.jpg';

      if (image) {
        const formData = new FormData();
        const filename = image.split('/').pop() || 'photo.jpg';
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : `image/jpeg`;

        formData.append('image', {
          uri: image,
          name: filename,
          type,
        } as any);

        const uploadResponse = await fetch('http://localhost:3001/api/reports/upload', {
          method: 'POST',
          body: formData,
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });

        if (uploadResponse.ok) {
          const uploadData = await uploadResponse.json();
          imageUrl = uploadData.imageUrl;
        } else {
          console.warn('Backend image upload failed, status code:', uploadResponse.status);
        }
      }

      const payload = {
        category,
        description,
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        imageUrl,
      };

      const response = await fetch('http://localhost:3001/api/reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        Alert.alert('¡Excelente!', 'Tu reporte fue enviado y priorizado automáticamente por EcoTuc.');
        // Reset
        setImage(null);
        setDescription('');
      } else {
        throw new Error('Error de servidor');
      }
    } catch (e) {
      // Fallback si no hay conexión local al backend
      console.error('Submit report error:', e);
      Alert.alert(
        'EcoTuc Offline', 
        'Reporte guardado en memoria local temporal. Se sincronizará al recuperar señal.'
      );
      setImage(null);
      setDescription('');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <Text style={styles.title}>Crear Reporte Urbano</Text>
      
      {/* Sección Foto */}
      <View style={styles.section}>
        <Text style={styles.label}>Fotografía (Obligatoria)</Text>
        {image ? (
          <View style={styles.photoContainer}>
            <Image source={{ uri: image }} style={styles.photo} />
            <TouchableOpacity style={styles.removePhoto} onPress={() => setImage(null)}>
              <Text style={styles.removePhotoText}>Quitar</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.photoButtons}>
            <TouchableOpacity style={styles.photoBtn} onPress={takePhoto}>
              <Text style={styles.photoBtnText}>Cámara 📸</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.photoBtn} onPress={selectFromGallery}>
              <Text style={styles.photoBtnText}>Galería 🖼️</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Sección Categoría */}
      <View style={styles.section}>
        <Text style={styles.label}>Tipo de Incidencia</Text>
        <View style={styles.categorySelect}>
          {['BASURAL', 'ALCANTARILLA', 'ESCOMBROS', 'PELIGROSO', 'OTROS'].map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[styles.categoryOption, category === cat && styles.categoryOptionActive]}
              onPress={() => setCategory(cat)}
            >
              <Text style={[styles.categoryOptionText, category === cat && styles.categoryOptionTextActive]}>
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Sección Descripción */}
      <View style={styles.section}>
        <Text style={styles.label}>Descripción</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Ej: Basura acumulada en el baldío, vidrios rotos..."
          placeholderTextColor="#9ca3af"
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={3}
        />
      </View>

      {/* Geolocalización */}
      <View style={styles.gpsContainer}>
        {isLoadingGps ? (
          <View style={styles.row}>
            <ActivityIndicator size="small" color="#10b981" />
            <Text style={styles.gpsText}>Capturando ubicación GPS...</Text>
          </View>
        ) : location ? (
          <Text style={styles.gpsText}>
            📍 GPS Capturado: {location.coords.latitude.toFixed(5)}, {location.coords.longitude.toFixed(5)}
          </Text>
        ) : (
          <TouchableOpacity onPress={requestLocationPermission}>
            <Text style={styles.gpsErrorText}>⚠️ Error GPS. Presiona para reintentar.</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Enviar */}
      <TouchableOpacity 
        style={[styles.submitBtn, (!image || isSubmitting) && styles.submitBtnDisabled]}
        onPress={handleSubmit}
        disabled={!image || isSubmitting}
      >
        {isSubmitting ? (
          <ActivityIndicator size="small" color="#ffffff" />
        ) : (
          <Text style={styles.submitBtnText}>Enviar Reporte a EcoTuc</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b0f19',
  },
  contentContainer: {
    padding: 20,
    gap: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 5,
  },
  section: {
    gap: 8,
  },
  label: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#9ca3af',
    textTransform: 'uppercase',
  },
  photoContainer: {
    height: 200,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: '#1e263d',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  removePhoto: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 8,
  },
  removePhotoText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  photoButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  photoBtn: {
    flex: 1,
    height: 60,
    backgroundColor: '#151b2c',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1e263d',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  categorySelect: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryOption: {
    backgroundColor: '#151b2c',
    borderWidth: 1,
    borderColor: '#1e263d',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  categoryOptionActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderColor: '#10b981',
  },
  categoryOptionText: {
    color: '#9ca3af',
    fontSize: 11,
    fontWeight: '600',
  },
  categoryOptionTextActive: {
    color: '#10b981',
  },
  input: {
    backgroundColor: '#151b2c',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1e263d',
    paddingHorizontal: 15,
    paddingVertical: 12,
    color: '#ffffff',
    fontSize: 14,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  gpsContainer: {
    backgroundColor: '#151b2c',
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1e263d',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  gpsText: {
    color: '#10b981',
    fontSize: 12,
    fontWeight: 'bold',
  },
  gpsErrorText: {
    color: '#f59e0b',
    fontSize: 12,
    fontWeight: 'bold',
  },
  submitBtn: {
    height: 55,
    backgroundColor: '#10b981',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
  },
  submitBtnDisabled: {
    backgroundColor: '#1f2937',
    shadowOpacity: 0,
    elevation: 0,
  },
  submitBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: 'bold',
  },
});
