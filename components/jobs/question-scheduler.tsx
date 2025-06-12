"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Calendar,
  Clock,
  Play,
  Pause,
  Trash2,
  Plus,
  Settings,
  Loader2,
} from "lucide-react";
import {
  createPageSchedule,
  updatePageSchedule,
  deletePageSchedule,
} from "@/app/server";
import { useNotionDataStore } from "@/lib/stores/notion-data-store";
import { useFormStore } from "@/lib/stores/form-store";

interface QuestionSchedule {
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

interface QuestionSchedulerProps {
  pageId: string;
  pageTitle: string;
}

export function QuestionScheduler({
  pageId,
  pageTitle,
}: QuestionSchedulerProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] =
    useState<QuestionSchedule | null>(null);
  const [showSchedules, setShowSchedules] = useState(false);

  // Get data from stores
  const {
    schedules: schedulesMap,
    loadingSchedules,
    fetchPageSchedules,
    setPageSchedules,
  } = useNotionDataStore();

  const {
    getScheduleForm,
    setScheduleForm,
    resetScheduleForm,
    isSubmitting,
    setSubmitting,
    applySchedulePreset,
  } = useFormStore();

  // Get page-specific data
  const schedules = schedulesMap[pageId] || [];
  const isLoading = loadingSchedules.has(pageId);

  // Form state
  const formKey = editingSchedule
    ? `edit-${editingSchedule.id}`
    : `new-${pageId}`;
  const form = getScheduleForm(formKey, pageId);

  const loadSchedules = async () => {
    try {
      setShowSchedules(true);
      await fetchPageSchedules(pageId);
    } catch (error) {
      console.error("Error loading schedules:", error);
    }
  };

  const resetForm = () => {
    resetScheduleForm(formKey);
    setEditingSchedule(null);
  };

  const openCreateDialog = () => {
    setEditingSchedule(null);
    resetScheduleForm(`new-${pageId}`);
    setIsDialogOpen(true);
  };

