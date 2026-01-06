/**
 * Candidate Service - For employers to search and view candidates
 */
import api from './api';

export interface CandidateSkill {
    id: number;
    name: string;
    proficiency: 'beginner' | 'intermediate' | 'advanced' | 'expert';
    years: number;
    is_primary: boolean;
    is_match: boolean;
}

export interface CandidateLocation {
    city?: string;
    state?: string;
    country?: string;
}

export interface CandidateRate {
    min?: number;
    max?: number;
    currency: string;
}

export interface MatchDetails {
    skills_matched: number;
    skills_total: number;
    has_required_skills: { name: string; proficiency: string; years: number }[];
    missing_skills: string[];
    strengths: string[];
    considerations: string[];
}

export interface Candidate {
    id: number;
    user_id: number;  // User ID for messaging
    user_uuid: string;
    name: string;
    avatar_url?: string;
    headline?: string;
    bio?: string;
    location: CandidateLocation;
    availability: 'available' | 'busy' | 'not_available';
    remote_available: boolean;
    hourly_rate: CandidateRate;
    rating?: number;
    reliability_score?: number;
    jobs_completed: number;
    hours_worked: number;
    is_verified: boolean;
    is_premium: boolean;
    skills: CandidateSkill[];
    match_score: number;
    match_details: MatchDetails;
}

export interface CandidateSearchFilters {
    skills?: number[];
    skill_names?: string[];
    min_proficiency?: 'beginner' | 'intermediate' | 'advanced' | 'expert';
    location?: {
        city?: string;
        latitude?: number;
        longitude?: number;
        radius_km?: number;
    };
    availability?: 'available' | 'busy' | 'not_available';
    remote_ok?: boolean;
    min_rating?: number;
    max_hourly_rate?: number;
    min_hourly_rate?: number;
    verified_only?: boolean;
    min_jobs_completed?: number;
    sort_by?: 'match_score' | 'rating' | 'experience' | 'rate_low' | 'rate_high' | 'recent';
    page?: number;
    page_size?: number;
}

export interface SearchFiltersResponse {
    popular_skills: {
        id: number;
        name: string;
        slug: string;
        category_name?: string;
    }[];
    availability_options: { value: string; label: string }[];
    proficiency_levels: { value: string; label: string }[];
    sort_options: { value: string; label: string }[];
}

export interface CandidateSearchResponse {
    total: number;
    page: number;
    page_size: number;
    total_pages: number;
    candidates: Candidate[];
    search_criteria: {
        skills_searched: number[];
        location?: any;
        filters_applied: any;
    };
}

export interface CandidateDetail extends Candidate {
    intro_video_url?: string;
    contact: {
        can_message: boolean;
    };
    rates: CandidateRate;
    ratings: {
        overall?: number;
        reliability?: number;
        attendance?: number;
        punctuality?: number;
    };
    stats: {
        jobs_completed: number;
        hours_worked: number;
        profile_completeness: number;
    };
    verification: {
        is_verified: boolean;
        is_premium: boolean;
        id_verified: boolean;
    };
    experiences: {
        job_title: string;
        company: string;
        location?: string;
        start_date?: string;
        end_date?: string;
        is_current: boolean;
        description?: string;
    }[];
    education: {
        institution: string;
        degree?: string;
        field?: string;
        start_date?: string;
        end_date?: string;
    }[];
    certifications: {
        name: string;
        organization: string;
        issue_date?: string;
        expiry_date?: string;
        is_expired: boolean;
        credential_id?: string;
        credential_url?: string;
        document_url?: string;
    }[];
    portfolio: {
        title: string;
        description?: string;
        media_url?: string;
        media_type?: string;
        project_url?: string;
    }[];
    resumes: {
        id: number;
        uuid: string;
        title: string;
        file_url?: string;
        file_type: string;
        is_primary: boolean;
        uploaded_at?: string;
    }[];
    member_since: string;
}

const candidateService = {
    /**
     * Get search filters and options for candidate search
     */
    async getSearchFilters(): Promise<SearchFiltersResponse> {
        const response = await api.get('/profile/candidates/search/');
        return response.data;
    },

    /**
     * Search for candidates with ML-based matching
     */
    async searchCandidates(filters: CandidateSearchFilters): Promise<CandidateSearchResponse> {
        const response = await api.post('/profile/candidates/search/', filters);
        return response.data;
    },

    /**
     * Get detailed candidate profile
     */
    async getCandidateDetail(uuid: string): Promise<CandidateDetail> {
        const response = await api.get(`/profile/candidates/${uuid}/`);
        return response.data;
    },

    /**
     * Quick search by skill names (convenience method)
     */
    async quickSearch(skillNames: string[], options?: {
        availability?: string;
        minRating?: number;
        page?: number;
    }): Promise<CandidateSearchResponse> {
        return this.searchCandidates({
            skill_names: skillNames,
            availability: options?.availability as any,
            min_rating: options?.minRating,
            page: options?.page || 1,
            sort_by: 'match_score',
        });
    },

    /**
     * Get all available skills for search
     */
    async getSkills(): Promise<{
        id: number;
        name: string;
        slug: string;
        category_name?: string;
    }[]> {
        const response = await api.get('/skills/skills/');
        return response.data.results || response.data;
    },
};

export default candidateService;
