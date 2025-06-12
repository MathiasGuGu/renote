import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";

export interface JobHistoryRecord {
  id: string;
  jobId: string;
  jobType: string;
  status: string;
  entityId?: string | null;
  entityType?: string | null;
  jobData?: any | null;
  result?: any | null;
  error?: string | null;
  startedAt?: Date | null;
  completedAt?: Date | null;
  duration?: number | null;
  retryCount?: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface JobQueueState {
  // State
  jobs: JobHistoryRecord[];
  isLoading: boolean;
  error: string | null;
  isPolling: boolean;
  lastFetch: Date | null;
  pollInterval: number; // in ms

  // Actions
  setJobs: (jobs: JobHistoryRecord[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setPolling: (polling: boolean) => void;
  addJob: (job: JobHistoryRecord) => void;
  updateJob: (jobId: string, updates: Partial<JobHistoryRecord>) => void;
  removeJob: (jobId: string) => void;
  refreshJobs: () => Promise<void>;
  startPolling: () => void;
  stopPolling: () => void;
  togglePolling: () => void;

  // Internal
  _pollTimeoutId: NodeJS.Timeout | null;
  _setPollTimeoutId: (id: NodeJS.Timeout | null) => void;
}

let jobQueueStore: any = null;

export const useJobQueueStore = create<JobQueueState>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    jobs: [],
    isLoading: false,
    error: null,
    isPolling: false,
    lastFetch: null,
    pollInterval: 120000, // 2 minutes (reduced frequency)
    _pollTimeoutId: null,

    // Actions
    setJobs: jobs => set({ jobs, lastFetch: new Date() }),

    setLoading: isLoading => set({ isLoading }),

    setError: error => set({ error }),

    setPolling: isPolling => {
      set({ isPolling });
      if (isPolling) {
        get().startPolling();
      } else {
        get().stopPolling();
      }
    },

    addJob: job =>
      set(state => ({
        jobs: [job, ...state.jobs],
      })),

    updateJob: (jobId, updates) =>
      set(state => ({
        jobs: state.jobs.map(job =>
          job.jobId === jobId ? { ...job, ...updates } : job
        ),
      })),

    removeJob: jobId =>
      set(state => ({
        jobs: state.jobs.filter(job => job.jobId !== jobId),
      })),

    refreshJobs: async () => {
      const state = get();
      if (state.isLoading) return; // Prevent concurrent requests

      try {
        state.setLoading(true);
        state.setError(null);

        // Dynamic import to avoid circular dependencies
        const { getUserJobHistory } = await import("@/app/server");
        const jobs = await getUserJobHistory(20, 0);

        state.setJobs(jobs);
      } catch (error) {
        console.error("Error fetching jobs:", error);
        state.setError("Failed to load job history");
      } finally {
        state.setLoading(false);
      }
    },

    startPolling: () => {
      const state = get();

      // Clear existing timeout
      if (state._pollTimeoutId) {
        clearTimeout(state._pollTimeoutId);
      }

      // Set up new polling
      const timeoutId = setTimeout(() => {
        if (get().isPolling) {
          get()
            .refreshJobs()
            .then(() => {
              // Schedule next poll
              get().startPolling();
            });
        }
      }, state.pollInterval);

      state._setPollTimeoutId(timeoutId);
    },

    stopPolling: () => {
      const state = get();
      if (state._pollTimeoutId) {
        clearTimeout(state._pollTimeoutId);
        state._setPollTimeoutId(null);
      }
    },

    togglePolling: () => {
      const state = get();
      state.setPolling(!state.isPolling);
    },

    _setPollTimeoutId: id => set({ _pollTimeoutId: id }),
  }))
);

// Initialize polling when store is first accessed (removed auto-start)
// Polling will be started manually by components that need it

// Cleanup on page unload
if (typeof window !== "undefined") {
  window.addEventListener("beforeunload", () => {
    useJobQueueStore.getState().stopPolling();
  });
}
