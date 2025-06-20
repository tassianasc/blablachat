import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Button, useTheme } from 'react-native-paper';
import { database } from '../config/Firebase';
import { MaterialCommunityIcons } from '@expo/vector-icons';

/**
 * Componente que exibe a lista de usuários (contatos) disponíveis para chat.
 * Permite iniciar uma conversa com um contato ou retornar à tela de login.
 * @param {object} props - Propriedades do componente.
 * @param {string} props.username - Nome de usuário do usuário logado.
 * @param {function} props.setOpcao - Callback para navegar para outra tela (e.g., 'chat', 'login').
 * @param {function} props.setChatData - Callback para definir os dados do chat a ser aberto.
 * @param {function} props.toggleTheme - Função para alternar o tema da aplicação.
 * @param {boolean} props.isDarkTheme - Indica se o tema atual é escuro.
 */
export default function ContactsScreen({ username, setOpcao, setChatData, toggleTheme, isDarkTheme }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const theme = useTheme();

  /**
   * Carrega a lista de todos os usuários do Firebase e a mantém atualizada em tempo real.
   * Exclui o próprio usuário logado da lista de contatos.
   */
  useEffect(() => {
    const usersRef = database.ref('users');

    const handleValueChange = (snapshot) => {
      const data = snapshot.val();
      const loadedUsers = [];
      if (data) {
        for (const key in data) {
          if (data[key].username !== username) { // Filtra o próprio usuário
            loadedUsers.push({ id: key, ...data[key] });
          }
        }
      }
      setUsers(loadedUsers);
      setLoading(false);
    };

    usersRef.on('value', handleValueChange);

    // Limpeza: desinscreve o listener ao desmontar o componente.
    return () => usersRef.off('value', handleValueChange);
  }, [username]); // Recarrega se o nome de usuário mudar

  /**
   * Inicia um chat com o contato selecionado.
   * Cria um ID de chat padronizado (nomes ordenados) e verifica/cria a entrada do chat no Firebase,
   * em seguida, navega para a tela de chat.
   * @param {string} contactUsername - O nome de usuário do contato para iniciar o chat.
   */
  const handleStartChat = async (contactUsername) => {
    // Garante um chatId único e consistente, independentemente da ordem dos participantes.
    const chatParticipants = [username, contactUsername].sort();
    const chatId = `${chatParticipants[0]}_${chatParticipants[1]}`;

    const chatRef = database.ref('chats/' + chatId);
    const snapshot = await chatRef.once('value');

    // Se o chat ainda não existe, cria a entrada inicial no Firebase.
    if (!snapshot.exists()) {
      await chatRef.set({
        participants: {
          [username]: true,
          [contactUsername]: true
        },
        lastMessageText: '',
        lastMessageTimestamp: 0
      });
    }

    setChatData({ chatId: chatId, contactUsername: contactUsername });
    setOpcao('chat'); // Navega para a tela de chat
  };

  // Exibe um indicador de carregamento enquanto os contatos são buscados.
  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={{ color: theme.colors.text, marginTop: 10 }}>Carregando contatos...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.screenTitle, { color: theme.colors.text }]}>Seus contatos</Text>
        <TouchableOpacity onPress={toggleTheme} style={styles.themeToggleButton}>
          <MaterialCommunityIcons 
            name={isDarkTheme ? "weather-sunny" : "weather-night"} 
            size={24} 
            color={theme.colors.primary} 
          />
        </TouchableOpacity>
      </View>

      <FlatList
        data={users}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.contactItem, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.backdrop }]}
            onPress={() => handleStartChat(item.username)}
          >
            <Text style={[styles.contactName, { color: theme.colors.text }]}>{item.username}</Text>
          </TouchableOpacity>
        )}
      />

      <Button
        mode="contained"
        onPress={() => setOpcao('login')} // Botão para deslogar e voltar à tela de login
        style={[styles.logoutButton, { backgroundColor: theme.colors.actionButtonBackground }]}
        labelStyle={{ color: theme.colors.actionButtonText }}
      >
        Sair
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 0,
    paddingHorizontal: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
  },
  screenTitle: {
    fontSize: 18,
    fontWeight: '500',
    alignSelf: 'flex-start',
    marginTop: 0,
    marginLeft: 10,
    marginBottom: 0,
  },
  themeToggleButton: {
    padding: 5,
    marginRight: 10,
  },
  contactItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderRadius: 6,
    marginBottom: 4,
  },
  contactName: {
    fontSize: 17,
  },
  logoutButton: {
    marginTop: 30,
    marginHorizontal: 30,
    borderRadius: 8,
  },
});