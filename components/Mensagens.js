import React, { useState, useEffect, useRef } from 'react';
import { FlatList, View, StyleSheet, TouchableOpacity, KeyboardAvoidingView, Platform, Image, Linking, ActivityIndicator, Modal, Alert, Keyboard } from 'react-native';
import { TextInput, Button, Text, useTheme } from 'react-native-paper';
import { database } from '../config/Firebase';
import firebase from "firebase";
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const EMOJIS = [
  '👍', '❤️', '😂', '😮', '😢', '😡', '💯', '🙏', '✨', '🔥',
  '🤩', '🥳', '😎', '😴', '👋', '🎉', '😂', '🥲', '🤣', '😭'
];

/**
 * Componente principal da tela de chat.
 * Exibe e gerencia mensagens de texto, imagens e documentos.
 * Inclui edição de mensagens, seletor de emojis, status online do contato e alternância de tema.
 * @param {object} props - Propriedades do componente.
 * @param {string} props.username - Nome de usuário do usuário logado.
 * @param {function} props.setOpcao - Callback para alterar a tela principal (e.g., para 'logado').
 * @param {object} props.chatData - Dados do chat atual: { chatId, contactUsername }.
 * @param {function} props.toggleTheme - Função para alternar o tema da aplicação.
 * @param {boolean} props.isDarkTheme - Indica se o tema atual é escuro.
 */
