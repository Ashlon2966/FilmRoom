import React from 'react';
import { Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// Screens
import ExploreDirectoryScreen from '../screens/dashboard/ExploreDirectoryScreen';
import RoomsListScreen from '../screens/dashboard/RoomsListScreen';
import CreateRoomScreen from '../screens/dashboard/CreateRoomScreen';
import RequestsHubScreen from '../screens/requests/RequestsHubScreen';
import ProfileDashboardScreen from '../screens/dashboard/ProfileDashboardScreen';
import ShortlistsScreen from '../screens/dashboard/ShortlistsScreen';
import SettingsScreen from '../screens/dashboard/SettingsScreen';
import DirectMessageScreen from '../screens/chat/DirectMessageScreen';
import ConversationsListScreen from '../screens/chat/ConversationsListScreen';

// 5 Pipeline Stages
import Stage1_IdeationScreen from '../screens/pipeline/Stage1_IdeationScreen';
import Stage2_ScreenplayScreen from '../screens/pipeline/Stage2_ScreenplayScreen';
import Stage3_PreProdScreen from '../screens/pipeline/Stage3_PreProdScreen';
import Stage4_ProductionScreen from '../screens/pipeline/Stage4_ProductionScreen';
import Stage5_PostProdScreen from '../screens/pipeline/Stage5_PostProdScreen';

import { useTheme } from '../context/ThemeContext';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

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

function TheBoardStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="RoomsList" component={RoomsListScreen} />
      <Stack.Screen name="CreateRoom" component={CreateRoomScreen} />
      <Stack.Screen name="StagePipeline" component={PipelineStack} />
    </Stack.Navigator>
  );
}

function RequestsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="RequestsHub" component={RequestsHubScreen} />
      <Stack.Screen name="DirectMessage" component={DirectMessageScreen} />
      <Stack.Screen name="ConversationsList" component={ConversationsListScreen} />
    </Stack.Navigator>
  );
}

function ProfileStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ProfileMain" component={ProfileDashboardScreen} />
      <Stack.Screen name="Shortlists" component={ShortlistsScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
    </Stack.Navigator>
  );
}

export default function AppNavigator() {
  const { theme } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: theme?.card || '#181b1f',
          borderTopColor: theme?.cardBorder || '#242830',
          height: 62,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarActiveTintColor: theme?.primary || '#f5a623',
        tabBarInactiveTintColor: theme?.textMuted || '#64748b',
      }}
    >
      {/* 1. EXPLORE */}
      <Tab.Screen
        name="ExploreTab"
        component={ExploreDirectoryScreen}
        options={{
          tabBarLabel: 'Explore',
          tabBarIcon: () => <Text style={{ fontSize: 18 }}>🧭</Text>,
        }}
      />

      {/* 2. THE BOARD */}
      <Tab.Screen
        name="TheBoardTab"
        component={TheBoardStack}
        options={{
          tabBarLabel: 'The Board',
          tabBarIcon: () => <Text style={{ fontSize: 18 }}>🎬</Text>,
        }}
      />

      {/* 3. REQUESTS */}
      <Tab.Screen
        name="RequestsTab"
        component={RequestsStack}
        options={{
          tabBarLabel: 'Requests',
          tabBarIcon: () => <Text style={{ fontSize: 18 }}>📥</Text>,
        }}
      />

      {/* 4. PROFILE */}
      <Tab.Screen
        name="ProfileTab"
        component={ProfileStack}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: () => <Text style={{ fontSize: 18 }}>👤</Text>,
        }}
      />
    </Tab.Navigator>
  );
}