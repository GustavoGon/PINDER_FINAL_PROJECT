import React, { useEffect, useRef } from 'react';
import { View, Text, Modal, TouchableOpacity, Animated, StyleSheet, Image } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';

interface MatchModalProps {
  visible: boolean;
  petName: string;
  petPhoto: string;
  onClose: () => void;
  isTutor?: boolean;
}

export default function MatchModal({ visible, petName, petPhoto, onClose, isTutor }: MatchModalProps) {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    if (visible) {
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 10,
        friction: 6,
        useNativeDriver: true,
      }).start();
    } else {
      scaleAnim.setValue(0);
    }
  }, [visible]);

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Animated.View style={[styles.container, { transform: [{ scale: scaleAnim }] }]}>
          
          {/* 🎊 Confetti Animation */}
          <View style={styles.confettiContainer}>
            {[...Array(6)].map((_, i) => (
              <Confetti key={i} delay={i * 100} />
            ))}
          </View>

          {/* Heart Icon Animation */}
          <HeartPulse />

          {/* Pet Photo */}
          <Image 
            source={{ uri: petPhoto }} 
            style={styles.petPhoto}
          />

          {/* Match Text */}
          <Text style={styles.matchText}>🎉 It's a Match! 🎉</Text>
          <Text style={styles.petNameText}>{petName}</Text>
          
          {isTutor ? (
            <Text style={styles.subtitleText}>
              Podes agora ver as adoções e continuar o processo.
            </Text>
          ) : (
            <Text style={styles.subtitleText}>
              Há uma nova possibilidade de encontro!
            </Text>
          )}

          {/* Close Button */}
          <TouchableOpacity style={styles.button} onPress={onClose}>
            <Text style={styles.buttonText}>
              {isTutor ? '🐾 Ver Adoções' : '👀 Ver Match'}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

const Confetti = ({ delay }: { delay: number }) => {
  const translateY = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(delay),
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 300,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={[
        styles.confetti,
        {
          transform: [{ translateY }],
          opacity,
          left: `${Math.random() * 100}%`,
        },
      ]}
    >
      <FontAwesome5 name="heart" size={20} color="#FF6B9D" solid />
    </Animated.View>
  );
};

const HeartPulse = () => {
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(scale, {
          toValue: 1.3,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  return (
    <Animated.View style={[styles.heartPulse, { transform: [{ scale }] }]}>
      <FontAwesome5 name="heart" size={60} color="#FF6B9D" solid />
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    width: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 20,
  },
  confettiContainer: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  confetti: {
    position: 'absolute',
    top: -20,
  },
  heartPulse: {
    marginBottom: 20,
  },
  petPhoto: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginVertical: 20,
    borderWidth: 4,
    borderColor: '#FF6B9D',
  },
  matchText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#5C4A3D',
    marginBottom: 10,
    textAlign: 'center',
  },
  petNameText: {
    fontSize: 22,
    fontWeight: '600',
    color: '#FF6B9D',
    marginBottom: 10,
  },
  subtitleText: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  button: {
    backgroundColor: '#FF6B9D',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 25,
    marginTop: 10,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});
