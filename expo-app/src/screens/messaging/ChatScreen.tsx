import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    View,
    Text,
    FlatList,
    TextInput,
    TouchableOpacity,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import { useColors, useAuthStore, useBadgeStore } from '../../store';
import { messagingService, Message, Conversation } from '../../services/messagingService';

type ChatRouteParams = {
    conversationId?: number | null;
    conversation?: Conversation;
    // For starting new conversations (when conversationId is null)
    recipientId?: number;
    recipientUuid?: string;
    recipientName?: string;
    jobId?: number;
};

export default function ChatScreen() {
    const navigation = useNavigation<any>();
    const route = useRoute<RouteProp<{ params: ChatRouteParams }, 'params'>>();
    const colors = useColors();
    const { user } = useAuthStore();
    const { fetchBadgeCounts } = useBadgeStore();

    const {
        conversationId: initialConversationId,
        conversation: initialConversation,
        recipientId,
        recipientName,
        jobId,
    } = route.params;

    const [messages, setMessages] = useState<Message[]>([]);
    const [conversation, setConversation] = useState<Conversation | undefined>(initialConversation);
    const [conversationId, setConversationId] = useState<number | null>(initialConversationId || null);
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [messageText, setMessageText] = useState('');
    const [isNewConversation, setIsNewConversation] = useState(!initialConversationId && !!recipientId);

    const flatListRef = useRef<FlatList>(null);
    const isSeeker = user?.user_type === 'seeker';

    const loadMessages = async () => {
        // If no conversation ID yet, this is a new conversation - just show empty state
        if (!conversationId) {
            setLoading(false);
            return;
        }

        try {
            const [messagesData, convData] = await Promise.all([
                messagingService.getMessages(conversationId),
                !conversation ? messagingService.getConversation(conversationId) : Promise.resolve(conversation),
            ]);
            setMessages(messagesData);
            if (!conversation) setConversation(convData);

            // Mark messages as read and refresh badge counts
            await messagingService.markAsRead(conversationId);
            fetchBadgeCounts();
        } catch (error) {
            console.error('Failed to load messages:', error);
        } finally {
            setLoading(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            loadMessages();
        }, [conversationId])
    );

    // Poll for new messages every 10 seconds (only if we have a conversation)
    useEffect(() => {
        if (!conversationId) return;
        const interval = setInterval(loadMessages, 10000);
        return () => clearInterval(interval);
    }, [conversationId]);

    const handleSend = async () => {
        if (!messageText.trim() || sending) return;

        const text = messageText.trim();
        setMessageText('');
        setSending(true);

        try {
            // If this is a new conversation (no conversationId), create it first
            if (!conversationId && recipientId) {
                const newConversation = await messagingService.startConversationWithSeeker(
                    recipientId,
                    text,
                    jobId
                );
                setConversation(newConversation);
                setConversationId(newConversation.id);
                setIsNewConversation(false);
                // Load the messages (including the one we just sent)
                const messagesData = await messagingService.getMessages(newConversation.id);
                setMessages(messagesData);
            } else if (conversationId) {
                // Normal message send to existing conversation
                const newMessage = await messagingService.sendMessage(conversationId, {
                    content: text,
                    message_type: 'text',
                });
                setMessages((prev) => [...prev, newMessage]);
            }

            // Scroll to bottom
            setTimeout(() => {
                flatListRef.current?.scrollToEnd({ animated: true });
            }, 100);
        } catch (error) {
            console.error('Failed to send message:', error);
            setMessageText(text); // Restore message on error
        } finally {
            setSending(false);
        }
    };

    const getOtherPartyName = () => {
        // For new conversations without a conversation object yet
        if (!conversation) {
            return recipientName || 'Chat';
        }
        if (isSeeker) {
            const profile = conversation.employer.profile;
            if (profile?.company_name) return profile.company_name;
            if (profile?.first_name) return `${profile.first_name} ${profile.last_name || ''}`.trim();
            return conversation.employer.email;
        } else {
            const profile = conversation.seeker.profile;
            if (profile?.first_name) return `${profile.first_name} ${profile.last_name || ''}`.trim();
            return conversation.seeker.email;
        }
    };

    const formatMessageTime = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const formatDateHeader = (dateString: string) => {
        const date = new Date(dateString);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        if (date.toDateString() === today.toDateString()) {
            return 'Today';
        } else if (date.toDateString() === yesterday.toDateString()) {
            return 'Yesterday';
        } else {
            return date.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' });
        }
    };

    const shouldShowDateHeader = (message: Message, index: number) => {
        if (index === 0) return true;
        const prevMessage = messages[index - 1];
        const currentDate = new Date(message.created_at).toDateString();
        const prevDate = new Date(prevMessage.created_at).toDateString();
        return currentDate !== prevDate;
    };

    const renderMessage = ({ item, index }: { item: Message; index: number }) => {
        const isMyMessage = item.sender.id === user?.id;
        const showDateHeader = shouldShowDateHeader(item, index);

        return (
            <View>
                {/* Date Header */}
                {showDateHeader && (
                    <View style={{ alignItems: 'center', marginVertical: 16 }}>
                        <View
                            style={{
                                backgroundColor: colors.border,
                                paddingHorizontal: 12,
                                paddingVertical: 4,
                                borderRadius: 12,
                            }}
                        >
                            <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                                {formatDateHeader(item.created_at)}
                            </Text>
                        </View>
                    </View>
                )}

                {/* Message Bubble */}
                <View
                    style={{
                        flexDirection: 'row',
                        justifyContent: isMyMessage ? 'flex-end' : 'flex-start',
                        marginBottom: 8,
                        paddingHorizontal: 16,
                    }}
                >
                    <View
                        style={{
                            maxWidth: '75%',
                            backgroundColor: isMyMessage ? colors.primary : colors.card,
                            borderRadius: 16,
                            borderBottomRightRadius: isMyMessage ? 4 : 16,
                            borderBottomLeftRadius: isMyMessage ? 16 : 4,
                            padding: 12,
                            borderWidth: isMyMessage ? 0 : 1,
                            borderColor: colors.border,
                        }}
                    >
                        {/* System message styling */}
                        {item.message_type === 'system' ? (
                            <Text style={{ fontSize: 13, color: colors.textSecondary, fontStyle: 'italic', textAlign: 'center' }}>
                                {item.content}
                            </Text>
                        ) : (
                            <>
                                <Text
                                    style={{
                                        fontSize: 15,
                                        color: isMyMessage ? '#FFF' : colors.text,
                                        lineHeight: 20,
                                    }}
                                >
                                    {item.content}
                                </Text>

                                {/* File attachment */}
                                {item.message_type === 'file' && item.file_url && (
                                    <TouchableOpacity
                                        style={{
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                            marginTop: 8,
                                            padding: 8,
                                            backgroundColor: isMyMessage ? 'rgba(255,255,255,0.2)' : colors.background,
                                            borderRadius: 8,
                                        }}
                                    >
                                        <Text style={{ marginRight: 8 }}>📎</Text>
                                        <Text
                                            style={{
                                                fontSize: 13,
                                                color: isMyMessage ? '#FFF' : colors.primary,
                                                textDecorationLine: 'underline',
                                            }}
                                            numberOfLines={1}
                                        >
                                            {item.file_name || 'Attachment'}
                                        </Text>
                                    </TouchableOpacity>
                                )}

                                {/* Time and read status */}
                                <View style={{ flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginTop: 4 }}>
                                    <Text
                                        style={{
                                            fontSize: 11,
                                            color: isMyMessage ? 'rgba(255,255,255,0.7)' : colors.textSecondary,
                                        }}
                                    >
                                        {formatMessageTime(item.created_at)}
                                    </Text>
                                    {isMyMessage && (
                                        <Text
                                            style={{
                                                fontSize: 11,
                                                color: item.is_read ? '#4ADE80' : 'rgba(255,255,255,0.5)',
                                                marginLeft: 4,
                                            }}
                                        >
                                            {item.is_read ? '✓✓' : '✓'}
                                        </Text>
                                    )}
                                </View>
                            </>
                        )}
                    </View>
                </View>
            </View>
        );
    };

    if (loading) {
        return (
            <SafeAreaView style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color={colors.primary} />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
            {/* Header */}
            <View
                style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    padding: 16,
                    borderBottomWidth: 1,
                    borderBottomColor: colors.border,
                    backgroundColor: colors.card,
                }}
            >
                <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginRight: 12 }}>
                    <Text style={{ fontSize: 24, color: colors.text }}>←</Text>
                </TouchableOpacity>

                <View
                    style={{
                        width: 40,
                        height: 40,
                        borderRadius: 20,
                        backgroundColor: colors.primary,
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginRight: 12,
                    }}
                >
                    <Text style={{ color: '#FFF', fontSize: 16, fontWeight: '600' }}>
                        {getOtherPartyName().charAt(0).toUpperCase()}
                    </Text>
                </View>

                <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text }} numberOfLines={1}>
                        {getOtherPartyName()}
                    </Text>
                    {conversation?.job && (
                        <Text style={{ fontSize: 12, color: colors.primary }} numberOfLines={1}>
                            {conversation.job.title}
                        </Text>
                    )}
                </View>
            </View>

            {/* Messages List */}
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
            >
                <FlatList
                    ref={flatListRef}
                    data={messages}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={renderMessage}
                    contentContainerStyle={{ paddingVertical: 16, flexGrow: 1 }}
                    onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
                    ListEmptyComponent={
                        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 }}>
                            <Text style={{ fontSize: 48, marginBottom: 16 }}>👋</Text>
                            <Text style={{ fontSize: 16, color: colors.textSecondary, textAlign: 'center' }}>
                                {isNewConversation
                                    ? `Send a message to start a conversation with ${recipientName || 'this candidate'}`
                                    : 'Start the conversation!'}
                            </Text>
                        </View>
                    }
                />

                {/* Message Input */}
                <View
                    style={{
                        flexDirection: 'row',
                        alignItems: 'flex-end',
                        padding: 12,
                        borderTopWidth: 1,
                        borderTopColor: colors.border,
                        backgroundColor: colors.card,
                    }}
                >
                    <TextInput
                        style={{
                            flex: 1,
                            backgroundColor: colors.background,
                            borderRadius: 20,
                            paddingHorizontal: 16,
                            paddingVertical: 10,
                            fontSize: 15,
                            color: colors.text,
                            maxHeight: 100,
                            borderWidth: 1,
                            borderColor: colors.border,
                        }}
                        placeholder="Type a message..."
                        placeholderTextColor={colors.textSecondary}
                        value={messageText}
                        onChangeText={setMessageText}
                        multiline
                        editable={!sending}
                    />

                    <TouchableOpacity
                        style={{
                            width: 44,
                            height: 44,
                            borderRadius: 22,
                            backgroundColor: messageText.trim() ? colors.primary : colors.border,
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginLeft: 8,
                        }}
                        onPress={handleSend}
                        disabled={!messageText.trim() || sending}
                    >
                        {sending ? (
                            <ActivityIndicator size="small" color="#FFF" />
                        ) : (
                            <Text style={{ fontSize: 20, color: '#FFF' }}>➤</Text>
                        )}
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}