  const openEditDialog = (schedule: QuestionSchedule) => {
    setEditingSchedule(schedule);
    setScheduleForm(`edit-${schedule.id}`, {
      pageId,
      name: schedule.name,
      frequency: schedule.frequency,
      questionTypes: schedule.questionTypes || [
        "multiple_choice",
        "short_answer",
      ],
      difficulty: schedule.difficulty || "medium",
      questionCount: schedule.questionCount || 5,
      focusAreas: schedule.focusAreas?.join(", ") || "",
      isActive: schedule.isActive ?? true,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      alert("Please provide a name for the schedule");
      return;
    }

    try {
      setSubmitting(formKey, true);

      const scheduleData = {
        pageId,
        name: form.name.trim(),
        frequency: form.frequency,
        questionTypes: form.questionTypes,
        difficulty: form.difficulty,
        questionCount: form.questionCount,
        focusAreas: form.focusAreas
          .split(",")
          .map(area => area.trim())
          .filter(Boolean),
      };

      if (editingSchedule) {
        await updatePageSchedule(editingSchedule.id, scheduleData);
      } else {
        await createPageSchedule(scheduleData);
      }

      setIsDialogOpen(false);
      resetForm();
      // Refresh schedules
      await fetchPageSchedules(pageId, true);
    } catch (error) {
      console.error("Error saving schedule:", error);
      alert("Failed to save schedule");
    } finally {
      setSubmitting(formKey, false);
    }
  };

  const handleToggleActive = async (schedule: QuestionSchedule) => {
    try {
      await updatePageSchedule(schedule.id, {
        isActive: !schedule.isActive,
      });
      // Refresh schedules
      await fetchPageSchedules(pageId, true);
    } catch (error) {
      console.error("Error toggling schedule:", error);
    }
  };

  const handleDelete = async (scheduleId: string) => {
    if (!confirm("Are you sure you want to delete this schedule?")) {
      return;
    }

    try {
      await deletePageSchedule(scheduleId);
      // Refresh schedules
      await fetchPageSchedules(pageId, true);
    } catch (error) {
      console.error("Error deleting schedule:", error);
    }
  };

  const formatFrequency = (freq: string) => {
    return freq.charAt(0).toUpperCase() + freq.slice(1);
  };

  const formatNextRun = (nextRun?: Date | null) => {
    if (!nextRun) return "Not scheduled";
    return new Date(nextRun).toLocaleString();
  };

  // Show button to load schedules if not loaded yet
  if (!showSchedules) {
    return (
      <Card className="border-l-4 border-l-purple-500">
        <CardContent className="pt-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-purple-600" />
              <div>
                <div className="font-medium text-sm">Question Scheduler</div>
                <div className="text-xs text-muted-foreground">
                  Set up automated question generation schedules
                </div>
              </div>
            </div>
            <Button
              onClick={loadSchedules}
              variant="outline"
              size="sm"
              className="text-purple-600"
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Calendar className="h-4 w-4 mr-1" />
              )}
              Load Schedules
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-l-4 border-l-purple-500">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Calendar className="h-5 w-5 text-purple-600" />
            <div>
              <CardTitle className="text-lg">Question Scheduler</CardTitle>
              <CardDescription>
                Automated question generation for "{pageTitle}"
              </CardDescription>
            </div>
          </div>
          <Button
            onClick={openCreateDialog}
            size="sm"
            className="bg-purple-600 hover:bg-purple-700"
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Schedule
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            <span className="text-sm">Loading schedules...</span>
          </div>
        ) : schedules.length > 0 ? (
          <div className="space-y-3">
            {schedules.map(schedule => (
              <div
                key={schedule.id}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <h4 className="font-medium">{schedule.name}</h4>
                    <Badge
                      variant={schedule.isActive ? "default" : "secondary"}
                      className={
                        schedule.isActive
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-800"
                      }
                    >
                      {schedule.isActive ? "Active" : "Paused"}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {formatFrequency(schedule.frequency)}
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    {schedule.questionCount || 5} questions •{" "}
                    {schedule.difficulty || "medium"} difficulty •{" "}
                    {schedule.questionTypes?.join(", ") ||
                      "multiple choice, short answer"}
                    {schedule.runCount !== undefined && (
                      <span> • {schedule.runCount} runs</span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Next: {formatNextRun(schedule.nextRun)}
                    {schedule.lastRun && (
                      <span className="ml-2">
                        Last: {new Date(schedule.lastRun).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    onClick={() => handleToggleActive(schedule)}
                    variant="outline"
                    size="sm"
                  >
                    {schedule.isActive ? (
                      <Pause className="h-3 w-3" />
                    ) : (
                      <Play className="h-3 w-3" />
                    )}
                  </Button>
                  <Button
                    onClick={() => openEditDialog(schedule)}
                    variant="outline"
                    size="sm"
                  >
                    <Settings className="h-3 w-3" />
                  </Button>
                  <Button
                    onClick={() => handleDelete(schedule.id)}
                    variant="outline"
                    size="sm"
                    className="text-red-600"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 text-muted-foreground">
            <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No schedules configured</p>
            <p className="text-sm">
              Create a schedule to automate question generation
            </p>
          </div>
        )}

        {/* Schedule Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingSchedule ? "Edit Schedule" : "Create Schedule"}
              </DialogTitle>
              <DialogDescription>
                Configure automated question generation for "{pageTitle}"
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {/* Quick Presets */}
              <div className="flex space-x-2">
                <Button
                  onClick={() => applySchedulePreset(formKey, pageId, "daily")}
                  variant="outline"
                  size="sm"
                  type="button"
                >
                  Daily Review
                </Button>
                <Button
                  onClick={() => applySchedulePreset(formKey, pageId, "weekly")}
                  variant="outline"
                  size="sm"
                  type="button"
                >
                  Weekly Deep
                </Button>
                <Button
                  onClick={() => applySchedulePreset(formKey, pageId, "study")}
                  variant="outline"
                  size="sm"
                  type="button"
                >
                  Study Session
                </Button>
              </div>

              {/* Form Fields */}
              <div className="grid gap-4">
                <div>
                  <Label htmlFor="name">Schedule Name</Label>
                  <Input
                    id="name"
                    value={form.name}
                    onChange={e =>
                      setScheduleForm(formKey, { name: e.target.value })
                    }
                    placeholder="e.g., Daily Review"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="frequency">Frequency</Label>
                    <Select
                      value={form.frequency}
                      onValueChange={value =>
                        setScheduleForm(formKey, { frequency: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="on_change">
                          On Content Change
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="difficulty">Difficulty</Label>
                    <Select
                      value={form.difficulty}
                      onValueChange={value =>
                        setScheduleForm(formKey, { difficulty: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="easy">Easy</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="hard">Hard</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="questionCount">Question Count</Label>
                    <Input
                      id="questionCount"
                      type="number"
                      value={form.questionCount}
                      onChange={e =>
                        setScheduleForm(formKey, {
                          questionCount: parseInt(e.target.value) || 5,
                        })
                      }
                      min="1"
                      max="20"
                    />
                  </div>

                  <div>
                    <Label
                      htmlFor="isActive"
                      className="flex items-center space-x-2"
                    >
                      <span>Active</span>
                      <Switch
                        id="isActive"
                        checked={form.isActive}
                        onCheckedChange={checked =>
                          setScheduleForm(formKey, { isActive: checked })
                        }
                      />
                    </Label>
                  </div>
                </div>

                <div>
                  <Label htmlFor="questionTypes">Question Types</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {[
                      "multiple_choice",
                      "short_answer",
                      "essay",
                      "flashcard",
                    ].map(type => (
                      <Button
                        key={type}
                        onClick={() => {
                          const current = form.questionTypes;
                          const updated = current.includes(type)
                            ? current.filter(t => t !== type)
                            : [...current, type];
                          setScheduleForm(formKey, { questionTypes: updated });
                        }}
                        variant={
                          form.questionTypes.includes(type)
                            ? "default"
                            : "outline"
                        }
                        size="sm"
                        type="button"
                      >
                        {type.replace("_", " ")}
                      </Button>
                    ))}
                  </div>
                </div>

                <div>
                  <Label htmlFor="focusAreas">
                    Focus Areas (comma-separated)
                  </Label>
                  <Textarea
                    id="focusAreas"
                    value={form.focusAreas}
                    onChange={e =>
                      setScheduleForm(formKey, { focusAreas: e.target.value })
                    }
                    placeholder="e.g., key concepts, definitions, examples"
                    rows={2}
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <Button
                onClick={() => setIsDialogOpen(false)}
                variant="outline"
                type="button"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting(formKey)}
                type="button"
              >
                {isSubmitting(formKey) ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : null}
                {editingSchedule ? "Update" : "Create"} Schedule
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
