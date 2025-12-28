import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Alert, StyleSheet, Switch, Modal, ActivityIndicator, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useColors } from '../../store';
import jobService, { JobCategory, JobTitle } from '../../services/jobService';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';
import config from '../../config';

import ScheduleSelector from '../../components/ScheduleSelector';

// Default location from config
const DEFAULT_LOCATION = config.settings.defaultLocation;

interface LocationSuggestion {
    place_id: number;
    display_name: string;
    lat: string;
    lon: string;
}

export default function PostJobScreen() {
    const navigation = useNavigation();
    const colors = useColors();

    // Steps: 0: Basics, 1: Location & Desc, 2: Skills & Schedule
    const [step, setStep] = useState(0);
    const [isLoading, setIsLoading] = useState(false);

    // Form Data
    const [categories, setCategories] = useState<JobCategory[]>([]);
    const [titles, setTitles] = useState<JobTitle[]>([]);

    // Skills State
    const [availableSkills, setAvailableSkills] = useState<{ id: number, name: string }[]>([
        { id: 1, name: 'Communication' }, { id: 2, name: 'Teamwork' },
        { id: 3, name: 'Problem Solving' }, { id: 4, name: 'Customer Service' },
        { id: 5, name: 'Leadership' }, { id: 6, name: 'Time Management' }
    ]);

    const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
    const [newSkill, setNewSkill] = useState('');

    const [selectedCategory, setSelectedCategory] = useState<JobCategory | null>(null);
    const [selectedTitle, setSelectedTitle] = useState<JobTitle | null>(null);

    const [formData, setFormData] = useState({
        company_name: '',
        job_type: 'full_time',
        headcount: '1',
        salary_amount: '',
        location_address: DEFAULT_LOCATION.address,
        latitude: DEFAULT_LOCATION.latitude,
        longitude: DEFAULT_LOCATION.longitude,
        description: '',
        schedule: null as any,
        hourly_rate: '',
        completion_reward: '',
    });

    const [showMap, setShowMap] = useState(false);
    const [locationSearch, setLocationSearch] = useState('');
    const [locationSuggestions, setLocationSuggestions] = useState<LocationSuggestion[]>([]);
    const [isSearchingLocation, setIsSearchingLocation] = useState(false);

    // Load categories and skills on mount
    useEffect(() => {
        loadCategories();
        loadSkills();
    }, []);

    // Load titles when category changes
    useEffect(() => {
        if (selectedCategory) {
            loadTitles(selectedCategory.id);
        } else {
            setTitles([]);
        }
    }, [selectedCategory]);

    // Auto-fill description when job title is selected
    useEffect(() => {
        if (selectedTitle && selectedTitle.description_template && !formData.description) {
            setFormData(prev => ({ ...prev, description: selectedTitle.description_template }));
        }
    }, [selectedTitle]);

    const loadCategories = async () => {
        try {
            const data = await jobService.getCategories();
            setCategories(data);
        } catch (e) {
            console.error('Failed to load categories:', e);
            Alert.alert('Error', 'Failed to load job categories');
        }
    };

    const loadTitles = async (catId: number) => {
        try {
            const data = await jobService.getTitles(catId);
            setTitles(data);
        } catch (e) {
            console.error('Failed to load titles:', e);
            Alert.alert('Error', 'Failed to load job titles');
        }
    };

    const loadSkills = async () => {
        try {
            const data = await jobService.getSkills();
            setAvailableSkills(data);
        } catch (e) {
            console.error('Failed to load skills:', e);
            // Keep default skills if API fails
        }
    };

    // Location search function
    const searchLocationSuggestions = async (query: string) => {
        if (query.length < 3) {
            setLocationSuggestions([]);
            return;
        }

        setIsSearchingLocation(true);
        try {
            // Bias search towards Malaysia
            const response = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=my&limit=5`,
                { headers: { 'User-Agent': 'JobApp/1.0' } }
            );
            const data = await response.json();
            setLocationSuggestions(data);
        } catch (error) {
            console.error('Error searching location:', error);
        } finally {
            setIsSearchingLocation(false);
        }
    };

    const selectLocation = (suggestion: LocationSuggestion) => {
        const lat = parseFloat(suggestion.lat);
        const lon = parseFloat(suggestion.lon);
        setFormData(prev => ({
            ...prev,
            latitude: lat,
            longitude: lon,
            location_address: suggestion.display_name.split(',').slice(0, 3).join(', ')
        }));
        setLocationSearch('');
        setLocationSuggestions([]);
    };

    const handleAddSkill = () => {
        if (newSkill.trim()) {
            if (!availableSkills.find(s => s.name.toLowerCase() === newSkill.toLowerCase())) {
                setAvailableSkills([...availableSkills, { id: Date.now(), name: newSkill }]);
            }
            if (!selectedSkills.includes(newSkill)) {
                setSelectedSkills([...selectedSkills, newSkill]);
            }
            setNewSkill('');
        }
    };

    const toggleSkill = (skillName: string) => {
        if (selectedSkills.includes(skillName)) {
            setSelectedSkills(selectedSkills.filter(s => s !== skillName));
        } else {
            setSelectedSkills([...selectedSkills, skillName]);
        }
    };

    const handleNext = () => {
        if (step === 0) {
            if (!selectedCategory || !selectedTitle || !formData.company_name) {
                Alert.alert('Missing Fields', 'Please select category, title and company name');
                return;
            }
            if (!formData.description && selectedTitle.description_template) {
                setFormData(prev => ({ ...prev, description: selectedTitle.description_template }));
            }
        } else if (step === 1) {
            if (!formData.location_address) {
                Alert.alert('Missing Location', 'Please select a location');
                return;
            }
        }
        setStep(step + 1);
    };

    const handleSubmit = async () => {
        // Validate required fields
        if (!selectedTitle?.title) {
            Alert.alert('Missing Information', 'Please select a job title');
            return;
        }
        if (!formData.company_name.trim()) {
            Alert.alert('Missing Information', 'Please enter your company name');
            return;
        }
        if (!formData.location_address.trim()) {
            Alert.alert('Missing Information', 'Please select a job location');
            return;
        }
        if (!formData.schedule) {
            Alert.alert('Missing Schedule', 'Please configure the working schedule');
            return;
        }

        setIsLoading(true);
        try {
            const payload = {
                category: selectedCategory?.id,
                job_title: selectedTitle?.id,
                title: selectedTitle?.title,
                company_name: formData.company_name,
                job_type: formData.job_type,
                headcount: parseInt(formData.headcount) || 1,
                salary_amount: parseFloat(formData.salary_amount) || 0,
                salary_period: formData.job_type === 'full_time' ? 'monthly' : 'hourly',
                location_address: formData.location_address,
                latitude: formData.latitude,
                longitude: formData.longitude,
                description: formData.description || 'No description provided',
                skills: selectedSkills,
                schedule: formData.schedule,
            };

            await jobService.createJob(payload);
            Alert.alert('Success', 'Job posted successfully!', [
                { text: 'OK', onPress: () => navigation.goBack() }
            ]);
        } catch (error: any) {
            console.error('Job post error:', error);
            console.error('Error response:', error.response?.data);
            console.error('Error message:', error.message);
            console.error('Error code:', error.code);

            // Format error message
            let errorMessage = 'Failed to post job';

            // Check for network errors first
            if (error.code === 'ERR_NETWORK' || error.message?.includes('Network') || !error.response) {
                errorMessage = 'Unable to connect to server. Please check your internet connection and try again.';
            } else if (error.response?.status === 401) {
                errorMessage = 'Session expired. Please log in again.';
            } else if (error.response?.data) {
                const data = error.response.data;
                if (typeof data === 'string') {
                    errorMessage = data;
                } else if (data.detail) {
                    errorMessage = data.detail;
                } else if (typeof data === 'object') {
                    // Format validation errors
                    const errors = Object.entries(data)
                        .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : value}`)
                        .join('\n');
                    errorMessage = errors || 'Validation error';
                }
            } else if (error.message) {
                errorMessage = error.message;
            }
            Alert.alert('Error', errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    // --- Render Steps ---

    const renderStep0 = () => (
        <ScrollView contentContainerStyle={{ padding: 20 }}>
            <Text style={[styles.label, { color: colors.text }]}>Job Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
                {categories.map(cat => (
                    <TouchableOpacity
                        key={cat.id}
                        style={[styles.chip, {
                            backgroundColor: selectedCategory?.id === cat.id ? colors.primary : colors.card,
                            borderColor: selectedCategory?.id === cat.id ? colors.primary : colors.border
                        }]}
                        onPress={() => {
                            setSelectedCategory(cat);
                            setSelectedTitle(null);
                        }}
                    >
                        <Text style={{ color: selectedCategory?.id === cat.id ? '#FFF' : colors.text }}>{cat.name}</Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            <Text style={[styles.label, { color: colors.text }]}>Job Title</Text>
            {selectedCategory ? (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 }}>
                    {titles.map(t => (
                        <TouchableOpacity
                            key={t.id}
                            style={[styles.chip, {
                                backgroundColor: selectedTitle?.id === t.id ? colors.primary : colors.card,
                                borderColor: selectedTitle?.id === t.id ? colors.primary : colors.border
                            }]}
                            onPress={() => setSelectedTitle(t)}
                        >
                            <Text style={{ color: selectedTitle?.id === t.id ? '#FFF' : colors.text }}>{t.title}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            ) : (
                <Text style={{ color: colors.textMuted, marginBottom: 20 }}>Select a category first</Text>
            )}

            <Text style={[styles.label, { color: colors.text }]}>Company Name</Text>
            <TextInput
                style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text, borderColor: colors.border }]}
                placeholder="e.g. My Awesome Cafe"
                placeholderTextColor={colors.textMuted}
                value={formData.company_name}
                onChangeText={t => setFormData({ ...formData, company_name: t })}
            />

            <Text style={[styles.label, { color: colors.text }]}>Job Type</Text>
            <View style={{ flexDirection: 'row', gap: 20, marginBottom: 20 }}>
                <TouchableOpacity
                    style={{ flexDirection: 'row', alignItems: 'center' }}
                    onPress={() => setFormData({ ...formData, job_type: 'full_time' })}
                >
                    <View style={[styles.radio, { borderColor: formData.job_type === 'full_time' ? colors.primary : colors.textMuted }]}>
                        {formData.job_type === 'full_time' && <View style={[styles.radioFill, { backgroundColor: colors.primary }]} />}
                    </View>
                    <Text style={{ color: colors.text, marginLeft: 8 }}>Full Time</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={{ flexDirection: 'row', alignItems: 'center' }}
                    onPress={() => setFormData({ ...formData, job_type: 'part_time' })}
                >
                    <View style={[styles.radio, { borderColor: formData.job_type === 'part_time' ? colors.primary : colors.textMuted }]}>
                        {formData.job_type === 'part_time' && <View style={[styles.radioFill, { backgroundColor: colors.primary }]} />}
                    </View>
                    <Text style={{ color: colors.text, marginLeft: 8 }}>Part Time</Text>
                </TouchableOpacity>
            </View>

            {formData.job_type === 'full_time' ? (
                <>
                    <Text style={[styles.label, { color: colors.text }]}>Monthly Salary (RM)</Text>
                    <TextInput
                        style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text, borderColor: colors.border }]}
                        placeholder="e.g. 2500"
                        placeholderTextColor={colors.textMuted}
                        keyboardType="numeric"
                        value={formData.salary_amount}
                        onChangeText={t => setFormData({ ...formData, salary_amount: t })}
                    />
                    <Text style={[styles.label, { color: colors.text }]}>Headcount Needed</Text>
                    <TextInput
                        style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text, borderColor: colors.border }]}
                        placeholder="e.g. 1"
                        placeholderTextColor={colors.textMuted}
                        keyboardType="numeric"
                        value={formData.headcount}
                        onChangeText={t => setFormData({ ...formData, headcount: t })}
                    />
                </>
            ) : (
                <Text style={{ color: colors.textMuted, fontStyle: 'italic', marginBottom: 20 }}>
                    Part-time jobs configured in later steps.
                </Text>
            )}

        </ScrollView>
    );

    const renderStep1 = () => (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }}>
            <Text style={[styles.label, { color: colors.text }]}>Location</Text>

            {/* Location Search */}
            <TextInput
                style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text, borderColor: colors.border, marginBottom: 8 }]}
                placeholder="Search for a location in Malaysia..."
                placeholderTextColor={colors.textMuted}
                value={locationSearch}
                onChangeText={(text) => {
                    setLocationSearch(text);
                    searchLocationSuggestions(text);
                }}
            />

            {/* Location Suggestions */}
            {isSearchingLocation && <ActivityIndicator size="small" color={colors.primary} style={{ marginBottom: 8 }} />}
            {locationSuggestions.length > 0 && (
                <View style={{ backgroundColor: colors.card, borderRadius: 8, marginBottom: 12, borderWidth: 1, borderColor: colors.border }}>
                    {locationSuggestions.map((suggestion) => (
                        <TouchableOpacity
                            key={suggestion.place_id}
                            style={{ padding: 12, borderBottomWidth: 1, borderBottomColor: colors.border }}
                            onPress={() => selectLocation(suggestion)}
                        >
                            <Text style={{ color: colors.text, fontSize: 13 }} numberOfLines={2}>
                                {suggestion.display_name}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            )}

            {/* Selected Location Display */}
            <TouchableOpacity
                style={[styles.input, { backgroundColor: colors.card, justifyContent: 'center', borderColor: colors.primary, marginBottom: 12 }]}
                onPress={() => setShowMap(true)}
            >
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={{ fontSize: 16, marginRight: 8 }}>📍</Text>
                    <View style={{ flex: 1 }}>
                        <Text style={{ color: colors.text, fontWeight: '600' }} numberOfLines={1}>
                            {formData.location_address}
                        </Text>
                        <Text style={{ color: colors.textSecondary, fontSize: 11 }}>
                            Tap to adjust on map
                        </Text>
                    </View>
                </View>
            </TouchableOpacity>

            <Text style={[styles.label, { color: colors.text, marginTop: 16 }]}>Job Description</Text>
            {selectedTitle && selectedTitle.description_template && formData.description === selectedTitle.description_template && (
                <View style={{ backgroundColor: colors.primaryLight || '#6366F115', padding: 8, borderRadius: 8, marginBottom: 8 }}>
                    <Text style={{ color: colors.primary, fontSize: 12 }}>
                        ✨ Auto-filled from "{selectedTitle.title}" template. You can edit below.
                    </Text>
                </View>
            )}
            <TextInput
                style={[styles.input, {
                    backgroundColor: colors.inputBackground,
                    color: colors.text,
                    borderColor: colors.border,
                    height: 180,
                    textAlignVertical: 'top',
                    paddingTop: 12,
                }]}
                multiline
                placeholder="Describe the job responsibilities, requirements, and benefits..."
                placeholderTextColor={colors.textMuted}
                value={formData.description}
                onChangeText={t => setFormData({ ...formData, description: t })}
            />
        </ScrollView>
    );

    // Map Modal with search integration
    const renderMapModal = () => (
        <Modal visible={showMap} animationType="slide">
            <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
                <View style={{ padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: colors.border }}>
                    <TouchableOpacity onPress={() => setShowMap(false)}>
                        <Text style={{ color: colors.textSecondary, fontSize: 16 }}>Cancel</Text>
                    </TouchableOpacity>
                    <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.text }}>Select Location</Text>
                    <TouchableOpacity onPress={() => setShowMap(false)}>
                        <Text style={{ color: colors.primary, fontSize: 16, fontWeight: '600' }}>Done</Text>
                    </TouchableOpacity>
                </View>

                {/* Current selection indicator */}
                <View style={{ padding: 12, backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                    <Text style={{ color: colors.textSecondary, fontSize: 12 }}>Selected Location:</Text>
                    <Text style={{ color: colors.text, fontWeight: '600' }} numberOfLines={1}>
                        {formData.location_address}
                    </Text>
                </View>

                <WebView
                    style={{ flex: 1 }}
                    source={{ html: getMapHTML(formData.latitude, formData.longitude) }}
                    onMessage={async (event) => {
                        const data = JSON.parse(event.nativeEvent.data);
                        if (data.type === 'locationSelected') {
                            // Reverse geocode to get address
                            try {
                                const response = await fetch(
                                    `https://nominatim.openstreetmap.org/reverse?format=json&lat=${data.lat}&lon=${data.lng}`,
                                    { headers: { 'User-Agent': 'JobApp/1.0' } }
                                );
                                const geoData = await response.json();
                                const address = geoData.display_name?.split(',').slice(0, 3).join(', ') ||
                                    `${data.lat.toFixed(4)}, ${data.lng.toFixed(4)}`;

                                setFormData(prev => ({
                                    ...prev,
                                    latitude: data.lat,
                                    longitude: data.lng,
                                    location_address: address
                                }));
                            } catch (e) {
                                setFormData(prev => ({
                                    ...prev,
                                    latitude: data.lat,
                                    longitude: data.lng,
                                    location_address: `${data.lat.toFixed(4)}, ${data.lng.toFixed(4)}`
                                }));
                            }
                        }
                    }}
                />
            </SafeAreaView>
        </Modal>
    );

    const renderStep2 = () => (
        <ScrollView contentContainerStyle={{ padding: 20 }}>
            {/* Skills Section */}
            <Text style={[styles.label, { color: colors.text }]}>Required Skills</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                {availableSkills.map(skill => (
                    <TouchableOpacity
                        key={skill.id}
                        style={[styles.chip, {
                            backgroundColor: selectedSkills.includes(skill.name) ? colors.primary : colors.inputBackground,
                            borderColor: selectedSkills.includes(skill.name) ? colors.primary : colors.border
                        }]}
                        onPress={() => toggleSkill(skill.name)}
                    >
                        <Text style={{ color: selectedSkills.includes(skill.name) ? '#FFF' : colors.text, fontSize: 12 }}>
                            {skill.name}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 20 }}>
                <TextInput
                    style={[styles.input, { flex: 1, backgroundColor: colors.inputBackground, color: colors.text, borderColor: colors.border }]}
                    placeholder="Add custom skill..."
                    placeholderTextColor={colors.textMuted}
                    value={newSkill}
                    onChangeText={setNewSkill}
                />
                <TouchableOpacity
                    style={{ backgroundColor: colors.card, padding: 12, borderRadius: 8, borderWidth: 1, borderColor: colors.border }}
                    onPress={handleAddSkill}
                >
                    <Text style={{ color: colors.primary, fontWeight: 'bold' }}>Add</Text>
                </TouchableOpacity>
            </View>

            {/* Schedule Section */}
            <Text style={[styles.label, { color: colors.text, fontSize: 16, marginTop: 10 }]}>Working Schedule</Text>
            <Text style={{ color: colors.textSecondary, fontSize: 12, marginBottom: 12 }}>
                {formData.job_type === 'full_time'
                    ? 'Set the working days and shift times for this position'
                    : 'Configure shifts with headcount, hourly rate, and completion rewards'}
            </Text>
            <View style={{ backgroundColor: colors.card, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: colors.cardBorder, marginBottom: 20 }}>
                <ScheduleSelector
                    type={formData.job_type as any}
                    onChange={(s) => setFormData(prev => ({ ...prev, schedule: s }))}
                />
            </View>
        </ScrollView>
    );

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
            <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border, flexDirection: 'row', alignItems: 'center' }}>
                <TouchableOpacity onPress={() => step === 0 ? navigation.goBack() : setStep(step - 1)}>
                    <Text style={{ fontSize: 24, color: colors.text, marginRight: 16 }}>←</Text>
                </TouchableOpacity>
                <Text style={{ fontSize: 20, fontWeight: '700', color: colors.text }}>
                    {step === 0 ? 'Job Basics' : step === 1 ? 'Location & Desc' : 'Skills & Schedule'}
                </Text>
            </View>

            {step === 0 && renderStep0()}
            {step === 1 && renderStep1()}
            {step === 2 && renderStep2()}

            <View style={{ padding: 20, borderTopWidth: 1, borderTopColor: colors.border }}>
                <TouchableOpacity
                    style={{
                        backgroundColor: colors.primary,
                        paddingVertical: 14,
                        borderRadius: 12,
                        alignItems: 'center',
                    }}
                    onPress={step === 2 ? handleSubmit : handleNext}
                    disabled={isLoading}
                >
                    {isLoading ? (
                        <ActivityIndicator color="#FFF" />
                    ) : (
                        <Text style={{ color: '#FFF', fontSize: 16, fontWeight: '700' }}>
                            {step === 2 ? 'Post Job' : 'Next'}
                        </Text>
                    )}
                </TouchableOpacity>
            </View>

            {renderMapModal()}
        </SafeAreaView>
    );
}

