import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { chatApi } from '../api/client';

interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
}

const WELCOME_TEXT =
  '👋 Hi! I\'m ChiliBot — your AI assistant for everything about chili peppers.\n\n' +
  'Ask me about Philippine chili varieties, recipes, growing tips, health benefits, Scoville ratings, or market prices!';

const CATEGORIES = [
  { label: '🌶️ Varieties', prompt: 'Tell me about Philippine chili pepper varieties' },
  { label: '🍳 Recipes', prompt: 'What are popular Filipino recipes using chili peppers?' },
  { label: '💪 Health', prompt: 'What are the health benefits of eating chili peppers?' },
  { label: '🌱 Growing', prompt: 'How do I grow chili peppers at home in the Philippines?' },
  { label: '🔥 Scoville', prompt: 'Explain the Scoville scale and where Filipino chilies rank' },
  { label: '📦 Storage', prompt: 'What is the best way to store and preserve chili peppers?' },
];

const SUGGESTIONS_INITIAL = [
  'What is Siling Labuyo?',
  'Compare Siling Haba and Siling Labuyo',
  'Best chili for sinigang?',
];

export default function ChatScreen() {
  const scrollRef = useRef<ScrollView>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'assistant', text: WELCOME_TEXT },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>(SUGGESTIONS_INITIAL);

  useEffect(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }, [messages]);

  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const userMsg: ChatMessage = { role: 'user', text: trimmed };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setSuggestions([]);
    setLoading(true);

    try {
      const history = messages
        .filter((m) => m.role !== 'assistant' || m.text !== WELCOME_TEXT)
        .slice(-10);

      const data = await chatApi.ask(trimmed, history);

      const botMsg: ChatMessage = { role: 'assistant', text: data.reply };
      setMessages((prev) => [...prev, botMsg]);

      if (data.suggestions?.length) {
        setSuggestions(data.suggestions);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', text: '⚠️ Sorry, I couldn\'t get a response. Please try again.' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.headerEmoji}>🤖</Text>
          <View>
            <Text style={styles.headerTitle}>ChiliBot</Text>
            <Text style={styles.headerSubtitle}>AI Chili Pepper Assistant</Text>
          </View>
        </View>
      </View>

      {/* Messages */}
      <ScrollView
        ref={scrollRef}
        style={styles.messageList}
        contentContainerStyle={styles.messageListContent}
      >
        {/* Category buttons (shown once at top) */}
        {messages.length <= 1 && (
          <View style={styles.categoryRow}>
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat.label}
                style={styles.categoryChip}
                onPress={() => sendMessage(cat.prompt)}
              >
                <Text style={styles.categoryChipText}>{cat.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {messages.map((msg, i) => (
          <View
            key={i}
            style={[
              styles.messageBubble,
              msg.role === 'user' ? styles.userBubble : styles.botBubble,
            ]}
          >
            {msg.role === 'assistant' && (
              <Text style={styles.botAvatar}>🤖</Text>
            )}
            <View
              style={[
                styles.bubbleInner,
                msg.role === 'user' ? styles.userBubbleInner : styles.botBubbleInner,
              ]}
            >
              <Text
                style={[
                  styles.messageText,
                  msg.role === 'user' ? styles.userText : styles.botText,
                ]}
              >
                {msg.text}
              </Text>
            </View>
          </View>
        ))}

        {loading && (
          <View style={[styles.messageBubble, styles.botBubble]}>
            <Text style={styles.botAvatar}>🤖</Text>
            <View style={[styles.bubbleInner, styles.botBubbleInner]}>
              <ActivityIndicator size="small" color="#dc2626" />
              <Text style={styles.typingText}>Thinking…</Text>
            </View>
          </View>
        )}

        {/* Suggestion chips */}
        {suggestions.length > 0 && !loading && (
          <View style={styles.suggestionsRow}>
            {suggestions.map((s, i) => (
              <TouchableOpacity
                key={i}
                style={styles.suggestionChip}
                onPress={() => sendMessage(s)}
              >
                <Text style={styles.suggestionText}>{s}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Input bar */}
      <View style={styles.inputBar}>
        <TextInput
          style={styles.textInput}
          value={input}
          onChangeText={setInput}
          placeholder="Ask about chili peppers…"
          placeholderTextColor="#9ca3af"
          multiline
          maxLength={500}
          editable={!loading}
          onSubmitEditing={() => sendMessage(input)}
          blurOnSubmit
        />
        <TouchableOpacity
          style={[styles.sendButton, (!input.trim() || loading) && styles.sendButtonDisabled]}
          onPress={() => sendMessage(input)}
          disabled={!input.trim() || loading}
        >
          <Ionicons name="send" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: {
    backgroundColor: '#dc2626',
    paddingTop: 56,
    paddingBottom: 16,
    paddingHorizontal: 20,
  },
  headerContent: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerEmoji: { fontSize: 32 },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#fff' },
  headerSubtitle: { color: 'rgba(255,255,255,0.8)', fontSize: 13, marginTop: 1 },

  /* Category chips */
  categoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  categoryChipText: { fontSize: 13, color: '#4b5563', fontWeight: '500' },

  /* Messages */
  messageList: { flex: 1 },
  messageListContent: { padding: 16, paddingBottom: 8 },
  messageBubble: { flexDirection: 'row', marginBottom: 12, alignItems: 'flex-end' },
  userBubble: { justifyContent: 'flex-end' },
  botBubble: { justifyContent: 'flex-start' },
  botAvatar: { fontSize: 20, marginRight: 8, marginBottom: 4 },
  bubbleInner: { maxWidth: '80%', borderRadius: 18, padding: 14 },
  userBubbleInner: { backgroundColor: '#dc2626', borderBottomRightRadius: 4 },
  botBubbleInner: {
    backgroundColor: '#fff',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  messageText: { fontSize: 14, lineHeight: 20 },
  userText: { color: '#fff' },
  botText: { color: '#1f2937' },
  typingText: { color: '#9ca3af', fontSize: 13, marginLeft: 8 },

  /* Suggestions */
  suggestionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  suggestionChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  suggestionText: { fontSize: 12, color: '#dc2626', fontWeight: '500' },

  /* Input bar */
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    paddingBottom: Platform.OS === 'ios' ? 32 : 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    gap: 10,
  },
  textInput: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    borderRadius: 22,
    paddingHorizontal: 18,
    paddingVertical: 12,
    fontSize: 14,
    maxHeight: 100,
    color: '#1f2937',
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#dc2626',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: { opacity: 0.4 },
});
