import api from './api';

// Types
export interface Job {
    id: number;
    uuid: string;
    title: string;
    description: string;
    company_name: string;
    company_logo?: string;
    location: {
        address: string;
        city: string;
        state?: string;
        country: string;
        latitude: number;
        longitude: number;
    };
    job_type: 'full_time' | 'part_time' | 'contract' | 'temporary' | 'internship';
    salary_min?: number;
    salary_max?: number;
    salary_currency?: string;
    salary_period?: 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly';
    required_skills: { id: number; name: string }[];
    experience_level?: 'entry' | 'mid' | 'senior' | 'lead' | 'executive';
    is_remote?: boolean;
    posted_at: string;
    expires_at?: string;
    is_active: boolean;
    distance_km?: number;
    match_score?: number;
}

export interface JobSearchFilters {
    query?: string;
    job_type?: 'full_time' | 'part_time' | 'contract' | 'temporary' | 'internship';
    latitude?: number;
    longitude?: number;
    radius_km?: number;
    match_skills?: boolean;
    match_availability?: boolean;
    page?: number;
    page_size?: number;
}

export interface JobSearchResponse {
    success: boolean;
    data: {
        results: Job[];
        count: number;
        next?: string;
        previous?: string;
    };
}

// Mock data for development (using Malaysian locations)
const mockJobs: Job[] = [
    {
        id: 1,
        uuid: 'job-1',
        title: 'Senior React Developer',
        description: 'Looking for an experienced React developer to join our team.',
        company_name: 'TechCorp Malaysia',
        location: {
            address: 'Level 15, Menara KLCC',
            city: 'Kuala Lumpur',
            state: 'Wilayah Persekutuan',
            country: 'Malaysia',
            latitude: 3.1579,
            longitude: 101.7116,
        },
        job_type: 'full_time',
        salary_min: 8000,
        salary_max: 12000,
        salary_currency: 'MYR',
        salary_period: 'monthly',
        required_skills: [{ id: 1, name: 'React' }, { id: 2, name: 'TypeScript' }, { id: 3, name: 'Node.js' }],
        experience_level: 'senior',
        is_remote: true,
        posted_at: new Date().toISOString(),
        is_active: true,
    },
    {
        id: 2,
        uuid: 'job-2',
        title: 'Part-time Graphic Designer',
        description: 'Creative designer needed for various marketing projects.',
        company_name: 'Creative Studio PJ',
        location: {
            address: '3 Two Square, Petaling Jaya',
            city: 'Petaling Jaya',
            state: 'Selangor',
            country: 'Malaysia',
            latitude: 3.1073,
            longitude: 101.6067,
        },
        job_type: 'part_time',
        salary_min: 20,
        salary_max: 35,
        salary_currency: 'MYR',
        salary_period: 'hourly',
        required_skills: [{ id: 4, name: 'Photoshop' }, { id: 5, name: 'Illustrator' }],
        experience_level: 'mid',
        is_remote: false,
        posted_at: new Date(Date.now() - 86400000).toISOString(),
        is_active: true,
    },
    {
        id: 3,
        uuid: 'job-3',
        title: 'Backend Python Developer',
        description: 'Build scalable APIs and backend services.',
        company_name: 'DataFlow Systems',
        location: {
            address: 'Bangsar South, KL',
            city: 'Kuala Lumpur',
            state: 'Wilayah Persekutuan',
            country: 'Malaysia',
            latitude: 3.1100,
            longitude: 101.6685,
        },
        job_type: 'full_time',
        salary_min: 6000,
        salary_max: 10000,
        salary_currency: 'MYR',
        salary_period: 'monthly',
        required_skills: [{ id: 6, name: 'Python' }, { id: 7, name: 'Django' }, { id: 8, name: 'PostgreSQL' }],
        experience_level: 'mid',
        is_remote: true,
        posted_at: new Date(Date.now() - 172800000).toISOString(),
        is_active: true,
    },
    {
        id: 4,
        uuid: 'job-4',
        title: 'Mobile App Developer',
        description: 'Develop cross-platform mobile applications.',
        company_name: 'AppMasters MY',
        location: {
            address: 'Publika, Mont Kiara',
            city: 'Kuala Lumpur',
            state: 'Wilayah Persekutuan',
            country: 'Malaysia',
            latitude: 3.1714,
            longitude: 101.6637,
        },
        job_type: 'contract',
        salary_min: 50,
        salary_max: 80,
        salary_currency: 'MYR',
        salary_period: 'hourly',
        required_skills: [{ id: 9, name: 'React Native' }, { id: 10, name: 'Flutter' }],
        experience_level: 'senior',
        is_remote: true,
        posted_at: new Date(Date.now() - 259200000).toISOString(),
        is_active: true,
    },
    {
        id: 5,
        uuid: 'job-5',
        title: 'F&B Crew (Part-Time)',
        description: 'Looking for friendly crew members for weekend shifts.',
        company_name: 'Kopitiam Express',
        location: {
            address: 'Pavilion KL, Bukit Bintang',
            city: 'Kuala Lumpur',
            state: 'Wilayah Persekutuan',
            country: 'Malaysia',
            latitude: 3.1488,
            longitude: 101.7131,
        },
        job_type: 'part_time',
        salary_min: 12,
        salary_max: 15,
        salary_currency: 'MYR',
        salary_period: 'hourly',
        required_skills: [{ id: 11, name: 'Customer Service' }, { id: 12, name: 'Communication' }],
        experience_level: 'entry',
        is_remote: false,
        posted_at: new Date(Date.now() - 345600000).toISOString(),
        is_active: true,
    },
];

