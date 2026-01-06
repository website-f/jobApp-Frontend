import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    Modal,
    ActivityIndicator,
    Alert,
    Dimensions,
    Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useColors } from '../../store';
import { Ionicons } from '@expo/vector-icons';
import profileService, { Availability } from '../../services/profileService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DAY_SIZE = (SCREEN_WIDTH - 48) / 7;

interface TimeSlot {
    id: string;
    start: string;
    end: string;
}

interface DayAvailability {
    date: string;
    isAvailable: boolean;
    timeSlots: TimeSlot[];
}

interface WeekdayDefault {
    enabled: boolean;
    start: string;
    end: string;
}

interface AppliedJob {
    date: string;
    jobTitle: string;
    status: string;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const TIME_OPTIONS = [
    '06:00', '06:30', '07:00', '07:30', '08:00', '08:30', '09:00', '09:30',
    '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00', '13:30',
    '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30',
    '18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00', '21:30', '22:00',
];

const generateId = () => Math.random().toString(36).substring(2, 9);

export default function AvailabilityScreen() {
    const navigation = useNavigation();
    const colors = useColors();

    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [selectedDates, setSelectedDates] = useState<Set<string>>(new Set());
    const [availability, setAvailability] = useState<Map<string, DayAvailability>>(new Map());
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [showTimeModal, setShowTimeModal] = useState(false);
    const [editingDate, setEditingDate] = useState<string | null>(null);
    const [editingSlotId, setEditingSlotId] = useState<string | null>(null);
    const [tempStartTime, setTempStartTime] = useState('09:00');
    const [tempEndTime, setTempEndTime] = useState('17:00');
    const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);

    // Weekly default settings - individual day configuration
    const [weeklyDefaults, setWeeklyDefaults] = useState<WeekdayDefault[]>([
        { enabled: false, start: '09:00', end: '17:00' }, // Sunday
        { enabled: true, start: '09:00', end: '17:00' },  // Monday
        { enabled: true, start: '09:00', end: '17:00' },  // Tuesday
        { enabled: true, start: '09:00', end: '17:00' },  // Wednesday
        { enabled: true, start: '09:00', end: '17:00' },  // Thursday
        { enabled: true, start: '09:00', end: '17:00' },  // Friday
        { enabled: false, start: '09:00', end: '17:00' }, // Saturday
    ]);
    const [showWeeklyModal, setShowWeeklyModal] = useState(false);
    const [editingWeekday, setEditingWeekday] = useState<number | null>(null);

    // Applied jobs for showing busy dates
    const [appliedJobs, setAppliedJobs] = useState<AppliedJob[]>([]);
    const [showAppliedDates, setShowAppliedDates] = useState(true);

    // Load availability from backend on mount
    useEffect(() => {
        loadAvailability();
    }, []);

