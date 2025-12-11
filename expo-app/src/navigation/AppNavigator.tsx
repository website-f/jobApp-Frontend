import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { ActivityIndicator, View, Text } from 'react-native';

// Screens
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import HomeScreen from '../screens/main/HomeScreen';
import ProfileScreen from '../screens/main/ProfileScreen';
import AccountScreen from '../screens/main/AccountScreen';
import EditProfileScreen from '../screens/profile/EditProfileScreen';
import SkillsScreen from '../screens/profile/SkillsScreen';
import ResumesScreen from '../screens/profile/ResumesScreen';
import ResumeAnalysisScreen from '../screens/profile/ResumeAnalysisScreen';
import BrowseJobsScreen from '../screens/main/BrowseJobsScreen';
import AvailabilityScreen from '../screens/profile/AvailabilityScreen';

// Store
import { useAuthStore, useThemeStore, useColors } from '../store';

// Types
export type RootStackParamList = {
    Auth: undefined;
    Main: undefined;
    EditProfile: { section?: 'about' | 'location' | 'basic' };
    Skills: undefined;
    Resumes: undefined;
    ResumeAnalysis: { uuid: string };
    Availability: undefined;
};

export type AuthStackParamList = {
    Login: undefined;
    Register: { userType?: 'seeker' | 'employer' };
    ForgotPassword: undefined;
};

export type MainTabParamList = {
    Home: undefined;
    Search: undefined;
    Profile: undefined;
    Account: undefined;
};

const RootStack = createNativeStackNavigator<RootStackParamList>();
const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const MainTab = createBottomTabNavigator<MainTabParamList>();

// Auth Navigator
function AuthNavigator() {
    return (
        <AuthStack.Navigator
            screenOptions={{
                headerShown: false,
                animation: 'slide_from_right',
            }}
        >
            <AuthStack.Screen name="Login" component={LoginScreen} />
            <AuthStack.Screen name="Register" component={RegisterScreen} />
        </AuthStack.Navigator>
    );
}



// Main Tab Navigator
function MainNavigator() {
    const { isDark } = useThemeStore();
    const colors = useColors();

    return (
        <MainTab.Navigator
            screenOptions={{
                headerShown: false,
                tabBarStyle: {
                    backgroundColor: colors.tabBar,
                    borderTopColor: colors.tabBarBorder,
                    borderTopWidth: 1,
                    paddingTop: 8,
                    paddingBottom: 8,
                    height: 60,
                },
                tabBarActiveTintColor: colors.primary,
                tabBarInactiveTintColor: colors.textMuted,
                tabBarLabelStyle: {
                    fontSize: 12,
                    fontWeight: '600',
                },
            }}
        >
            <MainTab.Screen
                name="Home"
                component={HomeScreen}
                options={{
                    tabBarLabel: 'Home',
                    tabBarIcon: ({ color }) => <TabIcon name="home" color={color} />,
                }}
            />
            <MainTab.Screen
                name="Search"
                component={BrowseJobsScreen}
                options={{
                    tabBarLabel: 'Jobs',
                    tabBarIcon: ({ color }) => <TabIcon name="search" color={color} />,
                }}
            />
            <MainTab.Screen
                name="Profile"
                component={ProfileScreen}
                options={{
                    tabBarLabel: 'Profile',
                    tabBarIcon: ({ color }) => <TabIcon name="profile" color={color} />,
                }}
            />
            <MainTab.Screen
                name="Account"
                component={AccountScreen}
                options={{
                    tabBarLabel: 'Account',
                    tabBarIcon: ({ color }) => <TabIcon name="account" color={color} />,
                }}
            />
        </MainTab.Navigator>
    );
}

// Simple Tab Icon Component
function TabIcon({ name, color }: { name: string; color: string }) {
    const icons: Record<string, string> = {
        home: '🏠',
        search: '💼',
        profile: '👤',
        account: '⚙️',
    };
    return (
        <View style={{ alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 20 }}>{icons[name] || '•'}</Text>
        </View>
    );
}

// Root Navigator
export default function AppNavigator() {
    const { isAuthenticated, isLoading, checkAuth } = useAuthStore();
    const colors = useColors();

    React.useEffect(() => {
        checkAuth();
    }, []);

    if (isLoading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    return (
        <NavigationContainer>
            <RootStack.Navigator screenOptions={{ headerShown: false }}>
                {isAuthenticated ? (
                    <>
                        <RootStack.Screen name="Main" component={MainNavigator} />
                        <RootStack.Screen name="EditProfile" component={EditProfileScreen} />
                        <RootStack.Screen name="Skills" component={SkillsScreen} />
                        <RootStack.Screen name="Resumes" component={ResumesScreen} />
                        <RootStack.Screen name="ResumeAnalysis" component={ResumeAnalysisScreen} />
                        <RootStack.Screen name="Availability" component={AvailabilityScreen} />
                    </>
                ) : (
                    <RootStack.Screen name="Auth" component={AuthNavigator} />
                )}
            </RootStack.Navigator>
        </NavigationContainer>
    );
}
