import { create } from "zustand";

export interface QuestionGenerationForm {
  pageId: string;
  questionTypes: string[];
  difficulty: string;
  count: number;
  focusAreas: string[];
}

export interface ScheduleForm {
  pageId: string;
  name: string;
  frequency: string;
  questionTypes: string[];
  difficulty: string;
  questionCount: number;
  focusAreas: string;
  isActive: boolean;
}

export interface FormState {
  // Question generation forms by pageId
  questionForms: Record<string, QuestionGenerationForm>;

  // Schedule forms by pageId (or by scheduleId for editing)
  scheduleForms: Record<string, ScheduleForm>;

  // Form submission states
  submitting: Set<string>;

  // Actions
  setQuestionForm: (
    pageId: string,
    form: Partial<QuestionGenerationForm>
  ) => void;
  resetQuestionForm: (pageId: string) => void;
  getQuestionForm: (pageId: string) => QuestionGenerationForm;

  setScheduleForm: (key: string, form: Partial<ScheduleForm>) => void;
  resetScheduleForm: (key: string) => void;
  getScheduleForm: (key: string, pageId: string) => ScheduleForm;

  setSubmitting: (key: string, submitting: boolean) => void;
  isSubmitting: (key: string) => boolean;

  // Preset management
  applyQuestionPreset: (
    pageId: string,
    preset: "quick" | "detailed" | "practice"
  ) => void;
  applySchedulePreset: (
    key: string,
    pageId: string,
    preset: "daily" | "weekly" | "study"
  ) => void;
}

const defaultQuestionForm = (pageId: string): QuestionGenerationForm => ({
  pageId,
  questionTypes: ["multiple_choice", "short_answer"],
  difficulty: "medium",
  count: 5,
  focusAreas: [],
});

const defaultScheduleForm = (pageId: string): ScheduleForm => ({
  pageId,
  name: "",
  frequency: "daily",
  questionTypes: ["multiple_choice", "short_answer"],
  difficulty: "medium",
  questionCount: 5,
  focusAreas: "",
  isActive: true,
});

export const useFormStore = create<FormState>()((set, get) => ({
  // Initial state
  questionForms: {},
  scheduleForms: {},
  submitting: new Set(),

  // Question form actions
  setQuestionForm: (pageId, formUpdates) =>
    set(state => ({
      questionForms: {
        ...state.questionForms,
        [pageId]: {
          ...defaultQuestionForm(pageId),
          ...state.questionForms[pageId],
          ...formUpdates,
        },
      },
    })),

  resetQuestionForm: pageId =>
    set(state => ({
      questionForms: {
        ...state.questionForms,
        [pageId]: defaultQuestionForm(pageId),
      },
    })),

  getQuestionForm: pageId => {
    const state = get();
    return state.questionForms[pageId] || defaultQuestionForm(pageId);
  },

  // Schedule form actions
  setScheduleForm: (key, formUpdates) =>
    set(state => {
      const existing = state.scheduleForms[key];
      const pageId = formUpdates.pageId || existing?.pageId || "";

      return {
        scheduleForms: {
          ...state.scheduleForms,
          [key]: {
            ...defaultScheduleForm(pageId),
            ...existing,
            ...formUpdates,
          },
        },
      };
    }),

  resetScheduleForm: key =>
    set(state => {
      const existing = state.scheduleForms[key];
      const pageId = existing?.pageId || "";

      return {
        scheduleForms: {
          ...state.scheduleForms,
          [key]: defaultScheduleForm(pageId),
        },
      };
    }),

  getScheduleForm: (key, pageId) => {
    const state = get();
    return state.scheduleForms[key] || defaultScheduleForm(pageId);
  },

  // Submission state
  setSubmitting: (key, submitting) =>
    set(state => {
      const newSet = new Set(state.submitting);
      if (submitting) {
        newSet.add(key);
      } else {
        newSet.delete(key);
      }
      return { submitting: newSet };
    }),

  isSubmitting: key => {
    return get().submitting.has(key);
  },

  // Preset management
  applyQuestionPreset: (pageId, preset) => {
    const state = get();

    const presets = {
      quick: {
        questionTypes: ["multiple_choice"],
        difficulty: "easy",
        count: 3,
        focusAreas: [],
      },
      detailed: {
        questionTypes: ["multiple_choice", "short_answer", "essay"],
        difficulty: "medium",
        count: 8,
        focusAreas: [],
      },
      practice: {
        questionTypes: ["multiple_choice", "short_answer"],
        difficulty: "hard",
        count: 10,
        focusAreas: [],
      },
    };

    state.setQuestionForm(pageId, presets[preset]);
  },

  applySchedulePreset: (key, pageId, preset) => {
    const state = get();

    const presets = {
      daily: {
        pageId,
        name: "Daily Review",
        frequency: "daily",
        questionTypes: ["multiple_choice", "short_answer"],
        difficulty: "medium",
        questionCount: 5,
        focusAreas: "",
        isActive: true,
      },
      weekly: {
        pageId,
        name: "Weekly Deep Dive",
        frequency: "weekly",
        questionTypes: ["short_answer", "essay"],
        difficulty: "hard",
        questionCount: 8,
        focusAreas: "",
        isActive: true,
      },
      study: {
        pageId,
        name: "Study Session",
        frequency: "manual",
        questionTypes: ["multiple_choice", "flashcard"],
        difficulty: "easy",
        questionCount: 15,
        focusAreas: "",
        isActive: true,
      },
    };

    state.setScheduleForm(key, presets[preset]);
  },
}));
