import api from './api';
import { SeekerProfile, EmployerProfile, Company } from './authService';

// Types
export interface UpdateSeekerProfileData {
    first_name?: string;
    last_name?: string;
    display_name?: string;
    headline?: string;
    bio?: string;
    date_of_birth?: string;
    gender?: string;
    nationality?: string;
    address_line_1?: string;
    address_line_2?: string;
    city?: string;
    state?: string;
    country?: string;
    postal_code?: string;
    latitude?: number;
    longitude?: number;
    willing_to_travel?: boolean;
    travel_radius_km?: number;
    remote_work_available?: boolean;
    hourly_rate_min?: number;
    hourly_rate_max?: number;
    rate_currency?: string;
    availability_status?: 'available' | 'busy' | 'not_available';
}

export interface UpdateEmployerProfileData {
    first_name?: string;
    last_name?: string;
    job_title?: string;
    department?: string;
    phone_direct?: string;
    is_company_owner?: boolean;
}

export interface WorkExperience {
    id: number;
    company_name: string;
    job_title: string;
    employment_type?: string;
    location?: string;
    is_remote?: boolean;
    start_date?: string;
    end_date?: string;
    is_current: boolean;
    description?: string;
    achievements?: string;
    skills_used?: string[];
    created_at: string;
    updated_at: string;
}

export interface Education {
    id: number;
    institution_name: string;
    degree?: string;
    field_of_study?: string;
    location?: string;
    start_date?: string;
    end_date?: string;
    is_current: boolean;
    grade?: string;
    activities?: string;
    description?: string;
    created_at: string;
    updated_at: string;
}

export interface PortfolioItem {
    id: number;
    uuid: string;
    title: string;
    description?: string;
    project_url?: string;
    media_type?: 'image' | 'video' | 'document' | 'link';
    media_url?: string;
    thumbnail_url?: string;
    skills_demonstrated?: string[];
    project_date?: string;
    is_featured: boolean;
    display_order: number;
    view_count: number;
    created_at: string;
    updated_at: string;
}

export interface Availability {
    id: number;
    day_of_week: 0 | 1 | 2 | 3 | 4 | 5 | 6;
    day_name: string;
    start_time?: string;
    end_time?: string;
    is_available: boolean;
    timezone?: string;
}

export interface FullProfile {
    user: any;
    profile: SeekerProfile | EmployerProfile;
    skills: any[];
    work_experiences: WorkExperience[];
    education: Education[];
    availability: Availability[];
    portfolio: PortfolioItem[];
    certifications: any[];
    resumes: any[];
}

// Profile Service
export const profileService = {
    /**
     * Get full profile with all related data
     */
    async getFullProfile(): Promise<FullProfile> {
        const response = await api.get<FullProfile>('/profile/');
        return response.data;
    },

    /**
     * Get seeker profile
     */
    async getSeekerProfile(): Promise<SeekerProfile> {
        const response = await api.get<SeekerProfile>('/profile/seeker/');
        return response.data;
    },

    /**
     * Update seeker profile
     */
    async updateSeekerProfile(data: UpdateSeekerProfileData): Promise<SeekerProfile> {
        const response = await api.put<SeekerProfile>('/profile/seeker/', data);
        return response.data;
    },

    /**
     * Get employer profile
     */
    async getEmployerProfile(): Promise<EmployerProfile> {
        const response = await api.get<EmployerProfile>('/profile/employer/');
        return response.data;
    },

    /**
     * Update employer profile
     */
    async updateEmployerProfile(data: UpdateEmployerProfileData): Promise<EmployerProfile> {
        const response = await api.put<EmployerProfile>('/profile/employer/', data);
        return response.data;
    },

    /**
     * Upload avatar
     */
    async uploadAvatar(file: FormData): Promise<{ avatar_url: string; message: string }> {
        const response = await api.post('/profile/avatar/', file, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        return response.data;
    },

    /**
     * Upload intro video (seekers only)
     */
    async uploadIntroVideo(file: FormData): Promise<{ intro_video_url: string; message: string }> {
        const response = await api.post('/profile/intro-video/', file, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        return response.data;
    },

    // Work Experience CRUD
    async getWorkExperiences(): Promise<WorkExperience[]> {
        const response = await api.get<WorkExperience[]>('/profile/experience/');
        return response.data;
    },

    async createWorkExperience(data: Partial<WorkExperience>): Promise<WorkExperience> {
        const response = await api.post<WorkExperience>('/profile/experience/', data);
        return response.data;
    },

    async updateWorkExperience(id: number, data: Partial<WorkExperience>): Promise<WorkExperience> {
        const response = await api.put<WorkExperience>(`/profile/experience/${id}/`, data);
        return response.data;
    },

    async deleteWorkExperience(id: number): Promise<void> {
        await api.delete(`/profile/experience/${id}/`);
    },

    // Education CRUD
    async getEducation(): Promise<Education[]> {
        const response = await api.get<Education[]>('/profile/education/');
        return response.data;
    },

    async createEducation(data: Partial<Education>): Promise<Education> {
        const response = await api.post<Education>('/profile/education/', data);
        return response.data;
    },

    async updateEducation(id: number, data: Partial<Education>): Promise<Education> {
        const response = await api.put<Education>(`/profile/education/${id}/`, data);
        return response.data;
    },

    async deleteEducation(id: number): Promise<void> {
        await api.delete(`/profile/education/${id}/`);
    },

    // Portfolio CRUD
    async getPortfolio(): Promise<PortfolioItem[]> {
        const response = await api.get<PortfolioItem[]>('/profile/portfolio/');
        return response.data;
    },

    async createPortfolioItem(data: Partial<PortfolioItem>): Promise<PortfolioItem> {
        const response = await api.post<PortfolioItem>('/profile/portfolio/', data);
        return response.data;
    },

    async updatePortfolioItem(id: number, data: Partial<PortfolioItem>): Promise<PortfolioItem> {
        const response = await api.put<PortfolioItem>(`/profile/portfolio/${id}/`, data);
        return response.data;
    },

    async deletePortfolioItem(id: number): Promise<void> {
        await api.delete(`/profile/portfolio/${id}/`);
    },

    async uploadPortfolioMedia(id: number, file: FormData): Promise<{ media_url: string }> {
        const response = await api.post(`/profile/portfolio/${id}/upload_media/`, file, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        return response.data;
    },

    // Availability
    async getAvailability(): Promise<Availability[]> {
        const response = await api.get<Availability[]>('/profile/availability/');
        return response.data;
    },

    async updateAvailability(schedules: Partial<Availability>[]): Promise<{ schedules: Availability[] }> {
        const response = await api.post('/profile/availability/bulk_update/', { schedules });
        return response.data;
    },

    // Company Management
    async getCompanies(): Promise<Company[]> {
        const response = await api.get<Company[]>('/profile/companies/');
        return response.data;
    },

    async createCompany(data: Partial<Company>): Promise<Company> {
        const response = await api.post<Company>('/profile/companies/', data);
        return response.data;
    },

    async updateCompany(id: number, data: Partial<Company>): Promise<Company> {
        const response = await api.put<Company>(`/profile/companies/${id}/`, data);
        return response.data;
    },

    // Public Profiles
    async getPublicSeekerProfile(uuid: string): Promise<SeekerProfile> {
        const response = await api.get<SeekerProfile>(`/profile/seeker/${uuid}/`);
        return response.data;
    },

    async getPublicEmployerProfile(uuid: string): Promise<EmployerProfile> {
        const response = await api.get<EmployerProfile>(`/profile/employer/${uuid}/`);
        return response.data;
    },
};

export default profileService;
