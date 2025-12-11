import api from './api';

// Types
export interface Resume {
    id: number;
    uuid: string;
    title: string;
    original_filename: string;
    file_url: string;
    file_type: string;
    file_size: number;
    file_size_formatted: string;
    is_primary: boolean;
    is_parsed: boolean;
    parsed_at?: string;
    has_analysis: boolean;
    download_count: number;
    created_at: string;
    updated_at: string;
}

export interface ResumeAnalysis {
    id: number;
    resume: number;
    resume_title: string;
    summary: string;

    // Extracted data
    extracted_contact: {
        email?: string;
        phone?: string;
        linkedin?: string;
        github?: string;
        location?: string;
        name?: string;
    };
    extracted_skills: {
        name: string;
        confidence: number;
        source?: string;
    }[];
    extracted_experience: {
        company?: string;
        title?: string;
        start_date?: string;
        end_date?: string;
        is_current: boolean;
        description?: string;
    }[];
    extracted_education: {
        institution?: string;
        degree?: string;
        field?: string;
        dates?: string;
    }[];
    extracted_certifications: any[];
    extracted_languages: string[];
    extracted_projects: any[];

    // AI Insights
    strengths: string[];
    improvement_areas: string[];
    keyword_suggestions: string[];

    // Scores
    ats_score: number;
    quality_score: number;
    completeness_score: number;
    formatting_score: number;
    overall_score: number;
    score_breakdown: {
        ats: { score: number; max: number };
        quality: { score: number; max: number };
        completeness: { score: number; max: number };
    };

    // Status
    status: 'pending' | 'processing' | 'completed' | 'failed';
    processing_time_ms: number;

    created_at: string;
    updated_at: string;
}

export interface ApplyAnalysisOptions {
    apply_skills?: boolean;
    apply_experience?: boolean;
    apply_education?: boolean;
    apply_contact?: boolean;
    skill_proficiency_default?: 'beginner' | 'intermediate' | 'advanced' | 'expert';
}

// Resume Service
export const resumeService = {
    /**
     * Get all resumes for current user
     */
    async getResumes(): Promise<Resume[]> {
        const response = await api.get<Resume[]>('/resumes/');
        return response.data;
    },

    /**
     * Upload a new resume
     */
    async uploadResume(file: FormData): Promise<Resume> {
        const response = await api.post<Resume>('/resumes/upload/', file, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        return response.data;
    },

    /**
     * Get a specific resume by UUID
     */
    async getResume(uuid: string): Promise<Resume> {
        const response = await api.get<Resume>(`/resumes/${uuid}/`);
        return response.data;
    },

    /**
     * Update resume details
     */
    async updateResume(uuid: string, data: { title?: string }): Promise<Resume> {
        const response = await api.put<Resume>(`/resumes/${uuid}/`, data);
        return response.data;
    },

    /**
     * Delete a resume (soft delete)
     */
    async deleteResume(uuid: string): Promise<void> {
        await api.delete(`/resumes/${uuid}/`);
    },

    /**
     * Set a resume as primary
     */
    async setAsPrimary(uuid: string): Promise<Resume> {
        const response = await api.post<{ resume: Resume }>(`/resumes/${uuid}/primary/`);
        return response.data.resume;
    },

    /**
     * Get AI analysis for a resume
     */
    async getAnalysis(uuid: string): Promise<ResumeAnalysis> {
        const response = await api.get<ResumeAnalysis>(`/resumes/${uuid}/analysis/`);
        return response.data;
    },

    /**
     * Trigger re-analysis of a resume
     */
    async reanalyze(uuid: string): Promise<{ message: string; status: string }> {
        const response = await api.post(`/resumes/${uuid}/reanalyze/`);
        return response.data;
    },

    /**
     * Apply analysis results to profile
     */
    async applyToProfile(uuid: string, options?: ApplyAnalysisOptions): Promise<{ message: string; applied: any }> {
        const response = await api.post(`/resumes/${uuid}/apply/`, options || {});
        return response.data;
    },

    /**
     * Check if analysis is complete (polling helper)
     */
    async waitForAnalysis(uuid: string, maxAttempts: number = 30, intervalMs: number = 2000): Promise<ResumeAnalysis> {
        for (let i = 0; i < maxAttempts; i++) {
            try {
                const analysis = await this.getAnalysis(uuid);
                if (analysis.status === 'completed' || analysis.status === 'failed') {
                    return analysis;
                }
            } catch (error) {
                // Analysis might not exist yet
            }

            await new Promise(resolve => setTimeout(resolve, intervalMs));
        }

        throw new Error('Analysis timed out');
    },

    /**
     * Get the score color based on value
     */
    getScoreColor(score: number): string {
        if (score >= 80) return '#22c55e'; // green
        if (score >= 60) return '#eab308'; // yellow
        if (score >= 40) return '#f97316'; // orange
        return '#ef4444'; // red
    },

    /**
     * Get the score label based on value
     */
    getScoreLabel(score: number): string {
        if (score >= 80) return 'Excellent';
        if (score >= 60) return 'Good';
        if (score >= 40) return 'Fair';
        return 'Needs Improvement';
    },
};

export default resumeService;
