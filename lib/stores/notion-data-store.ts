import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";

export interface NotionPage {
  id: string;
  accountId: string;
  notionId: string;
  title: string;
  url: string;
  icon?: any;
  accountName?: string;
  questionCount?: number;
  questions?: Question[];
  archived?: string;
  lastEditedTime: Date;
  content?: any;
  parent?: any;
}

export interface Question {
  id: string;
  notionPageId: string;
  type: string;
  question: string;
  answer?: string | null;
  options?: string[] | null;
  difficulty?: string | null;
  tags?: string[] | null;
  aiModel?: string | null;
  aiPrompt?: string | null;
  confidence?: number | null;
  metadata?: any | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface QuestionSchedule {
  id: string;
  userId: string;
  pageId: string;
  name: string;
  isActive?: boolean | null;
  frequency: string;
  cronExpression?: string | null;
  questionTypes?: string[] | null;
  difficulty?: string | null;
  questionCount?: number | null;
  focusAreas?: string[] | null;
  lastRun?: Date | null;
  nextRun?: Date | null;
  runCount?: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CostEstimate {
  cost: number;
  tokens: number;
  characterCount: number;
}

export interface NotionDataState {
  // Cached data
  pages: Record<string, NotionPage>;
  questions: Record<string, Question[]>; // pageId -> questions
  schedules: Record<string, QuestionSchedule[]>; // pageId -> schedules
  costEstimates: Record<string, CostEstimate>; // pageId -> estimate

  // Loading states
  loadingPages: Set<string>;
  loadingQuestions: Set<string>;
  loadingSchedules: Set<string>;
  loadingEstimates: Set<string>;

  // Error states
  errors: Record<string, string>;

  // Cache timestamps
  lastFetch: Record<string, Date>;

  // Actions
  setPages: (pages: NotionPage[]) => void;
  setPageQuestions: (pageId: string, questions: Question[]) => void;
  setPageSchedules: (pageId: string, schedules: QuestionSchedule[]) => void;
  setCostEstimate: (pageId: string, estimate: CostEstimate) => void;

  // Loading actions
  setLoadingQuestions: (pageId: string, loading: boolean) => void;
  setLoadingSchedules: (pageId: string, loading: boolean) => void;
  setLoadingEstimates: (pageId: string, loading: boolean) => void;

  // Error actions
  setError: (key: string, error: string | null) => void;

  // Data fetching
  fetchPageQuestions: (pageId: string, force?: boolean) => Promise<Question[]>;
  fetchPageSchedules: (
    pageId: string,
    force?: boolean
  ) => Promise<QuestionSchedule[]>;
  fetchCostEstimate: (pageId: string, force?: boolean) => Promise<CostEstimate>;

  // Cache management
  isCacheValid: (key: string, maxAge?: number) => boolean;
  invalidateCache: (keys?: string[]) => void;

  // Optimistic updates
  addQuestion: (pageId: string, question: Question) => void;
  updateQuestion: (
    pageId: string,
    questionId: string,
    updates: Partial<Question>
  ) => void;
  removeQuestion: (pageId: string, questionId: string) => void;

  addSchedule: (pageId: string, schedule: QuestionSchedule) => void;
  updateSchedule: (
    pageId: string,
    scheduleId: string,
    updates: Partial<QuestionSchedule>
  ) => void;
  removeSchedule: (pageId: string, scheduleId: string) => void;
}

export const useNotionDataStore = create<NotionDataState>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    pages: {},
    questions: {},
    schedules: {},
    costEstimates: {},
    loadingPages: new Set(),
    loadingQuestions: new Set(),
    loadingSchedules: new Set(),
    loadingEstimates: new Set(),
    errors: {},
    lastFetch: {},

    // Actions
    setPages: pages => {
      const pagesMap = pages.reduce(
        (acc, page) => {
          acc[page.id] = page;
          return acc;
        },
        {} as Record<string, NotionPage>
      );

      set(state => ({
        pages: { ...state.pages, ...pagesMap },
        lastFetch: { ...state.lastFetch, pages: new Date() },
      }));
    },

    setPageQuestions: (pageId, questions) =>
      set(state => ({
        questions: { ...state.questions, [pageId]: questions },
        lastFetch: { ...state.lastFetch, [`questions-${pageId}`]: new Date() },
      })),

    setPageSchedules: (pageId, schedules) =>
      set(state => ({
        schedules: { ...state.schedules, [pageId]: schedules },
        lastFetch: { ...state.lastFetch, [`schedules-${pageId}`]: new Date() },
      })),

    setCostEstimate: (pageId, estimate) =>
      set(state => ({
        costEstimates: { ...state.costEstimates, [pageId]: estimate },
        lastFetch: { ...state.lastFetch, [`estimate-${pageId}`]: new Date() },
      })),

    setLoadingQuestions: (pageId, loading) =>
      set(state => {
        const newSet = new Set(state.loadingQuestions);
        if (loading) {
          newSet.add(pageId);
        } else {
          newSet.delete(pageId);
        }
        return { loadingQuestions: newSet };
      }),

    setLoadingSchedules: (pageId, loading) =>
      set(state => {
        const newSet = new Set(state.loadingSchedules);
        if (loading) {
          newSet.add(pageId);
        } else {
          newSet.delete(pageId);
        }
        return { loadingSchedules: newSet };
      }),

    setLoadingEstimates: (pageId, loading) =>
      set(state => {
        const newSet = new Set(state.loadingEstimates);
        if (loading) {
          newSet.add(pageId);
        } else {
          newSet.delete(pageId);
        }
        return { loadingEstimates: newSet };
      }),

    setError: (key, error) =>
      set(state => ({
        errors: error
          ? { ...state.errors, [key]: error }
          : Object.fromEntries(
              Object.entries(state.errors).filter(([k]) => k !== key)
            ),
      })),

    fetchPageQuestions: async (pageId, force = false) => {
      const state = get();
      const cacheKey = `questions-${pageId}`;

      // Check cache first
      if (!force && state.questions[pageId] && state.isCacheValid(cacheKey)) {
        return state.questions[pageId];
      }

      // Prevent concurrent requests
      if (state.loadingQuestions.has(pageId)) {
        // Wait for existing request
        return new Promise(resolve => {
          const unsubscribe = useNotionDataStore.subscribe(
            state => state.loadingQuestions,
            loadingQuestions => {
              if (!loadingQuestions.has(pageId)) {
                unsubscribe();
                resolve(get().questions[pageId] || []);
              }
            }
          );
        });
      }

      try {
        state.setLoadingQuestions(pageId, true);
        state.setError(cacheKey, null);

        const { getPageQuestions } = await import("@/app/server");
        const result = await getPageQuestions(pageId);

        state.setPageQuestions(pageId, result.questions);
        return result.questions;
      } catch (error) {
        console.error(`Error fetching questions for page ${pageId}:`, error);
        state.setError(cacheKey, "Failed to load questions");
        return [];
      } finally {
        state.setLoadingQuestions(pageId, false);
      }
    },

    fetchPageSchedules: async (pageId, force = false) => {
      const state = get();
      const cacheKey = `schedules-${pageId}`;

      // Check cache first
      if (!force && state.schedules[pageId] && state.isCacheValid(cacheKey)) {
        return state.schedules[pageId];
      }

      // Prevent concurrent requests
      if (state.loadingSchedules.has(pageId)) {
        return new Promise(resolve => {
          const unsubscribe = useNotionDataStore.subscribe(
            state => state.loadingSchedules,
            loadingSchedules => {
              if (!loadingSchedules.has(pageId)) {
                unsubscribe();
                resolve(get().schedules[pageId] || []);
              }
            }
          );
        });
      }

      try {
        state.setLoadingSchedules(pageId, true);
        state.setError(cacheKey, null);

        const { getPageSchedules } = await import("@/app/server");
        const schedules = await getPageSchedules(pageId);

        state.setPageSchedules(pageId, schedules);
        return schedules;
      } catch (error) {
        console.error(`Error fetching schedules for page ${pageId}:`, error);
        state.setError(cacheKey, "Failed to load schedules");
        return [];
      } finally {
        state.setLoadingSchedules(pageId, false);
      }
    },

    fetchCostEstimate: async (pageId, force = false) => {
      const state = get();
      const cacheKey = `estimate-${pageId}`;

      // Check cache first
      if (
        !force &&
        state.costEstimates[pageId] &&
        state.isCacheValid(cacheKey)
      ) {
        return state.costEstimates[pageId];
      }

      // Prevent concurrent requests
      if (state.loadingEstimates.has(pageId)) {
        return new Promise(resolve => {
          const unsubscribe = useNotionDataStore.subscribe(
            state => state.loadingEstimates,
            loadingEstimates => {
              if (!loadingEstimates.has(pageId)) {
                unsubscribe();
                resolve(get().costEstimates[pageId]);
              }
            }
          );
        });
      }

      try {
        state.setLoadingEstimates(pageId, true);
        state.setError(cacheKey, null);

        const { estimateQuestionGenerationCost } = await import("@/app/server");
        const estimate = (await estimateQuestionGenerationCost(pageId, {
          questionTypes: ["multiple_choice", "short_answer"],
          difficulty: "medium",
          count: 5,
        })) as CostEstimate;

        state.setCostEstimate(pageId, estimate);
        return estimate;
      } catch (error) {
        console.error(
          `Error fetching cost estimate for page ${pageId}:`,
          error
        );
        state.setError(cacheKey, "Failed to get cost estimate");
        throw error;
      } finally {
        state.setLoadingEstimates(pageId, false);
      }
    },

    isCacheValid: (key, maxAge = 5 * 60 * 1000) => {
      // 5 minutes default
      const state = get();
      const lastFetch = state.lastFetch[key];
      if (!lastFetch) return false;

      return Date.now() - lastFetch.getTime() < maxAge;
    },

    invalidateCache: keys =>
      set(state => {
        if (!keys) {
          // Clear all cache
          return {
            questions: {},
            schedules: {},
            costEstimates: {},
            lastFetch: {},
            errors: {},
          };
        }

        const newLastFetch = { ...state.lastFetch };
        keys.forEach(key => delete newLastFetch[key]);

        return { lastFetch: newLastFetch };
      }),

    // Optimistic updates
    addQuestion: (pageId, question) =>
      set(state => ({
        questions: {
          ...state.questions,
          [pageId]: [question, ...(state.questions[pageId] || [])],
        },
      })),

    updateQuestion: (pageId, questionId, updates) =>
      set(state => ({
        questions: {
          ...state.questions,
          [pageId]:
            state.questions[pageId]?.map(q =>
              q.id === questionId ? { ...q, ...updates } : q
            ) || [],
        },
      })),

    removeQuestion: (pageId, questionId) =>
      set(state => ({
        questions: {
          ...state.questions,
          [pageId]:
            state.questions[pageId]?.filter(q => q.id !== questionId) || [],
        },
      })),

    addSchedule: (pageId, schedule) =>
      set(state => ({
        schedules: {
          ...state.schedules,
          [pageId]: [schedule, ...(state.schedules[pageId] || [])],
        },
      })),

    updateSchedule: (pageId, scheduleId, updates) =>
      set(state => ({
        schedules: {
          ...state.schedules,
          [pageId]:
            state.schedules[pageId]?.map(s =>
              s.id === scheduleId ? { ...s, ...updates } : s
            ) || [],
        },
      })),

    removeSchedule: (pageId, scheduleId) =>
      set(state => ({
        schedules: {
          ...state.schedules,
          [pageId]:
            state.schedules[pageId]?.filter(s => s.id !== scheduleId) || [],
        },
      })),
  }))
);
