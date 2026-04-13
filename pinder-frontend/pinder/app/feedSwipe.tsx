import React, { useState, useRef } from 'react';
import { 
  View, 
  Text, 
  Image, 
  TouchableOpacity, 
  StyleSheet, 
  Animated, 
  Platform
} from 'react-native';
import { FontAwesome5, MaterialIcons } from '@expo/vector-icons'; // Substitui o react-icons
import BottomNav from '@/src/components/BottomNav';

export default function FeedSwipe() {
  const [isFlipped, setIsFlipped] = useState(false);
  
  // O motor da animação que começa no valor 0
  const flipAnim = useRef(new Animated.Value(0)).current;

  const handleFlip = () => {
    // efeito para virar o cartão. Se estiver virado, volta para 0, se não, vai para 1
    Animated.spring(flipAnim, {
      toValue: isFlipped ? 0 : 1,
      friction: 8,
      tension: 10,
      useNativeDriver: true,
    }).start();
    
    setIsFlipped(!isFlipped);
  };

  // Calcula a rotação da Frente (0º a 180º)
  const frontInterpolate = flipAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  // Calcula a rotação das Costas (180º a 360º)
  const backInterpolate = flipAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['180deg', '360deg'],
  });

  const frontAnimatedStyle = { transform: [{ rotateY: frontInterpolate }] };
  const backAnimatedStyle = { transform: [{ rotateY: backInterpolate }] };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <FontAwesome5 name="paw" size={24} color="#5C4A3D" />
        <Text style={styles.logoTitle}>Pinder</Text>
      </View>

      {/* Área Central do Cartão */}
      <View style={styles.mainArea}>
        <View style={styles.cardContainer}>
          
          {/* Frente do Cartão */}
          <Animated.View style={[styles.card, styles.cardFront, frontAnimatedStyle]}>
            <View style={styles.imageContainer}>
              <Image 
                source={{ uri: "https://images.unsplash.com/photo-1552053831-71594a27632d?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=60" }} 
                style={styles.petImage}
              />
              
              {/* Barras de Story no topo da imagem */}
              <View style={styles.storyBarsContainer}>
                <View style={[styles.bar, styles.barActive]} />
                <View style={styles.bar} />
                <View style={styles.bar} />
                <View style={styles.bar} />
              </View>
              
              <View style={styles.photoCounter}>
                <Text style={styles.photoCounterText}>Fotos (4)</Text>
              </View>
            </View>

            <View style={styles.cardInfo}>
              <Text style={styles.petName}>Buddy - 3 anos</Text>
              <Text style={styles.petBreed}>Golden Retriever</Text>
            </View>

            {/* Botões de Ação na Frente */}
            <View style={styles.cardActions}>
              <TouchableOpacity style={[styles.actionBtn, styles.btnDislike]}>
  <FontAwesome5 name="frown" size={28} color="#ff7a7a" />
