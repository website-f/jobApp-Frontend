/**
 * Work Service - Clock in/out, work sessions, breaks
 */
import api from './api';

export interface WorkSession {
    id: number;
    application: number;
    shift?: number;
    seeker: number;
    job: number;
    status: 'active' | 'on_break' | 'completed' | 'disputed' | 'cancelled';
    clock_in_time: string;
    clock_in_latitude?: number;
    clock_in_longitude?: number;
    clock_in_photo?: string;
    clock_in_verified: boolean;
    clock_in_distance_meters?: number;
    clock_out_time?: string;
    clock_out_latitude?: number;
    clock_out_longitude?: number;
    clock_out_photo?: string;
    clock_out_verified: boolean;
    clock_out_distance_meters?: number;
    total_work_minutes?: number;
    total_break_minutes?: number;
    total_earnings?: number;
    geofence_radius_meters: number;
    employer_confirmed: boolean;
    employer_confirmed_at?: string;
    employer_notes?: string;
    breaks: WorkBreak[];
    job_title: string;
    company_name: string;
    seeker_name?: string;
    created_at: string;
    updated_at: string;
}

export interface WorkBreak {
    id: number;
    break_type: 'lunch' | 'rest' | 'prayer' | 'personal' | 'other';
    start_time: string;
    end_time?: string;
    duration_minutes?: number;
    notes?: string;
}

export interface ClockInData {
    application_id: number;
    shift_id?: number;
    latitude: number;
    longitude: number;
    photo_url?: string;
}

export interface ClockOutData {
    session_id: number;
    latitude: number;
    longitude: number;
    photo_url?: string;
}

export interface ReportToWork {
    id: number;
    application: number;
    shift?: number;
    status: 'on_the_way' | 'arrived' | 'cancelled';
    departure_latitude?: number;
    departure_longitude?: number;
    estimated_arrival_time?: string;
    estimated_distance_km?: number;
    actual_arrival_time?: string;
    reported_at: string;
    job_title: string;
    company_name: string;
}

const workService = {
    // Get active work session
    async getActiveSession(): Promise<WorkSession | null> {
        const response = await api.get('/work/sessions/active/');
        return response.data.active_session;
    },

    // Clock in
    async clockIn(data: ClockInData): Promise<{
        success: boolean;
        session: WorkSession;
        distance_from_job: number;
        is_within_geofence: boolean;
        message: string;
    }> {
        const response = await api.post('/work/sessions/clock_in/', data);
        return response.data;
    },

    // Clock out
    async clockOut(data: ClockOutData): Promise<{
        success: boolean;
        session: WorkSession;
        total_hours: number;
        total_earnings: number;
        message: string;
    }> {
        const response = await api.post('/work/sessions/clock_out/', data);
        return response.data;
    },

    // Start break
    async startBreak(sessionId: number, breakType: string, notes?: string): Promise<{
        success: boolean;
        break: WorkBreak;
    }> {
        const response = await api.post(`/work/sessions/${sessionId}/start_break/`, {
            break_type: breakType,
            notes
        });
        return response.data;
    },

    // End break
    async endBreak(sessionId: number): Promise<{
        success: boolean;
        break: WorkBreak;
    }> {
        const response = await api.post(`/work/sessions/${sessionId}/end_break/`);
        return response.data;
    },

    // Get work history
    async getWorkHistory(): Promise<WorkSession[]> {
        const response = await api.get('/work/sessions/history/');
        return response.data.sessions;
    },

    // Get session details
    async getSession(sessionId: number): Promise<WorkSession> {
        const response = await api.get(`/work/sessions/${sessionId}/`);
        return response.data;
    },

    // Report to work (on the way)
    async reportToWork(data: {
        application_id: number;
        shift_id?: number;
        latitude: number;
        longitude: number;
        estimated_arrival_minutes?: number;
    }): Promise<{
        success: boolean;
        report: ReportToWork;
    }> {
        const response = await api.post('/work/reports/', data);
        return response.data;
    },

    // Get my reports
    async getMyReports(): Promise<ReportToWork[]> {
        const response = await api.get('/work/reports/');
        return response.data.results || response.data;
    },

    // Employer confirm session
    async confirmSession(sessionId: number, confirmed: boolean, notes?: string): Promise<{
        success: boolean;
        session: WorkSession;
    }> {
        const response = await api.post(`/work/sessions/${sessionId}/employer_confirm/`, {
            confirmed,
            notes
        });
        return response.data;
    }
};

export default workService;