// Calculate distance between two points using Haversine formula
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

// Job Service
export const jobService = {
    /**
     * Search for jobs with filters
     */
    async searchJobs(filters: JobSearchFilters): Promise<JobSearchResponse> {
        try {
            // Map filters to backend params
            const params: any = {};
            if (filters.query) params.query = filters.query;
            if (filters.job_type) params.job_type = filters.job_type;
            if (filters.latitude) params.latitude = filters.latitude;
            if (filters.longitude) params.longitude = filters.longitude;
            if (filters.radius_km) params.radius_km = filters.radius_km;

            const response = await api.get('/jobs/', { params });

            // Handle pagination (Django REST Framework PageNumberPagination)
            let resultList: any[] = [];
            let totalCount = 0;

            if (Array.isArray(response.data)) {
                resultList = response.data;
                totalCount = resultList.length;
            } else if (response.data && Array.isArray(response.data.results)) {
                resultList = response.data.results;
                totalCount = response.data.count || resultList.length;
            }

            // Transform backend data to frontend Job interface using robust helper
            const jobs: Job[] = resultList.map((j: any) => mapJobFromApi(j));

            // Calculate distance relative to User request if needed
            if (filters.latitude && filters.longitude) {
                jobs.forEach(job => {
                    job.distance_km = calculateDistance(
                        filters.latitude!,
                        filters.longitude!,
                        job.location.latitude,
                        job.location.longitude
                    );
                });
                jobs.sort((a, b) => (a.distance_km || 0) - (b.distance_km || 0));
            }

            return {
                success: true,
                data: {
                    results: jobs,
                    count: jobs.length,
                },
            };
        } catch (error) {
            console.error('Job Search Failed, falling back to mock:', error);
            // Fallback to mock for demo stability if API fails (e.g. no jobs in DB yet)
            let results = [...mockJobs];
            // ... (keep fallback filter logic to ensure mock experience still works)
            if (filters.query) {
                const query = filters.query.toLowerCase();
                results = results.filter(job =>
                    job.title.toLowerCase().includes(query) ||
                    job.company_name.toLowerCase().includes(query) ||
                    job.description.toLowerCase().includes(query)
                );
            }
            if (filters.job_type) {
                results = results.filter(job => job.job_type === filters.job_type);
            }
            if (filters.latitude && filters.longitude) {
                results = results.map(job => ({
                    ...job,
                    distance_km: calculateDistance(
                        filters.latitude!,
                        filters.longitude!,
                        job.location.latitude,
                        job.location.longitude
                    ),
                }));
                if (filters.radius_km) {
                    results = results.filter(job => (job.distance_km || 0) <= filters.radius_km!);
                }
                results.sort((a, b) => (a.distance_km || 0) - (b.distance_km || 0));
            }

            return {
                success: false, // Indicate it was a fallback if needed, or true to hide it
                data: {
                    results,
                    count: results.length,
                },
            };
        }
    },

    /**
     * Get job details
     */
    async getJob(uuid: string): Promise<{ success: boolean; data: Job }> {
        // TODO: Backend retrieve ID
        const job = mockJobs.find(j => j.uuid === uuid);
        if (!job) throw new Error('Job not found');
        return { success: true, data: job };
    },

    /**
     * Get nearby jobs
     */
    /**
     * Get nearby jobs
     */
    async getNearbyJobs(latitude: number, longitude: number, radiusKm: number = 50): Promise<JobSearchResponse> {
        return this.searchJobs({ latitude, longitude, radius_km: radiusKm });
    },

    // Employer Methods
    async getEmployerJobs(): Promise<Job[]> {
        const response = await api.get('/jobs/my_jobs/');
        return response.data.map((j: any) => mapJobFromApi(j));
    },

    async createJob(jobData: any): Promise<Job> {
        try {
            const response = await api.post('/jobs/', jobData);
            return mapJobFromApi(response.data);
        } catch (error: any) {
            console.error('createJob - error:', error.response?.status, error.response?.data);
            throw error;
        }
    },

    async deleteJob(jobId: number): Promise<void> {
        await api.delete(`/jobs/${jobId}/`);
    },

    async getCategories(): Promise<JobCategory[]> {
        const response = await api.get('/jobs/categories/');
        return response.data;
    },

    async getTitles(categoryId: number): Promise<JobTitle[]> {
        const response = await api.get('/jobs/titles/', { params: { category: categoryId } });
        return response.data;
    },

    async getSkills(): Promise<{ id: number; name: string }[]> {
        try {
            const response = await api.get('/skills/');
            return response.data.map((s: any) => ({ id: s.id, name: s.name }));
        } catch (e) {
            console.log('Failed to fetch skills, using defaults');
            // Fallback skills if endpoint fails
            return [
                { id: 1, name: 'Communication' },
                { id: 2, name: 'Teamwork' },
                { id: 3, name: 'Problem Solving' },
                { id: 4, name: 'Customer Service' },
                { id: 5, name: 'Leadership' },
                { id: 6, name: 'Time Management' },
            ];
        }
    },

    // Application Methods
    async applyForJob(jobId: number, data: {
        application_type: 'apply' | 'bid';
        cover_letter?: string;
        resume_id?: number;
        shift_id?: number;
        proposed_rate?: number;
    }): Promise<any> {
        const response = await api.post('/jobs/applications/', {
            job: jobId,
            ...data,
        });
        return response.data;
    },

    async getMyApplications(): Promise<any[]> {
        const response = await api.get('/jobs/applications/my_applications/');
        return response.data;
    },

    async withdrawApplication(applicationId: number): Promise<void> {
        await api.post(`/jobs/applications/${applicationId}/withdraw/`);
    },

    // Employer Methods for viewing candidates
    async getJobApplications(jobId: number): Promise<any[]> {
        const response = await api.get(`/jobs/${jobId}/applications/`);
        return response.data;
    },

    async updateApplicationStatus(applicationId: number, status: string, notes?: string): Promise<void> {
        await api.post(`/jobs/applications/${applicationId}/update_status/`, { status, notes });
    },
};

