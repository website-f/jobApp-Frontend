import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ScrollView,
    Modal,
    FlatList,
    ActivityIndicator,
    Dimensions,
    Platform,
    Alert,
    KeyboardAvoidingView,
    RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';
import { useColors, ThemeColors, useAuthStore } from '../../store';
import jobService, { Job, JobSearchFilters, JobShift } from '../../services/jobService';
import config from '../../config';
import { formatSalaryRange, getCurrencySymbol } from '../../utils/currency';
import { useTranslation } from '../../hooks';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Default location from config (Kuala Lumpur, Malaysia)
const DEFAULT_LOCATION = config.settings.defaultLocation;

interface LocationSuggestion {
    place_id: number;
    display_name: string;
    lat: string;
    lon: string;
}

export default function BrowseJobsScreen() {
    const colors = useColors();
    const { user } = useAuthStore();
    const { t } = useTranslation();
    const webViewRef = useRef<WebView>(null);

    // Get user's preferred currency or default to MYR
    const preferredCurrency = user?.preferred_currency || 'MYR';

    // Location state - initialize with defaults
    const [currentLocation, setCurrentLocation] = useState<{ latitude: number; longitude: number } | null>({
        latitude: DEFAULT_LOCATION.latitude,
        longitude: DEFAULT_LOCATION.longitude,
    });
    const [locationAddress, setLocationAddress] = useState(DEFAULT_LOCATION.address);
    const [showLocationModal, setShowLocationModal] = useState(false);
    const [locationSearch, setLocationSearch] = useState('');
    const [locationSuggestions, setLocationSuggestions] = useState<LocationSuggestion[]>([]);
    const [isSearchingLocation, setIsSearchingLocation] = useState(false);

    // Job filters state
    const [searchQuery, setSearchQuery] = useState('');
    const [jobType, setJobType] = useState<'all' | 'full_time' | 'part_time' | 'contract'>('all');
    const [radiusKm, setRadiusKm] = useState(50);
    const [matchSkills, setMatchSkills] = useState(false);
    const [matchAvailability, setMatchAvailability] = useState(false);
    const [showFilters, setShowFilters] = useState(false);

    // Jobs state
    const [jobs, setJobs] = useState<Job[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedJob, setSelectedJob] = useState<Job | null>(null);

    // Job Application state
    const [showJobDetailModal, setShowJobDetailModal] = useState(false);
    const [showApplyModal, setShowApplyModal] = useState(false);
    const [isApplying, setIsApplying] = useState(false);
    const [applicationType, setApplicationType] = useState<'apply' | 'bid'>('apply');
    const [coverLetter, setCoverLetter] = useState('');
    const [proposedRate, setProposedRate] = useState('');

    // Track applied jobs
    const [appliedJobIds, setAppliedJobIds] = useState<Set<number>>(new Set());

    // Get current location on mount
    useEffect(() => {
        getCurrentLocation();
    }, []);

    // Fetch user's applied jobs on mount
    useEffect(() => {
        fetchAppliedJobs();
    }, []);

    const fetchAppliedJobs = async () => {
        try {
            const applications = await jobService.getMyApplications();
            const jobIds = new Set<number>(applications.map((app: any) => app.job?.id || app.job).filter(Boolean));
            setAppliedJobIds(jobIds);
        } catch (error) {
            console.log('Could not fetch applied jobs:', error);
        }
    };

    // Search jobs when location or filters change
    useEffect(() => {
        if (currentLocation) {
            searchJobs();
        }
    }, [currentLocation, jobType, radiusKm, matchSkills, matchAvailability]);

    // Helper to check if location is Android emulator default (Mountain View, CA)
    const isEmulatorDefaultLocation = (lat: number, lon: number): boolean => {
        // Android emulator default is approximately 37.4220, -122.0840 (Mountain View, CA)
        const isNearMountainView =
            Math.abs(lat - 37.4220) < 0.01 &&
            Math.abs(lon - (-122.0840)) < 0.01;
        return isNearMountainView;
    };

    const getCurrentLocation = async () => {
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                console.log('Location permission denied, using default (Kuala Lumpur)');
                // Already initialized with defaults, just search
                return;
            }

            // Try multiple methods to get location
            try {
                // First try: Get last known location (faster)
                const lastKnown = await Location.getLastKnownPositionAsync();
                if (lastKnown) {
                    const { latitude, longitude } = lastKnown.coords;

                    // Skip if this is the Android emulator default location
                    if (isEmulatorDefaultLocation(latitude, longitude)) {
                        console.log('Detected emulator default location (Mountain View), using Kuala Lumpur instead');
                        // Keep the default Kuala Lumpur location
                        return;
                    }

                    console.log('Using last known location');
                    setCurrentLocation({ latitude, longitude });
                    reverseGeocode(latitude, longitude);
                    return;
                }
            } catch (lastKnownError) {
                console.log('Last known location not available');
            }

            // Second try: Get current position with timeout
            const locationPromise = Location.getCurrentPositionAsync({
                accuracy: Platform.OS === 'android' ? Location.Accuracy.Low : Location.Accuracy.Balanced,
            });

            // Add timeout to prevent hanging
            const timeoutPromise = new Promise<never>((_, reject) =>
                setTimeout(() => reject(new Error('Location timeout')), 15000)
            );

            try {
                const location = await Promise.race([locationPromise, timeoutPromise]);
                const { latitude, longitude } = location.coords;

                // Skip if this is the Android emulator default location
                if (isEmulatorDefaultLocation(latitude, longitude)) {
                    console.log('Detected emulator default location (Mountain View), using Kuala Lumpur instead');
                    // Keep the default Kuala Lumpur location
                    return;
                }

                setCurrentLocation({ latitude, longitude });
                reverseGeocode(latitude, longitude);
            } catch (locError) {
                console.log('Could not get precise location, using default (Kuala Lumpur)');
                // Keep default location already set
            }
        } catch (error) {
            console.log('Location error, using default (Kuala Lumpur):', error);
            // Keep default location already set
        }
    };

    const reverseGeocode = async (lat: number, lon: number) => {
        try {
            const address = await Location.reverseGeocodeAsync({
                latitude: lat,
                longitude: lon,
            });

            if (address[0]) {
                const addr = address[0];
                const city = addr.city || addr.district || 'Unknown';
                const region = addr.region || addr.country || '';
                setLocationAddress(`${city}, ${region} `);
            } else {
                setLocationAddress('Location found');
            }
        } catch {
            setLocationAddress('Location found');
        }
    };

    const [refreshing, setRefreshing] = useState(false);

    const [isUsingMockData, setIsUsingMockData] = useState(false);

    const fetchJobs = async (isRefetch = false) => {
        if (!currentLocation) return;

        if (!isRefetch) setIsLoading(true);
        try {
            const filters: JobSearchFilters = {
                query: searchQuery || undefined,
                latitude: currentLocation.latitude,
                longitude: currentLocation.longitude,
                radius_km: radiusKm,
                job_type: jobType === 'all' ? undefined : jobType,
                match_skills: matchSkills,
                match_availability: matchAvailability,
            };

            const response = await jobService.searchJobs(filters);

            // Always use the results if we got any
            if (response.data && response.data.results) {
                setJobs(response.data.results);
                updateMapMarkers(response.data.results);
                setIsUsingMockData(!response.success);
            } else {
                setJobs([]);
                setIsUsingMockData(false);
            }
        } catch (error) {
            console.error('Error searching jobs:', error);
            // Don't show alert on every error - just log it
            // The mock data fallback in jobService will handle it
            setJobs([]);
        } finally {
            setIsLoading(false);
            setRefreshing(false);
        }
    };

    const searchJobs = () => {
        fetchJobs(false);
    };

    const onRefresh = () => {
        setRefreshing(true);
        fetchJobs(true);
    };

    const searchLocationSuggestions = async (query: string) => {
        if (query.length < 3) {
            setLocationSuggestions([]);
            return;
        }

        setIsSearchingLocation(true);
        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`,
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
        setCurrentLocation({ latitude: lat, longitude: lon });
        setLocationAddress(suggestion.display_name.split(',').slice(0, 2).join(', '));
        setShowLocationModal(false);
        setLocationSearch('');
        setLocationSuggestions([]);
    };

    const updateMapMarkers = (jobsList: Job[]) => {
        if (!webViewRef.current || !currentLocation) return;

        const markersData = jobsList.map(job => ({
            id: job.id,
            lat: job.location.latitude,
            lng: job.location.longitude,
            title: job.title,
            company: job.company_name,
            type: job.job_type,
        }));

        webViewRef.current.injectJavaScript(`
            updateMarkers(${JSON.stringify(markersData)}, ${currentLocation.latitude}, ${currentLocation.longitude});
            true;
        `);
    };

    const handleMapMessage = (event: any) => {
        try {
            const data = JSON.parse(event.nativeEvent.data);
            if (data.type === 'jobSelected') {
                const job = jobs.find(j => j.id === data.jobId);
                if (job) {
                    setSelectedJob(job);
                    setShowJobDetailModal(true);
                }
            }
        } catch (error) {
            console.log('Map message:', event.nativeEvent.data);
        }
    };

    // Open job detail modal
    const openJobDetail = (job: Job) => {
        setSelectedJob(job);
        setShowJobDetailModal(true);
    };

    // Handle job application
    const handleApplyForJob = async () => {
        if (!selectedJob) return;

        console.log('Submitting application for job:', selectedJob.id);
        setIsApplying(true);
        try {
            await jobService.applyForJob(selectedJob.id, {
                application_type: applicationType,
                cover_letter: coverLetter || undefined,
                proposed_rate: applicationType === 'bid' && proposedRate ? parseFloat(proposedRate) : undefined,
            });

            console.log('Application submitted successfully');
            // Add to applied jobs set immediately
            setAppliedJobIds(prev => new Set([...prev, selectedJob.id]));

            Alert.alert('Success!', 'Your application has been submitted successfully.', [
                {
                    text: 'OK',
                    onPress: () => {
                        setShowApplyModal(false);
                        setShowJobDetailModal(false);
                        setCoverLetter('');
                        setProposedRate('');
                        setApplicationType('apply');
                    }
                }
            ]);
        } catch (error: any) {
            console.error('Application error:', error?.response?.data || error?.message || error);
            let errorMessage = 'Failed to submit application. Please try again.';

            if (error?.response?.data) {
                const data = error.response.data;
                if (typeof data === 'string') {
                    errorMessage = data;
                } else if (data.detail) {
                    errorMessage = data.detail;
                } else if (data.non_field_errors) {
                    errorMessage = data.non_field_errors.join(', ');
                } else if (data.job) {
                    errorMessage = Array.isArray(data.job) ? data.job.join(', ') : data.job;
                } else {
                    // Try to extract first error message from the response
                    const firstKey = Object.keys(data)[0];
                    if (firstKey) {
                        const value = data[firstKey];
                        errorMessage = Array.isArray(value) ? value.join(', ') : String(value);
                    }
                }
            } else if (error?.message) {
                errorMessage = error.message;
            }

            Alert.alert('Application Failed', errorMessage);
        } finally {
            setIsApplying(false);
        }
    };

    const getLeafletHTML = () => {
        const isDark = colors.background === '#0A0A0A' || colors.background === '#121212';
        const tileUrl = isDark
            ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
            : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

        return `
<!DOCTYPE html>
<html>
<head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        html, body, #map { width: 100%; height: 100%; }
        .job-marker {
            background: ${colors.primary};
            border: 2px solid white;
            border-radius: 50%;
            width: 28px;
            height: 28px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: bold;
            font-size: 12px;
            box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        }
        .user-marker {
            background: #3B82F6;
            border: 3px solid white;
            border-radius: 50%;
            width: 20px;
            height: 20px;
            box-shadow: 0 0 0 8px rgba(59, 130, 246, 0.3);
        }
        .leaflet-popup-content-wrapper {
            background: ${isDark ? '#1A1A1A' : '#FFFFFF'};
            color: ${isDark ? '#FFFFFF' : '#000000'};
            border-radius: 12px;
            padding: 0;
        }
        .leaflet-popup-content {
            margin: 12px;
        }
        .popup-title { font-weight: 700; font-size: 14px; margin-bottom: 4px; }
        .popup-company { font-size: 12px; color: ${isDark ? '#888' : '#666'}; margin-bottom: 6px; }
        .popup-type {
            display: inline-block;
            background: ${colors.primaryLight || '#6366F120'};
            color: ${colors.primary};
            font-size: 10px;
            padding: 2px 8px;
            border-radius: 10px;
            font-weight: 600;
        }
    </style>
</head>
<body>
    <div id="map"></div>
    <script>
        // Initialize map centered on Kuala Lumpur, Malaysia
        var map = L.map('map', { zoomControl: false }).setView([${DEFAULT_LOCATION.latitude}, ${DEFAULT_LOCATION.longitude}], 12);

        L.tileLayer('${tileUrl}', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 18,
        }).addTo(map);

        L.control.zoom({ position: 'bottomright' }).addTo(map);

        var markers = [];
        var userMarker = null;

        function createJobIcon() {
            return L.divIcon({
                className: 'job-marker-wrapper',
                html: '<div class="job-marker">💼</div>',
                iconSize: [28, 28],
                iconAnchor: [14, 14],
            });
        }

        function createUserIcon() {
            return L.divIcon({
                className: 'user-marker-wrapper',
                html: '<div class="user-marker"></div>',
                iconSize: [20, 20],
                iconAnchor: [10, 10],
            });
        }

        function updateMarkers(jobs, userLat, userLng) {
            // Clear existing markers
            markers.forEach(m => map.removeLayer(m));
            markers = [];

            // Add user marker
            if (userMarker) map.removeLayer(userMarker);
            userMarker = L.marker([userLat, userLng], { icon: createUserIcon() })
                .addTo(map)
                .bindPopup('<div class="popup-title">📍 You are here</div>');

            // Add job markers
            jobs.forEach(job => {
                var marker = L.marker([job.lat, job.lng], { icon: createJobIcon() })
                    .addTo(map)
                    .bindPopup(
                        '<div class="popup-title">' + job.title + '</div>' +
                        '<div class="popup-company">' + job.company + '</div>' +
                        '<div class="popup-type">' + job.type.replace('_', ' ').toUpperCase() + '</div>'
                    );

                marker.on('click', function() {
                    window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'jobSelected', jobId: job.id }));
                });

                markers.push(marker);
            });

            // Fit bounds to show all markers
            if (jobs.length > 0) {
                var group = new L.featureGroup([userMarker, ...markers]);
                map.fitBounds(group.getBounds().pad(0.1));
            } else {
                map.setView([userLat, userLng], 12);
            }
        }

        // Initial message to parent
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'mapReady' }));
    </script>
