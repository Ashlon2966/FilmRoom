import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// Screens
import ExploreDirectoryScreen from '../screens/dashboard/ExploreDirectoryScreen';
import RoomsListScreen from '../screens/dashboard/RoomsListScreen';
import CreateRoomScreen from '../screens/dashboard/CreateRoomScreen';
import ProfileDashboardScreen from '../screens/dashboard/ProfileDashboardScreen';
import SettingsScreen from '../screens/dashboard/SettingsScreen';
import ChatScreen from '../screens/roles/ChatScreen';
import ConversationsListScreen from '../screens/chat/ConversationsListScreen';
import DirectMessageScreen from '../screens/chat/DirectMessageScreen';

// 5 Pipeline Stages
import Stage1_IdeationScreen from '../screens/pipeline/Stage1_IdeationScreen';
import Stage2_ScreenplayScreen from '../screens/pipeline/Stage2_ScreenplayScreen';
import Stage3_PreProdScreen from '../screens/pipeline/Stage3_PreProdScreen';
import Stage4_ProductionScreen from '../screens/pipeline/Stage4_ProductionScreen';
import Stage5_PostProdScreen from '../screens/pipeline/Stage5_PostProdScreen';

// Modals
import CreateActionSheetModal from '../components/CreateActionSheetModal';
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

function MessagesStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ConversationsList" component={ConversationsListScreen} />
      <Stack.Screen name="DirectMessage" component={DirectMessageScreen} />
    </Stack.Navigator>
  );
}

function ProfileStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ProfileMain" component={ProfileDashboardScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
    </Stack.Navigator>
  );
}

function EmptyScreen() {
  return null;
}

export default function AppNavigator({ navigation }) {
  const { theme } = useTheme();
  const [isActionSheetVisible, setIsActionSheetVisible] = useState(false);

  return (
    <>
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
        {/* 1. Explore */}
        <Tab.Screen
          name="ExploreTab"
          component={ExploreDirectoryScreen}
          options={{
            tabBarLabel: 'Explore',
            tabBarIcon: () => <Text style={{ fontSize: 18 }}>🧭</Text>,
          }}
        />

        {/* 2. The Board */}
        <Tab.Screen
          name="TheBoardTab"
          component={TheBoardStack}
          options={{
            tabBarLabel: 'The Board',
            tabBarIcon: () => <Text style={{ fontSize: 18 }}>🎬</Text>,
          }}
        />

        {/* 3. Center Create (+) Action Button */}
        <Tab.Screen
          name="CreateAction"
          component={EmptyScreen}
          options={{
            tabBarLabel: '',
            tabBarIcon: () => (
              <View style={[styles.centerCreateButton, { backgroundColor: theme?.primary || '#f5a623' }]}>
                <Text style={styles.centerCreateIcon}>+</Text>
              </View>
            ),
          }}
          listeners={{
            tabPress: (e) => {
              e.preventDefault();
              setIsActionSheetVisible(true);
            },
          }}
        />

        {/* 4. Messages */}
        <Tab.Screen
          name="MessagesTab"
          component={MessagesStack}
          options={{
            tabBarLabel: 'Messages',
            tabBarIcon: () => <Text style={{ fontSize: 18 }}>💬</Text>,
          }}
        />

        {/* 5. My Profile */}
        <Tab.Screen
          name="ProfileTab"
          component={ProfileStack}
          options={{
            tabBarLabel: 'My Profile',
            tabBarIcon: () => <Text style={{ fontSize: 18 }}>👤</Text>,
          }}
        />
      </Tab.Navigator>

      {/* The 3-Option Action Sheet */}
      <CreateActionSheetModal
        visible={isActionSheetVisible}
        onClose={() => setIsActionSheetVisible(false)}
        onCreateRoom={() => {
          navigation.navigate('TheBoardTab', { screen: 'CreateRoom' });
        }}
        onAddFriends={() => {
          navigation.navigate('MessagesTab', { screen: 'ConversationsList' });
        }}
        onPostAchievement={() => {
          navigation.navigate('ProfileTab', { screen: 'ProfileMain' });
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  centerCreateButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 18,
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 4,
  },
  centerCreateIcon: {
    color: '#000000',
    fontSize: 28,
    fontWeight: '700',
    lineHeight: 30,
  },
});