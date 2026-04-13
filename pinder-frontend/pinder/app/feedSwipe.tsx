import React, { useState, useRef, useEffect } from 'react';
import { 
  View, Text, Image, TouchableOpacity, StyleSheet, 
  Animated, PanResponder, Dimensions 
} from 'react-native';
import { FontAwesome5, MaterialIcons } from '@expo/vector-icons';
import BottomNav from '../src/components/BottomNav';

// A largura do ecrã para sabermos quando o cartão deve "voar"
const SCREEN_WIDTH = Dimensions.get('window').width;
const SWIPE_THRESHOLD = 0.25 * SCREEN_WIDTH; // 25% do ecrã
const SWIPE_OUT_DURATION = 250;

// --- DADOS FALSOS PARA TESTE ---
const DUMMY_PETS = [
  {
    id: 1,
    name: 'Buddy',
    age: '3 anos',
    breed: 'Golden Retriever',
    size: 'Grande',
    energy: 'Alta ⚡',
    description: 'Adoro correr atrás de bolas e nadar!',
    photos: [
      "https://images.unsplash.com/photo-1552053831-71594a27632d?w=500",
      "https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=500",
      "https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=500"
    ]
  },
  {
    id: 2,
    name: 'Luna',
    age: '1 ano',
    breed: 'Gato Siamês',
    size: 'Pequeno',
    energy: 'Média',
    description: 'Sou a rainha da casa. Só gosto de festas quando eu quero.',
    photos: [
      "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=500",
      "https://images.unsplash.com/photo-1513360371669-4adf3dd7dff8?w=500"
    ]
  },
  {
    id: 3,
    name: 'Max',
    age: '5 anos',
    breed: 'Bulldog Francês',
    size: 'Médio',
    energy: 'Baixa 🛋️',
    description: 'Resso incrivelmente alto, mas sou um amor.',
    photos: [
      "https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?w=500"
    ]
  }
];