    const loadAvailability = async () => {
        setIsLoading(true);
        try {
            const data = await profileService.getAvailability();
            // Transform backend format to weekly defaults
            if (data && Array.isArray(data)) {
                const newDefaults = [...weeklyDefaults];
                data.forEach((item: Availability) => {
                    const dayIndex = item.day_of_week;
                    if (dayIndex >= 0 && dayIndex < 7) {
                        newDefaults[dayIndex] = {
                            enabled: item.is_available,
                            start: item.start_time || '09:00',
                            end: item.end_time || '17:00',
                        };
                    }
                });
                setWeeklyDefaults(newDefaults);

                // Also apply to calendar for current month
                applyWeeklyDefaultsToCalendar(newDefaults);
            }
        } catch (error) {
            console.error('Failed to load availability:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const applyWeeklyDefaultsToCalendar = (defaults: WeekdayDefault[]) => {
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();
        const lastDay = new Date(year, month + 1, 0).getDate();
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const newAvailability = new Map<string, DayAvailability>();
        for (let i = 1; i <= lastDay; i++) {
            const date = new Date(year, month, i);
            if (date < today) continue;
            const dow = date.getDay();
            const dayDefault = defaults[dow];
            const dateStr = formatDate(date);

            if (dayDefault.enabled) {
                newAvailability.set(dateStr, {
                    date: dateStr,
                    isAvailable: true,
                    timeSlots: [{ id: generateId(), start: dayDefault.start, end: dayDefault.end }],
                });
            }
        }
        setAvailability(newAvailability);
    };

    // Generate calendar days
    const getCalendarDays = () => {
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();

        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const startOffset = firstDay.getDay();

        const days: (Date | null)[] = [];

        // Previous month days
        for (let i = 0; i < startOffset; i++) {
            days.push(null);
        }

        // Current month days
        for (let i = 1; i <= lastDay.getDate(); i++) {
            days.push(new Date(year, month, i));
        }

        return days;
    };

    const formatDate = (date: Date): string => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const isToday = (date: Date): boolean => {
        const today = new Date();
        return date.toDateString() === today.toDateString();
    };

    const isPast = (date: Date): boolean => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return date < today;
    };

    const handleDatePress = (date: Date) => {
        if (isPast(date)) return;

        const dateStr = formatDate(date);

        if (isMultiSelectMode) {
            const newSelected = new Set(selectedDates);
            if (newSelected.has(dateStr)) {
                newSelected.delete(dateStr);
            } else {
                newSelected.add(dateStr);
            }
            setSelectedDates(newSelected);
        } else {
            setEditingDate(dateStr);
            setEditingSlotId(null);
            setTempStartTime('09:00');
            setTempEndTime('17:00');
            setShowTimeModal(true);
        }
    };

    const handleLongPress = (date: Date) => {
        if (isPast(date)) return;
        setIsMultiSelectMode(true);
        const dateStr = formatDate(date);
        setSelectedDates(new Set([dateStr]));
    };

    const markSelectedAsUnavailable = () => {
        const newAvailability = new Map(availability);
        selectedDates.forEach(dateStr => {
            newAvailability.set(dateStr, {
                date: dateStr,
                isAvailable: false,
                timeSlots: [],
            });
        });
        setAvailability(newAvailability);
        setSelectedDates(new Set());
        setIsMultiSelectMode(false);
    };

    const markSelectedAsAvailable = () => {
        const newAvailability = new Map(availability);
        selectedDates.forEach(dateStr => {
            newAvailability.set(dateStr, {
                date: dateStr,
                isAvailable: true,
                timeSlots: [{ id: generateId(), start: '09:00', end: '17:00' }],
            });
        });
        setAvailability(newAvailability);
        setSelectedDates(new Set());
        setIsMultiSelectMode(false);
    };

    const addTimeSlot = () => {
        if (!editingDate) return;

        if (tempStartTime >= tempEndTime) {
            Alert.alert('Invalid Time', 'Start time must be before end time');
            return;
        }

        const newAvailability = new Map(availability);
        const existing = newAvailability.get(editingDate);
        const newSlot: TimeSlot = { id: generateId(), start: tempStartTime, end: tempEndTime };

        if (existing) {
            // Check for overlapping slots
            const hasOverlap = existing.timeSlots.some(slot => {
                if (editingSlotId && slot.id === editingSlotId) return false;
                return (tempStartTime < slot.end && tempEndTime > slot.start);
            });

            if (hasOverlap) {
                Alert.alert('Overlap', 'This time slot overlaps with an existing one');
                return;
            }

            if (editingSlotId) {
                // Update existing slot
                const updatedSlots = existing.timeSlots.map(slot =>
                    slot.id === editingSlotId ? { ...slot, start: tempStartTime, end: tempEndTime } : slot
                );
                newAvailability.set(editingDate, { ...existing, timeSlots: updatedSlots });
            } else {
                // Add new slot
                newAvailability.set(editingDate, {
                    ...existing,
                    isAvailable: true,
                    timeSlots: [...existing.timeSlots, newSlot].sort((a, b) => a.start.localeCompare(b.start)),
                });
            }
        } else {
            newAvailability.set(editingDate, {
                date: editingDate,
                isAvailable: true,
                timeSlots: [newSlot],
            });
        }

        setAvailability(newAvailability);
        setEditingSlotId(null);
        setTempStartTime('09:00');
        setTempEndTime('17:00');
    };

    const removeTimeSlot = (slotId: string) => {
        if (!editingDate) return;

        const newAvailability = new Map(availability);
        const existing = newAvailability.get(editingDate);

        if (existing) {
            const updatedSlots = existing.timeSlots.filter(slot => slot.id !== slotId);
            if (updatedSlots.length === 0) {
                newAvailability.delete(editingDate);
            } else {
                newAvailability.set(editingDate, { ...existing, timeSlots: updatedSlots });
            }
            setAvailability(newAvailability);
        }
    };

    const editTimeSlot = (slot: TimeSlot) => {
        setEditingSlotId(slot.id);
        setTempStartTime(slot.start);
        setTempEndTime(slot.end);
    };

    const markAsUnavailable = () => {
        if (!editingDate) return;

        const newAvailability = new Map(availability);
        newAvailability.set(editingDate, {
            date: editingDate,
            isAvailable: false,
            timeSlots: [],
        });
        setAvailability(newAvailability);
        setShowTimeModal(false);
        setEditingDate(null);
    };

    const clearDay = () => {
        if (!editingDate) return;

        const newAvailability = new Map(availability);
        newAvailability.delete(editingDate);
        setAvailability(newAvailability);
        setShowTimeModal(false);
        setEditingDate(null);
    };

    const previousMonth = () => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
    };

