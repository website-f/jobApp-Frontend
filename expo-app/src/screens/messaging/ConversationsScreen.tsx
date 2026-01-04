import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    RefreshControl,
    ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useColors, useAuthStore } from '../../store';
import { messagingService, Conversation } from '../../services/messagingService';

export default function ConversationsScreen() {
    const navigation = useNavigation<any>();
    const colors = useColors();
    const { user } = useAuthStore();

    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const isSeeker = user?.user_type === 'seeker';

    const loadConversations = async () => {
        try {
            const data = await messagingService.getConversations();
            setConversations(data);
        } catch (error) {
            console.error('Failed to load conversations:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    // Reload conversations when screen comes into focus
    useFocusEffect(
        useCallback(() => {
            loadConversations();
        }, [])
    );

    const onRefresh = () => {
        setRefreshing(true);
        loadConversations();
    };

    const formatTime = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffDays === 0) {
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } else if (diffDays === 1) {
            return 'Yesterday';
        } else if (diffDays < 7) {
            return date.toLocaleDateString([], { weekday: 'short' });
        } else {
            return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
        }
    };

    const getOtherPartyName = (conv: Conversation) => {
        if (isSeeker) {
            // Seeker sees employer name
            const profile = conv.employer.profile;
            if (profile?.company_name) return profile.company_name;
            if (profile?.first_name) return `${profile.first_name} ${profile.last_name || ''}`.trim();
            return conv.employer.email;
        } else {
            // Employer sees seeker name
            const profile = conv.seeker.profile;
            if (profile?.first_name) return `${profile.first_name} ${profile.last_name || ''}`.trim();
            return conv.seeker.email;
        }
    };

    const getInitial = (conv: Conversation) => {
        const name = getOtherPartyName(conv);
        return name.charAt(0).toUpperCase();
    };

    const renderConversation = ({ item }: { item: Conversation }) => (
        <TouchableOpacity
            style={{
                flexDirection: 'row',
                padding: 16,
                backgroundColor: colors.card,
                borderBottomWidth: 1,
                borderBottomColor: colors.border,
            }}
            onPress={() => navigation.navigate('Chat', { conversationId: item.id, conversation: item })}
            activeOpacity={0.7}
        >
            {/* Avatar */}
            <View
                style={{
                    width: 50,
                    height: 50,
                    borderRadius: 25,
                    backgroundColor: colors.primary,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 12,
                }}
            >
                <Text style={{ color: '#FFF', fontSize: 20, fontWeight: '600' }}>
                    {getInitial(item)}
                </Text>
            </View>

            {/* Content */}
            <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text, flex: 1 }} numberOfLines={1}>
                        {getOtherPartyName(item)}
                    </Text>
                    <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                        {item.last_message_at ? formatTime(item.last_message_at) : ''}
                    </Text>
                </View>

                {/* Job title */}
                {item.job && (
                    <Text style={{ fontSize: 13, color: colors.primary, marginBottom: 2 }} numberOfLines={1}>
                        {item.job.title}
                    </Text>
                )}

                {/* Last message preview */}
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text
                        style={{
                            fontSize: 14,
                            color: item.unread_count > 0 ? colors.text : colors.textSecondary,
                            fontWeight: item.unread_count > 0 ? '500' : 'normal',
                            flex: 1,
                        }}
                        numberOfLines={1}
                    >
                        {item.last_message_preview || 'No messages yet'}
                    </Text>

                    {/* Unread badge */}
                    {item.unread_count > 0 && (
                        <View
                            style={{
                                backgroundColor: colors.primary,
                                borderRadius: 10,
                                minWidth: 20,
                                height: 20,
                                alignItems: 'center',
                                justifyContent: 'center',
                                paddingHorizontal: 6,
                                marginLeft: 8,
                            }}
                        >
                            <Text style={{ color: '#FFF', fontSize: 12, fontWeight: '600' }}>
                                {item.unread_count > 99 ? '99+' : item.unread_count}
                            </Text>
                        </View>
                    )}
                </View>
            </View>
        </TouchableOpacity>
    );

    if (loading) {
        return (
            <SafeAreaView style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color={colors.primary} />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
            {/* Header */}
            <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                <Text style={{ fontSize: 24, fontWeight: '700', color: colors.text }}>Messages</Text>
                <Text style={{ fontSize: 14, color: colors.textSecondary, marginTop: 4 }}>
                    {isSeeker ? 'Chat with employers about your applications' : 'Chat with candidates about job openings'}
                </Text>
            </View>

            {conversations.length === 0 ? (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 }}>
                    <Text style={{ fontSize: 48, marginBottom: 16 }}>💬</Text>
                    <Text style={{ fontSize: 18, fontWeight: '600', color: colors.text, marginBottom: 8, textAlign: 'center' }}>
                        No messages yet
                    </Text>
                    <Text style={{ fontSize: 14, color: colors.textSecondary, textAlign: 'center' }}>
                        {isSeeker
                            ? 'Apply for jobs to start conversations with employers'
                            : 'Conversations with applicants will appear here'}
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={conversations}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={renderConversation}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
                    }
                    contentContainerStyle={{ flexGrow: 1, paddingBottom: 80 }}
                />
            )}
        </SafeAreaView>
    );
}