export default function FeedSwipe() {
  const [pets, setPets] = useState(DUMMY_PETS);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  // Animações
  const position = useRef(new Animated.ValueXY()).current;
  const flipAnim = useRef(new Animated.Value(0)).current;

  // --- O MOTOR DO SWIPE (PAN RESPONDER) ---
  const panResponder = useRef(
    PanResponder.create({
      // Só assume o controlo se o utilizador mexer o dedo (permite clicar nos botões)
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        return Math.abs(gestureState.dx) > 5 || Math.abs(gestureState.dy) > 5;
      },
      onPanResponderMove: (evt, gestureState) => {
        // Move o cartão com o dedo (apenas no eixo X, o Y mexe muito pouco para dar estilo)
        position.setValue({ x: gestureState.dx, y: gestureState.dy * 0.1 });
      },
      onPanResponderRelease: (evt, gestureState) => {
        if (gestureState.dx > SWIPE_THRESHOLD) {
          forceSwipe('right'); // Swipe para a Direita (Like)
        } else if (gestureState.dx < -SWIPE_THRESHOLD) {
          forceSwipe('left'); // Swipe para a Esquerda (Dislike)
        } else {
          resetPosition(); // Não foi longe suficiente, volta ao meio
        }
      }
    })
  ).current;

  // --- FUNÇÕES DE ANIMAÇÃO ---
  const forceSwipe = (direction: 'right' | 'left') => {
    const x = direction === 'right' ? SCREEN_WIDTH + 100 : -SCREEN_WIDTH - 100;
    Animated.timing(position, {
      toValue: { x, y: 0 },
      duration: SWIPE_OUT_DURATION,
      useNativeDriver: false,
    }).start(() => onSwipeComplete(direction));
  };

  const onSwipeComplete = (direction: 'right' | 'left') => {
    // 1. TODO - Enviar a decisão para o backend (aqui só fazemos console.log)
    console.log(`Fez ${direction === 'right' ? 'LIKE' : 'DISLIKE'} no ${pets[currentIndex].name}`);

    // 2. Avança para o próximo cão
    setCurrentIndex((prev) => prev + 1);
    setCurrentPhotoIndex(0); // Volta à foto 1 do próximo cão
    
    // 3. Se estava virado para a descrição, volta para a foto escondido
    if (isFlipped) handleFlip(true); 

    // 4. Coloca o cartão invisível no centro para a próxima renderização
    position.setValue({ x: 0, y: 0 });
  };

  const resetPosition = () => {
    Animated.spring(position, {
      toValue: { x: 0, y: 0 },
      friction: 4,
      useNativeDriver: false,
    }).start();
  };

  // --- LÓGICA DO FLIP (VIRAR O CARTÃO) ---
  const handleFlip = (forceFront = false) => {
    const toValue = forceFront ? 0 : isFlipped ? 0 : 1;
    Animated.spring(flipAnim, {
      toValue,
      friction: 8,
      tension: 10,
      useNativeDriver: true,
    }).start();
    if (!forceFront) setIsFlipped(!isFlipped);
    else setIsFlipped(false);
  };

  const frontInterpolate = flipAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  const backInterpolate = flipAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['180deg', '360deg'],
  });

  // --- LÓGICA DE FOTOS ---
  const currentPet = pets[currentIndex];

  const handleNextPhoto = () => {
    if (currentPhotoIndex < currentPet.photos.length - 1) {
      setCurrentPhotoIndex(prev => prev + 1);
    }
  };

  const handlePrevPhoto = () => {
    if (currentPhotoIndex > 0) {
      setCurrentPhotoIndex(prev => prev - 1);
    }
  };

  // Se já não houver mais pets
  if (currentIndex >= pets.length) {
    return (
      <View style={styles.container}>
        <View style={styles.header}><Text style={styles.logoTitle}>Pinder</Text></View>
        <View style={[styles.mainArea, { alignItems: 'center', justifyContent: 'center' }]}>
          <FontAwesome5 name="check-circle" size={60} color="#D6CEC3" />
          <Text style={{ fontSize: 20, color: '#5C4A3D', fontWeight: 'bold', marginTop: 20 }}>Já viste todos os pets!</Text>
          <Text style={{ color: '#888', marginTop: 10 }}>Volta mais tarde para novos amigos.</Text>
        </View>
        <BottomNav activePage="home" />
      </View>
    );
  }

  // --- RENDERIZAÇÃO DO CARTÃO ---
  const cardStyle = {
    ...position.getLayout(),
    // Roda ligeiramente o cartão enquanto swipe
    transform: [{
      rotate: position.x.interpolate({
        inputRange: [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2],
        outputRange: ['-10deg', '0deg', '10deg'],
        extrapolate: 'clamp',
      })
    }]
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <FontAwesome5 name="paw" size={24} color="#5C4A3D" />
        <Text style={styles.logoTitle}>Pinder</Text>
      </View>

      <View style={styles.mainArea}>
        {/* O container que tem o PanResponder amarrado */}
        <Animated.View 
          style={[styles.cardContainer, cardStyle]} 
          {...panResponder.panHandlers}
        >
          
          {/* FRENTE DO CARTÃO */}
          <Animated.View style={[styles.card, { transform: [{ rotateY: frontInterpolate }] }]} pointerEvents={isFlipped ? 'none' : 'auto'}>
            
            <View style={styles.imageContainer}>
              <Image source={{ uri: currentPet.photos[currentPhotoIndex] }} style={styles.petImage} />
              
              {/* Barras de Progresso no Topo (Stories) */}
              <View style={styles.storyBarsContainer}>
                {currentPet.photos.map((_, idx) => (
                  <View key={idx} style={[styles.bar, idx === currentPhotoIndex && styles.barActive]} />
                ))}
              </View>

              {/* Botões Invisíveis para trocar de foto */}
              <TouchableOpacity style={styles.leftTapArea} onPress={handlePrevPhoto} activeOpacity={1} />
              <TouchableOpacity style={styles.rightTapArea} onPress={handleNextPhoto} activeOpacity={1} />
            </View>

            <View style={styles.cardInfo}>
              <Text style={styles.petName}>{currentPet.name} - {currentPet.age}</Text>
              <Text style={styles.petBreed}>{currentPet.breed}</Text>
            </View>

            <View style={styles.cardActions}>
              <TouchableOpacity style={[styles.actionBtn, styles.btnDislike]} onPress={() => forceSwipe('left')}>
                <FontAwesome5 name="times" size={24} color="#ff7a7a" />
              </TouchableOpacity>
              
              <TouchableOpacity style={[styles.actionBtn, styles.btnLike]} onPress={() => forceSwipe('right')}>
                <FontAwesome5 name="heart" size={28} color="#4CAF50" solid />
              </TouchableOpacity>
              
              <View style={styles.flipActionContainer}>
                <TouchableOpacity style={[styles.actionBtn, styles.btnFlip]} onPress={() => handleFlip()}>
                  <MaterialIcons name="flip-to-back" size={24} color="#5C4A3D" />
                </TouchableOpacity>
                <Text style={styles.flipHint}>Ver Descrição &gt;</Text>
              </View>
            </View>
          </Animated.View>

          {/* VERSO DO CARTÃO (DESCRIÇÃO) */}
          <Animated.View style={[styles.card, styles.cardBack, { transform: [{ rotateY: backInterpolate }] }]} pointerEvents={isFlipped ? 'auto' : 'none'}>
            <View style={styles.backHeader}>
              <Text style={styles.backTitle}>{currentPet.name}</Text>
              <TouchableOpacity style={styles.btnFlipBack} onPress={() => handleFlip()}>
                <MaterialIcons name="flip-to-front" size={20} color="#5C4A3D" />
                <Text style={styles.btnFlipBackText}> Voltar</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.backContent}>
              <Text style={styles.backBreedLine}>{currentPet.breed} • {currentPet.age}</Text>
              <View style={styles.traitsGrid}>
                <View style={styles.traitBadge}><Text style={styles.traitText}>Tamanho: {currentPet.size}</Text></View>
                <View style={styles.traitBadge}><Text style={styles.traitText}>Energia: {currentPet.energy}</Text></View>
              </View>

              <View style={styles.descriptionBox}>
                <Text style={styles.descriptionTitle}>Sobre mim</Text>
                <Text style={styles.descriptionText}>{currentPet.description}</Text>
              </View>
            </View>

            <View style={[styles.cardActions, styles.backActions]}>
              <TouchableOpacity style={[styles.actionBtn, styles.btnDislike]} onPress={() => forceSwipe('left')}>
                <FontAwesome5 name="times" size={24} color="#ff7a7a" />
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionBtn, styles.btnLike]} onPress={() => forceSwipe('right')}>
                <FontAwesome5 name="heart" size={28} color="#4CAF50" solid />
              </TouchableOpacity>
            </View>
          </Animated.View>

        </Animated.View>
      </View>

      <BottomNav activePage="home" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F2EB', paddingTop: 40 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 15 },
  logoTitle: { fontSize: 24, fontWeight: 'bold', color: '#5C4A3D', marginLeft: 10 },
  mainArea: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20, paddingBottom: 100 },
  
  cardContainer: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
  card: { width: '100%', height: '100%', backgroundColor: 'white', borderRadius: 20, backfaceVisibility: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.15, shadowRadius: 10, elevation: 8, position: 'absolute', padding: 15 },
  cardBack: { padding: 20 },
  
  imageContainer: { flex: 1, position: 'relative', borderRadius: 15, overflow: 'hidden' },
  petImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  
  storyBarsContainer: { position: 'absolute', top: 10, left: 10, right: 10, flexDirection: 'row', gap: 4, zIndex: 10 },
  bar: { flex: 1, height: 4, backgroundColor: 'rgba(255, 255, 255, 0.5)', borderRadius: 2 },
  barActive: { backgroundColor: 'white' },
  
  // Zonas de toque transparentes sobre a foto
  leftTapArea: { position: 'absolute', top: 0, bottom: 0, left: 0, width: '50%', zIndex: 5 },
  rightTapArea: { position: 'absolute', top: 0, bottom: 0, right: 0, width: '50%', zIndex: 5 },

  cardInfo: { marginTop: 15, marginBottom: 10 },
  petName: { fontSize: 24, fontWeight: 'bold', color: '#333' },
  petBreed: { fontSize: 16, color: '#666', marginTop: 4 },
  
  cardActions: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', marginTop: 10, paddingBottom: 10 },
  actionBtn: { width: 60, height: 60, borderRadius: 30, backgroundColor: 'white', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 5, elevation: 5 },
  btnDislike: { borderWidth: 1, borderColor: '#ffe0e0' },
  btnLike: { width: 70, height: 70, borderRadius: 35, borderWidth: 1, borderColor: '#e6ffe6' },
  btnFlip: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#F5F2EB' },
  flipActionContainer: { alignItems: 'center' },
  flipHint: { fontSize: 10, color: '#999', marginTop: 4 },
  
  backHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#eee', paddingBottom: 15, marginBottom: 15 },
  backTitle: { fontSize: 26, fontWeight: 'bold', color: '#5C4A3D' },
  btnFlipBack: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5F2EB', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20 },
  btnFlipBackText: { color: '#5C4A3D', fontWeight: 'bold', marginLeft: 4 },
  backContent: { flex: 1 },
  backBreedLine: { fontSize: 16, color: '#666', fontWeight: 'bold', marginBottom: 15 },
  traitsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  traitBadge: { backgroundColor: '#F5F2EB', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 15 },
  traitText: { color: '#5C4A3D', fontWeight: '600', fontSize: 14 },
  descriptionBox: { backgroundColor: '#fafafa', padding: 15, borderRadius: 12, borderWidth: 1, borderColor: '#eee' },
  descriptionTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 8 },
  descriptionText: { fontSize: 15, color: '#555', lineHeight: 22 },
  backActions: { justifyContent: 'center', gap: 30, paddingBottom: 0 }
});