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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';
import { useColors, ThemeColors } from '../../store';
import jobService, { Job, JobSearchFilters } from '../../services/jobService';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface LocationSuggestion {
    place_id: number;
    display_name: string;
    lat: string;
    lon: string;
}

export default function BrowseJobsScreen() {
    const colors = useColors();
    const webViewRef = useRef<WebView>(null);

    // Location state
    const [currentLocation, setCurrentLocation] = useState<{ latitude: number; longitude: number } | null>(null);
    const [locationAddress, setLocationAddress] = useState('Getting location...');
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

    // Get current location on mount
    useEffect(() => {
        getCurrentLocation();
    }, []);

    // Search jobs when location or filters change
    useEffect(() => {
        if (currentLocation) {
            searchJobs();
        }
    }, [currentLocation, jobType, radiusKm, matchSkills, matchAvailability]);

    const getCurrentLocation = async () => {
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                setLocationAddress('San Francisco, CA (Default)');
                setCurrentLocation({ latitude: 37.7749, longitude: -122.4194 });
                return;
            }

            try {
                const location = await Location.getCurrentPositionAsync({
                    accuracy: Location.Accuracy.Balanced,
                });
                setCurrentLocation({
                    latitude: location.coords.latitude,
                    longitude: location.coords.longitude,
                });

                // Reverse geocode to get address
                try {
                    const address = await Location.reverseGeocodeAsync({
                        latitude: location.coords.latitude,
                        longitude: location.coords.longitude,
                    });

                    if (address[0]) {
                        const addr = address[0];
                        const city = addr.city || addr.district || 'Unknown';
                        const region = addr.region || addr.country || '';
                        setLocationAddress(`${city}, ${region}`);
                    } else {
                        setLocationAddress('Location found');
                    }
                } catch {
                    setLocationAddress('Location found');
                }
            } catch (locError) {
                // Location unavailable (common on emulator)
                console.log('Using default location (emulator mode)');
                setLocationAddress('San Francisco, CA (Demo)');
                setCurrentLocation({ latitude: 37.7749, longitude: -122.4194 });
            }
        } catch (error) {
            console.log('Using default location');
            setLocationAddress('San Francisco, CA (Demo)');
            setCurrentLocation({ latitude: 37.7749, longitude: -122.4194 });
        }
    };

    const searchJobs = async () => {
        if (!currentLocation) return;

        setIsLoading(true);
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
            if (response.success) {
                setJobs(response.data.results);
                updateMapMarkers(response.data.results);
            }
        } catch (error) {
            console.error('Error searching jobs:', error);
        } finally {
            setIsLoading(false);
        }
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
                if (job) setSelectedJob(job);
            }
        } catch (error) {
            console.log('Map message:', event.nativeEvent.data);
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
        var map = L.map('map', { zoomControl: false }).setView([37.7749, -122.4194], 10);
        
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
        if (!job.salary_min) return 'Salary not specified';
        const formatNum = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(0)}k` : n.toString();
        const period = job.salary_period === 'yearly' ? '/yr' : job.salary_period === 'hourly' ? '/hr' : '';
        if (job.salary_max) {
            return `$${formatNum(job.salary_min)} - $${formatNum(job.salary_max)}${period}`;
        }
        return `$${formatNum(job.salary_min)}${period}`;
    };

    const formatDistance = (km?: number) => {
        if (!km) return '';
        return km < 1 ? `${Math.round(km * 1000)}m away` : `${km.toFixed(1)}km away`;
    };

    const jobTypeOptions = [
        { key: 'all', label: 'All Types' },
        { key: 'full_time', label: 'Full Time' },
        { key: 'part_time', label: 'Part Time' },
        { key: 'contract', label: 'Contract' },
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
                        <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textSecondary, marginBottom: 8 }}>Job Type</Text>
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
                        <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textSecondary, marginBottom: 8 }}>Search Radius</Text>
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
                                <Text style={{ fontSize: 12, color: colors.text, fontWeight: '500' }}>Match my skills</Text>
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
                                <Text style={{ fontSize: 12, color: colors.text, fontWeight: '500' }}>Match availability</Text>
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
                            <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 14 }}>🔍 Search Jobs</Text>
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
                        {isLoading ? 'Loading...' : `${jobs.length} jobs found`}
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
                        <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text }}>No jobs found</Text>
                        <Text style={{ fontSize: 14, color: colors.textSecondary, marginTop: 4 }}>Try adjusting your filters</Text>
                    </View>
                ) : (
                    <FlatList
                        data={jobs}
                        keyExtractor={(item) => item.uuid}
                        contentContainerStyle={{ padding: 16 }}
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
                                onPress={() => setSelectedJob(item)}
                            >
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>{item.title}</Text>
                                        <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 2 }}>{item.company_name}</Text>
                                    </View>
                                    {item.is_remote && (
                                        <View style={{ backgroundColor: colors.successLight, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }}>
                                            <Text style={{ fontSize: 10, fontWeight: '600', color: colors.success }}>REMOTE</Text>
                                        </View>
                                    )}
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
        </SafeAreaView>
    );
}
