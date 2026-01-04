/**
 * Rating Service - Reviews and ratings
 */
import api from './api';

export interface Review {
    id: number;
    reviewee: number;
    reviewer: number;
    review_type: 'seeker_review' | 'employer_review';
    application: number;
    work_session?: number;
    attendance_punctuality: number;
    work_quality: number;
    competencies: number;
    compliance_safety: number;
    professionalism: number;
    overall_rating: number;
    comment?: string;
    pros?: string[];
    cons?: string[];
    would_recommend: boolean;
    is_visible: boolean;
    created_at: string;
    reviewer_name: string;
    reviewee_name: string;
    job_title: string;
    response?: ReviewResponse;
}

export interface ReviewResponse {
    id: number;
    response: string;
    created_at: string;
    updated_at: string;
}

export interface CreateReviewData {
    application: number;
    work_session?: number;
    attendance_punctuality: number;
    work_quality: number;
    competencies: number;
    compliance_safety: number;
    professionalism: number;
    comment?: string;
    pros?: string[];
    cons?: string[];
    would_recommend?: boolean;
}

export interface RatingSummary {
    overall_rating: number;
    total_reviews: number;
    attendance_punctuality_avg: number;
    work_quality_avg: number;
    competencies_avg: number;
    compliance_safety_avg: number;
    professionalism_avg: number;
    would_recommend_percent: number;
    rating_distribution: {
        [key: string]: number;
    };
}

const ratingService = {
    // Submit a review
    async submitReview(data: CreateReviewData): Promise<{
        success: boolean;
        review: Review;
        message: string;
    }> {
        const response = await api.post('/reviews/', data);
        return response.data;
    },

    // Get reviews I've given
    async getGivenReviews(): Promise<Review[]> {
        const response = await api.get('/reviews/given/');
        return response.data.reviews;
    },

    // Get reviews I've received
    async getReceivedReviews(): Promise<Review[]> {
        const response = await api.get('/reviews/received/');
        return response.data.reviews;
    },

    // Get user's reviews and summary
    async getUserReviews(userId: number): Promise<{
        user_id: number;
        summary: RatingSummary;
        reviews: Review[];
    }> {
        const response = await api.get(`/reviews/user/${userId}/`);
        return response.data;
    },

    // Respond to a review
    async respondToReview(reviewId: number, responseText: string): Promise<{
        success: boolean;
        response: ReviewResponse;
    }> {
        const response = await api.post(`/reviews/${reviewId}/respond/`, {
            response: responseText
        });
        return response.data;
    },

    // Report a review
    async reportReview(reviewId: number, reason: string, details: string): Promise<{
        success: boolean;
        message: string;
    }> {
        const response = await api.post(`/reviews/${reviewId}/report/`, {
            reason,
            details
        });
        return response.data;
    },

    // Get pending reviews (jobs to review)
    async getPendingReviews(): Promise<any[]> {
        const response = await api.get('/reviews/pending/');
        return response.data.pending_reviews;
    }
};

export default ratingService;
