/**
 * Penalty Service - Penalty tracking and appeals
 */
import api from './api';

export interface Penalty {
    id: number;
    user: number;
    penalty_rule?: number;
    penalty_type: string;
    penalty_type_display: string;
    severity: 'warning' | 'minor' | 'major' | 'severe';
    severity_display: string;
    application?: number;
    work_session?: number;
    points_deducted: number;
    monetary_penalty?: number;
    description: string;
    evidence_urls: string[];
    is_auto_detected: boolean;
    offense_count: number;
    can_appeal: boolean;
    appeal_deadline?: string;
    appeal_status: 'none' | 'pending' | 'approved' | 'rejected';
    appeal_status_display: string;
    appeal_reason?: string;
    appeal_submitted_at?: string;
    is_active: boolean;
    issued_at: string;
    job_title?: string;
    can_appeal_now: boolean;
}

export interface PenaltyRule {
    id: number;
    penalty_type: string;
    applies_to: 'seeker' | 'employer' | 'both';
    first_offense_points: number;
    second_offense_points: number;
    third_offense_points: number;
    subsequent_offense_points: number;
    monetary_penalty_percent: number;
    warning_threshold: number;
    suspension_threshold: number;
    ban_threshold: number;
    can_appeal: boolean;
    appeal_window_hours: number;
    description: string;
    is_active: boolean;
}

export interface PenaltySummary {
    id: number;
    user: number;
    user_name: string;
    total_penalty_points: number;
    active_penalties_count: number;
    no_show_count: number;
    late_arrival_count: number;
    early_leave_count: number;
    withdrawal_count: number;
    is_warned: boolean;
    is_suspended: boolean;
    is_banned: boolean;
    suspension_until?: string;
    last_penalty_at?: string;
    last_updated: string;
}

const penaltyService = {
    // Get my penalties
    async getMyPenalties(): Promise<Penalty[]> {
        const response = await api.get('/penalties/my_penalties/');
        return response.data.penalties;
    },

    // Get penalty summary
    async getPenaltySummary(): Promise<PenaltySummary> {
        const response = await api.get('/penalties/summary/');
        return response.data.summary;
    },

    // Get penalty details
    async getPenalty(penaltyId: number): Promise<Penalty> {
        const response = await api.get(`/penalties/${penaltyId}/`);
        return response.data;
    },

    // Submit appeal
    async submitAppeal(penaltyId: number, reason: string): Promise<{
        success: boolean;
        penalty: Penalty;
        message: string;
    }> {
        const response = await api.post(`/penalties/${penaltyId}/appeal/`, {
            reason
        });
        return response.data;
    },

    // Get penalty rules
    async getPenaltyRules(): Promise<PenaltyRule[]> {
        const response = await api.get('/penalties/rules/');
        return response.data.results || response.data;
    },

    // Issue penalty (employer only)
    async issuePenalty(data: {
        user_id: number;
        application_id?: number;
        work_session_id?: number;
        penalty_type: string;
        severity?: string;
        description: string;
        evidence_urls?: string[];
    }): Promise<{
        success: boolean;
        penalty: Penalty;
        message: string;
    }> {
        const response = await api.post('/penalties/issue/', data);
        return response.data;
    }
};

export default penaltyService;