</body>
</html>
        `;
    };

    const formatSalary = (job: Job) => {
        if (!job.salary_min && !job.salary_max) return 'Salary not specified';
        return formatSalaryRange(
            job.salary_min,
            job.salary_max,
            preferredCurrency,
            job.salary_period
        );
    };

    const formatDistance = (km?: number) => {
        if (!km) return '';
        return km < 1 ? `${Math.round(km * 1000)}m away` : `${km.toFixed(1)}km away`;
    };

    // Format time from HH:MM:SS to readable format
    const formatTime = (time: string) => {
        if (!time) return '';
        const [hours, minutes] = time.split(':');
        const h = parseInt(hours, 10);
        const ampm = h >= 12 ? 'PM' : 'AM';
        const hour12 = h % 12 || 12;
        return `${hour12}:${minutes} ${ampm}`;
    };

    // Get day name from day_of_week number (0=Monday)
    const getDayName = (day: number) => {
        const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        return days[day] || '';
    };

    // Check if selected job has been applied to
    const isJobApplied = (jobId: number) => appliedJobIds.has(jobId);

    const jobTypeOptions = [
        { key: 'all', label: t('jobs.allTypes') },
        { key: 'full_time', label: t('jobs.fullTime') },
        { key: 'part_time', label: t('jobs.partTime') },
        { key: 'contract', label: t('jobs.contract') },
    ];

    const radiusOptions = [10, 25, 50, 100, 200];

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
            {/* Header - Location Bar */}
            <TouchableOpacity
                style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: colors.card,
                    marginHorizontal: 16,
                    marginTop: 8,
                    padding: 12,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: colors.cardBorder,
                }}
                onPress={() => setShowLocationModal(true)}
            >
                <Text style={{ fontSize: 20, marginRight: 10 }}>📍</Text>
                <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 12, color: colors.textSecondary }}>Your Location</Text>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }} numberOfLines={1}>
                        {locationAddress}
                    </Text>
                </View>
                <Text style={{ fontSize: 18, color: colors.textMuted }}>›</Text>
            </TouchableOpacity>

            {/* Search & Filters */}
            <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                    <View style={{ flex: 1, position: 'relative' }}>
                        <TextInput
                            style={{
                                backgroundColor: colors.inputBackground,
                                borderWidth: 1,
                                borderColor: colors.border,
                                borderRadius: 12,
                                paddingHorizontal: 16,
                                paddingVertical: 12,
                                fontSize: 14,
                                color: colors.text,
                            }}
                            placeholder="Search jobs..."
                            placeholderTextColor={colors.textMuted}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            onSubmitEditing={searchJobs}
                            returnKeyType="search"
                        />
                    </View>
                    <TouchableOpacity
                        style={{
                            backgroundColor: showFilters ? colors.primary : colors.card,
                            padding: 12,
                            borderRadius: 12,
                            borderWidth: 1,
                            borderColor: showFilters ? colors.primary : colors.cardBorder,
                            justifyContent: 'center',
                        }}
                        onPress={() => setShowFilters(!showFilters)}
                    >
                        <Text style={{ fontSize: 18 }}>⚙️</Text>
                    </TouchableOpacity>
                </View>

                {/* Filter Panel */}
                {showFilters && (
                    <View style={{
                        backgroundColor: colors.card,
                        borderRadius: 12,
                        padding: 16,
                        marginTop: 12,
                        borderWidth: 1,
                        borderColor: colors.cardBorder,
                    }}>
                        {/* Job Type */}
                        <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textSecondary, marginBottom: 8 }}>{t('jobs.jobType')}</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                            <View style={{ flexDirection: 'row', gap: 8 }}>
                                {jobTypeOptions.map(option => (
                                    <TouchableOpacity
                                        key={option.key}
                                        style={{
                                            paddingHorizontal: 16,
                                            paddingVertical: 8,
                                            borderRadius: 20,
                                            backgroundColor: jobType === option.key ? colors.primary : colors.inputBackground,
                                            borderWidth: 1,
                                            borderColor: jobType === option.key ? colors.primary : colors.border,
                                        }}
                                        onPress={() => setJobType(option.key as any)}
                                    >
                                        <Text style={{
                                            fontSize: 13,
                                            fontWeight: '600',
                                            color: jobType === option.key ? '#FFFFFF' : colors.text,
                                        }}>
                                            {option.label}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </ScrollView>

                        {/* Radius */}
                        <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textSecondary, marginBottom: 8 }}>{t('jobs.searchRadius')}</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                            <View style={{ flexDirection: 'row', gap: 8 }}>
                                {radiusOptions.map(r => (
                                    <TouchableOpacity
                                        key={r}
                                        style={{
                                            paddingHorizontal: 16,
                                            paddingVertical: 8,
                                            borderRadius: 20,
                                            backgroundColor: radiusKm === r ? colors.primary : colors.inputBackground,
                                            borderWidth: 1,
                                            borderColor: radiusKm === r ? colors.primary : colors.border,
                                        }}
                                        onPress={() => setRadiusKm(r)}
                                    >
                                        <Text style={{
                                            fontSize: 13,
                                            fontWeight: '600',
                                            color: radiusKm === r ? '#FFFFFF' : colors.text,
                                        }}>
                                            {r} km
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </ScrollView>

                        {/* Match Options */}
                        <View style={{ flexDirection: 'row', gap: 12 }}>
                            <TouchableOpacity
                                style={{
                                    flex: 1,
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    gap: 8,
                                    padding: 12,
                                    borderRadius: 12,
                                    backgroundColor: matchSkills ? colors.primaryLight : colors.inputBackground,
                                    borderWidth: 1,
                                    borderColor: matchSkills ? colors.primary : colors.border,
                                }}
                                onPress={() => setMatchSkills(!matchSkills)}
                            >
                                <View style={{
                                    width: 20,
                                    height: 20,
                                    borderRadius: 4,
                                    borderWidth: 2,
                                    borderColor: matchSkills ? colors.primary : colors.textMuted,
                                    backgroundColor: matchSkills ? colors.primary : 'transparent',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}>
                                    {matchSkills && <Text style={{ color: '#FFF', fontSize: 12 }}>✓</Text>}
                                </View>
                                <Text style={{ fontSize: 12, color: colors.text, fontWeight: '500' }}>{t('jobs.matchMySkills')}</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={{
                                    flex: 1,
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    gap: 8,
                                    padding: 12,
                                    borderRadius: 12,
                                    backgroundColor: matchAvailability ? colors.primaryLight : colors.inputBackground,
                                    borderWidth: 1,
                                    borderColor: matchAvailability ? colors.primary : colors.border,
                                }}
                                onPress={() => setMatchAvailability(!matchAvailability)}
                            >
                                <View style={{
                                    width: 20,
                                    height: 20,
                                    borderRadius: 4,
                                    borderWidth: 2,
                                    borderColor: matchAvailability ? colors.primary : colors.textMuted,
                                    backgroundColor: matchAvailability ? colors.primary : 'transparent',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}>
                                    {matchAvailability && <Text style={{ color: '#FFF', fontSize: 12 }}>✓</Text>}
                                </View>
                                <Text style={{ fontSize: 12, color: colors.text, fontWeight: '500' }}>{t('jobs.matchAvailability')}</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Search Button */}
                        <TouchableOpacity
                            style={{
                                backgroundColor: colors.primary,
                                paddingVertical: 12,
                                borderRadius: 12,
                                alignItems: 'center',
                                marginTop: 16,
                            }}
                            onPress={searchJobs}
                        >
                            <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 14 }}>{t('jobs.searchJobs')}</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>

            {/* Map */}
            <View style={{ flex: 1, marginTop: 12 }}>
                <WebView
                    ref={webViewRef}
                    source={{ html: getLeafletHTML() }}
                    style={{ flex: 1 }}
                    onMessage={handleMapMessage}
                    javaScriptEnabled={true}
                    domStorageEnabled={true}
                    startInLoadingState={true}
                    renderLoading={() => (
                        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
                            <ActivityIndicator size="large" color={colors.primary} />
                        </View>
                    )}
                />

                {/* Jobs count badge */}
                <View style={{
                    position: 'absolute',
                    top: 12,
                    left: 12,
                    backgroundColor: colors.card,
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 20,
                    borderWidth: 1,
                    borderColor: colors.cardBorder,
                }}>
                    <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text }}>
                        {isLoading ? t('common.loading') : t('jobs.jobsFound', { count: jobs.length })}
                    </Text>
                </View>
            </View>

            {/* Job List (bottom sheet style) */}
            <View style={{
                backgroundColor: colors.card,
                borderTopLeftRadius: 20,
                borderTopRightRadius: 20,
                maxHeight: SCREEN_HEIGHT * 0.4,
                borderWidth: 1,
                borderBottomWidth: 0,
                borderColor: colors.cardBorder,
            }}>
                <View style={{ alignItems: 'center', paddingVertical: 8 }}>
                    <View style={{ width: 40, height: 4, backgroundColor: colors.textMuted, borderRadius: 2 }} />
                </View>

                {isLoading ? (
                    <View style={{ padding: 40, alignItems: 'center' }}>
                        <ActivityIndicator size="large" color={colors.primary} />
                    </View>
                ) : jobs.length === 0 ? (
                    <View style={{ padding: 40, alignItems: 'center' }}>
                        <Text style={{ fontSize: 40, marginBottom: 12 }}>📭</Text>
                        <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text }}>{t('jobs.noJobsFound')}</Text>
                        <Text style={{ fontSize: 14, color: colors.textSecondary, marginTop: 4 }}>{t('jobs.tryAdjustingFilters')}</Text>
                    </View>
                ) : (
                    <FlatList
                        data={jobs}
                        keyExtractor={(item) => item.uuid}
                        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
                        refreshControl={
                            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
                        }
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                style={{
                                    backgroundColor: selectedJob?.id === item.id ? colors.primaryLight : colors.inputBackground,
                                    borderRadius: 12,
                                    padding: 16,
                                    marginBottom: 12,
                                    borderWidth: 1,
                                    borderColor: selectedJob?.id === item.id ? colors.primary : colors.border,
                                }}
                                onPress={() => openJobDetail(item)}
                            >
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>{item.title}</Text>
                                        <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 2 }}>{item.company_name}</Text>
                                    </View>
                                    <View style={{ flexDirection: 'row', gap: 6 }}>
                                        {isJobApplied(item.id) && (
                                            <View style={{ backgroundColor: colors.successLight, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }}>
                                                <Text style={{ fontSize: 10, fontWeight: '600', color: colors.success }}>{t('jobs.applied')}</Text>
                                            </View>
                                        )}
                                        {item.is_remote && (
                                            <View style={{ backgroundColor: colors.primaryLight, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }}>
                                                <Text style={{ fontSize: 10, fontWeight: '600', color: colors.primary }}>REMOTE</Text>
                                            </View>
                                        )}
                                    </View>
                                </View>

                                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
                                    <View style={{ backgroundColor: colors.primaryLight, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 }}>
                                        <Text style={{ fontSize: 11, fontWeight: '600', color: colors.primary }}>
                                            {item.job_type.replace('_', ' ').toUpperCase()}
                                        </Text>
                                    </View>
                                    <View style={{ backgroundColor: colors.warningLight, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 }}>
                                        <Text style={{ fontSize: 11, fontWeight: '600', color: colors.warning }}>{formatSalary(item)}</Text>
                                    </View>
                                    {item.distance_km !== undefined && item.distance_km > 0 && (
                                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                            <Text style={{ fontSize: 11, color: colors.textSecondary }}>
                                                {`📍 ${formatDistance(item.distance_km)}`}
                                            </Text>
                                        </View>
                                    )}
                                </View>

                                {item.required_skills.length > 0 && (
                                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
                                        {item.required_skills.slice(0, 3).map(skill => (
                                            <View key={skill.id} style={{
                                                backgroundColor: colors.background,
                                                paddingHorizontal: 8,
                                                paddingVertical: 3,
                                                borderRadius: 8,
                                            }}>
                                                <Text style={{ fontSize: 10, color: colors.textSecondary }}>{skill.name}</Text>
                                            </View>
                                        ))}
                                        {item.required_skills.length > 3 && (
                                            <Text style={{ fontSize: 10, color: colors.textMuted, alignSelf: 'center' }}>
                                                +{item.required_skills.length - 3} more
                                            </Text>
                                        )}
                                    </View>
                                )}
                            </TouchableOpacity>
                        )}
                    />
                )}
            </View>

            {/* Location Search Modal */}
            <Modal visible={showLocationModal} animationType="slide" transparent>
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <View style={{
                        flex: 1,
                        marginTop: 100,
                        backgroundColor: colors.background,
                        borderTopLeftRadius: 20,
                        borderTopRightRadius: 20,
                        padding: 20,
                    }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                            <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>Change Location</Text>
                            <TouchableOpacity onPress={() => setShowLocationModal(false)}>
                                <Text style={{ fontSize: 24, color: colors.textMuted }}>×</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
                            <TextInput
                                style={{
                                    flex: 1,
                                    backgroundColor: colors.inputBackground,
                                    borderWidth: 1,
                                    borderColor: colors.border,
                                    borderRadius: 12,
                                    paddingHorizontal: 16,
                                    paddingVertical: 12,
                                    fontSize: 14,
                                    color: colors.text,
                                }}
                                placeholder="Search for a location..."
                                placeholderTextColor={colors.textMuted}
                                value={locationSearch}
                                onChangeText={(text) => {
                                    setLocationSearch(text);
                                    searchLocationSuggestions(text);
                                }}
                                autoFocus
                            />
                        </View>

                        <TouchableOpacity
                            style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                gap: 12,
                                padding: 16,
                                backgroundColor: colors.card,
                                borderRadius: 12,
                                marginBottom: 16,
                                borderWidth: 1,
                                borderColor: colors.cardBorder,
                            }}
                            onPress={getCurrentLocation}
                        >
                            <Text style={{ fontSize: 20 }}>📍</Text>
                            <Text style={{ fontSize: 14, fontWeight: '600', color: colors.primary }}>Use my current location</Text>
                        </TouchableOpacity>

                        {isSearchingLocation && (
                            <ActivityIndicator size="small" color={colors.primary} style={{ marginBottom: 12 }} />
                        )}

                        <FlatList
                            data={locationSuggestions}
                            keyExtractor={(item) => item.place_id.toString()}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={{
                                        padding: 16,
                                        backgroundColor: colors.card,
                                        borderRadius: 12,
                                        marginBottom: 8,
                                        borderWidth: 1,
                                        borderColor: colors.cardBorder,
                                    }}
                                    onPress={() => selectLocation(item)}
                                >
                                    <Text style={{ fontSize: 14, color: colors.text }} numberOfLines={2}>{item.display_name}</Text>
                                </TouchableOpacity>
                            )}
                        />
                    </View>
                </View>
            </Modal>

            {/* Job Detail Modal - Contains both job details and application form */}
            <Modal visible={showJobDetailModal} animationType="slide">
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={{ flex: 1, backgroundColor: colors.background }}
                >
                    {/* Native-style Header */}
                    <View style={{
                        backgroundColor: colors.background,
                        paddingTop: Platform.OS === 'ios' ? 50 : 40,
                        borderBottomWidth: 1,
                        borderBottomColor: colors.border,
                    }}>
                        <View style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            paddingHorizontal: 16,
                            paddingBottom: 12,
                            minHeight: 44,
                        }}>
                            <TouchableOpacity
                                onPress={() => {
                                    if (showApplyModal) {
                                        // Go back to job details
                                        setShowApplyModal(false);
                                    } else {
                                        // Close modal entirely and reset state
                                        setShowJobDetailModal(false);
                                        setShowApplyModal(false);
                                        setCoverLetter('');
                                        setProposedRate('');
                                        setApplicationType('apply');
                                    }
                                }}
                                style={{
                                    width: 36,
                                    height: 36,
                                    borderRadius: 18,
                                    backgroundColor: colors.inputBackground,
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    marginRight: 12,
                                }}
                                activeOpacity={0.7}
                            >
                                <Text style={{ fontSize: 18, color: colors.text }}>←</Text>
                            </TouchableOpacity>
                            <View style={{ flex: 1 }}>
                                <Text style={{ fontSize: 17, fontWeight: '600', color: colors.text }} numberOfLines={1}>
                                    {showApplyModal
                                        ? (applicationType === 'bid' ? t('jobs.submitBid') : t('jobs.submitApplication'))
                                        : selectedJob?.title
                                    }
                                </Text>
                                <Text style={{ fontSize: 13, color: colors.textSecondary }}>
                                    {showApplyModal ? selectedJob?.title : selectedJob?.company_name}
                                </Text>
                            </View>
                            {!showApplyModal && (
                                <TouchableOpacity
                                    onPress={() => {
                                        setShowJobDetailModal(false);
                                        setShowApplyModal(false);
                                        setCoverLetter('');
                                        setProposedRate('');
                                        setApplicationType('apply');
                                    }}
                                    style={{
                                        width: 36,
                                        height: 36,
                                        borderRadius: 18,
                                        backgroundColor: colors.inputBackground,
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}
                                    activeOpacity={0.7}
                                >
                                    <Text style={{ fontSize: 18, color: colors.textMuted }}>×</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>

                    {selectedJob && !showApplyModal && (
                        <>
                            {/* Job Details View */}
                            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
                                {/* Job Type & Salary */}
                                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                                    <View style={{ backgroundColor: colors.primaryLight, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 }}>
                                        <Text style={{ fontSize: 12, fontWeight: '600', color: colors.primary }}>
                                            {selectedJob.job_type.replace('_', ' ').toUpperCase()}
                                        </Text>
                                    </View>
                                    <View style={{ backgroundColor: colors.warningLight, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 }}>
                                        <Text style={{ fontSize: 12, fontWeight: '600', color: colors.warning }}>
                                            {formatSalary(selectedJob)}
                                        </Text>
                                    </View>
                                    {selectedJob.is_remote && (
                                        <View style={{ backgroundColor: colors.successLight, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 }}>
                                            <Text style={{ fontSize: 12, fontWeight: '600', color: colors.success }}>REMOTE</Text>
                                        </View>
                                    )}
                                </View>

                                {/* Location */}
                                <View style={{
                                    backgroundColor: colors.card,
                                    padding: 16,
                                    borderRadius: 12,
                                    marginBottom: 16,
                                    borderWidth: 1,
                                    borderColor: colors.cardBorder
                                }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        <Text style={{ fontSize: 20, marginRight: 12 }}>📍</Text>
                                        <View style={{ flex: 1 }}>
                                            <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>
                                                {selectedJob.location.address}
                                            </Text>
                                            {selectedJob.distance_km !== undefined && selectedJob.distance_km > 0 && (
                                                <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>
                                                    {formatDistance(selectedJob.distance_km)}
                                                </Text>
                                            )}
                                        </View>
                                    </View>
                                </View>

                                {/* Description */}
                                <View style={{ marginBottom: 16 }}>
                                    <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 8 }}>{t('jobs.description')}</Text>
                                    <Text style={{ fontSize: 14, color: colors.textSecondary, lineHeight: 22 }}>
                                        {selectedJob.description}
                                    </Text>
                                </View>

                                {/* Required Skills */}
                                {selectedJob.required_skills.length > 0 && (
                                    <View style={{ marginBottom: 16 }}>
                                        <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 8 }}>{t('jobs.requiredSkills')}</Text>
                                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                                            {selectedJob.required_skills.map(skill => (
                                                <View key={skill.id} style={{
                                                    backgroundColor: colors.inputBackground,
                                                    paddingHorizontal: 12,
                                                    paddingVertical: 6,
                                                    borderRadius: 16,
                                                    borderWidth: 1,
                                                    borderColor: colors.border
                                                }}>
                                                    <Text style={{ fontSize: 12, color: colors.text }}>{skill.name}</Text>
                                                </View>
                                            ))}
                                        </View>
                                    </View>
                                )}

                                {/* Working Schedule */}
                                {selectedJob.shifts && selectedJob.shifts.length > 0 && (
                                    <View style={{ marginBottom: 16 }}>
                                        <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 8 }}>{t('jobs.workingSchedule')}</Text>
                                        <View style={{
                                            backgroundColor: colors.card,
                                            borderRadius: 12,
                                            padding: 12,
                                            borderWidth: 1,
                                            borderColor: colors.cardBorder
                                        }}>
                                            {selectedJob.shifts.map((shift, index) => (
                                                <View
                                                    key={shift.id}
                                                    style={{
                                                        flexDirection: 'row',
                                                        alignItems: 'center',
                                                        paddingVertical: 8,
                                                        borderBottomWidth: index < (selectedJob.shifts?.length || 0) - 1 ? 1 : 0,
                                                        borderBottomColor: colors.border
                                                    }}
                                                >
                                                    <Text style={{ fontSize: 18, marginRight: 10 }}>🕐</Text>
                                                    <View style={{ flex: 1 }}>
                                                        <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>
                                                            {shift.date
                                                                ? new Date(shift.date).toLocaleDateString('en-MY', { weekday: 'short', month: 'short', day: 'numeric' })
                                                                : shift.day_of_week !== undefined
                                                                    ? getDayName(shift.day_of_week)
                                                                    : 'Flexible'
                                                            }
                                                        </Text>
                                                        <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 2 }}>
                                                            {formatTime(shift.start_time)} - {formatTime(shift.end_time)}
                                                        </Text>
                                                    </View>
                                                    {shift.hourly_rate && (
                                                        <View style={{ alignItems: 'flex-end' }}>
                                                            <Text style={{ fontSize: 13, fontWeight: '600', color: colors.primary }}>
                                                                {getCurrencySymbol(preferredCurrency)}{shift.hourly_rate}/hr
                                                            </Text>
                                                            {shift.headcount_needed && (
                                                                <Text style={{ fontSize: 11, color: colors.textMuted }}>
                                                                    {shift.headcount_needed} {shift.headcount_needed === 1 ? 'spot' : 'spots'}
                                                                </Text>
                                                            )}
                                                        </View>
                                                    )}
                                                </View>
                                            ))}
                                        </View>
                                    </View>
                                )}

                                {/* Posted Date */}
                                <View style={{ flexDirection: 'row', alignItems: 'center', paddingTop: 16, borderTopWidth: 1, borderTopColor: colors.border }}>
                                    <Text style={{ fontSize: 12, color: colors.textMuted }}>
                                        Posted: {new Date(selectedJob.posted_at).toLocaleDateString('en-MY', {
                                            year: 'numeric',
                                            month: 'long',
                                            day: 'numeric'
                                        })}
                                    </Text>
                                </View>
                            </ScrollView>

                            {/* Apply Button */}
                            <View style={{
                                padding: 16,
                                borderTopWidth: 1,
                                borderTopColor: colors.border,
                                backgroundColor: colors.background,
                                paddingBottom: Platform.OS === 'ios' ? 30 : 16,
                            }}>
                                {isJobApplied(selectedJob.id) ? (
                                    <View
                                        style={{
                                            backgroundColor: colors.successLight,
                                            paddingVertical: 16,
                                            borderRadius: 12,
                                            alignItems: 'center',
                                            flexDirection: 'row',
                                            justifyContent: 'center',
                                            gap: 8,
                                        }}
                                    >
                                        <Text style={{ fontSize: 18 }}>✓</Text>
                                        <Text style={{ fontSize: 16, fontWeight: '700', color: colors.success }}>
                                            {t('jobs.alreadyApplied')}
                                        </Text>
                                    </View>
                                ) : (
                                    <TouchableOpacity
                                        style={{
                                            backgroundColor: colors.primary,
                                            paddingVertical: 16,
                                            borderRadius: 12,
                                            alignItems: 'center',
                                        }}
                                        onPress={() => setShowApplyModal(true)}
                                        activeOpacity={0.7}
                                    >
                                        <Text style={{ fontSize: 16, fontWeight: '700', color: '#FFFFFF' }}>
                                            {t('jobs.applyNow')}
                                        </Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        </>
                    )}

                    {selectedJob && showApplyModal && (
                        <>
                            {/* Application Form View */}
                            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
                                {/* Job Summary Card */}
                                <View style={{
                                    backgroundColor: colors.card,
                                    padding: 16,
                                    borderRadius: 12,
                                    marginBottom: 20,
                                    borderWidth: 1,
                                    borderColor: colors.cardBorder
                                }}>
                                    <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>{selectedJob.company_name}</Text>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 8 }}>
                                        <View style={{ backgroundColor: colors.primaryLight, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 }}>
                                            <Text style={{ fontSize: 11, color: colors.primary, fontWeight: '500' }}>
                                                {selectedJob.job_type.replace('_', ' ').toUpperCase()}
                                            </Text>
                                        </View>
                                        <Text style={{ fontSize: 13, color: colors.textSecondary }}>{formatSalary(selectedJob)}</Text>
                                    </View>
                                </View>

                                {/* Application Type - Apply or Bid */}
                                <View style={{ marginBottom: 20 }}>
                                    <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 8 }}>
                                        {t('jobs.applicationType')}
                                    </Text>
                                    <View style={{ flexDirection: 'row', gap: 12 }}>
                                        <TouchableOpacity
                                            style={{
                                                flex: 1,
                                                padding: 12,
                                                borderRadius: 12,
                                                borderWidth: 2,
                                                borderColor: applicationType === 'apply' ? colors.primary : colors.border,
                                                backgroundColor: applicationType === 'apply' ? colors.primaryLight : colors.inputBackground,
                                                alignItems: 'center',
                                            }}
                                            onPress={() => setApplicationType('apply')}
                                        >
                                            <Text style={{ fontSize: 20, marginBottom: 4 }}>📝</Text>
                                            <Text style={{ fontSize: 13, fontWeight: '600', color: applicationType === 'apply' ? colors.primary : colors.text }}>
                                                {t('jobs.apply')}
                                            </Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={{
                                                flex: 1,
                                                padding: 12,
                                                borderRadius: 12,
                                                borderWidth: 2,
                                                borderColor: applicationType === 'bid' ? colors.primary : colors.border,
                                                backgroundColor: applicationType === 'bid' ? colors.primaryLight : colors.inputBackground,
                                                alignItems: 'center',
                                            }}
                                            onPress={() => setApplicationType('bid')}
                                        >
                                            <Text style={{ fontSize: 20, marginBottom: 4 }}>💰</Text>
                                            <Text style={{ fontSize: 13, fontWeight: '600', color: applicationType === 'bid' ? colors.primary : colors.text }}>
                                                {t('jobs.bid')}
                                            </Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>

                                {/* Proposed Rate (for bidding) */}
                                {applicationType === 'bid' && (
                                    <View style={{ marginBottom: 20 }}>
                                        <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 8 }}>
                                            Proposed Hourly Rate ({getCurrencySymbol(preferredCurrency)})
                                        </Text>
                                        <TextInput
                                            style={{
                                                backgroundColor: colors.inputBackground,
                                                borderWidth: 1,
                                                borderColor: colors.border,
                                                borderRadius: 12,
                                                padding: 12,
                                                fontSize: 16,
                                                color: colors.text,
                                            }}
                                            placeholder="e.g. 15"
                                            placeholderTextColor={colors.textMuted}
                                            keyboardType="numeric"
                                            value={proposedRate}
                                            onChangeText={setProposedRate}
                                        />
                                    </View>
                                )}

                                {/* Cover Letter */}
                                <View style={{ marginBottom: 20 }}>
                                    <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 8 }}>
                                        {t('jobs.coverLetterOptional')}
                                    </Text>
                                    <TextInput
                                        style={{
                                            backgroundColor: colors.inputBackground,
                                            borderWidth: 1,
                                            borderColor: colors.border,
                                            borderRadius: 12,
                                            padding: 12,
                                            fontSize: 14,
                                            color: colors.text,
                                            height: 120,
                                            textAlignVertical: 'top',
                                        }}
                                        placeholder={t('jobs.coverLetterPlaceholder')}
                                        placeholderTextColor={colors.textMuted}
                                        multiline
                                        value={coverLetter}
                                        onChangeText={setCoverLetter}
                                    />
                                </View>
                            </ScrollView>

                            {/* Submit Button */}
                            <View style={{
                                padding: 16,
                                borderTopWidth: 1,
                                borderTopColor: colors.border,
                                backgroundColor: colors.background,
                                paddingBottom: Platform.OS === 'ios' ? 30 : 16,
                            }}>
                                <TouchableOpacity
                                    style={{
                                        backgroundColor: isApplying || (applicationType === 'bid' && !proposedRate) ? colors.border : colors.primary,
                                        paddingVertical: 16,
                                        borderRadius: 12,
                                        alignItems: 'center',
                                    }}
                                    onPress={handleApplyForJob}
                                    disabled={isApplying || (applicationType === 'bid' && !proposedRate)}
                                    activeOpacity={0.7}
                                >
                                    {isApplying ? (
                                        <ActivityIndicator color="#FFFFFF" />
                                    ) : (
                                        <Text style={{ fontSize: 16, fontWeight: '700', color: '#FFFFFF' }}>
                                            {applicationType === 'bid' ? t('jobs.submitBid') : t('jobs.submitApplication')}
                                        </Text>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </>
                    )}
                </KeyboardAvoidingView>
            </Modal>
        </SafeAreaView>
    );
}
