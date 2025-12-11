import api from './api';

// Types
export interface SkillCategory {
    id: number;
    name: string;
    slug: string;
    parent?: number;
    icon?: string;
    description?: string;
    is_active: boolean;
    subcategories: SkillCategory[];
    skill_count: number;
}

export interface Skill {
    id: number;
    name: string;
    slug: string;
    category?: number;
    category_name?: string;
    description?: string;
    icon?: string;
    is_verified: boolean;
    usage_count: number;
}

export interface SeekerSkill {
    id: number;
    skill: number;
    skill_name: string;
    skill_slug: string;
    category_name?: string;
    proficiency_level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
    years_experience?: number;
    is_primary: boolean;
    is_verified: boolean;
    verified_at?: string;
    assessment_score?: number;
    endorsement_count: number;
    created_at: string;
}

export interface Certification {
    id: number;
    name: string;
    issuing_organization: string;
    description?: string;
    category?: number;
    category_name?: string;
    requires_renewal: boolean;
    renewal_period_months?: number;
    is_active: boolean;
}

export interface SeekerCertification {
    id: number;
    certification?: number;
    name: string;
    organization: string;
    custom_name?: string;
    custom_organization?: string;
    credential_id?: string;
    credential_url?: string;
    issue_date: string;
    expiry_date?: string;
    document_url?: string;
    verification_status: 'pending' | 'verified' | 'rejected' | 'expired';
    verified_at?: string;
    is_expired: boolean;
    days_until_expiry?: number;
    created_at: string;
    updated_at: string;
}

export interface AddSkillData {
    skill: number;
    proficiency_level?: 'beginner' | 'intermediate' | 'advanced' | 'expert';
    years_experience?: number;
    is_primary?: boolean;
}

export interface AddCertificationData {
    certification?: number;
    custom_name?: string;
    custom_organization?: string;
    credential_id?: string;
    credential_url?: string;
    issue_date: string;
    expiry_date?: string;
    document_url?: string;
}

// Skill Service
export const skillService = {
    /**
     * Get all skill categories (hierarchical)
     */
    async getCategories(): Promise<SkillCategory[]> {
        const response = await api.get<SkillCategory[]>('/skills/categories/');
        return response.data;
    },

    /**
     * Get all skills
     */
    async getSkills(params?: { category?: number; verified?: boolean }): Promise<Skill[]> {
        const response = await api.get<Skill[]>('/skills/', { params });
        return response.data;
    },

    /**
     * Search skills by name
     */
    async searchSkills(query: string): Promise<Skill[]> {
        const response = await api.get<Skill[]>('/skills/search/', {
            params: { q: query }
        });
        return response.data;
    },

    /**
     * Get current user's skills
     */
    async getMySkills(): Promise<SeekerSkill[]> {
        const response = await api.get<SeekerSkill[]>('/skills/my/');
        return response.data;
    },

    /**
     * Add a skill to profile
     */
    async addSkill(data: AddSkillData): Promise<SeekerSkill> {
        const response = await api.post<SeekerSkill>('/skills/my/', data);
        return response.data;
    },

    /**
     * Update a skill on profile
     */
    async updateSkill(id: number, data: Partial<AddSkillData>): Promise<SeekerSkill> {
        const response = await api.put<SeekerSkill>(`/skills/my/${id}/`, data);
        return response.data;
    },

    /**
     * Remove a skill from profile
     */
    async removeSkill(id: number): Promise<void> {
        await api.delete(`/skills/my/${id}/`);
    },

    /**
     * Add multiple skills at once
     */
    async bulkAddSkills(skills: { skill_id: number; proficiency_level?: string; years_experience?: number }[]): Promise<{ added: number; skipped: number }> {
        const response = await api.post('/skills/my/bulk/', { skills });
        return response.data;
    },

    /**
     * Get certifications catalog
     */
    async getCertifications(params?: { category?: number; q?: string }): Promise<Certification[]> {
        const response = await api.get<Certification[]>('/skills/certifications/', { params });
        return response.data;
    },

    /**
     * Get current user's certifications
     */
    async getMyCertifications(): Promise<SeekerCertification[]> {
        const response = await api.get<SeekerCertification[]>('/skills/certifications/my/');
        return response.data;
    },

    /**
     * Add a certification to profile
     */
    async addCertification(data: AddCertificationData): Promise<SeekerCertification> {
        const response = await api.post<SeekerCertification>('/skills/certifications/my/', data);
        return response.data;
    },

    /**
     * Update a certification on profile
     */
    async updateCertification(id: number, data: Partial<AddCertificationData>): Promise<SeekerCertification> {
        const response = await api.put<SeekerCertification>(`/skills/certifications/my/${id}/`, data);
        return response.data;
    },

    /**
     * Remove a certification from profile
     */
    async removeCertification(id: number): Promise<void> {
        await api.delete(`/skills/certifications/my/${id}/`);
    },

    /**
     * Upload certification document
     */
    async uploadCertificationDocument(id: number, file: FormData): Promise<{ document_url: string }> {
        const response = await api.post(`/skills/certifications/my/${id}/upload/`, file, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        return response.data;
    },

    /**
     * Get expiring certifications
     */
    async getExpiringCertifications(days: number = 30): Promise<SeekerCertification[]> {
        const response = await api.get<SeekerCertification[]>('/skills/certifications/expiring/', {
            params: { days }
        });
        return response.data;
    },
};

export default skillService;
