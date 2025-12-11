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

// Mock data for development (until backend is ready)
const mockJobs: Job[] = [
    {
        id: 1,
        uuid: 'job-1',
        title: 'Senior React Developer',
        description: 'Looking for an experienced React developer to join our team.',
        company_name: 'TechCorp Inc',
        location: {
            address: '123 Tech Street',
            city: 'San Francisco',
            state: 'CA',
            country: 'USA',
            latitude: 37.7749,
            longitude: -122.4194,
        },
        job_type: 'full_time',
        salary_min: 120000,
        salary_max: 180000,
        salary_currency: 'USD',
        salary_period: 'yearly',
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
        company_name: 'Creative Studio',
        location: {
            address: '456 Design Ave',
            city: 'Los Angeles',
            state: 'CA',
            country: 'USA',
            latitude: 34.0522,
            longitude: -118.2437,
        },
        job_type: 'part_time',
        salary_min: 25,
        salary_max: 40,
        salary_currency: 'USD',
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
            address: '789 Data Lane',
            city: 'Seattle',
            state: 'WA',
            country: 'USA',
            latitude: 47.6062,
            longitude: -122.3321,
        },
        job_type: 'full_time',
        salary_min: 100000,
        salary_max: 150000,
        salary_currency: 'USD',
        salary_period: 'yearly',
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
        company_name: 'AppMasters',
        location: {
            address: '321 Mobile Blvd',
            city: 'Austin',
            state: 'TX',
            country: 'USA',
            latitude: 30.2672,
            longitude: -97.7431,
        },
        job_type: 'contract',
        salary_min: 80,
        salary_max: 120,
        salary_currency: 'USD',
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
        title: 'DevOps Engineer',
        description: 'Manage cloud infrastructure and CI/CD pipelines.',
        company_name: 'CloudNet Solutions',
        location: {
            address: '555 Cloud Way',
            city: 'Denver',
            state: 'CO',
            country: 'USA',
            latitude: 39.7392,
            longitude: -104.9903,
        },
        job_type: 'full_time',
        salary_min: 110000,
        salary_max: 160000,
        salary_currency: 'USD',
        salary_period: 'yearly',
        required_skills: [{ id: 11, name: 'AWS' }, { id: 12, name: 'Docker' }, { id: 13, name: 'Kubernetes' }],
        experience_level: 'senior',
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
        // TODO: Replace with actual API call when backend is ready
        // const response = await api.get('/jobs/search/', { params: filters });
        // return response.data;

        // Mock implementation
        let results = [...mockJobs];

        // Filter by query (title)
        if (filters.query) {
            const query = filters.query.toLowerCase();
            results = results.filter(job =>
                job.title.toLowerCase().includes(query) ||
                job.company_name.toLowerCase().includes(query) ||
                job.description.toLowerCase().includes(query)
            );
        }

        // Filter by job type
        if (filters.job_type) {
            results = results.filter(job => job.job_type === filters.job_type);
        }

        // Calculate distance and filter by radius
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

            // Filter by radius
            if (filters.radius_km) {
                results = results.filter(job => (job.distance_km || 0) <= filters.radius_km!);
            }

            // Sort by distance
            results.sort((a, b) => (a.distance_km || 0) - (b.distance_km || 0));
        }

        return {
            success: true,
            data: {
                results,
                count: results.length,
            },
        };
    },

    /**
     * Get job details
     */
    async getJob(uuid: string): Promise<{ success: boolean; data: Job }> {
        // TODO: Replace with actual API call
        const job = mockJobs.find(j => j.uuid === uuid);
        if (!job) throw new Error('Job not found');
        return { success: true, data: job };
    },

    /**
     * Get nearby jobs
     */
    async getNearbyJobs(latitude: number, longitude: number, radiusKm: number = 50): Promise<JobSearchResponse> {
        return this.searchJobs({ latitude, longitude, radius_km: radiusKm });
    },
};

export default jobService;
