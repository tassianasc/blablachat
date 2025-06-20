import React, { useState } from 'react';
import { SafeAreaView, StyleSheet, Image, Dimensions } from 'react-native';
import { Provider as PaperProvider, DefaultTheme, DarkTheme } from 'react-native-paper';

import Mensagens from './components/Mensagens';
import Login from './components/Login';
import ContactsScreen from './components/ContactsScreen';

import Logo from './assets/blablachat.png';

/**
 * Tema claro personalizado para react-native-paper.
 * Define a paleta de cores para os componentes da UI em modo claro.
 */
const LightTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: '#6200ee',
    accent: '#03dac4',
    background: '#f0f0f0',
    surface: '#ffffff',
    text: '#000000',
    placeholder: '#888888',
    disabled: '#aaaaaa',
    backdrop: 'rgba(0,0,0,0.5)',
    notification: '#ff0000',
    chatBackground: '#ecf0f1',
    myMessageBackground: '#DCF8C6',
    otherMessageBackground: '#FFFFFF',
    headerBackground: '#eee',
    lightText: '#666',
    inputBackground: '#eee',
    inputBorder: '#ddd',
    onlineIndicator: '#4CAF50',
    offlineIndicator: '#888',
    actionButtonText: '#1a4f8b',
    actionButtonBackground: '#d0e7ff',
  },
};

/**
 * Tema escuro personalizado para react-native-paper.
 * Define a paleta de cores para os componentes da UI em modo escuro.
 */
const DarkThemeCustom = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: '#BB86FC',
    accent: '#03DAC6',
    background: '#2C2C2C',
    surface: '#3A3A3A',
    headerBackground: '#383838',
    inputBackground: '#4A4A4A',
    inputBorder: '#616161',
    chatBackground: '#1F1F1F',
    myMessageBackground: '#4CAF50',
    otherMessageBackground: '#545F67',
    text: '#FFFFFF',
    placeholder: '#BBBBBB',
    lightText: '#AAAAAA',
    onlineIndicator: '#4CAF50',
    offlineIndicator: '#888888',
    actionButtonText: '#E0E0E0',
    actionButtonBackground: '#555555',
    disabled: '#555555',
    backdrop: 'rgba(0,0,0,0.7)',
    notification: '#CF6679',
  },
};

/**
 * Componente principal da aplicação.
 * Gerencia a navegação entre as telas (Login, Contatos, Chat)
 * e a alternância de tema (claro/escuro).
 */
export default function App() {
  const [currentScreen, setCurrentScreen] = useState('login'); 
  const [loggedInUsername, setLoggedInUsername] = useState('');
  const [activeChatData, setActiveChatData] = useState(null); 
  const [isDarkTheme, setIsDarkTheme] = useState(false); 

  const theme = isDarkTheme ? DarkThemeCustom : LightTheme;

  /**
   * Alterna o estado do tema entre claro e escuro.
   */
  const toggleTheme = () => setIsDarkTheme((prev) => !prev);

  let displayedScreen = null;

  // Renderiza a tela ativa com base no estado `currentScreen`.
  if (currentScreen === 'login') {
    displayedScreen = (
      <Login 
        setOpcao={setCurrentScreen} 
        setUsername={setLoggedInUsername} 
        toggleTheme={toggleTheme} 
        isDarkTheme={isDarkTheme} 
      />
    );
  } else if (currentScreen === 'logado') {
    displayedScreen = (
      <ContactsScreen
        username={loggedInUsername}
        setOpcao={setCurrentScreen}
        setChatData={setActiveChatData}
        toggleTheme={toggleTheme} 
        isDarkTheme={isDarkTheme} 
      />
    );
  } else if (currentScreen === 'chat') {
    displayedScreen = (
      <Mensagens
        username={loggedInUsername}
        setOpcao={setCurrentScreen}
        chatData={activeChatData}
        toggleTheme={toggleTheme} 
        isDarkTheme={isDarkTheme} 
      />
    );
  }

  return (
    <PaperProvider theme={theme}>
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        {/* Oculta o logo na tela de chat para otimizar espaço */}
        {currentScreen !== 'chat' && <Image source={Logo} style={styles.logo} />}
        {displayedScreen}
      </SafeAreaView>
    </PaperProvider>
  );
}

const screenWidth = Dimensions.get('window').width;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  logo: {
    width: screenWidth * 0.6,
    height: screenWidth * 0.6,
    resizeMode: 'contain',
    alignSelf: 'center',
    marginTop: 0,
    marginBottom: -20,
  },
});