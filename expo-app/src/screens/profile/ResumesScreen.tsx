import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as DocumentPicker from 'expo-document-picker';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { useProfileStore, useColors } from '../../store';
import resumeService from '../../services/resumeService';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function ResumesScreen() {
    const navigation = useNavigation<NavigationProp>();
    const { resumes, setResumes, addResume, removeResume } = useProfileStore();
    const [isLoading, setIsLoading] = useState(true);
    const [isUploading, setIsUploading] = useState(false);
    const colors = useColors();

    useEffect(() => {
        loadResumes();
    }, []);

    const loadResumes = async () => {
        setIsLoading(true);
        try {
            const response = await resumeService.getResumes();
            if (response.success) setResumes(response.data);
        } catch (error) {
            console.error('Failed to load resumes:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleUpload = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: ['application/pdf', 'application/msword'],
                copyToCacheDirectory: true,
            });

            if (!result.canceled && result.assets?.[0]) {
                setIsUploading(true);
                const response = await resumeService.uploadResume(result.assets[0], {
                    is_primary: resumes.length === 0,
                });
                if (response.success) {
                    addResume(response.data);
                    Alert.alert('Success', 'Resume uploaded!');
                }
                setIsUploading(false);
            }
        } catch (error: any) {
            setIsUploading(false);
            Alert.alert('Error', error.message || 'Upload failed');
        }
    };

    const handleDelete = (uuid: string) => {
        Alert.alert('Delete', 'Are you sure?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete',
                style: 'destructive',
                onPress: async () => {
                    await resumeService.deleteResume(uuid);
                    removeResume(uuid);
                },
            },
        ]);
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
            <View style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: 16,
                borderBottomWidth: 1,
                borderBottomColor: colors.border,
            }}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Text style={{ color: colors.primary, fontSize: 16, fontWeight: '600' }}>← Back</Text>
                </TouchableOpacity>
                <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700' }}>Resumes</Text>
                <View style={{ width: 50 }} />
            </View>

            <TouchableOpacity
                style={{
                    backgroundColor: colors.primary,
                    margin: 16,
                    padding: 16,
                    borderRadius: 12,
                    alignItems: 'center',
                }}
                onPress={handleUpload}
                disabled={isUploading}
            >
                {isUploading ? (
                    <ActivityIndicator color="#FFF" />
                ) : (
                    <Text style={{ color: '#FFF', fontSize: 16, fontWeight: '700' }}>+ Upload Resume</Text>
                )}
            </TouchableOpacity>

            {isLoading ? (
                <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
            ) : resumes.length === 0 ? (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 }}>
                    <Text style={{ fontSize: 60, marginBottom: 16 }}>📄</Text>
                    <Text style={{ fontSize: 20, fontWeight: '700', color: colors.text, marginBottom: 8 }}>No Resumes Yet</Text>
                    <Text style={{ fontSize: 14, color: colors.textSecondary, textAlign: 'center' }}>
                        Upload your resume to apply for jobs faster
                    </Text>
                </View>
            ) : (
                <ScrollView contentContainerStyle={{ padding: 16 }}>
                    {resumes.map((r) => (
                        <View key={r.uuid} style={{
                            backgroundColor: colors.card,
                            borderRadius: 12,
                            padding: 16,
                            marginBottom: 12,
                            borderWidth: 1,
                            borderColor: colors.cardBorder,
                        }}>
                            <Text style={{ color: colors.text, fontSize: 16, fontWeight: '700' }}>{r.title}</Text>
                            <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 4 }}>
                                {r.file_size_human} • {r.file_type.toUpperCase()}
                            </Text>
                            {r.is_primary && (
                                <Text style={{ color: colors.warning, fontSize: 12, marginTop: 8 }}>★ Primary</Text>
                            )}
                            <View style={{
                                flexDirection: 'row',
                                justifyContent: 'space-between',
                                marginTop: 12,
                                paddingTop: 12,
                                borderTopWidth: 1,
                                borderTopColor: colors.cardBorder,
                            }}>
                                <TouchableOpacity onPress={() => navigation.navigate('ResumeAnalysis', { uuid: r.uuid })}>
                                    <Text style={{ color: colors.primary, fontWeight: '600' }}>View Analysis</Text>
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => handleDelete(r.uuid)}>
                                    <Text style={{ color: colors.error, fontWeight: '600' }}>Delete</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    ))}
                </ScrollView>
            )}
        </SafeAreaView>
    );
}
