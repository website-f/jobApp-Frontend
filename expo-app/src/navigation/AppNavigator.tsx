import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { ActivityIndicator, View, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

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
import EmployerJobsScreen from '../screens/main/EmployerJobsScreen';
import PostJobScreen from '../screens/main/PostJobScreen';
import AIRecommendationsScreen from '../screens/main/AIRecommendationsScreen';
import AvailabilityScreen from '../screens/profile/AvailabilityScreen';
import LocationScreen from '../screens/profile/LocationScreen';
import MyApplicationsScreen from '../screens/main/MyApplicationsScreen';
import NotificationsScreen from '../screens/main/NotificationsScreen';
import ConversationsScreen from '../screens/messaging/ConversationsScreen';
import ChatScreen from '../screens/messaging/ChatScreen';

// New Feature Screens
import { ClockInOutScreen, WorkHistoryScreen } from '../screens/work';
import { WalletScreen } from '../screens/wallet';
import { SubscriptionScreen } from '../screens/subscription';
import { RatingScreen } from '../screens/ratings';
import { PenaltyScreen } from '../screens/penalties';

// Store
import { useAuthStore, useThemeStore, useColors } from '../store';

// i18n
import { useTranslation } from '../hooks';

// Types
export type RootStackParamList = {
    Auth: undefined;
    Main: undefined;
    EditProfile: { section?: 'about' | 'location' | 'basic' };
    Skills: undefined;
    Resumes: undefined;
    ResumeAnalysis: { uuid: string };
    Availability: undefined;
    Location: undefined;
    PostJob: { editJob?: any } | undefined;
    MyApplications: undefined;
    AIRecommendations: undefined;
    Notifications: undefined;
    Conversations: undefined;
    Chat: { conversationId: number; conversation?: any };
    // New Feature Routes
    ClockInOut: { applicationId?: number } | undefined;
    WorkHistory: undefined;
    Wallet: undefined;
    Subscription: undefined;
    Ratings: undefined;
    Penalties: undefined;
};

export type AuthStackParamList = {
    Login: undefined;
    Register: { userType?: 'seeker' | 'employer' };
    ForgotPassword: undefined;
};

export type MainTabParamList = {
    Jobs: undefined; // Jobs/Browse tab
    Messages: undefined;
    Home: undefined; // Center floating button
    Profile: undefined;
    Account: undefined;
    // Employer specific
    EmployerJobs: undefined;
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



// Main Tab Navigator - Native style with floating Home button
function MainNavigator() {
    const { isDark } = useThemeStore();
    const colors = useColors();
    const { user } = useAuthStore();
    const { t } = useTranslation();
    const isEmployer = user?.user_type === 'employer';
    const insets = useSafeAreaInsets();

    // Native tab bar heights
    const TAB_BAR_HEIGHT = Platform.select({ ios: 50, android: 60, default: 56 });
    const bottomInset = Platform.OS === 'ios' ? insets.bottom : 0;

    return (
        <MainTab.Navigator
            initialRouteName="Home"
            screenOptions={{
                headerShown: false,
                tabBarStyle: {
                    backgroundColor: colors.tabBar,
                    borderTopColor: colors.tabBarBorder,
                    borderTopWidth: Platform.OS === 'ios' ? 0.5 : 1,
                    height: TAB_BAR_HEIGHT + (Platform.OS === 'ios' ? bottomInset : 12),
                    paddingBottom: Platform.OS === 'ios' ? bottomInset : 8,
                    paddingTop: Platform.OS === 'ios' ? 8 : 6,
                    elevation: Platform.OS === 'android' ? 8 : 0,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: -1 },
                    shadowOpacity: 0.05,
                    shadowRadius: 4,
                },
                tabBarActiveTintColor: colors.primary,
                tabBarInactiveTintColor: colors.textMuted,
                tabBarShowLabel: true,
                tabBarLabelStyle: {
                    fontSize: Platform.OS === 'ios' ? 10 : 11,
                    fontWeight: '500',
                    marginTop: Platform.OS === 'ios' ? 2 : 0,
                    marginBottom: Platform.OS === 'android' ? 4 : 2,
                },
                tabBarIconStyle: {
                    marginTop: Platform.OS === 'ios' ? 2 : 2,
                },
            }}
        >
            {/* Jobs */}
            {isEmployer ? (
                <MainTab.Screen
                    name="EmployerJobs"
                    component={EmployerJobsScreen}
                    options={{
                        tabBarLabel: t('jobs.title'),
                        tabBarIcon: ({ color, focused }) => (
                            <Ionicons name={focused ? 'briefcase' : 'briefcase-outline'} size={24} color={color} />
                        ),
                    }}
                />
            ) : (
                <MainTab.Screen
                    name="Jobs"
                    component={BrowseJobsScreen}
                    options={{
                        tabBarLabel: t('jobs.title'),
                        tabBarIcon: ({ color, focused }) => (
                            <Ionicons name={focused ? 'briefcase' : 'briefcase-outline'} size={24} color={color} />
                        ),
                    }}
                />
            )}

            {/* Messages */}
            <MainTab.Screen
                name="Messages"
                component={ConversationsScreen}
                options={{
                    tabBarLabel: t('nav.messages'),
                    tabBarIcon: ({ color, focused }) => (
                        <Ionicons name={focused ? 'chatbubbles' : 'chatbubbles-outline'} size={24} color={color} />
                    ),
                }}
            />

            {/* Center - Home (Floating) */}
            <MainTab.Screen
                name="Home"
                component={HomeScreen}
                options={{
                    tabBarLabel: '',
                    tabBarIcon: ({ focused }) => (
                        <FloatingHomeButton colors={colors} focused={focused} />
                    ),
                }}
            />

            {/* Profile */}
            <MainTab.Screen
                name="Profile"
                component={ProfileScreen}
                options={{
                    tabBarLabel: t('nav.profile'),
                    tabBarIcon: ({ color, focused }) => (
                        <Ionicons name={focused ? 'person' : 'person-outline'} size={24} color={color} />
                    ),
                }}
            />

            {/* Account */}
            <MainTab.Screen
                name="Account"
                component={AccountScreen}
                options={{
                    tabBarLabel: t('settings.title'),
                    tabBarIcon: ({ color, focused }) => (
                        <Ionicons name={focused ? 'settings' : 'settings-outline'} size={24} color={color} />
                    ),
                }}
            />
        </MainTab.Navigator>
    );
}

// Floating Home Button Component
function FloatingHomeButton({ colors, focused }: { colors: any; focused: boolean }) {
    // Increased size for better visibility and touch target
    const buttonSize = Platform.OS === 'ios' ? 60 : 64;
    const iconSize = Platform.OS === 'ios' ? 28 : 30;

    return (
        <View
            style={{
                position: 'absolute',
                top: Platform.OS === 'ios' ? -24 : -28,
                alignItems: 'center',
                justifyContent: 'center',
            }}
        >
            <LinearGradient
                colors={[colors.gradientStart || '#0EA5E9', colors.gradientEnd || '#8B5CF6']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                    width: buttonSize,
                    height: buttonSize,
                    borderRadius: buttonSize / 2,
                    alignItems: 'center',
                    justifyContent: 'center',
                    shadowColor: colors.primary || '#0EA5E9',
                    shadowOffset: { width: 0, height: 6 },
                    shadowOpacity: 0.4,
                    shadowRadius: 10,
                    elevation: 12,
                    borderWidth: Platform.OS === 'ios' ? 4 : 5,
                    borderColor: colors.tabBar || colors.background,
                }}
            >
                <Ionicons name="home" size={iconSize} color="#FFFFFF" />
            </LinearGradient>
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
                        <RootStack.Screen name="Location" component={LocationScreen} />
                        <RootStack.Screen name="PostJob" component={PostJobScreen} />
                        <RootStack.Screen name="MyApplications" component={MyApplicationsScreen} />
                        <RootStack.Screen name="AIRecommendations" component={AIRecommendationsScreen} />
                        <RootStack.Screen name="Notifications" component={NotificationsScreen} />
                        <RootStack.Screen name="Conversations" component={ConversationsScreen} />
                        <RootStack.Screen name="Chat" component={ChatScreen} />
                        {/* New Feature Screens */}
                        <RootStack.Screen name="ClockInOut" component={ClockInOutScreen} />
                        <RootStack.Screen name="WorkHistory" component={WorkHistoryScreen} />
                        <RootStack.Screen name="Wallet" component={WalletScreen} />
                        <RootStack.Screen name="Subscription" component={SubscriptionScreen} />
                        <RootStack.Screen name="Ratings" component={RatingScreen} />
                        <RootStack.Screen name="Penalties" component={PenaltyScreen} />
                    </>
                ) : (
                    <RootStack.Screen name="Auth" component={AuthNavigator} />
                )}
            </RootStack.Navigator>
        </NavigationContainer>
    );
}
