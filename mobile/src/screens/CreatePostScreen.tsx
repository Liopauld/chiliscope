import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { forumApi } from '../api/client';
import type { RootStackParamList } from '../navigation/RootNavigator';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const CATEGORIES = [
  { key: 'general', label: 'General', icon: 'chatbubbles' as const, color: '#6b7280' },
  { key: 'identification', label: 'ID Help', icon: 'search' as const, color: '#3b82f6' },
  { key: 'cultivation', label: 'Growing', icon: 'leaf' as const, color: '#22c55e' },
  { key: 'recipes', label: 'Recipes', icon: 'restaurant' as const, color: '#f97316' },
  { key: 'research', label: 'Research', icon: 'flask' as const, color: '#8b5cf6' },
  { key: 'marketplace', label: 'Market', icon: 'cart' as const, color: '#ec4899' },
];

export default function CreatePostScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('general');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const addTag = () => {
    const tag = tagInput.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    if (tag && !tags.includes(tag) && tags.length < 5) {
      setTags([...tags, tag]);
      setTagInput('');
    }
  };

  const removeTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag));
  };

  const handleSubmit = async () => {
    if (title.trim().length < 3) {
      Alert.alert('Validation', 'Title must be at least 3 characters.');
      return;
    }
    if (content.trim().length < 10) {
      Alert.alert('Validation', 'Content must be at least 10 characters.');
      return;
    }

    setSubmitting(true);
    try {
      const post = await forumApi.createPost({
        title: title.trim(),
        content: content.trim(),
        category,
        tags,
      });
      Alert.alert('Success', 'Your post has been published!', [
        {
          text: 'View Post',
          onPress: () => {
            navigation.goBack();
            // Navigate to the new post
            setTimeout(() => {
              navigation.navigate('PostDetail', { postId: post.post_id });
            }, 300);
          },
        },
        {
          text: 'Back to Forum',
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      Alert.alert('Error', typeof detail === 'string' ? detail : 'Failed to create post. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const canSubmit = title.trim().length >= 3 && content.trim().length >= 10;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="close" size={24} color="#6b7280" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New Post</Text>
        <TouchableOpacity
          style={[styles.postBtn, !canSubmit && styles.postBtnDisabled]}
          onPress={handleSubmit}
          disabled={submitting || !canSubmit}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Text style={styles.postBtnText}>Post</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.form} keyboardShouldPersistTaps="handled">
        {/* Category Selector */}
        <Text style={styles.label}>Category</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
          {CATEGORIES.map(cat => (
            <TouchableOpacity
              key={cat.key}
              style={[
                styles.categoryChip,
                category === cat.key && { backgroundColor: cat.color },
              ]}
              onPress={() => setCategory(cat.key)}
            >
              <Ionicons
                name={cat.icon}
                size={14}
                color={category === cat.key ? '#ffffff' : cat.color}
              />
              <Text
                style={[
                  styles.categoryChipText,
                  category === cat.key && { color: '#ffffff' },
                ]}
              >
                {cat.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Title */}
        <Text style={styles.label}>Title</Text>
        <TextInput
          style={styles.titleInput}
          placeholder="What's your post about?"
          placeholderTextColor="#9ca3af"
          value={title}
          onChangeText={setTitle}
          maxLength={200}
        />
        <Text style={styles.charCount}>{title.length}/200</Text>

        {/* Content */}
        <Text style={styles.label}>Content</Text>
        <TextInput
          style={styles.contentInput}
          placeholder="Share your thoughts, questions, or discoveries..."
          placeholderTextColor="#9ca3af"
          value={content}
          onChangeText={setContent}
          multiline
          textAlignVertical="top"
          maxLength={5000}
        />
        <Text style={styles.charCount}>{content.length}/5000</Text>

        {/* Tags */}
        <Text style={styles.label}>Tags (optional)</Text>
        <View style={styles.tagInputRow}>
          <TextInput
            style={styles.tagInput}
            placeholder="Add a tag..."
            placeholderTextColor="#9ca3af"
            value={tagInput}
            onChangeText={setTagInput}
            onSubmitEditing={addTag}
            returnKeyType="done"
            maxLength={30}
          />
          <TouchableOpacity style={styles.addTagBtn} onPress={addTag}>
            <Ionicons name="add" size={20} color="#f97316" />
          </TouchableOpacity>
        </View>
        {tags.length > 0 && (
          <View style={styles.tagsRow}>
            {tags.map(tag => (
              <View key={tag} style={styles.tagBadge}>
                <Text style={styles.tagBadgeText}>#{tag}</Text>
                <TouchableOpacity onPress={() => removeTag(tag)}>
                  <Ionicons name="close-circle" size={16} color="#9ca3af" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* Guidelines */}
        <View style={styles.guidelines}>
          <Ionicons name="information-circle-outline" size={18} color="#9ca3af" />
          <Text style={styles.guidelinesText}>
            Keep discussions respectful and on-topic. Posts about chili identification, growing tips, 
            recipes, and research are welcome!
          </Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  backBtn: {
    padding: 8,
    marginRight: 8,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  postBtn: {
    backgroundColor: '#f97316',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 64,
    alignItems: 'center',
  },
  postBtnDisabled: {
    backgroundColor: '#d1d5db',
  },
  postBtnText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  form: {
    flex: 1,
    padding: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
    marginTop: 16,
  },
  categoryScroll: {
    flexGrow: 0,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    marginRight: 8,
    gap: 6,
  },
  categoryChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6b7280',
  },
  titleInput: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: '#1f2937',
    fontWeight: '600',
  },
  charCount: {
    fontSize: 11,
    color: '#9ca3af',
    textAlign: 'right',
    marginTop: 4,
  },
  contentInput: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: '#1f2937',
    minHeight: 160,
    lineHeight: 22,
  },
  tagInputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  tagInput: {
    flex: 1,
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1f2937',
  },
  addTagBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#fff7ed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  tagBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 4,
  },
  tagBadgeText: {
    fontSize: 13,
    color: '#6b7280',
  },
  guidelines: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#f9fafb',
    padding: 14,
    borderRadius: 12,
    marginTop: 24,
    gap: 8,
  },
  guidelinesText: {
    flex: 1,
    fontSize: 12,
    color: '#9ca3af',
    lineHeight: 18,
  },
});
