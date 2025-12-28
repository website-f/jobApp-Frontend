import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, TextInput, ScrollView, Alert } from 'react-native';
import { useColors } from '../store';
import { Calendar } from 'react-native-calendars';
import config from '../config';

interface ScheduleSelectorProps {
    type: 'full_time' | 'part_time';
    onChange: (schedule: any) => void;
}

interface DaySchedule {
    selected: boolean;
    startTime: string;
    endTime: string;
}

interface Shift {
    id: string;
    date: string;
    startTime: string;
    endTime: string;
    headcount: string;
    hourlyRate: string;
    completionReward: string;
}

const CURRENCY_SYMBOL = config.settings.currencySymbol;

// Generate unique ID for shifts
const generateId = () => Math.random().toString(36).substring(2, 9);

export default function ScheduleSelector({ type, onChange }: ScheduleSelectorProps) {
    const colors = useColors();

    // Full-time: day-by-day schedule with time slots
    const [daySchedules, setDaySchedules] = useState<Record<number, DaySchedule>>({
        0: { selected: false, startTime: '09:00', endTime: '18:00' },
        1: { selected: true, startTime: '09:00', endTime: '18:00' },
        2: { selected: true, startTime: '09:00', endTime: '18:00' },
        3: { selected: true, startTime: '09:00', endTime: '18:00' },
        4: { selected: true, startTime: '09:00', endTime: '18:00' },
        5: { selected: true, startTime: '09:00', endTime: '18:00' },
        6: { selected: false, startTime: '09:00', endTime: '18:00' },
    });

    // Part-time mode
    const [ptMode, setPtMode] = useState<'recurring' | 'specific'>('specific');

    // Recurring settings
    const [recurringDays, setRecurringDays] = useState<number[]>([]);
    const [recurringStart, setRecurringStart] = useState('09:00');
    const [recurringEnd, setRecurringEnd] = useState('17:00');
    const [recurringHeadcount, setRecurringHeadcount] = useState('1');
    const [recurringHourlyRate, setRecurringHourlyRate] = useState('');
    const [recurringReward, setRecurringReward] = useState('');

    // Specific dates with MULTIPLE SHIFTS per date
    const [selectedDates, setSelectedDates] = useState<Record<string, { selected: boolean; selectedColor: string }>>({});
    const [shifts, setShifts] = useState<Shift[]>([]);
    const [editingShift, setEditingShift] = useState<Shift | null>(null);

    const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const WEEKDAYS_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    // Update parent whenever schedule changes
    useEffect(() => {
        if (type === 'full_time') {
            const fullTimeShifts = Object.entries(daySchedules)
                .filter(([_, val]) => val.selected)
                .map(([day, val]) => ({
                    day_of_week: parseInt(day),
                    start_time: val.startTime,
                    end_time: val.endTime,
                }));
            onChange({ type: 'full_time', shifts: fullTimeShifts });
        }
    }, [daySchedules, type]);

    useEffect(() => {
        if (type === 'part_time') {
            if (ptMode === 'recurring') {
                const recurringShifts = recurringDays.map(day => ({
                    day_of_week: day,
                    start_time: recurringStart,
                    end_time: recurringEnd,
                    headcount_needed: parseInt(recurringHeadcount) || 1,
                    hourly_rate: parseFloat(recurringHourlyRate) || 0,
                    completion_reward: parseFloat(recurringReward) || 0,
                }));
                onChange({ type: 'part_time_recurring', shifts: recurringShifts });
            } else {
                // Specific dates - multiple shifts per date
                const specificShifts = shifts.map(shift => ({
                    date: shift.date,
                    start_time: shift.startTime,
                    end_time: shift.endTime,
                    headcount_needed: parseInt(shift.headcount) || 1,
                    hourly_rate: parseFloat(shift.hourlyRate) || 0,
                    completion_reward: parseFloat(shift.completionReward) || 0,
                }));
                onChange({ type: 'part_time_specific', shifts: specificShifts });
            }
        }
    }, [ptMode, recurringDays, recurringStart, recurringEnd, recurringHeadcount, recurringHourlyRate, recurringReward, shifts, type]);

    const toggleFullTimeDay = (dayIndex: number) => {
        setDaySchedules(prev => ({
            ...prev,
            [dayIndex]: { ...prev[dayIndex], selected: !prev[dayIndex].selected }
        }));
    };

    const updateFullTimeSchedule = (dayIndex: number, field: 'startTime' | 'endTime', value: string) => {
        setDaySchedules(prev => ({
            ...prev,
            [dayIndex]: { ...prev[dayIndex], [field]: value }
        }));
    };

    const toggleRecurringDay = (index: number) => {
        if (recurringDays.includes(index)) {
            setRecurringDays(recurringDays.filter(d => d !== index));
        } else {
            setRecurringDays([...recurringDays, index]);
        }
    };

    // Handle date selection on calendar
    const handleDayPress = (day: any) => {
        const dateStr = day.dateString;
        const newSelected = { ...selectedDates };

        if (newSelected[dateStr]) {
            // Remove date and all its shifts
            delete newSelected[dateStr];
            setShifts(shifts.filter(s => s.date !== dateStr));
        } else {
            // Add date with one default shift
            newSelected[dateStr] = { selected: true, selectedColor: colors.primary };
            const newShift: Shift = {
                id: generateId(),
                date: dateStr,
                startTime: '09:00',
                endTime: '17:00',
                headcount: '1',
                hourlyRate: '',
                completionReward: '',
            };
            setShifts([...shifts, newShift]);
        }
        setSelectedDates(newSelected);
    };

    // Add another shift to a date
    const addShiftToDate = (date: string) => {
        const newShift: Shift = {
            id: generateId(),
            date: date,
            startTime: '09:00',
            endTime: '17:00',
            headcount: '1',
            hourlyRate: '',
            completionReward: '',
        };
        setShifts([...shifts, newShift]);
    };

    // Remove a specific shift
    const removeShift = (shiftId: string) => {
        const shift = shifts.find(s => s.id === shiftId);
        if (!shift) return;

        const dateShifts = shifts.filter(s => s.date === shift.date);

        if (dateShifts.length === 1) {
            // Last shift for this date - also remove date selection
            const newSelected = { ...selectedDates };
            delete newSelected[shift.date];
            setSelectedDates(newSelected);
        }

        setShifts(shifts.filter(s => s.id !== shiftId));
    };

    // Update a shift
    const updateShift = (shiftId: string, field: keyof Shift, value: string) => {
        setShifts(shifts.map(s =>
            s.id === shiftId ? { ...s, [field]: value } : s
        ));
    };

    // Get shifts for a specific date
    const getShiftsForDate = (date: string) => shifts.filter(s => s.date === date);

    // Get unique selected dates sorted
    const getUniqueDates = () => {
        return Object.keys(selectedDates).sort();
    };

    // Full-Time UI
    if (type === 'full_time') {
        return (
            <View>
                <Text style={[styles.label, { color: colors.text }]}>Working Days & Hours</Text>
                <Text style={{ color: colors.textSecondary, fontSize: 12, marginBottom: 12 }}>
                    Select the days and set shift times for each day
                </Text>

                {WEEKDAYS_FULL.map((day, index) => (
                    <View key={day} style={{ marginBottom: 12 }}>
                        <TouchableOpacity
                            style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                paddingVertical: 8,
                            }}
                            onPress={() => toggleFullTimeDay(index)}
                        >
                            <View style={{
                                width: 22,
                                height: 22,
                                borderRadius: 4,
                                borderWidth: 2,
                                borderColor: daySchedules[index].selected ? colors.primary : colors.textMuted,
                                backgroundColor: daySchedules[index].selected ? colors.primary : 'transparent',
                                alignItems: 'center',
                                justifyContent: 'center',
                                marginRight: 10,
                            }}>
                                {daySchedules[index].selected && <Text style={{ color: '#FFF', fontSize: 12 }}>✓</Text>}
                            </View>
                            <Text style={{ color: colors.text, fontWeight: '600', flex: 1 }}>{day}</Text>
                        </TouchableOpacity>

                        {daySchedules[index].selected && (
                            <View style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                gap: 8,
                                marginLeft: 32,
                                marginTop: 4,
                            }}>
                                <TextInput
                                    style={[styles.timeInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.inputBackground }]}
                                    value={daySchedules[index].startTime}
                                    onChangeText={t => updateFullTimeSchedule(index, 'startTime', t)}
                                    placeholder="09:00"
                                    placeholderTextColor={colors.textMuted}
                                />
                                <Text style={{ color: colors.textSecondary }}>to</Text>
                                <TextInput
                                    style={[styles.timeInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.inputBackground }]}
                                    value={daySchedules[index].endTime}
                                    onChangeText={t => updateFullTimeSchedule(index, 'endTime', t)}
                                    placeholder="18:00"
                                    placeholderTextColor={colors.textMuted}
                                />
                            </View>
                        )}
                    </View>
                ))}
            </View>
        );
    }

    // Part-Time UI
    return (
        <View>
            {/* Mode Selector */}
            <View style={{ flexDirection: 'row', marginBottom: 16, backgroundColor: colors.inputBackground, borderRadius: 8, padding: 4 }}>
                <TouchableOpacity
                    style={{
                        flex: 1,
                        padding: 10,
                        alignItems: 'center',
                        borderRadius: 6,
                        backgroundColor: ptMode === 'specific' ? colors.card : 'transparent',
                        borderWidth: ptMode === 'specific' ? 1 : 0,
                        borderColor: colors.primary,
                    }}
                    onPress={() => setPtMode('specific')}
                >
                    <Text style={{ color: ptMode === 'specific' ? colors.primary : colors.text, fontWeight: '600', fontSize: 13 }}>
                        🗓️ Specific Dates
                    </Text>
                    <Text style={{ color: colors.textSecondary, fontSize: 10 }}>Multiple shifts per date</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={{
                        flex: 1,
                        padding: 10,
                        alignItems: 'center',
                        borderRadius: 6,
                        backgroundColor: ptMode === 'recurring' ? colors.card : 'transparent',
                        borderWidth: ptMode === 'recurring' ? 1 : 0,
                        borderColor: colors.primary,
                    }}
                    onPress={() => setPtMode('recurring')}
                >
                    <Text style={{ color: ptMode === 'recurring' ? colors.primary : colors.text, fontWeight: '600', fontSize: 13 }}>
                        📅 Recurring
                    </Text>
                    <Text style={{ color: colors.textSecondary, fontSize: 10 }}>Same days weekly</Text>
                </TouchableOpacity>
            </View>

            {ptMode === 'specific' ? (
                <View>
                    <Text style={{ color: colors.textSecondary, fontSize: 13, marginBottom: 12 }}>
                        Tap dates to add shifts. Each date can have multiple shifts with different rates.
                    </Text>

                    <Calendar
                        onDayPress={handleDayPress}
                        markedDates={selectedDates}
                        minDate={new Date().toISOString().split('T')[0]}
                        theme={{
                            backgroundColor: colors.card,
                            calendarBackground: colors.card,
                            textSectionTitleColor: colors.textSecondary,
                            selectedDayBackgroundColor: colors.primary,
                            selectedDayTextColor: '#ffffff',
                            todayTextColor: colors.primary,
                            dayTextColor: colors.text,
                            textDisabledColor: colors.textMuted,
                            monthTextColor: colors.text,
                            arrowColor: colors.primary,
                        }}
                    />

                    {/* Shifts List */}
                    {getUniqueDates().length > 0 && (
                        <View style={{ marginTop: 16 }}>
                            <Text style={{ color: colors.text, fontWeight: '700', fontSize: 16, marginBottom: 12 }}>
                                Manage Shifts ({shifts.length} total)
                            </Text>

                            {getUniqueDates().map(date => {
                                const dateShifts = getShiftsForDate(date);
                                const dateLabel = new Date(date).toLocaleDateString('en-MY', {
                                    weekday: 'short', day: 'numeric', month: 'short'
                                });

                                return (
                                    <View key={date} style={{ marginBottom: 16 }}>
                                        {/* Date Header */}
                                        <View style={{
                                            flexDirection: 'row',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            backgroundColor: colors.primary + '20',
                                            padding: 10,
                                            borderRadius: 8,
                                            marginBottom: 8,
                                        }}>
                                            <Text style={{ color: colors.primary, fontWeight: '700' }}>
                                                📅 {dateLabel}
                                            </Text>
                                            <TouchableOpacity
                                                style={{
                                                    backgroundColor: colors.primary,
                                                    paddingHorizontal: 12,
                                                    paddingVertical: 6,
                                                    borderRadius: 6,
                                                    flexDirection: 'row',
                                                    alignItems: 'center',
                                                }}
                                                onPress={() => addShiftToDate(date)}
                                            >
                                                <Text style={{ color: '#FFF', fontWeight: '600', fontSize: 12 }}>+ Add Shift</Text>
                                            </TouchableOpacity>
                                        </View>

                                        {/* Shifts for this date */}
                                        {dateShifts.map((shift, shiftIndex) => (
                                            <View
                                                key={shift.id}
                                                style={{
                                                    backgroundColor: colors.inputBackground,
                                                    padding: 12,
                                                    borderRadius: 8,
                                                    marginBottom: 8,
                                                    borderLeftWidth: 3,
                                                    borderLeftColor: colors.primary,
                                                }}
                                            >
                                                {/* Shift Header */}
                                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                                                    <Text style={{ color: colors.text, fontWeight: '600' }}>
                                                        Shift {shiftIndex + 1}
                                                    </Text>
                                                    <TouchableOpacity
                                                        onPress={() => {
                                                            Alert.alert(
                                                                'Remove Shift',
                                                                'Are you sure you want to remove this shift?',
                                                                [
                                                                    { text: 'Cancel', style: 'cancel' },
                                                                    { text: 'Remove', style: 'destructive', onPress: () => removeShift(shift.id) }
                                                                ]
                                                            );
                                                        }}
                                                    >
                                                        <Text style={{ color: '#EF4444', fontSize: 12, fontWeight: '600' }}>🗑️ Remove</Text>
                                                    </TouchableOpacity>
                                                </View>

                                                {/* Time Row */}
                                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                                                    <View style={{ flex: 1 }}>
                                                        <Text style={{ color: colors.textSecondary, fontSize: 10, marginBottom: 2 }}>Start</Text>
                                                        <TextInput
                                                            style={[styles.compactInput, { color: colors.text, backgroundColor: colors.card }]}
                                                            value={shift.startTime}
                                                            onChangeText={t => updateShift(shift.id, 'startTime', t)}
                                                            placeholder="09:00"
                                                        />
                                                    </View>
                                                    <Text style={{ color: colors.textSecondary, marginTop: 14 }}>→</Text>
                                                    <View style={{ flex: 1 }}>
                                                        <Text style={{ color: colors.textSecondary, fontSize: 10, marginBottom: 2 }}>End</Text>
                                                        <TextInput
                                                            style={[styles.compactInput, { color: colors.text, backgroundColor: colors.card }]}
                                                            value={shift.endTime}
                                                            onChangeText={t => updateShift(shift.id, 'endTime', t)}
                                                            placeholder="17:00"
                                                        />
                                                    </View>
                                                </View>

                                                {/* Details Row */}
                                                <View style={{ flexDirection: 'row', gap: 8 }}>
                                                    <View style={{ flex: 1 }}>
                                                        <Text style={{ color: colors.textSecondary, fontSize: 10, marginBottom: 2 }}>👥 Headcount</Text>
                                                        <TextInput
                                                            style={[styles.compactInput, { color: colors.text, backgroundColor: colors.card }]}
                                                            value={shift.headcount}
                                                            onChangeText={t => updateShift(shift.id, 'headcount', t)}
                                                            keyboardType="numeric"
                                                            placeholder="1"
                                                        />
                                                    </View>
                                                    <View style={{ flex: 1 }}>
                                                        <Text style={{ color: colors.textSecondary, fontSize: 10, marginBottom: 2 }}>💰 Rate ({CURRENCY_SYMBOL}/hr)</Text>
                                                        <TextInput
                                                            style={[styles.compactInput, { color: colors.text, backgroundColor: colors.card }]}
                                                            value={shift.hourlyRate}
                                                            onChangeText={t => updateShift(shift.id, 'hourlyRate', t)}
                                                            keyboardType="numeric"
                                                            placeholder="15.00"
                                                        />
                                                    </View>
                                                    <View style={{ flex: 1 }}>
                                                        <Text style={{ color: colors.textSecondary, fontSize: 10, marginBottom: 2 }}>🎁 Bonus</Text>
                                                        <TextInput
                                                            style={[styles.compactInput, { color: colors.text, backgroundColor: colors.card }]}
                                                            value={shift.completionReward}
                                                            onChangeText={t => updateShift(shift.id, 'completionReward', t)}
                                                            keyboardType="numeric"
                                                            placeholder="0"
                                                        />
                                                    </View>
                                                </View>
                                            </View>
                                        ))}
                                    </View>
                                );
                            })}
                        </View>
                    )}
                </View>
            ) : (
                // Recurring Mode
                <View>
                    <Text style={{ color: colors.textSecondary, fontSize: 13, marginBottom: 12 }}>
                        Select recurring days for part-time work (e.g., every weekend)
                    </Text>

                    {/* Day Selection */}
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                        {WEEKDAYS.map((day, index) => (
                            <TouchableOpacity
                                key={day}
                                style={{
                                    paddingHorizontal: 14,
                                    paddingVertical: 10,
                                    borderRadius: 8,
                                    backgroundColor: recurringDays.includes(index) ? colors.primary : colors.inputBackground,
                                    borderWidth: 1,
                                    borderColor: recurringDays.includes(index) ? colors.primary : colors.border
                                }}
                                onPress={() => toggleRecurringDay(index)}
                            >
                                <Text style={{
                                    color: recurringDays.includes(index) ? '#FFF' : colors.text,
                                    fontSize: 13,
                                    fontWeight: '600'
                                }}>
                                    {day}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {recurringDays.length > 0 && (
                        <View style={{ backgroundColor: colors.inputBackground, padding: 12, borderRadius: 8 }}>
                            <Text style={{ color: colors.text, fontWeight: '600', marginBottom: 12 }}>
                                Shift Details (applies to all selected days)
                            </Text>

                            {/* Time */}
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                                <View style={{ flex: 1 }}>
                                    <Text style={{ color: colors.textSecondary, fontSize: 11, marginBottom: 4 }}>Start Time</Text>
                                    <TextInput
                                        style={[styles.input, { color: colors.text, backgroundColor: colors.card }]}
                                        value={recurringStart}
                                        onChangeText={setRecurringStart}
                                        placeholder="09:00"
                                    />
                                </View>
                                <Text style={{ color: colors.textSecondary, marginTop: 16 }}>to</Text>
                                <View style={{ flex: 1 }}>
                                    <Text style={{ color: colors.textSecondary, fontSize: 11, marginBottom: 4 }}>End Time</Text>
                                    <TextInput
                                        style={[styles.input, { color: colors.text, backgroundColor: colors.card }]}
                                        value={recurringEnd}
                                        onChangeText={setRecurringEnd}
                                        placeholder="17:00"
                                    />
                                </View>
                            </View>

                            {/* Headcount & Rate */}
                            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                                <View style={{ flex: 1 }}>
                                    <Text style={{ color: colors.textSecondary, fontSize: 11, marginBottom: 4 }}>Headcount Needed</Text>
                                    <TextInput
                                        style={[styles.input, { color: colors.text, backgroundColor: colors.card }]}
                                        value={recurringHeadcount}
                                        onChangeText={setRecurringHeadcount}
                                        keyboardType="numeric"
                                        placeholder="1"
                                    />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={{ color: colors.textSecondary, fontSize: 11, marginBottom: 4 }}>Hourly Rate ({CURRENCY_SYMBOL})</Text>
                                    <TextInput
                                        style={[styles.input, { color: colors.text, backgroundColor: colors.card }]}
                                        value={recurringHourlyRate}
                                        onChangeText={setRecurringHourlyRate}
                                        keyboardType="numeric"
                                        placeholder="15.00"
                                    />
                                </View>
                            </View>

                            {/* Completion Reward */}
                            <Text style={{ color: colors.textSecondary, fontSize: 11, marginBottom: 4 }}>Completion Reward ({CURRENCY_SYMBOL})</Text>
                            <TextInput
                                style={[styles.input, { color: colors.text, backgroundColor: colors.card }]}
                                value={recurringReward}
                                onChangeText={setRecurringReward}
                                keyboardType="numeric"
                                placeholder="0.00"
                            />
                        </View>
                    )}
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    label: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 8,
    },
    input: {
        borderWidth: 1,
        borderRadius: 8,
        padding: 10,
        fontSize: 14,
        borderColor: '#CCC',
    },
    compactInput: {
        borderWidth: 1,
        borderRadius: 6,
        padding: 8,
        fontSize: 13,
        borderColor: '#DDD',
    },
    timeInput: {
        borderWidth: 1,
        borderRadius: 6,
        paddingHorizontal: 12,
        paddingVertical: 8,
        fontSize: 13,
        width: 80,
        textAlign: 'center',
    },
});
