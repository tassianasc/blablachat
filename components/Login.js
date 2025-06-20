import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { TextInput, Button, Text, useTheme } from 'react-native-paper';
import { database } from '../config/Firebase';
import { MaterialCommunityIcons } from '@expo/vector-icons';

/**
 * Componente de Login para autenticação e cadastro de usuários.
 * Permite alternar entre temas claro e escuro.
 * @param {object} props - Propriedades do componente.
 * @param {function} props.setOpcao - Callback para alterar a tela principal (e.g., para 'logado').
 * @param {function} props.setUsername - Callback para definir o nome de usuário logado.
 * @param {function} props.toggleTheme - Função para alternar o tema do aplicativo.
 * @param {boolean} props.isDarkTheme - Indica se o tema atual é escuro.
 */
export default function Login({ setOpcao, setUsername, toggleTheme, isDarkTheme }) {
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [users, setUsers] = useState([]); // Armazena a lista de usuários do Firebase para verificação
  const theme = useTheme();

  /**
   * Efeito para carregar e manter a lista de usuários atualizada do Firebase ('/login').
   * Ouve por mudanças em tempo real para refletir novos cadastros imediatamente.
   */
  useEffect(() => {
    const usersRef = database.ref('/login');

    const handleValueChange = (snapshot) => {
      const data = snapshot.val();
      setUsers(data ? Object.values(data) : []);
    };

    usersRef.on('value', handleValueChange);

    // Desinscreve o listener ao desmontar o componente para evitar vazamento de memória.
    return () => usersRef.off('value', handleValueChange);
  }, []);

  /**
   * Cadastra um novo usuário nas coleções '/login' e '/users' do Firebase.
   * Em caso de sucesso, loga o usuário e navega para a tela de contatos.
   * @param {object} newUser - Objeto contendo { username, senha }.
   */
  const registerUser = async (newUser) => {
    try {
      await database.ref('/login').push(newUser);
      await database.ref('users/' + newUser.username).set({ username: newUser.username });

      // Mensagem de sucesso para o usuário.
      Alert.alert('Sucesso', 'Cadastro efetuado com sucesso!');
      setUsername(newUser.username);
      setOpcao('logado');
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível cadastrar o usuário. ' + error.message);
    }
  };

  /**
   * Gerencia o processo de autenticação ou cadastro.
   * Valida inputs, verifica usuário existente e realiza login ou cadastro automático.
   */
  const handleAuthentication = async () => {
    if (usernameInput.trim() === '' || passwordInput.trim() === '') {
      Alert.alert('Erro', 'Por favor, digite usuário e senha!');
      return;
    }

    const userCredentials = { username: usernameInput, senha: passwordInput };

    const foundUser = users.find(
      (user) => user.username === userCredentials.username
    );

    if (foundUser) {
      // Usuário encontrado: tenta fazer login
      if (foundUser.senha === userCredentials.senha) {
        setUsername(foundUser.username);
        setOpcao('logado');
        // Não há mensagem de sucesso para login existente, pois a transição de tela já serve como feedback.
      } else {
        // Senha incorreta: mensagem de erro unificada.
        Alert.alert('Erro', 'Credenciais erradas. Tente novamente!');
      }
    } else {
      // Usuário não encontrado: cadastra automaticamente
      await registerUser(userCredentials);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.loginTitle, { color: theme.colors.text }]}>Login</Text>
        <TouchableOpacity onPress={toggleTheme} style={styles.themeToggleButton}>
          <MaterialCommunityIcons 
            name={isDarkTheme ? "weather-sunny" : "weather-night"}
            size={24} 
            color={theme.colors.primary} 
          />
        </TouchableOpacity>
      </View>

      <TextInput
        label="Usuário"
        value={usernameInput}
        onChangeText={setUsernameInput}
        style={[styles.input, { backgroundColor: theme.colors.inputBackground, borderColor: theme.colors.inputBorder }]}
        theme={{ colors: { primary: theme.colors.primary, text: theme.colors.text, placeholder: theme.colors.placeholder } }}
        textColor={theme.colors.text}
        placeholderTextColor={theme.colors.placeholder}
        autoCapitalize="none"
      />
      <TextInput
        label="Senha"
        value={passwordInput}
        onChangeText={setPasswordInput}
        style={[styles.input, { backgroundColor: theme.colors.inputBackground, borderColor: theme.colors.inputBorder }]}
        secureTextEntry
        theme={{ colors: { primary: theme.colors.primary, text: theme.colors.text, placeholder: theme.colors.placeholder } }}
        textColor={theme.colors.text}
        placeholderTextColor={theme.colors.placeholder}
      />
      <Button 
        mode="contained" 
        onPress={handleAuthentication} 
        style={[styles.button, { backgroundColor: theme.colors.primary }]}
        labelStyle={{ color: theme.colors.onPrimary }}
      >
        Entrar / Cadastrar
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 10,
    marginTop: 0,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 0,
    marginBottom: 20,
  },
  input: {
    marginBottom: 10,
  },
  button: {
    marginBottom: 20,
  },
  loginTitle: {
    fontSize: 18,
    fontWeight: '500',
  },
  themeToggleButton: {
    padding: 5,
  },
});