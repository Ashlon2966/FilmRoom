import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// Screens
import RoomsListScreen from '../screens/dashboard/RoomsListScreen';
import CreateRoomScreen from '../screens/dashboard/CreateRoomScreen';
import ProfileDashboardScreen from '../screens/dashboard/ProfileDashboardScreen';
import SettingsScreen from '../screens/dashboard/SettingsScreen';
import ChatScreen from '../screens/roles/ChatScreen';
import ConversationsListScreen from '../screens/chat/ConversationsListScreen';
import DirectMessageScreen from '../screens/chat/DirectMessageScreen';

// 5-Stage Pipeline Screens
import Stage1_IdeationScreen from '../screens/pipeline/Stage1_IdeationScreen';
import Stage2_ScreenplayScreen from '../screens/pipeline/Stage2_ScreenplayScreen';
import Stage3_PreProdScreen from '../screens/pipeline/Stage3_PreProdScreen';
import Stage4_ProductionScreen from '../screens/pipeline/Stage4_ProductionScreen';
import Stage5_PostProdScreen from '../screens/pipeline/Stage5_PostProdScreen';

import { useTheme } from '../context/ThemeContext';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// 5 Production Stages Stack
function PipelineStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Stage1_Ideation" component={Stage1_IdeationScreen} />
      <Stack.Screen name="Stage2_Screenplay" component={Stage2_ScreenplayScreen} />
      <Stack.Screen name="Stage3_PreProd" component={Stage3_PreProdScreen} />
      <Stack.Screen name="Stage4_Production" component={Stage4_ProductionScreen} />
      <Stack.Screen name="Stage5_PostProd" component={Stage5_PostProdScreen} />
    </Stack.Navigator>
  );
}

// Rooms Stack
function RoomsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="RoomsList" component={RoomsListScreen} />
      <Stack.Screen name="CreateRoom" component={CreateRoomScreen} />
      <Stack.Screen name="StagePipeline" component={PipelineStack} />
    </Stack.Navigator>
  );
}

// Direct Messages Stack
function ChatStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ConversationsList" component={ConversationsListScreen} />
      <Stack.Screen name="DirectMessage" component={DirectMessageScreen} />
    </Stack.Navigator>
  );
}

// Profile & Settings Stack
function ProfileStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ProfileMain" component={ProfileDashboardScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
    </Stack.Navigator>
  );
}

// Empty component for the center action button trigger
function EmptyScreen() {
  return null;
}

export default function AppNavigator({ navigation }) {
  const { theme } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: theme?.card || '#1c1c1e',
          borderTopColor: theme?.border || '#2c2c2e',
          height: 60,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarActiveTintColor: theme?.primary || '#e50914',
        tabBarInactiveTintColor: theme?.textSecondary || '#888888',
      }}
    >
      {/* 1. Films (Far Left) */}
      <Tab.Screen
        name="FilmsTab"
        component={RoomsStack}
        options={{
          tabBarLabel: 'Films',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 18 }}>🎬</Text>,
        }}
      />

      {/* 2. Room Broadcast Chat */}
      <Tab.Screen
        name="RoomChatTab"
        component={ChatScreen}
        options={{
          tabBarLabel: 'Room Chat',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 18 }}>📢</Text>,
        }}
      />

      {/* 3. Center Create Action Button */}
      <Tab.Screen
        name="CreateAction"
        component={EmptyScreen}
        options={({ navigation }) => ({
          tabBarLabel: '',
          tabBarIcon: () => (
            <View style={[styles.centerCreateButton, { backgroundColor: theme?.primary || '#e50914' }]}>
              <Text style={styles.centerCreateIcon}>+</Text>
            </View>
          ),
        })}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            e.preventDefault(); // Stop default tab navigation
            navigation.navigate('FilmsTab', { screen: 'CreateRoom' });
          },
        })}
      />

      {/* 4. Direct Messages */}
      <Tab.Screen
        name="MessagesTab"
        component={ChatStack}
        options={{
          tabBarLabel: 'Messages',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 18 }}>💬</Text>,
        }}
      />

      {/* 5. Profile & Settings (Far Right) */}
      <Tab.Screen
        name="ProfileTab"
        component={ProfileStack}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 18 }}>👤</Text>,
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  centerCreateButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 4,
  },
  centerCreateIcon: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: '300',
    lineHeight: 30,
  },
});