    const nextMonth = () => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
    };

    const saveAvailability = async () => {
        setIsSaving(true);
        try {
            // Transform weeklyDefaults to backend format
            const schedules = weeklyDefaults.map((day, index) => ({
                day_of_week: index as 0 | 1 | 2 | 3 | 4 | 5 | 6,
                is_available: day.enabled,
                start_time: day.enabled ? day.start : null,
                end_time: day.enabled ? day.end : null,
            }));

            await profileService.updateAvailability(schedules);
            Alert.alert('Saved', 'Your availability has been updated');
        } catch (error) {
            console.error('Failed to save availability:', error);
            Alert.alert('Error', 'Failed to save availability');
        } finally {
            setIsSaving(false);
        }
    };

    // Quick Action: Set current week (Mon-Fri 9-5)
    const setCurrentWeek = () => {
        const today = new Date();
        const newAvailability = new Map(availability);
        for (let i = 0; i < 7; i++) {
            const date = new Date(today);
            date.setDate(today.getDate() + i);
            if (isPast(date)) continue;
            const dow = date.getDay();
            if (dow !== 0 && dow !== 6) { // Weekdays only
                const dateStr = formatDate(date);
                newAvailability.set(dateStr, {
                    date: dateStr,
                    isAvailable: true,
                    timeSlots: [{ id: generateId(), start: '09:00', end: '17:00' }],
                });
            }
        }
        setAvailability(newAvailability);
        Alert.alert('Done', 'Set weekdays (Mon-Fri) 9AM-5PM for the next 7 days');
    };

    // Quick Action: Set full month weekdays
    const setFullMonthWeekdays = () => {
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();
        const lastDay = new Date(year, month + 1, 0).getDate();
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const newAvailability = new Map(availability);
        for (let i = 1; i <= lastDay; i++) {
            const date = new Date(year, month, i);
            if (date < today) continue;
            const dow = date.getDay();
            if (dow !== 0 && dow !== 6) {
                const dateStr = formatDate(date);
                newAvailability.set(dateStr, {
                    date: dateStr,
                    isAvailable: true,
                    timeSlots: [{ id: generateId(), start: '09:00', end: '17:00' }],
                });
            }
        }
        setAvailability(newAvailability);
        Alert.alert('Done', 'Set all weekdays in this month (9AM-5PM)');
    };

    // Quick Action: Clear all
    const clearAll = () => {
        Alert.alert(
            'Clear All',
            'Remove all availability settings?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Clear',
                    style: 'destructive',
                    onPress: () => {
                        setAvailability(new Map());
                        Alert.alert('Cleared', 'All availability has been removed');
                    },
                },
            ]
        );
    };

    // Check if date has applied job
    const getAppliedJobForDate = (dateStr: string): AppliedJob | undefined => {
        return appliedJobs.find(job => job.date === dateStr);
    };

    const getDayStyle = (date: Date) => {
        const dateStr = formatDate(date);
        const dayInfo = availability.get(dateStr);
        const isSelected = selectedDates.has(dateStr);
        const appliedJob = showAppliedDates ? getAppliedJobForDate(dateStr) : undefined;

        let backgroundColor = 'transparent';
        let borderColor = 'transparent';
        let textColor = colors.text;
        let hasJob = false;

        if (isPast(date)) {
            textColor = colors.textMuted;
        } else if (isSelected) {
            backgroundColor = colors.primary;
            textColor = '#FFFFFF';
        } else if (appliedJob) {
            // Applied job takes priority - show in warning color
            backgroundColor = '#FEF3C7'; // amber light
            borderColor = '#F59E0B'; // amber
            textColor = '#B45309';
            hasJob = true;
        } else if (dayInfo) {
            if (dayInfo.isAvailable) {
                backgroundColor = colors.successLight;
                borderColor = colors.success;
                textColor = colors.success;
            } else {
                backgroundColor = colors.errorLight;
                borderColor = colors.error;
                textColor = colors.error;
            }
        }

        if (isToday(date) && !isSelected) {
            borderColor = colors.primary;
        }

        return { backgroundColor, borderColor, textColor, hasJob, appliedJob };
    };

    const calendarDays = getCalendarDays();
    const currentDayInfo = editingDate ? availability.get(editingDate) : null;

    // Show loading spinner while fetching initial data
    if (isLoading) {
        return (
            <SafeAreaView style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={{ marginTop: 12, color: colors.textSecondary }}>Loading availability...</Text>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
            {/* Header */}
            <View style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingHorizontal: 20,
                paddingVertical: 16,
                borderBottomWidth: 1,
                borderBottomColor: colors.border,
            }}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Text style={{ fontSize: 16, color: colors.primary, fontWeight: '600' }}>← Back</Text>
                </TouchableOpacity>
                <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>My Availability</Text>
                <TouchableOpacity onPress={saveAvailability} disabled={isSaving}>
                    {isSaving ? (
                        <ActivityIndicator size="small" color={colors.primary} />
                    ) : (
                        <Text style={{ fontSize: 16, color: colors.primary, fontWeight: '600' }}>Save</Text>
                    )}
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ padding: 16 }}>
                {/* Instructions */}
                <View style={{
                    backgroundColor: colors.primaryLight,
                    borderRadius: 12,
                    padding: 16,
                    marginBottom: 16,
                }}>
                    <Text style={{ fontSize: 14, color: colors.primary, fontWeight: '600', marginBottom: 4 }}>
                        📅 Manage Your Availability
                    </Text>
                    <Text style={{ fontSize: 12, color: colors.primary, opacity: 0.8 }}>
                        Tap a date to add time slots. Long press to select multiple dates.
                    </Text>
                </View>

                {/* Legend */}
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 12, marginBottom: 16 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <View style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: colors.successLight, borderWidth: 1, borderColor: colors.success }} />
                        <Text style={{ fontSize: 11, color: colors.textSecondary }}>Available</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <View style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: colors.errorLight, borderWidth: 1, borderColor: colors.error }} />
                        <Text style={{ fontSize: 11, color: colors.textSecondary }}>Unavailable</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <View style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: '#FEF3C7', borderWidth: 1, borderColor: '#F59E0B' }} />
                        <Text style={{ fontSize: 11, color: colors.textSecondary }}>Applied Job</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <View style={{ width: 12, height: 12, borderRadius: 6, borderWidth: 2, borderColor: colors.primary }} />
                        <Text style={{ fontSize: 11, color: colors.textSecondary }}>Today</Text>
                    </View>
                </View>

                {/* Weekly Default Settings Card */}
                <TouchableOpacity
                    style={{
                        backgroundColor: colors.card,
                        borderRadius: 12,
                        padding: 16,
                        marginBottom: 16,
                        borderWidth: 1,
                        borderColor: colors.cardBorder,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                    }}
                    onPress={() => setShowWeeklyModal(true)}
                >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                        <View style={{
                            width: 44,
                            height: 44,
                            borderRadius: 12,
                            backgroundColor: colors.primaryLight,
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}>
                            <Ionicons name="calendar-outline" size={24} color={colors.primary} />
                        </View>
                        <View>
                            <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text }}>Weekly Schedule</Text>
                            <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                                Set default hours for each day
                            </Text>
                        </View>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
                </TouchableOpacity>

                {/* Calendar Card */}
                <View style={{
                    backgroundColor: colors.card,
                    borderRadius: 16,
                    padding: 16,
                    borderWidth: 1,
                    borderColor: colors.cardBorder,
                }}>
                    {/* Month Navigation */}
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                        <TouchableOpacity
                            style={{ padding: 8, borderRadius: 8, backgroundColor: colors.inputBackground }}
                            onPress={previousMonth}
                        >
                            <Text style={{ fontSize: 18, color: colors.text }}>‹</Text>
                        </TouchableOpacity>
                        <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>
                            {MONTHS[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                        </Text>
                        <TouchableOpacity
                            style={{ padding: 8, borderRadius: 8, backgroundColor: colors.inputBackground }}
                            onPress={nextMonth}
                        >
                            <Text style={{ fontSize: 18, color: colors.text }}>›</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Weekday Headers */}
                    <View style={{ flexDirection: 'row', marginBottom: 8 }}>
                        {WEEKDAYS.map(day => (
                            <View key={day} style={{ width: DAY_SIZE, alignItems: 'center' }}>
                                <Text style={{
                                    fontSize: 12,
                                    fontWeight: '600',
                                    color: day === 'Sun' || day === 'Sat' ? colors.error : colors.textSecondary,
                                }}>
                                    {day}
                                </Text>
                            </View>
                        ))}
                    </View>

                    {/* Calendar Grid */}
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                        {calendarDays.map((date, index) => {
                            if (!date) {
                                return (
                                    <View key={`empty-${index}`} style={{ width: DAY_SIZE, height: DAY_SIZE }} />
                                );
                            }

                            const { backgroundColor, borderColor, textColor, hasJob, appliedJob } = getDayStyle(date);
                            const dateStr = formatDate(date);
                            const dayInfo = availability.get(dateStr);
                            const slotsCount = dayInfo?.isAvailable ? dayInfo.timeSlots.length : 0;

                            return (
                                <TouchableOpacity
                                    key={dateStr}
                                    style={{
                                        width: DAY_SIZE,
                                        height: DAY_SIZE,
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}
                                    onPress={() => handleDatePress(date)}
                                    onLongPress={() => handleLongPress(date)}
                                    disabled={isPast(date)}
                                >
                                    <View style={{
                                        width: 40,
                                        height: 40,
                                        borderRadius: 20,
                                        backgroundColor,
                                        borderWidth: isToday(date) ? 2 : (borderColor !== 'transparent' ? 1 : 0),
                                        borderColor,
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}>
                                        <Text style={{
                                            fontSize: 14,
                                            fontWeight: isToday(date) ? '700' : '500',
                                            color: textColor,
                                        }}>
                                            {date.getDate()}
                                        </Text>
                                        {hasJob && (
                                            <View style={{
                                                position: 'absolute',
                                                bottom: 2,
                                                width: 6,
                                                height: 6,
                                                borderRadius: 3,
                                                backgroundColor: '#F59E0B',
                                            }} />
                                        )}
                                    </View>
                                    {hasJob ? (
                                        <Text style={{ fontSize: 8, color: '#B45309', marginTop: 2 }}>
                                            Job
                                        </Text>
                                    ) : slotsCount > 0 ? (
                                        <Text style={{ fontSize: 8, color: colors.success, marginTop: 2 }}>
                                            {slotsCount} slot{slotsCount > 1 ? 's' : ''}
                                        </Text>
                                    ) : null}
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </View>

                {/* Multi-Select Actions */}
                {isMultiSelectMode && selectedDates.size > 0 && (
                    <View style={{
                        backgroundColor: colors.card,
                        borderRadius: 12,
                        padding: 16,
                        marginTop: 16,
                        borderWidth: 1,
                        borderColor: colors.primary,
                    }}>
                        <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 12, textAlign: 'center' }}>
                            {selectedDates.size} date{selectedDates.size > 1 ? 's' : ''} selected
                        </Text>
                        <View style={{ flexDirection: 'row', gap: 12 }}>
                            <TouchableOpacity
                                style={{
                                    flex: 1,
                                    backgroundColor: colors.success,
                                    paddingVertical: 12,
                                    borderRadius: 10,
                                    alignItems: 'center',
                                }}
                                onPress={markSelectedAsAvailable}
                            >
                                <Text style={{ color: '#FFF', fontWeight: '600', fontSize: 13 }}>✓ Available</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={{
                                    flex: 1,
                                    backgroundColor: colors.error,
                                    paddingVertical: 12,
                                    borderRadius: 10,
                                    alignItems: 'center',
                                }}
                                onPress={markSelectedAsUnavailable}
                            >
                                <Text style={{ color: '#FFF', fontWeight: '600', fontSize: 13 }}>✕ Not Available</Text>
                            </TouchableOpacity>
                        </View>
                        <TouchableOpacity
                            style={{ marginTop: 12, alignItems: 'center' }}
                            onPress={() => {
                                setSelectedDates(new Set());
                                setIsMultiSelectMode(false);
                            }}
                        >
                            <Text style={{ color: colors.textSecondary }}>Cancel Selection</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* Quick Actions */}
                <View style={{ marginTop: 16 }}>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 12 }}>Quick Actions</Text>
                    <View style={{ flexDirection: 'row', gap: 12 }}>
                        <TouchableOpacity
                            style={{
                                flex: 1,
                                backgroundColor: colors.card,
                                padding: 16,
                                borderRadius: 12,
                                borderWidth: 1,
                                borderColor: colors.cardBorder,
                                alignItems: 'center',
                            }}
                            onPress={setCurrentWeek}
                        >
                            <Text style={{ fontSize: 24, marginBottom: 8 }}>📆</Text>
                            <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text }}>Set Week</Text>
                            <Text style={{ fontSize: 10, color: colors.textSecondary }}>Mon-Fri 9-5</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={{
                                flex: 1,
                                backgroundColor: colors.card,
                                padding: 16,
                                borderRadius: 12,
                                borderWidth: 1,
                                borderColor: colors.cardBorder,
                                alignItems: 'center',
                            }}
                            onPress={setFullMonthWeekdays}
                        >
                            <Text style={{ fontSize: 24, marginBottom: 8 }}>📅</Text>
                            <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text }}>Full Month</Text>
                            <Text style={{ fontSize: 10, color: colors.textSecondary }}>All weekdays</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={{
                                flex: 1,
                                backgroundColor: colors.card,
                                padding: 16,
                                borderRadius: 12,
                                borderWidth: 1,
                                borderColor: colors.cardBorder,
                                alignItems: 'center',
                            }}
                            onPress={clearAll}
                        >
                            <Text style={{ fontSize: 24, marginBottom: 8 }}>🗑️</Text>
                            <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text }}>Clear All</Text>
                            <Text style={{ fontSize: 10, color: colors.textSecondary }}>Reset all</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Upcoming Availability Summary */}
                <View style={{ marginTop: 24, marginBottom: 40 }}>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 12 }}>Upcoming Availability</Text>
                    {Array.from(availability.entries())
                        .filter(([date, info]) => new Date(date) >= new Date() && info.isAvailable)
                        .sort((a, b) => a[0].localeCompare(b[0]))
                        .slice(0, 5)
                        .map(([date, info]) => {
                            const d = new Date(date);
                            return (
                                <TouchableOpacity
                                    key={date}
                                    style={{
                                        backgroundColor: colors.card,
                                        borderRadius: 12,
                                        padding: 14,
                                        marginBottom: 8,
                                        borderWidth: 1,
                                        borderColor: colors.cardBorder,
                                    }}
                                    onPress={() => {
                                        setEditingDate(date);
                                        setEditingSlotId(null);
                                        setTempStartTime('09:00');
                                        setTempEndTime('17:00');
                                        setShowTimeModal(true);
                                    }}
                                >
                                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                                            <View style={{
                                                width: 44,
                                                height: 44,
                                                borderRadius: 10,
                                                backgroundColor: colors.successLight,
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                            }}>
                                                <Text style={{ fontSize: 16, fontWeight: '700', color: colors.success }}>{d.getDate()}</Text>
                                                <Text style={{ fontSize: 9, color: colors.success }}>{MONTHS[d.getMonth()].slice(0, 3)}</Text>
                                            </View>
                                            <View>
                                                <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>
                                                    {WEEKDAYS[d.getDay()]}, {MONTHS[d.getMonth()].slice(0, 3)} {d.getDate()}
                                                </Text>
                                                <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                                                    {info.timeSlots.length} time slot{info.timeSlots.length > 1 ? 's' : ''}
                                                </Text>
                                            </View>
                                        </View>
                                        <Text style={{ fontSize: 12, color: colors.primary, fontWeight: '600' }}>Edit</Text>
                                    </View>
                                    {/* Show time slots */}
                                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
                                        {info.timeSlots.map(slot => (
                                            <View key={slot.id} style={{
                                                backgroundColor: colors.successLight,
                                                paddingHorizontal: 8,
                                                paddingVertical: 4,
                                                borderRadius: 8,
                                            }}>
                                                <Text style={{ fontSize: 11, color: colors.success, fontWeight: '500' }}>
                                                    {slot.start} - {slot.end}
                                                </Text>
                                            </View>
                                        ))}
                                    </View>
                                </TouchableOpacity>
                            );
                        })}
                    {Array.from(availability.entries()).filter(([date, info]) => new Date(date) >= new Date() && info.isAvailable).length === 0 && (
                        <View style={{
                            backgroundColor: colors.card,
                            borderRadius: 12,
                            padding: 24,
                            alignItems: 'center',
                            borderWidth: 1,
                            borderColor: colors.cardBorder,
                        }}>
                            <Text style={{ fontSize: 32, marginBottom: 8 }}>📭</Text>
                            <Text style={{ fontSize: 14, color: colors.textSecondary }}>No upcoming availability set</Text>
                        </View>
                    )}
                </View>
            </ScrollView>

            {/* Time Slot Modal */}
            <Modal visible={showTimeModal} animationType="slide" transparent>
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
                    <View style={{
                        backgroundColor: colors.background,
                        borderTopLeftRadius: 24,
                        borderTopRightRadius: 24,
                        padding: 24,
                        maxHeight: '85%',
                    }}>
                        <View style={{ alignItems: 'center', marginBottom: 8 }}>
                            <View style={{ width: 40, height: 4, backgroundColor: colors.textMuted, borderRadius: 2 }} />
                        </View>

                        {editingDate && (
                            <ScrollView showsVerticalScrollIndicator={false}>
                                <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text, textAlign: 'center', marginBottom: 4 }}>
                                    {new Date(editingDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                                </Text>
                                <Text style={{ fontSize: 12, color: colors.textSecondary, textAlign: 'center', marginBottom: 20 }}>
                                    Add or edit your available time slots
                                </Text>

                                {/* Existing Time Slots */}
                                {currentDayInfo && currentDayInfo.timeSlots.length > 0 && (
                                    <View style={{ marginBottom: 20 }}>
                                        <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 10 }}>Current Time Slots</Text>
                                        {currentDayInfo.timeSlots.map(slot => (
                                            <View key={slot.id} style={{
                                                flexDirection: 'row',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                backgroundColor: editingSlotId === slot.id ? colors.primaryLight : colors.card,
                                                borderRadius: 10,
                                                padding: 12,
                                                marginBottom: 8,
                                                borderWidth: editingSlotId === slot.id ? 2 : 1,
                                                borderColor: editingSlotId === slot.id ? colors.primary : colors.cardBorder,
                                            }}>
                                                <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>
                                                    {slot.start} - {slot.end}
                                                </Text>
                                                <View style={{ flexDirection: 'row', gap: 12 }}>
                                                    <TouchableOpacity onPress={() => editTimeSlot(slot)}>
                                                        <Text style={{ fontSize: 12, color: colors.primary, fontWeight: '600' }}>Edit</Text>
                                                    </TouchableOpacity>
                                                    <TouchableOpacity onPress={() => removeTimeSlot(slot.id)}>
                                                        <Text style={{ fontSize: 12, color: colors.error, fontWeight: '600' }}>Remove</Text>
                                                    </TouchableOpacity>
                                                </View>
                                            </View>
                                        ))}
                                    </View>
                                )}

                                {/* Add/Edit Time Slot */}
                                <View style={{
                                    backgroundColor: colors.card,
                                    borderRadius: 12,
                                    padding: 16,
                                    marginBottom: 20,
                                    borderWidth: 1,
                                    borderColor: colors.cardBorder,
                                }}>
                                    <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 12 }}>
                                        {editingSlotId ? 'Edit Time Slot' : 'Add New Time Slot'}
                                    </Text>

                                    {/* Time Selection */}
                                    <View style={{ flexDirection: 'row', gap: 16, marginBottom: 16 }}>
                                        <View style={{ flex: 1 }}>
                                            <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textSecondary, marginBottom: 8 }}>Start Time</Text>
                                            <ScrollView style={{ maxHeight: 120, backgroundColor: colors.inputBackground, borderRadius: 10 }}>
                                                {TIME_OPTIONS.map(time => (
                                                    <TouchableOpacity
                                                        key={`start-${time}`}
                                                        style={{
                                                            padding: 10,
                                                            backgroundColor: tempStartTime === time ? colors.primary : 'transparent',
                                                            borderRadius: 6,
                                                            marginHorizontal: 4,
                                                            marginVertical: 2,
                                                        }}
                                                        onPress={() => setTempStartTime(time)}
                                                    >
                                                        <Text style={{
                                                            fontSize: 13,
                                                            fontWeight: tempStartTime === time ? '600' : '400',
                                                            color: tempStartTime === time ? '#FFF' : colors.text,
                                                            textAlign: 'center',
                                                        }}>
                                                            {time}
                                                        </Text>
                                                    </TouchableOpacity>
                                                ))}
                                            </ScrollView>
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textSecondary, marginBottom: 8 }}>End Time</Text>
                                            <ScrollView style={{ maxHeight: 120, backgroundColor: colors.inputBackground, borderRadius: 10 }}>
                                                {TIME_OPTIONS.map(time => (
                                                    <TouchableOpacity
                                                        key={`end-${time}`}
                                                        style={{
                                                            padding: 10,
                                                            backgroundColor: tempEndTime === time ? colors.primary : 'transparent',
                                                            borderRadius: 6,
                                                            marginHorizontal: 4,
                                                            marginVertical: 2,
                                                        }}
                                                        onPress={() => setTempEndTime(time)}
                                                    >
                                                        <Text style={{
                                                            fontSize: 13,
                                                            fontWeight: tempEndTime === time ? '600' : '400',
                                                            color: tempEndTime === time ? '#FFF' : colors.text,
                                                            textAlign: 'center',
                                                        }}>
                                                            {time}
                                                        </Text>
                                                    </TouchableOpacity>
                                                ))}
                                            </ScrollView>
                                        </View>
                                    </View>

                                    {/* Duration Display */}
                                    <View style={{
                                        backgroundColor: colors.primaryLight,
                                        borderRadius: 10,
                                        padding: 10,
                                        marginBottom: 12,
                                        alignItems: 'center',
                                    }}>
                                        <Text style={{ fontSize: 14, color: colors.primary, fontWeight: '600' }}>
                                            {tempStartTime} → {tempEndTime}
                                        </Text>
                                    </View>

                                    <TouchableOpacity
                                        style={{
                                            backgroundColor: colors.primary,
                                            paddingVertical: 12,
                                            borderRadius: 10,
                                            alignItems: 'center',
                                        }}
                                        onPress={addTimeSlot}
                                    >
                                        <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 14 }}>
                                            {editingSlotId ? '✓ Update Slot' : '+ Add Time Slot'}
                                        </Text>
                                    </TouchableOpacity>

                                    {editingSlotId && (
                                        <TouchableOpacity
                                            style={{ marginTop: 8, alignItems: 'center' }}
                                            onPress={() => {
                                                setEditingSlotId(null);
                                                setTempStartTime('09:00');
                                                setTempEndTime('17:00');
                                            }}
                                        >
                                            <Text style={{ color: colors.textSecondary, fontSize: 13 }}>Cancel Edit</Text>
                                        </TouchableOpacity>
                                    )}
                                </View>

                                {/* Action Buttons */}
                                <View style={{ gap: 10, marginBottom: 20 }}>
                                    <TouchableOpacity
                                        style={{
                                            backgroundColor: colors.error,
                                            paddingVertical: 14,
                                            borderRadius: 12,
                                            alignItems: 'center',
                                        }}
                                        onPress={markAsUnavailable}
                                    >
                                        <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 14 }}>✕ Mark Day as Unavailable</Text>
                                    </TouchableOpacity>

                                    <View style={{ flexDirection: 'row', gap: 12 }}>
                                        <TouchableOpacity
                                            style={{
                                                flex: 1,
                                                backgroundColor: colors.card,
                                                paddingVertical: 14,
                                                borderRadius: 12,
                                                alignItems: 'center',
                                                borderWidth: 1,
                                                borderColor: colors.cardBorder,
                                            }}
                                            onPress={clearDay}
                                        >
                                            <Text style={{ color: colors.textSecondary, fontWeight: '600', fontSize: 14 }}>Clear Day</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={{
                                                flex: 1,
                                                backgroundColor: colors.primary,
                                                paddingVertical: 14,
                                                borderRadius: 12,
                                                alignItems: 'center',
                                            }}
                                            onPress={() => {
                                                setShowTimeModal(false);
                                                setEditingDate(null);
                                                setEditingSlotId(null);
                                            }}
                                        >
                                            <Text style={{ color: '#FFF', fontWeight: '600', fontSize: 14 }}>Done</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </ScrollView>
                        )}
                    </View>
                </View>
            </Modal>

            {/* Weekly Schedule Modal */}
            <Modal visible={showWeeklyModal} animationType="slide" transparent>
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
                    <View style={{
                        backgroundColor: colors.background,
                        borderTopLeftRadius: 24,
                        borderTopRightRadius: 24,
                        padding: 24,
                        maxHeight: '80%',
                    }}>
                        <View style={{ alignItems: 'center', marginBottom: 8 }}>
                            <View style={{ width: 40, height: 4, backgroundColor: colors.textMuted, borderRadius: 2 }} />
                        </View>

                        <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text, textAlign: 'center', marginBottom: 4 }}>
                            Weekly Schedule
                        </Text>
                        <Text style={{ fontSize: 12, color: colors.textSecondary, textAlign: 'center', marginBottom: 20 }}>
                            Set your default availability for each day of the week
                        </Text>

                        <ScrollView showsVerticalScrollIndicator={false}>
                            {WEEKDAYS.map((day, index) => {
                                const dayDefault = weeklyDefaults[index];
                                const fullDayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][index];

                                return (
                                    <View
                                        key={day}
                                        style={{
                                            backgroundColor: colors.card,
                                            borderRadius: 12,
                                            padding: 14,
                                            marginBottom: 10,
                                            borderWidth: 1,
                                            borderColor: dayDefault.enabled ? colors.success : colors.cardBorder,
                                        }}
                                    >
                                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                                                <View style={{
                                                    width: 40,
                                                    height: 40,
                                                    borderRadius: 10,
                                                    backgroundColor: dayDefault.enabled ? colors.successLight : colors.surfaceHover,
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                }}>
                                                    <Text style={{
                                                        fontSize: 12,
                                                        fontWeight: '700',
                                                        color: dayDefault.enabled ? colors.success : colors.textMuted,
                                                    }}>
                                                        {day}
                                                    </Text>
                                                </View>
                                                <View>
                                                    <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>
                                                        {fullDayName}
                                                    </Text>
                                                    {dayDefault.enabled && (
                                                        <Text style={{ fontSize: 12, color: colors.success }}>
                                                            {dayDefault.start} - {dayDefault.end}
                                                        </Text>
                                                    )}
                                                </View>
                                            </View>
                                            <Switch
                                                value={dayDefault.enabled}
                                                onValueChange={(value) => {
                                                    const newDefaults = [...weeklyDefaults];
                                                    newDefaults[index] = { ...newDefaults[index], enabled: value };
                                                    setWeeklyDefaults(newDefaults);
                                                }}
                                                trackColor={{ false: colors.surfaceHover, true: colors.success + '80' }}
                                                thumbColor={dayDefault.enabled ? colors.success : colors.textMuted}
                                            />
                                        </View>

                                        {/* Time selection when enabled */}
                                        {dayDefault.enabled && (
                                            <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
                                                <TouchableOpacity
                                                    style={{
                                                        flex: 1,
                                                        backgroundColor: colors.inputBackground,
                                                        borderRadius: 8,
                                                        padding: 10,
                                                        alignItems: 'center',
                                                    }}
                                                    onPress={() => {
                                                        // Simple time picker - cycle through common times
                                                        const times = ['06:00', '07:00', '08:00', '09:00', '10:00'];
                                                        const currentIdx = times.indexOf(dayDefault.start);
                                                        const nextIdx = (currentIdx + 1) % times.length;
                                                        const newDefaults = [...weeklyDefaults];
                                                        newDefaults[index] = { ...newDefaults[index], start: times[nextIdx] };
                                                        setWeeklyDefaults(newDefaults);
                                                    }}
                                                >
                                                    <Text style={{ fontSize: 10, color: colors.textMuted }}>Start</Text>
                                                    <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>{dayDefault.start}</Text>
                                                </TouchableOpacity>
                                                <TouchableOpacity
                                                    style={{
                                                        flex: 1,
                                                        backgroundColor: colors.inputBackground,
                                                        borderRadius: 8,
                                                        padding: 10,
                                                        alignItems: 'center',
                                                    }}
                                                    onPress={() => {
                                                        // Simple time picker - cycle through common times
                                                        const times = ['14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00'];
                                                        const currentIdx = times.indexOf(dayDefault.end);
                                                        const nextIdx = (currentIdx + 1) % times.length;
                                                        const newDefaults = [...weeklyDefaults];
                                                        newDefaults[index] = { ...newDefaults[index], end: times[nextIdx] };
                                                        setWeeklyDefaults(newDefaults);
                                                    }}
                                                >
                                                    <Text style={{ fontSize: 10, color: colors.textMuted }}>End</Text>
                                                    <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>{dayDefault.end}</Text>
                                                </TouchableOpacity>
                                            </View>
                                        )}
                                    </View>
                                );
                            })}

                            {/* Apply to Calendar Button */}
                            <TouchableOpacity
                                style={{
                                    backgroundColor: colors.primary,
                                    paddingVertical: 14,
                                    borderRadius: 12,
                                    alignItems: 'center',
                                    marginTop: 10,
                                    marginBottom: 20,
                                }}
                                onPress={() => {
                                    // Apply weekly defaults to the current month
                                    const year = currentMonth.getFullYear();
                                    const month = currentMonth.getMonth();
                                    const lastDay = new Date(year, month + 1, 0).getDate();
                                    const today = new Date();
                                    today.setHours(0, 0, 0, 0);

                                    const newAvailability = new Map(availability);
                                    for (let i = 1; i <= lastDay; i++) {
                                        const date = new Date(year, month, i);
                                        if (date < today) continue;
                                        const dow = date.getDay();
                                        const dayDefault = weeklyDefaults[dow];
                                        const dateStr = formatDate(date);

                                        if (dayDefault.enabled) {
                                            newAvailability.set(dateStr, {
                                                date: dateStr,
                                                isAvailable: true,
                                                timeSlots: [{ id: generateId(), start: dayDefault.start, end: dayDefault.end }],
                                            });
                                        }
                                    }
                                    setAvailability(newAvailability);
                                    setShowWeeklyModal(false);
                                    Alert.alert('Applied', 'Weekly schedule applied to the current month');
                                }}
                            >
                                <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 14 }}>Apply to This Month</Text>
                            </TouchableOpacity>
                        </ScrollView>

                        <TouchableOpacity
                            style={{
                                paddingVertical: 14,
                                alignItems: 'center',
                            }}
                            onPress={() => setShowWeeklyModal(false)}
                        >
                            <Text style={{ color: colors.textSecondary, fontWeight: '600', fontSize: 14 }}>Close</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}
