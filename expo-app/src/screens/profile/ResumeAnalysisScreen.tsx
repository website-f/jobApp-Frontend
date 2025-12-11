import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { useColors, ThemeColors } from '../../store';
import resumeService, { ResumeAnalysis } from '../../services/resumeService';

type RouteProps = RouteProp<RootStackParamList, 'ResumeAnalysis'>;

export default function ResumeAnalysisScreen() {
    const navigation = useNavigation();
    const route = useRoute<RouteProps>();
    const { uuid } = route.params;
    const [analysis, setAnalysis] = useState<ResumeAnalysis | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isPending, setIsPending] = useState(false);
    const colors = useColors();

    useEffect(() => {
        loadAnalysis();
    }, [uuid]);

    const loadAnalysis = async () => {
        setIsLoading(true);
        try {
            const response = await resumeService.getAnalysis(uuid);
            if (response.success) {
                if ('status' in response.data && response.data.status === 'processing') {
                    setIsPending(true);
                } else {
                    setAnalysis(response.data as ResumeAnalysis);
                }
            }
        } catch (error) {
            console.error('Failed to load analysis:', error);
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) {
        return (
            <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            </SafeAreaView>
        );
    }

    if (isPending) {
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
                    <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700' }}>Analysis</Text>
                    <View style={{ width: 50 }} />
                </View>
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
                    <Text style={{ fontSize: 60, marginBottom: 16 }}>⏳</Text>
                    <Text style={{ color: colors.text, fontSize: 20, fontWeight: '700', marginBottom: 8 }}>Analysis in Progress</Text>
                    <Text style={{ color: colors.textSecondary, fontSize: 14, textAlign: 'center' }}>Please check back in a few minutes</Text>
                    <TouchableOpacity
                        style={{ backgroundColor: colors.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, marginTop: 20 }}
                        onPress={loadAnalysis}
                    >
                        <Text style={{ color: '#FFF', fontWeight: '700' }}>Refresh</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

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
                <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700' }}>Resume Analysis</Text>
                <View style={{ width: 50 }} />
            </View>

            <ScrollView contentContainerStyle={{ padding: 16 }}>
                {/* Scores */}
                <View style={{
                    backgroundColor: colors.card,
                    borderRadius: 16,
                    padding: 20,
                    marginBottom: 16,
                    borderWidth: 1,
                    borderColor: colors.cardBorder,
                }}>
                    <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 12 }}>Overall Scores</Text>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginTop: 16 }}>
                        <ScoreCircle label="ATS" value={analysis?.scores?.ats_score} colors={colors} />
                        <ScoreCircle label="Quality" value={analysis?.scores?.quality_score} colors={colors} />
                        <ScoreCircle label="Overall" value={analysis?.scores?.overall_score} colors={colors} />
                    </View>
                </View>

                {/* Summary */}
                {analysis?.summary && (
                    <Section title="Summary" colors={colors}>
                        <Text style={{ color: colors.text, fontSize: 14, lineHeight: 22 }}>{analysis.summary}</Text>
                    </Section>
                )}

                {/* Skills */}
                {analysis?.skills && analysis.skills.length > 0 && (
                    <Section title="Extracted Skills" colors={colors}>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                            {analysis.skills.map((skill, i) => (
                                <View key={i} style={{ backgroundColor: colors.primaryLight, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 }}>
                                    <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '600' }}>{skill.name}</Text>
                                </View>
                            ))}
                        </View>
                    </Section>
                )}

                {/* Work Experience */}
                {analysis?.work_experience && analysis.work_experience.length > 0 && (
                    <Section title="Work Experience" colors={colors}>
                        {analysis.work_experience.map((exp, i) => (
                            <View key={i} style={{ marginBottom: 12 }}>
                                <Text style={{ color: colors.text, fontSize: 14, fontWeight: '700' }}>{exp.job_title}</Text>
                                <Text style={{ color: colors.textSecondary, fontSize: 13, marginTop: 2 }}>{exp.company_name}</Text>
                                <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 2 }}>
                                    {exp.start_date} - {exp.is_current ? 'Present' : exp.end_date}
                                </Text>
                            </View>
                        ))}
                    </Section>
                )}

                {/* Education */}
                {analysis?.education && analysis.education.length > 0 && (
                    <Section title="Education" colors={colors}>
                        {analysis.education.map((edu, i) => (
                            <View key={i} style={{ marginBottom: 12 }}>
                                <Text style={{ color: colors.text, fontSize: 14, fontWeight: '700' }}>{edu.degree}</Text>
                                <Text style={{ color: colors.textSecondary, fontSize: 13, marginTop: 2 }}>{edu.institution_name}</Text>
                                <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 2 }}>{edu.field_of_study}</Text>
                            </View>
                        ))}
                    </Section>
                )}

                {/* Strengths */}
                {analysis?.strengths && analysis.strengths.length > 0 && (
                    <Section title="Strengths" colors={colors}>
                        {analysis.strengths.map((s, i) => (
                            <Text key={i} style={{ color: colors.text, fontSize: 14, marginBottom: 6 }}>✓ {s}</Text>
                        ))}
                    </Section>
                )}

                {/* Improvements */}
                {analysis?.improvement_areas && analysis.improvement_areas.length > 0 && (
                    <Section title="Areas for Improvement" colors={colors}>
                        {analysis.improvement_areas.map((s, i) => (
                            <Text key={i} style={{ color: colors.text, fontSize: 14, marginBottom: 6 }}>• {s}</Text>
                        ))}
                    </Section>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

function Section({ title, children, colors }: { title: string; children: React.ReactNode; colors: ThemeColors }) {
    return (
        <View style={{
            backgroundColor: colors.card,
            borderRadius: 16,
            padding: 16,
            marginBottom: 12,
            borderWidth: 1,
            borderColor: colors.cardBorder,
        }}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 12 }}>{title}</Text>
            {children}
        </View>
    );
}

function ScoreCircle({ label, value, colors }: { label: string; value?: number; colors: ThemeColors }) {
    const score = value ?? 0;
    const color = score >= 80 ? colors.success : score >= 60 ? colors.warning : colors.error;
    return (
        <View style={{ alignItems: 'center' }}>
            <Text style={{ fontSize: 28, fontWeight: '700', color }}>{score}%</Text>
            <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 4 }}>{label}</Text>
        </View>
    );
}
