import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';

// Screens
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import HomeScreen from '../screens/HomeScreen';
import CameraScreen from '../screens/CameraScreen';
import LibraryScreen from '../screens/LibraryScreen';
import ProfileScreen from '../screens/ProfileScreen';
import ResultsScreen from '../screens/ResultsScreen';
import EncyclopediaScreen from '../screens/EncyclopediaScreen';
import CulinaryScreen from '../screens/CulinaryScreen';
import AdminScreen from '../screens/AdminScreen';
import AnalyticsScreen from '../screens/AnalyticsScreen';
import PriceMonitorScreen from '../screens/PriceMonitorScreen';
import ChatScreen from '../screens/ChatScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import ForumScreen from '../screens/ForumScreen';
import PostDetailScreen from '../screens/PostDetailScreen';
import CreatePostScreen from '../screens/CreatePostScreen';
import ModelComparisonScreen from '../screens/ModelComparisonScreen';
import GrowthScreen from '../screens/GrowthScreen';
import StudiesScreen from '../screens/StudiesScreen';
import AboutScreen from '../screens/AboutScreen';
import ChiliMapScreen from '../screens/ChiliMapScreen';

export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
  Login: undefined;
  Register: undefined;
  Camera: undefined;
  Results: { analysisId: string };
  Encyclopedia: undefined;
  Culinary: undefined;
  Admin: undefined;
  Analytics: undefined;
  PriceMonitor: undefined;
  Chat: undefined;
  Notifications: undefined;
  Forum: undefined;
  PostDetail: { postId: string };
  CreatePost: undefined;
  ModelComparison: undefined;
  Growth: undefined;
  Studies: undefined;
  About: undefined;
  ChiliMap: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Capture: undefined;
  Library: undefined;
  Profile: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'home';

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Capture') {
            iconName = focused ? 'camera' : 'camera-outline';
          } else if (route.name === 'Library') {
            iconName = focused ? 'folder' : 'folder-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#f97316',
        tabBarInactiveTintColor: 'gray',
        headerShown: false,
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Capture" component={CameraScreen} />
      <Tab.Screen name="Library" component={LibraryScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
    </Stack.Navigator>
  );
}

export default function RootNavigator() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#f97316" />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {isAuthenticated ? (
        <>
          <Stack.Screen name="Main" component={MainTabs} />
          <Stack.Screen name="Results" component={ResultsScreen} />
          <Stack.Screen name="Encyclopedia" component={EncyclopediaScreen} />
          <Stack.Screen name="Culinary" component={CulinaryScreen} />
          <Stack.Screen name="Admin" component={AdminScreen} />
          <Stack.Screen name="Analytics" component={AnalyticsScreen} />
          <Stack.Screen name="PriceMonitor" component={PriceMonitorScreen} />
          <Stack.Screen name="Chat" component={ChatScreen} />
          <Stack.Screen name="Notifications" component={NotificationsScreen} />
          <Stack.Screen name="Forum" component={ForumScreen} />
          <Stack.Screen name="PostDetail" component={PostDetailScreen} />
          <Stack.Screen name="CreatePost" component={CreatePostScreen} />
          <Stack.Screen name="ModelComparison" component={ModelComparisonScreen} />
          <Stack.Screen name="Growth" component={GrowthScreen} />
          <Stack.Screen name="Studies" component={StudiesScreen} />
          <Stack.Screen name="About" component={AboutScreen} />
          <Stack.Screen name="ChiliMap" component={ChiliMapScreen} />
        </>
      ) : (
        <Stack.Screen name="Auth" component={AuthStack} />
      )}
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
});
