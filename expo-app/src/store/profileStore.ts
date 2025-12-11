import { create } from 'zustand';
import { SeekerSkill } from '../services/skillService';
import { Resume } from '../services/resumeService';
import { FullProfile } from '../services/profileService';

interface ProfileState {
    profile: FullProfile | null;
    skills: SeekerSkill[];
    resumes: Resume[];
    isLoading: boolean;
    error: string | null;

    // Actions
    setProfile: (profile: FullProfile | null) => void;
    setSkills: (skills: SeekerSkill[]) => void;
    setResumes: (resumes: Resume[]) => void;
    addSkill: (skill: SeekerSkill) => void;
    removeSkill: (skillId: number) => void;
    addResume: (resume: Resume) => void;
    removeResume: (uuid: string) => void;
    updateResume: (uuid: string, data: Partial<Resume>) => void;
    setLoading: (loading: boolean) => void;
    setError: (error: string | null) => void;
    reset: () => void;
}

const initialState = {
    profile: null,
    skills: [],
    resumes: [],
    isLoading: false,
    error: null,
};

export const useProfileStore = create<ProfileState>()((set, get) => ({
    ...initialState,

    setProfile: (profile) => set({ profile }),

    setSkills: (skills) => set({ skills }),

    setResumes: (resumes) => set({ resumes }),

    addSkill: (skill) => set((state) => ({
        skills: [...state.skills.filter(s => s.id !== skill.id), skill],
    })),

    removeSkill: (skillId) => set((state) => ({
        skills: state.skills.filter(s => s.id !== skillId),
    })),

    addResume: (resume) => set((state) => ({
        resumes: [...state.resumes, resume],
    })),

    removeResume: (uuid) => set((state) => ({
        resumes: state.resumes.filter(r => r.uuid !== uuid),
    })),

    updateResume: (uuid, data) => set((state) => ({
        resumes: state.resumes.map(r => r.uuid === uuid ? { ...r, ...data } : r),
    })),

    setLoading: (isLoading) => set({ isLoading }),

    setError: (error) => set({ error }),

    reset: () => set(initialState),
}));

export default useProfileStore;