</TouchableOpacity>
              
              <TouchableOpacity style={[styles.actionBtn, styles.btnLike]}>
                <FontAwesome5 name="heart" size={28} color="#4CAF50" solid />
              </TouchableOpacity>
              
              <View style={styles.flipActionContainer}>
                <TouchableOpacity style={[styles.actionBtn, styles.btnFlip]} onPress={handleFlip}>
                  <MaterialIcons name="flip-to-back" size={24} color="#5C4A3D" />
                </TouchableOpacity>
                <Text style={styles.flipHint}>Ver Descrição &gt;</Text>
              </View>
            </View>
          </Animated.View>


  {/* Verso do Cartão */}
          <Animated.View style={[styles.card, styles.cardBack, backAnimatedStyle]}>
            <View style={styles.backHeader}>
              <Text style={styles.backTitle}>Buddy</Text>
              <TouchableOpacity style={styles.btnFlipBack} onPress={handleFlip}>
                <MaterialIcons name="flip-to-front" size={20} color="#5C4A3D" />
                <Text style={styles.btnFlipBackText}> Voltar</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.backContent}>
              <Text style={styles.backBreedLine}>Golden Retriever • 3 anos • Macho</Text>
              
              <View style={styles.traitsGrid}>
                <View style={styles.traitBadge}><Text style={styles.traitText}>Tamanho: Médio</Text></View>
                <View style={styles.traitBadge}><Text style={styles.traitText}>Energia: Alta ⚡</Text></View>
              </View>

              <View style={styles.descriptionBox}>
                <Text style={styles.descriptionTitle}>Sobre mim</Text>
                <Text style={styles.descriptionText}>
                  Sou o Buddy! Cão ativo e carinhoso. Adoro correr atrás de bolas, nadar e fazer novos amigos peludos e humanos. Vamos brincar no parque!
                </Text>
              </View>
            </View>

            {/* Botões de Ação nas Costas */}
            <View style={[styles.cardActions, styles.backActions]}>
              <TouchableOpacity style={[styles.actionBtn, styles.btnDislike]}>
                <FontAwesome5 name="times" size={24} color="#ff8686" />
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionBtn, styles.btnLike]}>
                <FontAwesome5 name="heart" size={28} color="#4CAF50" solid />
              </TouchableOpacity>
            </View>
          </Animated.View>

        </View>
      </View>
      <BottomNav activePage="home" />


    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F2EB',
    paddingTop: 40, // Espaço para a barra de estado do telemóvel
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
  },
  logoTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#5C4A3D',
    marginLeft: 10,
  },
 mainArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 100 : 80, 
  },

  cardContainer: {
    width: '100%',
    height: '100%', 
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    width: '100%',
    height: '100%',
    backgroundColor: 'white',
    borderRadius: 20,
    backfaceVisibility: 'hidden', 
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8, // Sombra para Android
    position: 'absolute', // Costas e Frente têm de ficar sobrepostas
  },
  cardFront: {
    padding: 15,
  },
  cardBack: {
    padding: 20,
  },
  imageContainer: {
    flex: 1,
    position: 'relative',
    borderRadius: 15,
    overflow: 'hidden',
  },
  petImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  storyBarsContainer: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    zIndex: 10,
  },
  bar: {
    flex: 1,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    marginHorizontal: 2,
    borderRadius: 2,
  },
  barActive: {
    backgroundColor: 'white',
  },
  photoCounter: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
  },
  photoCounterText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  cardInfo: {
    marginTop: 15,
    marginBottom: 10,
  },
  petName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  petBreed: {
    fontSize: 16,
    color: '#666',
    marginTop: 4,
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginTop: 10,
    paddingBottom: 10,
  },
  actionBtn: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 5,
  },
  btnDislike: {
    borderWidth: 1,
    borderColor: '#ffe6e6',
  },
  btnLike: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 1,
    borderColor: '#e6ffe6',
  },
  btnFlip: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#F5F2EB',
  },
  flipActionContainer: {
    alignItems: 'center',
  },
  flipHint: {
    fontSize: 10,
    color: '#999',
    marginTop: 4,
  },
  backHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 15,
    marginBottom: 15,
  },
  backTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#5C4A3D',
  },
  btnFlipBack: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F2EB',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  btnFlipBackText: {
    color: '#5C4A3D',
    fontWeight: 'bold',
    marginLeft: 4,
  },
  backContent: {
    flex: 1,
  },
  backBreedLine: {
    fontSize: 16,
    color: '#666',
    fontWeight: 'bold',
    marginBottom: 15,
  },
  traitsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  traitBadge: {
    backgroundColor: '#F5F2EB',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 15,
  },
  traitText: {
    color: '#5C4A3D',
    fontWeight: '600',
    fontSize: 14,
  },
  descriptionBox: {
    backgroundColor: '#fafafa',
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#eee',
  },
  descriptionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  descriptionText: {
    fontSize: 15,
    color: '#555',
    lineHeight: 22,
  },
  backActions: {
    justifyContent: 'center',
    gap: 30,
    paddingBottom: 0,
  },
  bottomNavPlaceholder: {
    height: 60,
    borderTopWidth: 1,
    borderTopColor: '#ddd',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
  }
});