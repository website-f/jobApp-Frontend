// API Client
export { default as api, setAuthTokens, getAccessToken, getRefreshToken, clearTokens } from './api';

// Services
export { default as authService } from './authService';
export { default as profileService } from './profileService';
export { default as skillService } from './skillService';
export { default as resumeService } from './resumeService';
export { default as documentService } from './documentService';

// Re-export types
export type {
    User,
    SeekerProfile,
    EmployerProfile,
    Company,
    SocialAccount,
    RegisterData,
    LoginData,
    SocialAuthData,
} from './authService';

export type {
    UpdateSeekerProfileData,
    UpdateEmployerProfileData,
    WorkExperience,
    Education,
    PortfolioItem,
    Availability,
    FullProfile,
} from './profileService';

export type {
    SkillCategory,
    Skill,
    SeekerSkill,
    Certification,
    SeekerCertification,
    AddSkillData,
    AddCertificationData,
} from './skillService';

export type {
    Resume,
    ResumeAnalysis,
    ApplyAnalysisOptions,
} from './resumeService';

export type {
    UserDocument,
    UploadDocumentData,
} from './documentService';
