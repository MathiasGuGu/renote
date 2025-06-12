"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Brain,
  Plus,
  Trash2,
  DollarSign,
  Clock,
  AlertCircle,
  CheckCircle,
  Loader2,
  Zap,
  Calendar,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import {
  generateQuestionsForPage,
  deletePageQuestions,
  enqueueQuestionGeneration,
} from "@/app/server";
import { useNotionDataStore } from "@/lib/stores/notion-data-store";
import { useFormStore } from "@/lib/stores/form-store";

interface QuestionGeneratorProps {
  pageId: string;
  pageTitle: string;
}

export function QuestionGenerator({
  pageId,
  pageTitle,
}: QuestionGeneratorProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get data from stores
  const {
    questions: questionsMap,
    schedules: schedulesMap,
    costEstimates,
    loadingQuestions,
    loadingSchedules,
    loadingEstimates,
    fetchPageQuestions,
    fetchPageSchedules,
    fetchCostEstimate,
    setPageQuestions,
  } = useNotionDataStore();

  const {
    getQuestionForm,
    setQuestionForm,
    isSubmitting,
    setSubmitting,
    applyQuestionPreset,
  } = useFormStore();

  // Get page-specific data
  const questions = questionsMap[pageId] || [];
  const schedules = schedulesMap[pageId] || [];
  const costEstimate = costEstimates[pageId];
  const isLoadingQuestions = loadingQuestions.has(pageId);
  const isLoadingSchedules = loadingSchedules.has(pageId);
  const isLoadingEstimate = loadingEstimates.has(pageId);

  // Form state
  const form = getQuestionForm(pageId);
  const isGenerating = isSubmitting(`generate-${pageId}`);
  const isQueuing = isSubmitting(`queue-${pageId}`);

  // Load data when component is expanded
  const handleExpand = async () => {
    setIsExpanded(true);
    try {
      await Promise.all([
        fetchPageQuestions(pageId),
        fetchPageSchedules(pageId),
      ]);
    } catch (err) {
      setError("Failed to load data");
    }
  };

  // Get cost estimate
  const handleEstimateCost = async () => {
    if (!isExpanded) await handleExpand();

    try {
      await fetchCostEstimate(pageId);
    } catch (err) {
      setError("Failed to estimate cost");
    }
  };

  // Generate questions immediately
  const handleGenerateQuestions = async () => {
    if (!isExpanded) await handleExpand();

    try {
      setSubmitting(`generate-${pageId}`, true);
      setError(null);

      const result = await generateQuestionsForPage(pageId, {
        questionTypes: form.questionTypes,
        difficulty: form.difficulty,
        count: form.count,
        focusAreas: form.focusAreas,
      });

      if (result.success && result.questions) {
        setPageQuestions(pageId, result.questions);
      }
    } catch (error) {
      console.error("Error generating questions:", error);
      setError(
        error instanceof Error ? error.message : "Failed to generate questions"
      );
    } finally {
      setSubmitting(`generate-${pageId}`, false);
    }
  };

  // Queue questions for background processing
  const handleQueueQuestions = async () => {
    if (!isExpanded) await handleExpand();

    try {
      setSubmitting(`queue-${pageId}`, true);
      setError(null);

      const result = await enqueueQuestionGeneration(pageId, {
        questionTypes: form.questionTypes,
        difficulty: form.difficulty,
        count: form.count,
        focusAreas: form.focusAreas,
      });

      if (result.success) {
        alert(`Questions queued for generation! Job ID: ${result.jobId}`);
      }
    } catch (error) {
      console.error("Error queueing questions:", error);
      setError(
        error instanceof Error ? error.message : "Failed to queue questions"
      );
    } finally {
      setSubmitting(`queue-${pageId}`, false);
    }
  };

  // Delete questions
  const handleDeleteQuestions = async () => {
    if (
      !confirm("Are you sure you want to delete all questions for this page?")
    ) {
      return;
    }

    try {
      await deletePageQuestions(pageId);
      setPageQuestions(pageId, []);
    } catch (error) {
      console.error("Error deleting questions:", error);
      setError("Failed to delete questions");
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "easy":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "hard":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      default:
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "multiple_choice":
        return "MC";
      case "short_answer":
        return "SA";
      case "essay":
        return "ES";
      case "flashcard":
        return "FC";
      default:
        return "Q";
    }
  };

  // Collapsed view
  if (!isExpanded) {
    return (
      <Card className="border-l-4 border-l-blue-500">
        <CardContent className="pt-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Brain className="h-4 w-4 text-blue-600" />
              <div>
                <div className="font-medium text-sm">Question Generator</div>
                <div className="text-xs text-muted-foreground">
                  {questions.length > 0 &&
                    `${questions.length} questions available`}
                  {schedules.length > 0 &&
                    (questions.length > 0 ? " • " : "") +
                      `${schedules.length} schedule${schedules.length !== 1 ? "s" : ""}`}
                  {questions.length === 0 &&
                    schedules.length === 0 &&
                    "Generate AI questions from page content"}
                </div>
              </div>
            </div>
            <Button
              onClick={handleExpand}
              variant="outline"
              size="sm"
              className="text-blue-600"
            >
              <ChevronDown className="h-4 w-4 mr-1" />
              Open Question Generator
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Expanded view
  return (
    <Card className="border-l-4 border-l-blue-500">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Brain className="h-5 w-5 text-blue-600" />
            <div>
              <CardTitle className="text-lg">AI Question Generator</CardTitle>
              <CardDescription>
                Generate learning questions from "{pageTitle}"
              </CardDescription>
            </div>
          </div>
          <Button
            onClick={() => setIsExpanded(false)}
            variant="outline"
            size="sm"
          >
            <ChevronUp className="h-4 w-4 mr-1" />
            Collapse
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Form Presets */}
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium">Quick presets:</span>
          <Button
            onClick={() => applyQuestionPreset(pageId, "quick")}
            variant="outline"
            size="sm"
          >
            <Zap className="h-3 w-3 mr-1" />
            Quick (3 easy)
          </Button>
          <Button
            onClick={() => applyQuestionPreset(pageId, "detailed")}
            variant="outline"
            size="sm"
          >
            <Brain className="h-3 w-3 mr-1" />
            Detailed (8 mixed)
          </Button>
          <Button
            onClick={() => applyQuestionPreset(pageId, "practice")}
            variant="outline"
            size="sm"
          >
            <Calendar className="h-3 w-3 mr-1" />
            Practice (10 hard)
          </Button>
        </div>

        {/* Form Controls */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">Question Types</label>
            <div className="flex flex-wrap gap-1 mt-1">
              {["multiple_choice", "short_answer", "essay", "flashcard"].map(
                type => (
                  <Button
                    key={type}
                    onClick={() => {
                      const currentTypes = form.questionTypes;
                      const newTypes = currentTypes.includes(type)
                        ? currentTypes.filter(t => t !== type)
                        : [...currentTypes, type];
                      setQuestionForm(pageId, { questionTypes: newTypes });
                    }}
                    variant={
                      form.questionTypes.includes(type) ? "default" : "outline"
                    }
                    size="sm"
                    className="text-xs"
                  >
                    {getTypeIcon(type)}
                  </Button>
                )
              )}
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">Difficulty & Count</label>
            <div className="flex space-x-2 mt-1">
              <select
                value={form.difficulty}
                onChange={e =>
                  setQuestionForm(pageId, { difficulty: e.target.value })
                }
                className="text-xs border rounded px-2 py-1 flex-1"
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
              <input
                type="number"
                value={form.count}
                onChange={e =>
                  setQuestionForm(pageId, {
                    count: parseInt(e.target.value) || 5,
                  })
                }
                min="1"
                max="20"
                className="text-xs border rounded px-2 py-1 w-16"
              />
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-4 w-4 text-red-500" />
              <span className="text-sm text-red-700 dark:text-red-400">
                {error}
              </span>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center space-x-2">
          <Button
            onClick={handleGenerateQuestions}
            disabled={isGenerating || isQueuing}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {isGenerating ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Plus className="h-4 w-4 mr-2" />
            )}
            {isGenerating ? "Generating..." : "Generate Now"}
          </Button>

          <Button
            onClick={handleQueueQuestions}
            disabled={isGenerating || isQueuing}
            variant="outline"
          >
            {isQueuing ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Clock className="h-4 w-4 mr-2" />
            )}
            Queue for Later
          </Button>

          <Button
            variant="outline"
            onClick={handleEstimateCost}
            disabled={isLoadingEstimate}
          >
            {isLoadingEstimate ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <DollarSign className="h-4 w-4 mr-2" />
            )}
            Estimate Cost
          </Button>

          {questions.length > 0 && (
            <Button
              variant="outline"
              onClick={handleDeleteQuestions}
              className="text-red-600 border-red-300"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete All
            </Button>
          )}
        </div>

        {/* Cost Estimate */}
        {costEstimate && (
          <div className="p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-4 w-4 text-blue-500" />
              <span className="text-sm font-medium">Estimated Cost:</span>
              <span className="text-sm">${costEstimate.cost.toFixed(4)}</span>
              <span className="text-xs text-muted-foreground">
                ({costEstimate.tokens} tokens, {costEstimate.characterCount}{" "}
                chars)
              </span>
            </div>
          </div>
        )}

        {/* Generated Questions */}
        {isLoadingQuestions ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            <span className="text-sm">Loading questions...</span>
          </div>
        ) : questions.length > 0 ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">
                Generated Questions ({questions.length})
              </h4>
              <div className="flex items-center space-x-1 text-xs">
                {schedules.length > 0 && (
                  <Badge
                    variant="secondary"
                    className="bg-green-100 text-green-800"
                  >
                    <Calendar className="h-3 w-3 mr-1" />
                    {schedules.length} schedule
                    {schedules.length !== 1 ? "s" : ""}
                  </Badge>
                )}
              </div>
            </div>
            {questions.slice(0, 3).map((question, index) => (
              <div key={question.id} className="p-3 border rounded-lg">
                <div className="flex items-start space-x-2">
                  <Badge
                    className={getDifficultyColor(
                      question.difficulty || "medium"
                    )}
                  >
                    {question.difficulty || "medium"}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {getTypeIcon(question.type)}
                  </Badge>
                </div>
                <p className="text-sm mt-2 font-medium">{question.question}</p>
                {question.options && question.options.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {question.options.map((option: string, i: number) => (
                      <div key={i} className="text-xs text-muted-foreground">
                        {String.fromCharCode(65 + i)}. {option}
                      </div>
                    ))}
                  </div>
                )}
                {question.answer && (
                  <div className="mt-2 text-xs text-green-600">
                    Answer: {question.answer}
                  </div>
                )}
                {question.tags && question.tags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {question.tags.map((tag: string, i: number) => (
                      <Badge key={i} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {questions.length > 3 && (
              <div className="text-center text-sm text-muted-foreground">
                ... and {questions.length - 3} more questions
              </div>
            )}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
