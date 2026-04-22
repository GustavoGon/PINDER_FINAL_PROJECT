import React, { useState, useRef, useEffect } from 'react';
import { 
  View, Text, Image, TouchableOpacity, StyleSheet, 
  Animated, PanResponder, Dimensions, ActivityIndicator, ScrollView 
} from 'react-native';
import { FontAwesome5, MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import BottomNav from '../src/components/BottomNav';
import MatchModal from '../src/components/MatchModal';
import { useActiveProfile } from '../src/contexts/ActiveProfileContext';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SWIPE_THRESHOLD = 0.25 * SCREEN_WIDTH; 
const SWIPE_OUT_DURATION = 250;

// Componente para o selo de Adoção/Amizade
const AdoptionBadge = ({ isForAdoption }: { isForAdoption: boolean }) => (
  <View style={[styles.adoptionStatus, { backgroundColor: isForAdoption ? '#4CAF50' : '#5C4A3D' }]}>
    <FontAwesome5 name={isForAdoption ? "home" : "heart"} size={10} color="white" />
    <Text style={styles.adoptionStatusText}>
      {isForAdoption ? "Para Adoção" : "Para Amizade"}
    </Text>
  </View>
);

export default function FeedSwipe() {
  const router = useRouter();
  const { activeProfile } = useActiveProfile(); 
  const [pets, setPets] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [myPetId, setMyPetId] = useState<string | null>(null);
  const [matchedPet, setMatchedPet] = useState<any>(null);
  const [showMatchModal, setShowMatchModal] = useState(false);
  const [skip, setSkip] = useState(0); // 🆕 Controlar paginação
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  const position = useRef(new Animated.ValueXY()).current;
  const flipAnim = useRef(new Animated.Value(0)).current;

  const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.X:3000'; 

  // --- 1. CARREGAR E FILTRAR OS PETS ---
 useEffect(() => {
    const fetchFeed = async () => {
      // Se ainda não temos o perfil ativo, paramos o loading para não ficar preso
      if (!activeProfile || !activeProfile.id) {
        setIsLoading(false);
        return; 
      }

      setIsLoading(true);
      setPets([]); // Limpar pets anteriores
      setCurrentIndex(0);
      
      try {
        const userStr = await AsyncStorage.getItem('user');
        const currentUser = userStr ? JSON.parse(userStr) : {};
        const myUserId = currentUser.user_id || currentUser.id;

        // 🔍 Se é PET: Usar recomendações do pet específico
        if (activeProfile.type === 'pet') {
          console.log(`🐾 Modo PET: Carregando recomendações para ${activeProfile.id}`);
          
          const recommendationsResponse = await fetch(
            `${API_URL}/pets/recommendations/${activeProfile.id}`
          );
          
          if (recommendationsResponse.ok) {
            const feedPets = await recommendationsResponse.json();
            setPets(feedPets);
            setMyPetId(activeProfile.id);
          } else {
            console.error("Erro do servidor:", await recommendationsResponse.text());
          }
        } 
        // 👤 Se é TUTOR: Mostrar pets para adoção próximos
        else if (activeProfile.type === 'tutor') {
          console.log(`👤 Modo TUTOR: Carregando pets para adoção`);
          
          const userResponse = await fetch(`${API_URL}/users/${myUserId}`);
          if (userResponse.ok) {
            const userData = await userResponse.json();
            
            // Buscar pets para adoção (usar o endpoint de feed com forAdoption=true)
            const forAdoptionResponse = await fetch(
              `${API_URL}/pets/feed?excludeUserId=${myUserId}&forAdoption=true&userId=${myUserId}&skip=0`
            );
            
            if (forAdoptionResponse.ok) {
              const adoptionPets = await forAdoptionResponse.json();
              setPets(adoptionPets);
            }
          }
        }
      } catch (error) {
        console.error("Erro de Rede (Verifica o teu IP!):", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchFeed();
  }, [activeProfile?.id, activeProfile?.type]);

  const calculateAge = (dobString: string) => {
    if (!dobString) return "Idade desconhecida";
    const birthDate = new Date(dobString);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
    if (age === 0) return "Menos de 1 ano";
    return age === 1 ? "1 ano" : `${age} anos`;
  };

  // --- 2. CARREGAR MAIS PETS QUANDO PRÓXIMO DO FINAL (TUTOR ONLY) ---
  useEffect(() => {
    // Carregar mais pets quando está perto do final (2 cards antes do fim)
    // MAS APENAS em modo TUTOR (pets para adoção têm paginação)
    if (activeProfile?.type === 'tutor' && currentIndex >= pets.length - 2 && pets.length > 0 && !isLoading) {
      loadMorePets();
    }
  }, [currentIndex, pets.length]);

  const loadMorePets = async () => {
    try {
      const userStr = await AsyncStorage.getItem('user');
      const currentUser = userStr ? JSON.parse(userStr) : {};
      const myUserId = currentUser.user_id || currentUser.id;

      const isForAdoption = activeProfile?.type === 'tutor' ? 'true' : 'false';

      console.log(`📥 Carregando mais pets... (skip=${skip})`);

      const response = await fetch(
        `${API_URL}/pets/feed?excludeUserId=${myUserId}&forAdoption=${isForAdoption}&userId=${myUserId}&skip=${skip}`
      );

      if (response.ok) {
        const morePets = await response.json();
        // Concatenar os novos pets à lista existente e EVITAR DUPLICATAS
        if (morePets.length > 0) {
          setPets((prevPets) => {
            // Filtrar pets que não estão já na lista
            const existingIds = new Set(prevPets.map(p => p.pet_id));
            const newPetsFiltered = morePets.filter(p => !existingIds.has(p.pet_id));
            
            console.log(`✅ Adicionados ${newPetsFiltered.length} novos pets (${morePets.length - newPetsFiltered.length} duplicatas removidas)`);
            return [...prevPets, ...newPetsFiltered];
          });
          
          // Incrementar o skip para o próximo fetch
          setSkip((prevSkip) => prevSkip + 10);
        }
      }
    } catch (error) {
      console.error('Erro ao carregar mais pets:', error);
    }
  };

  // --- MOTOR DE SWIPE ---
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        return Math.abs(gestureState.dx) > 5 || Math.abs(gestureState.dy) > 5;
      },
      onPanResponderMove: (evt, gestureState) => {
        position.setValue({ x: gestureState.dx, y: gestureState.dy * 0.1 });
      },
      onPanResponderRelease: (evt, gestureState) => {
        if (gestureState.dx > SWIPE_THRESHOLD) forceSwipe('right');
        else if (gestureState.dx < -SWIPE_THRESHOLD) forceSwipe('left');
        else resetPosition();
      }
    })
  ).current;

  const forceSwipe = (direction: 'right' | 'left') => {
    const x = direction === 'right' ? SCREEN_WIDTH + 100 : -SCREEN_WIDTH - 100;
    Animated.timing(position, {
      toValue: { x, y: 0 },
      duration: SWIPE_OUT_DURATION,
      useNativeDriver: false,
    }).start(() => onSwipeComplete(direction));
  };

  const onSwipeComplete = async (direction: 'right' | 'left') => {
    const swipedPet = pets[currentIndex];
    
    // Verificar se o pet existe antes de continuar
    if (!swipedPet) {
      console.warn("Pet não encontrado no índice:", currentIndex);
      setCurrentIndex((prev) => prev + 1);
      return;
    }

    // 🔑 Se é TUTOR: myPetId não faz sentido, pula o swipe
    if (activeProfile?.type === 'tutor') {
      console.warn("⚠️ Tutores não podem fazer swipe. Precisa selecionar um pet.");
      return;
    }

    if (!myPetId) {
      console.warn("Pet do utilizador não configurado");
      return;
    }
    
    const isLike = direction === 'right';

    try {
      const response = await fetch(`${API_URL}/interactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pet_id: myPetId,
          target_pet_id: swipedPet.pet_id,
          like_dislike: isLike
        })
      });

      if (response.status === 201) {
        // MATCH DETECTADO!
        const data = await response.json();
        if (data.message === "🎉 It's a match!") {
          setMatchedPet(swipedPet);
          setShowMatchModal(true);
        }
      }
    } catch (error) {
      console.error("Erro ao guardar interação:", error);
    }

    setCurrentIndex((prev) => prev + 1);
    setCurrentPhotoIndex(0); 
    if (isFlipped) handleFlip(true); 
    position.setValue({ x: 0, y: 0 });
  };

  const handleMatchModalClose = () => {
    setShowMatchModal(false);
    
    // Ambos (tutor e pet) vão para matches após um match
    router.push('/matches');
  };

  const resetPosition = () => {
    Animated.spring(position, { toValue: { x: 0, y: 0 }, friction: 4, useNativeDriver: false }).start();
  };

  // --- FLIP ANIMATION ---
  const handleFlip = (forceFront = false) => {
    const toValue = forceFront ? 0 : isFlipped ? 0 : 1;
    Animated.spring(flipAnim, { toValue, friction: 8, tension: 10, useNativeDriver: true }).start();
    if (!forceFront) setIsFlipped(!isFlipped);
    else setIsFlipped(false);
  };

  const frontInterpolate = flipAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });
  const backInterpolate = flipAnim.interpolate({ inputRange: [0, 1], outputRange: ['180deg', '360deg'] });

  const frontOpacity = flipAnim.interpolate({
    inputRange: [0, 0.5, 0.51, 1],
    outputRange: [1, 1, 0, 0]
  });

  const backOpacity = flipAnim.interpolate({
    inputRange: [0, 0.5, 0.51, 1],
    outputRange: [0, 0, 1, 1]
  });

  // ECRÃS DE ESTADO (Loading & Fim do Feed)
  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}><Text style={styles.logoTitle}>Pinder</Text></View>
        <View style={[styles.mainArea, { alignItems: 'center', justifyContent: 'center' }]}>
          <ActivityIndicator size="large" color="#5C4A3D" />
          <Text style={{ marginTop: 15, color: '#666' }}>A procurar pets na tua zona...</Text>
        </View>
        <BottomNav activePage="home" />
      </View>
    );
  }

  if (currentIndex >= pets.length) {
    const emptyMessage = activeProfile?.type === 'tutor' 
      ? 'Não há mais pets para adoção no teu distrito'
      : 'Já viste todos os pets disponíveis!';

    return (
      <View style={styles.container}>
        <View style={styles.header}><Text style={styles.logoTitle}>Pinder</Text></View>
        <View style={[styles.mainArea, { alignItems: 'center', justifyContent: 'center' }]}>
          <FontAwesome5 name="check-circle" size={60} color="#D6CEC3" />
          <Text style={{ fontSize: 20, color: '#5C4A3D', fontWeight: 'bold', marginTop: 20 }}>Pronto!</Text>
          <Text style={{ color: '#888', marginTop: 10, textAlign: 'center', paddingHorizontal: 20 }}>
            {emptyMessage}
          </Text>
        </View>
        <BottomNav activePage="home" />
      </View>
    );
  }

  // --- PREPARAÇÃO DO CARTÃO ATUAL ---
  const currentPet = pets[currentIndex];
  
  const petPhotos = currentPet?.photos?.length > 0 
    ? currentPet.photos.map((p: any) => p.url) 
    : [currentPet?.main_photo || "https://placehold.co/400x600/eeeeee/999999?text=Sem+Foto"];

  const tutorName = currentPet?.owner?.username || currentPet?.user_name || 'Tutor';
  const tutorPhoto = currentPet?.owner?.photo || "https://placehold.co/100x100/eeeeee/999999?text=U";
  const tutorLocation = currentPet?.owner?.location || 'Localização não definida';

  const handleNextPhoto = () => {
    if (currentPhotoIndex < petPhotos.length - 1) setCurrentPhotoIndex(prev => prev + 1);
  };
  const handlePrevPhoto = () => {
    if (currentPhotoIndex > 0) setCurrentPhotoIndex(prev => prev - 1);
  };

  const cardStyle = {
    ...position.getLayout(),
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
        <Animated.View style={[styles.cardContainer, cardStyle]} {...panResponder.panHandlers}>
          
          {/* FRENTE */}
          <Animated.View style={[styles.card, { transform: [{ rotateY: frontInterpolate }], opacity: frontOpacity }]} pointerEvents={isFlipped ? 'none' : 'auto'}>
            <View style={styles.imageContainer}>
              <Image source={{ uri: petPhotos[currentPhotoIndex] }} style={styles.petImage} />
              
              <View style={styles.badgeOverlay}>
                <AdoptionBadge isForAdoption={currentPet?.forAdoption} />
              </View>

              <View style={styles.storyBarsContainer}>
                {petPhotos.map((_, idx) => (
                  <View key={idx} style={[styles.bar, idx === currentPhotoIndex && styles.barActive]} />
                ))}
              </View>

              <TouchableOpacity style={styles.leftTapArea} onPress={handlePrevPhoto} activeOpacity={1} />
              <TouchableOpacity style={styles.rightTapArea} onPress={handleNextPhoto} activeOpacity={1} />
            </View>

            <View style={styles.cardInfoContainer}>
              <View style={styles.petTextInfo}>
                <Text style={styles.petName} numberOfLines={1}>{currentPet?.name} - {calculateAge(currentPet?.dob)}</Text>
                <Text style={styles.petBreed} numberOfLines={1}>{currentPet?.breed?.name || 'Raça Indefinida'}</Text>
              </View>
              
              <View style={styles.tutorBadge}>
                <Image source={{ uri: tutorPhoto }} style={styles.tutorAvatar} />
                <Text style={styles.tutorName} numberOfLines={1}>{tutorName}</Text>
              </View>
            </View>

            <View style={styles.cardActions}>
              {/* Botão de Dislike agora com carinha triste (frown) */}
              <TouchableOpacity style={[styles.actionBtn, styles.btnDislike]} onPress={() => forceSwipe('left')}>
                <FontAwesome5 name="frown" size={26} color="#ff7a7a" />
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

          {/* VERSO (DESCRIÇÃO) */}
          <Animated.View style={[styles.card, styles.cardBack, { transform: [{ rotateY: backInterpolate }], opacity: backOpacity }]} pointerEvents={isFlipped ? 'auto' : 'none'}>
            <View style={styles.backHeader}>
              <View>
                <Text style={styles.backTitle}>{currentPet?.name}</Text>
                <View style={{ marginTop: 5, alignSelf: 'flex-start' }}>
                  <AdoptionBadge isForAdoption={currentPet?.forAdoption} />
                </View>
              </View>
              <TouchableOpacity style={styles.btnFlipBack} onPress={() => handleFlip()}>
                <MaterialIcons name="flip-to-front" size={20} color="#5C4A3D" />
                <Text style={styles.btnFlipBackText}> Voltar</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.backContent} showsVerticalScrollIndicator={false}>
              <Text style={styles.backBreedLine}>
                {currentPet?.breed?.name || 'Raça Indefinida'} • {currentPet?.gender || 'N/A'}
              </Text>
              
              <View style={styles.tutorInfoBack}>
                <Image source={{ uri: tutorPhoto }} style={styles.tutorAvatarMedium} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.tutorNameBack}>Tutor: {tutorName}</Text>
                  <Text style={styles.tutorLocationBack}>
                    <FontAwesome5 name="map-marker-alt" size={10} color="#888" /> {tutorLocation}
                  </Text>
                </View>
              </View>

              <View style={styles.traitsGrid}>
                <View style={styles.traitBadge}><Text style={styles.traitText}>Tamanho: {currentPet?.size || 'N/A'}</Text></View>
                <View style={styles.traitBadge}>
                  <Text style={styles.traitText}>
                    Energia: {currentPet?.energy ? Array(currentPet.energy).fill('⚡').join('') : 'N/A'}
                  </Text>
                </View>
              </View>

              <View style={styles.descriptionBox}>
                <Text style={styles.descriptionTitle}>Sobre mim</Text>
                <Text style={styles.descriptionText}>
                  {currentPet?.description || 'Este pet ainda não tem uma descrição disponível.'}
                </Text>
              </View>
            </ScrollView>

            <View style={[styles.cardActions, styles.backActions]}>
              {/* Botão de Dislike agora com carinha triste (frown) */}
              <TouchableOpacity style={[styles.actionBtn, styles.btnDislike]} onPress={() => forceSwipe('left')}>
                <FontAwesome5 name="frown" size={28} color="#ff7a7a" />
              </TouchableOpacity>
              
              <TouchableOpacity style={[styles.actionBtn, styles.btnLike]} onPress={() => forceSwipe('right')}>
                <FontAwesome5 name="heart" size={28} color="#4CAF50" solid />
              </TouchableOpacity>
            </View>
          </Animated.View>

        </Animated.View>
      </View>

      <MatchModal
        visible={showMatchModal}
        petName={matchedPet?.name || ''}
        petPhoto={matchedPet?.main_photo || ''}
        onClose={handleMatchModalClose}
        isTutor={activeProfile?.type === 'tutor'}
      />

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
  
  badgeOverlay: { position: 'absolute', top: 25, left: 10, zIndex: 20 },
  adoptionStatus: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4, paddingHorizontal: 10, borderRadius: 12, gap: 5 },
  adoptionStatusText: { color: 'white', fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase' },

  storyBarsContainer: { position: 'absolute', top: 10, left: 10, right: 10, flexDirection: 'row', gap: 4, zIndex: 10 },
  bar: { flex: 1, height: 4, backgroundColor: 'rgba(255, 255, 255, 0.5)', borderRadius: 2 },
  barActive: { backgroundColor: 'white' },
  
  leftTapArea: { position: 'absolute', top: 0, bottom: 0, left: 0, width: '50%', zIndex: 5 },
  rightTapArea: { position: 'absolute', top: 0, bottom: 0, right: 0, width: '50%', zIndex: 5 },

  cardInfoContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 15, marginBottom: 10 },
  petTextInfo: { flex: 1 },
  petName: { fontSize: 22, fontWeight: 'bold', color: '#333' },
  petBreed: { fontSize: 15, color: '#666', marginTop: 4 },
  
  tutorBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5F2EB', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 20, marginLeft: 10, borderWidth: 1, borderColor: '#EAE6DF', maxWidth: 120 },
  tutorAvatar: { width: 24, height: 24, borderRadius: 12, marginRight: 6 },
  tutorName: { fontSize: 12, color: '#5C4A3D', fontWeight: 'bold', flexShrink: 1 },

  cardActions: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', marginTop: 5, paddingBottom: 5 },
  actionBtn: { width: 60, height: 60, borderRadius: 30, backgroundColor: 'white', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 5, elevation: 5 },
  btnDislike: { borderWidth: 1, borderColor: '#ffe0e0' },
  btnLike: { width: 70, height: 70, borderRadius: 35, borderWidth: 1, borderColor: '#e6ffe6' },
  btnFlip: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#F5F2EB' },
  flipActionContainer: { alignItems: 'center' },
  flipHint: { fontSize: 10, color: '#999', marginTop: 4 },
  
  backHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', borderBottomWidth: 1, borderBottomColor: '#eee', paddingBottom: 15, marginBottom: 15 },
  backTitle: { fontSize: 26, fontWeight: 'bold', color: '#5C4A3D' },
  btnFlipBack: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5F2EB', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, marginTop: 4 },
  btnFlipBackText: { color: '#5C4A3D', fontWeight: 'bold', marginLeft: 4 },
  backContent: { flex: 1 },
  backBreedLine: { fontSize: 16, color: '#666', fontWeight: 'bold', marginBottom: 15 },
  
  tutorInfoBack: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FAFAFA', padding: 12, borderRadius: 15, marginBottom: 20, borderWidth: 1, borderColor: '#F0F0F0' },
  tutorAvatarMedium: { width: 40, height: 40, borderRadius: 20, marginRight: 12 },
  tutorNameBack: { fontSize: 15, fontWeight: 'bold', color: '#333', marginBottom: 2 },
  tutorLocationBack: { fontSize: 12, color: '#888' },

  traitsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  traitBadge: { backgroundColor: '#F5F2EB', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 15 },
  traitText: { color: '#5C4A3D', fontWeight: '600', fontSize: 14 },
  descriptionBox: { backgroundColor: '#fafafa', padding: 15, borderRadius: 12, borderWidth: 1, borderColor: '#eee', marginBottom: 10 },
  descriptionTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 8 },
  descriptionText: { fontSize: 15, color: '#555', lineHeight: 22 },
  backActions: { justifyContent: 'center', gap: 30, paddingBottom: 0, paddingTop: 10 }
});