export default function Mensagens({ username, setOpcao, chatData, toggleTheme, isDarkTheme }) {
  const [messageInput, setMessageInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [editingMessage, setEditingMessage] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [imageModalUrl, setImageModalUrl] = useState(null);
  const [contactIsOnline, setContactIsOnline] = useState(false);
  const [contactStatusText, setContactStatusText] = useState('Offline');
  const flatListRef = useRef(null);
  const theme = useTheme();

  const { chatId, contactUsername } = chatData;

  /**
   * Efeito para carregar e atualizar as mensagens em tempo real do Firebase.
   * Marca mensagens recebidas como lidas e rola a lista para a última mensagem.
   */
  useEffect(() => {
    const chatMessagesRef = database.ref(`messages/${chatId}`);

    const handleMessagesChange = (snapshot) => {
      const data = snapshot.val();
      const loadedMessages = [];

      if (data) {
        Object.keys(data).forEach((key) => loadedMessages.push({ id: key, ...data[key] }));
      }

      loadedMessages.sort((a, b) => a.timestamp - b.timestamp);
      setMessages(loadedMessages);

      loadedMessages.forEach((msg) => {
        if (msg.to === username && !msg.read) {
          database.ref(`messages/${chatId}/${msg.id}`).update({ read: true });
        }
      });

      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    };

    chatMessagesRef.on('value', handleMessagesChange);
    return () => chatMessagesRef.off('value', handleMessagesChange); // Limpeza do listener
  }, [chatId, username]);

  /**
   * Efeito para gerenciar o status online do usuário logado no Firebase.
   * Define o status como online ao montar e offline ao desmontar/desconectar.
   */
  useEffect(() => {
    if (!username) return;

    const userStatusRef = database.ref(`usersStatus/${username}`);

    userStatusRef.set({
      isOnline: true,
      lastChanged: firebase.database.ServerValue.TIMESTAMP
    });

    userStatusRef.onDisconnect().set({
      isOnline: false,
      lastChanged: firebase.database.ServerValue.TIMESTAMP
    });

    return () => {
      userStatusRef.set({
        isOnline: false,
        lastChanged: firebase.database.ServerValue.TIMESTAMP
      });
    };
  }, [username]);

  /**
   * Efeito para observar e exibir o status online do contato atual.
   */
  useEffect(() => {
    if (!contactUsername) return;

    const contactStatusRef = database.ref(`usersStatus/${contactUsername}`);

    const handleContactStatusChange = (snapshot) => {
      const statusData = snapshot.val();
      setContactIsOnline(statusData && statusData.isOnline);
      setContactStatusText(statusData && statusData.isOnline ? 'Online' : 'Offline');
    };

    contactStatusRef.on('value', handleContactStatusChange);
    return () => contactStatusRef.off('value', handleContactStatusChange); // Limpeza do listener
  }, [contactUsername]);

  /**
   * Envia uma nova mensagem ou edita uma mensagem existente.
   * Suporta mensagens de texto, imagens e documentos.
   * @param {string} type - Tipo da mensagem ('text', 'image', 'document', 'pdf').
   * @param {object} [fileData=null] - Dados do arquivo para mensagens de mídia: { fileUrl, fileName, type, mimeType }.
   * @param {string} [emojiText=null] - Texto de emoji a ser enviado (se aplicável).
   */
  const handleSendMessage = async (type = 'text', fileData = null, emojiText = null) => {
    if (type === 'text' && messageInput.trim() === '' && !emojiText) return;
    if (type !== 'text' && !fileData) return;

    setIsUploading(true);
    Keyboard.dismiss();

    try {
      if (editingMessage) {
        if (type !== 'text') {
          Alert.alert('Erro', 'Não é possível editar arquivos.');
          setIsUploading(false);
          return;
        }
        await database.ref(`messages/${chatId}/${editingMessage.id}`).update({
          text: messageInput,
          edited: true,
          timestamp: Date.now()
        });
        setEditingMessage(null);
        setMessageInput('');
      } else {
        const newMessage = {
          from: username,
          to: contactUsername,
          timestamp: Date.now(),
          read: false,
          edited: false,
        };

        if (type === 'text') {
          newMessage.type = 'text';
          newMessage.text = emojiText || messageInput;
        } else {
          newMessage.type = fileData.type;
          newMessage.fileUrl = fileData.fileUrl;
          newMessage.fileName = fileData.fileName;
        }

        await database.ref(`messages/${chatId}`).push(newMessage);
        setMessageInput('');
        setShowEmojiPicker(false);

        // Atualiza a última mensagem no chat para exibição rápida na lista de contatos/conversas.
        await database.ref(`chats/${chatId}`).update({
          lastMessageText:
            newMessage.type === 'text'
              ? newMessage.text
              : `[${newMessage.type.toUpperCase()}] ${newMessage.fileName}`,
          lastMessageTimestamp: newMessage.timestamp
        });
      }
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível enviar/editar a mensagem. ' + error.message);
    } finally {
      setIsUploading(false);
    }
  };

  /**
   * Abre o seletor de arquivos do dispositivo (primeiro documento, depois imagem).
   * Processa o arquivo selecionado e o envia via `uploadFileAsBase64`.
   */
  const pickFile = async () => {
    if (editingMessage) {
      Alert.alert('Ação Bloqueada', 'Cancele a edição antes de anexar um arquivo.');
      return;
    }

    try {
      let result = await DocumentPicker.getDocumentAsync({ type: '*/*' });
      if (result.canceled || !result.assets?.length) {
        result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images });
        if (result.canceled || !result.assets?.length) return;
      }

      const asset = result.assets[0];
      let fileType = 'document';
      if (asset.mimeType?.includes('image')) fileType = 'image';
      else if (asset.mimeType?.includes('pdf')) fileType = 'pdf';

      const fileName = asset.name || `${fileType}_${Date.now()}.${asset.uri.split('.').pop()}`;
      uploadFileAsBase64(asset.uri, fileName, fileType, asset.mimeType);
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível selecionar o arquivo/imagem.');
    }
  };

  /**
   * Converte o arquivo de uma URI para Base64 e o envia como mensagem.
   * Utilizado para armazenar arquivos diretamente no Firebase Realtime Database.
   * @param {string} uri - URI do arquivo local.
   * @param {string} fileName - Nome do arquivo.
   * @param {string} fileType - Tipo inferido do arquivo ('image', 'document', 'pdf').
   * @param {string} mimeType - MIME type do arquivo.
   */
  const uploadFileAsBase64 = async (uri, fileName, fileType, mimeType) => {
    setIsUploading(true);
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      const reader = new FileReader();

      reader.onloadend = () => {
        const base64data = reader.result;
        handleSendMessage(fileType, { fileUrl: base64data, fileName, type: fileType, mimeType });
      };

      reader.readAsDataURL(blob);
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível converter o arquivo. ' + error.message);
    } finally {
      setIsUploading(false);
    }
  };

  /**
   * Define uma mensagem de texto para edição.
   * @param {object} messageToEdit - A mensagem de texto a ser editada.
   */
  const handleEditMessage = (messageToEdit) => {
    if (messageToEdit.type !== 'text') {
      Alert.alert('Impossível Editar', 'Apenas mensagens de texto podem ser editadas.');
      return;
    }
    setEditingMessage(messageToEdit);
    setMessageInput(messageToEdit.text);
    setShowEmojiPicker(false);
  };

  /**
   * Adiciona um emoji ao campo de entrada de mensagem.
   * @param {string} emoji - O emoji a ser adicionado.
   */
  const addEmojiToMessageInput = (emoji) => {
    setMessageInput((prevMessage) => prevMessage + emoji);
    setShowEmojiPicker(false);
  };

  /**
   * Renderiza uma única bolha de mensagem na lista.
   * Exibe conteúdo diferente baseado no tipo da mensagem (texto, imagem, documento)
   * e inclui informações como remetente, timestamp e status de leitura.
   * @param {object} item - O objeto da mensagem a ser renderizado.
   */
  const renderMessageItem = ({ item }) => {
    const isMyMessage = item.from === username;
    return (
      <View
        style={[
          styles.messageBubble,
          isMyMessage
            ? { backgroundColor: theme.colors.myMessageBackground, alignSelf: 'flex-end' }
            : { backgroundColor: theme.colors.otherMessageBackground, alignSelf: 'flex-start' },
        ]}
      >
        <Text style={[styles.username, { color: theme.colors.text }]}>{item.from}</Text>

        {item.type === 'text' && (
          <Text style={[styles.messageText, { color: theme.colors.text }]}>
            {item.text} {item.edited && <Text style={[styles.editedText, { color: theme.colors.lightText }] }>(editado)</Text>}
          </Text>
        )}

        {item.type === 'image' && (
          <TouchableOpacity onPress={() => setImageModalUrl(item.fileUrl)}>
            <Image source={{ uri: item.fileUrl }} style={styles.imageMessage} />
          </TouchableOpacity>
        )}

        {(item.type === 'pdf' || item.type === 'document') && (
          <TouchableOpacity onPress={() => Linking.openURL(item.fileUrl)}>
            <Text style={[styles.fileLinkText, { color: theme.colors.primary }]}>📁 {item.fileName}</Text>
            {item.type === 'pdf' && <Text style={[styles.fileTypeText, { color: theme.colors.lightText }]}>(PDF)</Text>}
          </TouchableOpacity>
        )}

        <View style={styles.messageFooter}>
          <Text style={[styles.messageTimestamp, { color: theme.colors.lightText }]}>
            {new Date(item.timestamp).toLocaleTimeString('pt-BR')}
          </Text>
          {isMyMessage && (
            <Text style={item.read ? styles.readTicks : styles.sentTicks}>{item.read ? '✔✔' : '✔'}</Text>
          )}
        </View>

        {isMyMessage && item.type === 'text' && (
          <View style={styles.actionButtonsContainer}>
            <TouchableOpacity onPress={() => handleEditMessage(item)}>
              <Text style={[styles.editButton, { color: theme.colors.primary }]}>Editar</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  /**
   * Renderiza um modal em tela cheia para visualização de imagens.
   */
  const renderImagePreviewModal = () => (
    <Modal visible={!!imageModalUrl} transparent animationType="fade">
      <View
        style={{
          flex: 1,
          backgroundColor: theme.colors.backdrop,
          justifyContent: 'center',
          alignItems: 'center'
        }}
      >
        <TouchableOpacity
          style={styles.closeModalButton}
          onPress={() => setImageModalUrl(null)}
        >
          <Text style={{ fontSize: 30, color: theme.colors.text }}>✕</Text>
        </TouchableOpacity>

        <Image
          source={{ uri: imageModalUrl }}
          style={styles.modalImage}
        />
      </View>
    </Modal>
  );

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.colors.chatBackground }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}
    >
      <View style={styles.contentWrapper}>
        <View style={[styles.header, { backgroundColor: theme.colors.headerBackground }]}>
          <TouchableOpacity onPress={() => { setOpcao('logado'); setEditingMessage(null); setMessageInput(''); }}>
            <Text style={[styles.backButton, { color: theme.colors.text }]}>←</Text>
          </TouchableOpacity>

          <View style={styles.chatTitleContainer}>
            <Text style={[styles.chatTitle, { color: theme.colors.text }]}>Chat com {contactUsername}</Text>
            <View style={styles.statusIndicatorContainer}>
              <Text style={contactIsOnline ? { color: theme.colors.onlineIndicator, fontSize: 12, marginRight: 4, fontWeight: '500' } : { color: theme.colors.offlineIndicator, fontSize: 12, marginRight: 4, fontWeight: '500' }}>
                {contactStatusText}
              </Text>
              <View style={contactIsOnline ? { ...styles.onlineIndicator, backgroundColor: theme.colors.onlineIndicator } : { ...styles.offlineIndicator, backgroundColor: theme.colors.offlineIndicator }} />
            </View>
          </View>

          <TouchableOpacity onPress={toggleTheme} style={styles.themeToggleButton}>
            <MaterialCommunityIcons 
              name={isDarkTheme ? "weather-sunny" : "weather-night"}
              size={24} 
              color={theme.colors.primary} 
            />
          </TouchableOpacity>

          <TouchableOpacity onPress={() => { setOpcao('login'); setEditingMessage(null); setMessageInput(''); }}>
            <Text style={[styles.closeChatButton, { color: theme.colors.notification }]}>⨉</Text>
          </TouchableOpacity>
        </View>

        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessageItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          style={styles.messageList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        />

        {isUploading && (
          <View style={[styles.uploadingContainer, { backgroundColor: theme.colors.surface }]}>
            <ActivityIndicator size="small" color={theme.colors.primary} />
            <Text style={[styles.uploadingText, { color: theme.colors.text }]}>Enviando arquivo...</Text>
          </View>
        )}

        {editingMessage && (
          <View style={[styles.editingBanner, { backgroundColor: theme.colors.accent }]}>
            <Text style={[styles.editingText, { color: theme.colors.text }]}>
              Editando: {editingMessage.text.substring(0, 30)}...
            </Text>
            <TouchableOpacity onPress={() => { setEditingMessage(null); setMessageInput(''); }}>
              <Text style={[styles.cancelEdit, { color: theme.colors.notification }]}>X</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={[styles.inputContainer, { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.backdrop }]}>
          <TouchableOpacity onPress={pickFile} style={styles.iconButton} disabled={!!editingMessage || isUploading}>
            <Text
              style={[
                styles.icon,
                { color: theme.colors.text },
                editingMessage || isUploading ? styles.disabledIcon : {}
              ]}
            >📎</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowEmojiPicker(true)} style={styles.iconButton}>
            <Text style={[styles.icon, { color: theme.colors.text }]}>😊</Text>
          </TouchableOpacity>

          <TextInput
            label="Mensagem"
            value={messageInput}
            onChangeText={setMessageInput}
            style={[styles.input, { backgroundColor: theme.colors.inputBackground, borderColor: theme.colors.inputBorder }]}
            placeholder={editingMessage ? 'Edite sua mensagem...' : 'Digite sua mensagem...'}
            editable={!isUploading}
            onSubmitEditing={() => handleSendMessage('text')}
            returnKeyType="send"
            theme={{ colors: { primary: theme.colors.primary, text: theme.colors.text, placeholder: theme.colors.placeholder } }}
            textColor={theme.colors.text}
            placeholderTextColor={theme.colors.placeholder}
          />

          <TouchableOpacity
            onPress={() => handleSendMessage('text')}
            style={[styles.sendButtonContainer, { backgroundColor: theme.colors.primary }]}
            disabled={isUploading}
          >
            <Text style={[styles.sendButton, { color: theme.colors.onPrimary }]}>{editingMessage ? '✔' : '➤'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Modal visible={showEmojiPicker} transparent animationType="slide">
        <TouchableOpacity style={styles.modalOverlay} onPressOut={() => setShowEmojiPicker(false)}>
          <View style={[styles.emojiPickerModal, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.emojiGrid}>
              {EMOJIS.map((emoji, idx) => (
                <TouchableOpacity key={idx} onPress={() => addEmojiToMessageInput(emoji)}>
                  <Text style={[styles.emoji, { color: theme.colors.text }]}>{emoji}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Button onPress={() => setShowEmojiPicker(false)} labelStyle={{ color: theme.colors.primary }}>Fechar</Button>
          </View>
        </TouchableOpacity>
      </Modal>

      {renderImagePreviewModal()}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  contentWrapper: { flex: 1, justifyContent: 'flex-end' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
    paddingTop: Platform.OS === 'android' ? 30 : 10
  },
  backButton: { fontSize: 20 },
  chatTitleContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  statusIndicatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  onlineIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  offlineIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  closeChatButton: { fontSize: 20 },
  inputContainer: {
    flexDirection: 'row',
    padding: 10,
    borderTopWidth: 1,
    alignItems: 'center'
  },
  iconButton: { padding: 8, marginRight: 5 },
  icon: { fontSize: 22 },
  disabledIcon: { opacity: 0.5 },
  input: {
    flex: 1,
    height: 40,
    marginRight: 10,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 15,
  },
  sendButtonContainer: {
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButton: { fontSize: 22 },
  messageList: { flex: 1 },
  list: { paddingHorizontal: 10 },
  messageBubble: {
    padding: 10,
    marginVertical: 4,
    borderRadius: 15,
    maxWidth: '80%'
  },
  username: { fontWeight: 'bold', marginBottom: 2, fontSize: 14 },
  messageText: { fontSize: 15 },
  editedText: { fontSize: 10 },
  messageFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 5
  },
  messageTimestamp: {
    fontSize: 10,
    marginRight: 5
  },
  fileLinkText: {
    fontSize: 16,
    textDecorationLine: 'underline'
  },
  fileTypeText: {
    fontSize: 10,
    marginTop: 2
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 5
  },
  editButton: { fontSize: 12 },
  uploadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    position: 'absolute',
    bottom: 60,
    left: 0,
    right: 0,
    zIndex: 10
  },
  uploadingText: { marginLeft: 10, fontSize: 14 },
  sentTicks: { color: '#999', fontSize: 10 },
  readTicks: { color: '#007AFF', fontSize: 10 },
  editingBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 8,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    marginHorizontal: 10,
    marginBottom: 5,
  },
  editingText: { fontSize: 14, flex: 1 },
  cancelEdit: { fontSize: 16, fontWeight: 'bold', marginLeft: 10 },
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  emojiPickerModal: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '50%',
  },
  emojiGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', marginBottom: 10 },
  emoji: { fontSize: 28, padding: 8 },
  imageMessage: { width: 200, height: 150, borderRadius: 8, resizeMode: 'cover', marginTop: 5 },
  themeToggleButton: {
    padding: 5,
  },
  closeModalButton: { position: 'absolute', top: 40, right: 20 },
  modalImage: { width: '90%', height: '70%', resizeMode: 'contain' },
});