import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Alert, StyleSheet, Switch, Modal, ActivityIndicator, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useColors } from '../../store';
import jobService, { JobCategory, JobTitle, Job } from '../../services/jobService';
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

type PostJobRouteParams = {
    editJob?: Job;
};

export default function PostJobScreen() {
    const navigation = useNavigation();
    const route = useRoute<RouteProp<{ params: PostJobRouteParams }, 'params'>>();
    const colors = useColors();

    // Check if we're editing an existing job
    const editJob = route.params?.editJob;
    const isEditMode = !!editJob;

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
        completion_points: '0', // Points awarded when part-time job is completed
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

    // Populate form when editing an existing job
    useEffect(() => {
        if (editJob) {
            setFormData({
                company_name: editJob.company_name || '',
                job_type: editJob.job_type || 'full_time',
                headcount: editJob.headcount?.toString() || '1',
                salary_amount: editJob.salary_amount?.toString() || '',
                location_address: editJob.location_address || DEFAULT_LOCATION.address,
                latitude: editJob.latitude || DEFAULT_LOCATION.latitude,
                longitude: editJob.longitude || DEFAULT_LOCATION.longitude,
                description: editJob.description || '',
                schedule: editJob.schedule || null,
                hourly_rate: editJob.hourly_rate?.toString() || '',
                completion_reward: editJob.completion_reward?.toString() || '',
                completion_points: editJob.completion_points?.toString() || '0',
            });
            if (editJob.skills) {
                // Handle skills as array of objects or strings
                const skillNames = editJob.skills.map((s: any) => typeof s === 'string' ? s : s.name);
                setSelectedSkills(skillNames);
            }
        }
    }, [editJob]);

    // When in edit mode and categories are loaded, set the selected category and title
    useEffect(() => {
        if (isEditMode && editJob && categories.length > 0) {
            // Find and set the category if available
            if (editJob.category) {
                const categoryId = typeof editJob.category === 'number' ? editJob.category : editJob.category?.id;
                const foundCategory = categories.find(c => c.id === categoryId);
                if (foundCategory) {
                    setSelectedCategory(foundCategory);
                }
            }

            // Create a placeholder title from the job data
            if (editJob.title) {
                setSelectedTitle({
                    id: editJob.job_title || 0,
                    title: editJob.title,
                    description_template: editJob.description || '',
                    category: typeof editJob.category === 'number' ? editJob.category : editJob.category?.id || 0,
                });
            }
        }
    }, [isEditMode, editJob, categories]);

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
            console.log('Loading job categories...');
            const data = await jobService.getCategories();
            console.log('Categories loaded:', data);
            if (Array.isArray(data) && data.length > 0) {
                setCategories(data);
            } else {
                console.warn('No categories returned from API, using defaults');
                setCategories(getDefaultCategories());
            }
        } catch (e: any) {
            console.error('Failed to load categories:', e?.response?.data || e?.message || e);
            setCategories(getDefaultCategories());
        }
    };

    const getDefaultCategories = (): JobCategory[] => [
        { id: 1, name: 'Food & Beverage', icon: 'restaurant' },
        { id: 2, name: 'Retail', icon: 'storefront' },
        { id: 3, name: 'Technology', icon: 'laptop' },
        { id: 4, name: 'Healthcare', icon: 'medical' },
        { id: 5, name: 'Logistics', icon: 'truck' },
        { id: 6, name: 'Education', icon: 'school' },
        { id: 7, name: 'Hospitality', icon: 'hotel' },
        { id: 8, name: 'Other', icon: 'briefcase' },
    ];

    const loadTitles = async (catId: number) => {
        try {
            console.log('Loading titles for category:', catId);
            const data = await jobService.getTitles(catId);
            console.log('Titles loaded:', data);
            if (Array.isArray(data) && data.length > 0) {
                setTitles(data);
            } else {
                console.warn('No titles returned for category, using defaults');
                setTitles(getDefaultTitlesForCategory(catId));
            }
        } catch (e: any) {
            console.error('Failed to load titles:', e?.response?.data || e?.message || e);
            setTitles(getDefaultTitlesForCategory(catId));
        }
    };

    const getDefaultTitlesForCategory = (categoryId: number): JobTitle[] => {
        const titlesByCategory: Record<number, JobTitle[]> = {
            1: [ // Food & Beverage
                { id: 101, title: 'Waiter/Waitress', description_template: 'We are looking for a friendly waiter/waitress to serve our guests. Responsibilities include taking orders, serving food and drinks, and ensuring customer satisfaction.', category: 1 },
                { id: 102, title: 'Barista', description_template: 'Looking for an experienced barista to prepare coffee and other beverages. Must have knowledge of coffee preparation and excellent customer service skills.', category: 1 },
                { id: 103, title: 'Kitchen Crew', description_template: 'Kitchen crew member needed to assist with food preparation, maintaining cleanliness, and supporting the kitchen team.', category: 1 },
                { id: 104, title: 'Cashier', description_template: 'Cashier needed to handle customer transactions, manage the cash register, and provide friendly service.', category: 1 },
            ],
            2: [ // Retail
                { id: 201, title: 'Sales Associate', description_template: 'Sales associate needed to assist customers, handle product inquiries, and process transactions.', category: 2 },
                { id: 202, title: 'Store Assistant', description_template: 'Store assistant to help with inventory management, stocking shelves, and customer service.', category: 2 },
                { id: 203, title: 'Visual Merchandiser', description_template: 'Visual merchandiser to create attractive store displays and maintain store presentation.', category: 2 },
            ],
            3: [ // Technology
                { id: 301, title: 'Software Developer', description_template: 'Software developer needed to design, develop, and maintain software applications.', category: 3 },
                { id: 302, title: 'IT Support', description_template: 'IT support specialist to provide technical assistance and troubleshoot issues.', category: 3 },
                { id: 303, title: 'Web Developer', description_template: 'Web developer to build and maintain websites and web applications.', category: 3 },
            ],
            4: [ // Healthcare
                { id: 401, title: 'Nurse', description_template: 'Registered nurse needed to provide patient care and medical assistance.', category: 4 },
                { id: 402, title: 'Medical Assistant', description_template: 'Medical assistant to support healthcare professionals with administrative and clinical tasks.', category: 4 },
            ],
            5: [ // Logistics
                { id: 501, title: 'Delivery Driver', description_template: 'Delivery driver needed to transport goods and ensure timely deliveries.', category: 5 },
                { id: 502, title: 'Warehouse Worker', description_template: 'Warehouse worker to handle inventory, packing, and shipping operations.', category: 5 },
            ],
            6: [ // Education
                { id: 601, title: 'Tutor', description_template: 'Tutor needed to provide academic support and guidance to students.', category: 6 },
                { id: 602, title: 'Teaching Assistant', description_template: 'Teaching assistant to support teachers in classroom activities and student supervision.', category: 6 },
            ],
            7: [ // Hospitality
                { id: 701, title: 'Receptionist', description_template: 'Receptionist needed to greet guests, manage reservations, and handle inquiries.', category: 7 },
                { id: 702, title: 'Housekeeper', description_template: 'Housekeeper to maintain cleanliness and tidiness of rooms and common areas.', category: 7 },
            ],
            8: [ // Other
                { id: 801, title: 'General Worker', description_template: 'General worker needed for various tasks and responsibilities.', category: 8 },
                { id: 802, title: 'Administrative Assistant', description_template: 'Administrative assistant to provide office support and handle administrative tasks.', category: 8 },
            ],
        };
        return titlesByCategory[categoryId] || titlesByCategory[8];
    };

    const loadSkills = async () => {
        try {
            const data = await jobService.getSkills();
            if (Array.isArray(data) && data.length > 0) {
                setAvailableSkills(data);
            }
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
        if (!isEditMode && !selectedTitle?.title) {
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
        if (!formData.schedule && !isEditMode) {
            Alert.alert('Missing Schedule', 'Please configure the working schedule');
            return;
        }

        setIsLoading(true);
        try {
            // Only include category/job_title IDs if they're real DB IDs (< 100)
            // Local fallback IDs start at 100+ and won't exist in the database
            const categoryId = selectedCategory?.id || editJob?.category;
            const jobTitleId = selectedTitle?.id || editJob?.job_title;

            const payload: any = {
                title: selectedTitle?.title || editJob?.title,
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
                schedule: formData.schedule || editJob?.schedule,
                // Include completion points for part-time jobs
                completion_points: formData.job_type === 'part_time' ? (parseInt(formData.completion_points) || 0) : 0,
            };

            // Only add category/job_title if they're valid DB IDs (not local fallbacks)
            if (categoryId && categoryId < 100) {
                payload.category = categoryId;
            }
            if (jobTitleId && jobTitleId < 100) {
                payload.job_title = jobTitleId;
            }

            if (isEditMode && editJob) {
                await jobService.updateJob(editJob.id, payload);
                Alert.alert('Success', 'Job updated successfully!', [
                    { text: 'OK', onPress: () => navigation.goBack() }
                ]);
            } else {
                await jobService.createJob(payload);
                Alert.alert('Success', 'Job posted successfully!', [
                    { text: 'OK', onPress: () => navigation.goBack() }
                ]);
            }
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
                <>
                    <Text style={{ color: colors.textMuted, fontStyle: 'italic', marginBottom: 12 }}>
                        Part-time shift details are configured in the Schedule step.
                    </Text>

                    {/* Completion Points for Part-time */}
                    <View style={{
                        backgroundColor: colors.card,
                        padding: 16,
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: colors.cardBorder,
                        marginBottom: 20,
                    }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                            <Text style={{ fontSize: 20, marginRight: 8 }}>🎯</Text>
                            <Text style={{ color: colors.text, fontWeight: '600', fontSize: 14 }}>Completion Points (Optional)</Text>
                        </View>
                        <Text style={{ color: colors.textSecondary, fontSize: 12, marginBottom: 12 }}>
                            Award bonus points to job seekers when they successfully complete this job. Points motivate workers and build loyalty.
                        </Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <TextInput
                                style={[styles.input, {
                                    flex: 1,
                                    backgroundColor: colors.inputBackground,
                                    color: colors.text,
                                    borderColor: colors.border,
                                    marginRight: 8,
                                }]}
                                placeholder="0"
                                placeholderTextColor={colors.textMuted}
                                keyboardType="numeric"
                                value={formData.completion_points}
                                onChangeText={t => setFormData({ ...formData, completion_points: t })}
                            />
                            <Text style={{ color: colors.textSecondary, fontWeight: '600' }}>points</Text>
                        </View>
                        {parseInt(formData.completion_points) > 0 && (
                            <View style={{
                                backgroundColor: colors.successLight || colors.success + '20',
                                padding: 8,
                                borderRadius: 8,
                                marginTop: 12,
                            }}>
                                <Text style={{ color: colors.success, fontSize: 12, textAlign: 'center' }}>
                                    ✨ Workers will earn {formData.completion_points} points upon job completion!
                                </Text>
                            </View>
                        )}
                    </View>
                </>
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
                <View>
                    {isEditMode && (
                        <Text style={{ fontSize: 12, color: colors.primary, fontWeight: '600' }}>EDIT MODE</Text>
                    )}
                    <Text style={{ fontSize: 20, fontWeight: '700', color: colors.text }}>
                        {step === 0 ? 'Job Basics' : step === 1 ? 'Location & Desc' : 'Skills & Schedule'}
                    </Text>
                </View>
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
                            {step === 2 ? (isEditMode ? 'Update Job' : 'Post Job') : 'Next'}
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