// Helper: Leaflet Map HTML for Picker
const getMapHTML = (lat: number, lng: number) => `
<!DOCTYPE html>
<html>
<head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    <style>body,html,#map{width:100%;height:100%;margin:0;}</style>
</head>
<body>
    <div id="map"></div>
    <script>
        var map = L.map('map').setView([${lat}, ${lng}], 13);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
        var marker = L.marker([${lat}, ${lng}], {draggable: true}).addTo(map);
        
        marker.on('dragend', function(e) {
            var pos = marker.getLatLng();
            window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'locationSelected',
                lat: pos.lat,
                lng: pos.lng
            }));
        });
        
        map.on('click', function(e) {
            marker.setLatLng(e.latlng);
            window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'locationSelected',
                lat: e.latlng.lat,
                lng: e.latlng.lng
            }));
        });
    </script>
</body>
</html>
`;

const styles = StyleSheet.create({
    label: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 8,
        marginTop: 16,
    },
    input: {
        borderWidth: 1,
        borderRadius: 8,
        padding: 12,
        fontSize: 14,
    },
    chip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        marginRight: 8,
        marginBottom: 8,
        borderWidth: 1,
    },
    radio: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 2,
        alignItems: 'center',
        justifyContent: 'center',
    },
    radioFill: {
        width: 10,
        height: 10,
        borderRadius: 5,
    },
});


