import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DashboardScreen from '../screens/DashboardScreen';
import AddScreen from '../screens/AddScreen';

export type RootTabParamList = {
  Dashboard: undefined;
  Add: { url?: string };
  Wishlist: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<RootTabParamList>();

const linking = {
  prefixes: ['centscape://', 'https://centscape.app'],
  config: {
    screens: {
      Add: {
        path: '/add',
        parse: {
          url: (url: string) => url,
        },
      },
      Dashboard: '/',
    },
  },
};

import { NavigationContainer } from '@react-navigation/native';

export default function Navigation() {
  return (
    <NavigationContainer linking={linking}>
      <Tab.Navigator
        initialRouteName="Dashboard"
        screenOptions={({ route }) => ({
          tabBarIcon: ({ focused, color, size }) => {
            let iconName: keyof typeof Ionicons.glyphMap;

            if (route.name === 'Dashboard') {
              iconName = focused ? 'home' : 'home-outline';
            } else if (route.name === 'Add') {
              iconName = focused ? 'add-circle' : 'add-circle-outline';
            } else if (route.name === 'Wishlist') {
              iconName = focused ? 'list' : 'list-outline';
            } else {
              iconName = focused ? 'time' : 'time-outline';
            }

            return <Ionicons name={iconName} size={size} color={color} />;
          },
          tabBarActiveTintColor: '#22c55e',
          tabBarInactiveTintColor: '#6b7280',
          tabBarStyle: {
            backgroundColor: '#374151',
            borderTopWidth: 0,
            paddingTop: 8,
            paddingBottom: 8,
            height: 80,
          },
          headerShown: false,
        })}
      >
        <Tab.Screen 
          name="Dashboard" 
          component={DashboardScreen}
          options={{ tabBarLabel: 'Home' }}
        />
        <Tab.Screen 
          name="Add" 
          component={AddScreen}
          options={{ tabBarLabel: 'Add' }}
        />
        <Tab.Screen 
          name="Wishlist" 
          component={DashboardScreen} // Same as dashboard for now
          options={{ tabBarLabel: 'Wishlist' }}
        />
        <Tab.Screen 
          name="Profile" 
          component={DashboardScreen} // Placeholder
          options={{ tabBarLabel: 'Profile' }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}