// Helper to map API response to Frontend model
function mapJobFromApi(j: any): Job {
    // Safety check for ID
    const jobId = j.id || 0;
    const jobUuid = j.uuid ? j.uuid : (jobId ? jobId.toString() : `temp-${Date.now()}`);

    return {
        id: jobId,
        uuid: jobUuid,
        title: j.title || 'Untitled Job',
        description: j.description || '',
        company_name: j.company_name || 'Unknown Company',
        location: {
            address: j.location_address || '',
            city: j.location_address ? (j.location_address.split(',')[0] || 'Unknown') : 'Unknown',
            state: '',
            country: 'Malaysia',
            latitude: Number(j.latitude) || 0,
            longitude: Number(j.longitude) || 0,
        },
        job_type: j.job_type || 'full_time',
        salary_min: Number(j.salary_amount) || 0,
        salary_max: Number(j.salary_amount) || 0,
        salary_period: j.salary_period || 'monthly',
        required_skills: j.skills ? j.skills.map((s: any) => ({ id: s.id, name: s.name })) : [],
        experience_level: 'mid',
        is_remote: false,
        posted_at: j.created_at || new Date().toISOString(),
        is_active: j.status === 'published',
        distance_km: 0,
    };
}

export interface JobCategory {
    id: number;
    name: string;
    icon: string;
}

export interface JobTitle {
    id: number;
    title: string;
    description_template: string;
    category: number;
}

export default jobService;

