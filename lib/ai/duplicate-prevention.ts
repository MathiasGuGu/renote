import { createHash } from "crypto";
import { getQuestionsByPageId } from "@/lib/db/queries/questions";

export interface QuestionFingerprint {
  contentHash: string; // Hash of question content
  conceptHash: string; // Hash of the core concept being tested
  structureHash: string; // Hash of question structure/format
  semanticHash: string; // Hash based on semantic meaning
}

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  similarity: number; // 0-100 similarity score
  duplicateType: "exact" | "semantic" | "structural" | "conceptual" | "none";
  conflictingQuestionId?: string;
  suggestions: string[]; // Suggestions to make question unique
}

export class DuplicatePreventionService {
  private static instance: DuplicatePreventionService;

  static getInstance(): DuplicatePreventionService {
    if (!DuplicatePreventionService.instance) {
      DuplicatePreventionService.instance = new DuplicatePreventionService();
    }
    return DuplicatePreventionService.instance;
  }

  /**
   * Generate comprehensive fingerprint for a question
   */
  generateQuestionFingerprint(question: {
    question: string;
    answer?: string;
    options?: string[];
    type: string;
  }): QuestionFingerprint {
    // Normalize text for comparison
    const normalizedQuestion = this.normalizeText(question.question);
    const normalizedAnswer = question.answer
      ? this.normalizeText(question.answer)
      : "";
    const normalizedOptions = question.options
      ? question.options.map(opt => this.normalizeText(opt))
      : [];

    // Content hash - exact content comparison
    const contentHash = createHash("md5")
      .update(
        normalizedQuestion + normalizedAnswer + normalizedOptions.join("")
      )
      .digest("hex");

    // Concept hash - core concept being tested
    const conceptHash = this.generateConceptHash(
      normalizedQuestion,
      normalizedAnswer
    );

    // Structure hash - question format and structure
    const structureHash = this.generateStructureHash(question);

    // Semantic hash - meaning-based comparison
    const semanticHash = this.generateSemanticHash(normalizedQuestion);

    return {
      contentHash,
      conceptHash,
      structureHash,
      semanticHash,
    };
  }

  /**
   * Check if a new question is a duplicate of existing questions
   */
  async checkForDuplicates(
    pageId: string,
    newQuestion: {
      question: string;
      answer?: string;
      options?: string[];
      type: string;
    }
  ): Promise<DuplicateCheckResult> {
    // Get existing questions for the page
    const existingQuestions = await getQuestionsByPageId(pageId);

    if (existingQuestions.length === 0) {
      return {
        isDuplicate: false,
        similarity: 0,
        duplicateType: "none",
        suggestions: [],
      };
    }

    // Generate fingerprint for new question
    const newFingerprint = this.generateQuestionFingerprint(newQuestion);

    // Check against each existing question
    let highestSimilarity = 0;
    let duplicateType: DuplicateCheckResult["duplicateType"] = "none";
    let conflictingQuestionId: string | undefined;

    for (const existing of existingQuestions) {
      const existingFingerprint = this.generateQuestionFingerprint({
        question: existing.question,
        answer: existing.answer || undefined,
        options: (existing.options as string[]) || undefined,
        type: existing.type,
      });

      const result = this.compareFingerprints(
        newFingerprint,
        existingFingerprint
      );

      if (result.similarity > highestSimilarity) {
        highestSimilarity = result.similarity;
        duplicateType = result.type;
        conflictingQuestionId = existing.id;
      }

      // If we find an exact duplicate, return immediately
      if (result.similarity >= 95) {
        break;
      }
    }

    const isDuplicate = highestSimilarity >= 80; // 80% similarity threshold
    const suggestions = isDuplicate
      ? this.generateVariationSuggestions(newQuestion, duplicateType)
      : [];

    return {
      isDuplicate,
      similarity: highestSimilarity,
      duplicateType,
      conflictingQuestionId,
      suggestions,
    };
  }

  /**
   * Generate variations of a question to avoid duplicates
   */
  async generateQuestionVariations(
    originalQuestion: {
      question: string;
      answer?: string;
      options?: string[];
      type: string;
    },
    variationCount: number = 3
  ): Promise<Array<typeof originalQuestion>> {
    const variations: Array<typeof originalQuestion> = [];

    // Different variation strategies based on question type
    switch (originalQuestion.type) {
      case "multiple_choice":
        variations.push(
          ...this.generateMultipleChoiceVariations(
            originalQuestion,
            variationCount
          )
        );
        break;
      case "short_answer":
        variations.push(
          ...this.generateShortAnswerVariations(
            originalQuestion,
            variationCount
          )
        );
        break;
      case "flashcard":
        variations.push(
          ...this.generateFlashcardVariations(originalQuestion, variationCount)
        );
        break;
      case "essay":
        variations.push(
          ...this.generateEssayVariations(originalQuestion, variationCount)
        );
        break;
    }

    return variations.slice(0, variationCount);
  }

  /**
   * Normalize text for consistent comparison
   */
  private normalizeText(text: string): string {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s]/g, "") // Remove punctuation
      .replace(/\s+/g, " ") // Normalize whitespace
      .replace(
        /\b(a|an|the|is|are|was|were|what|when|where|why|how|which)\b/g,
        ""
      ) // Remove common words
      .trim();
  }

  /**
   * Generate concept hash based on key concepts being tested
   */
  private generateConceptHash(question: string, answer: string): string {
    // Extract key concepts (this is a simplified version)
    const keyTerms = this.extractKeyTerms(question + " " + answer);
    const conceptString = keyTerms.sort().join("");

    return createHash("md5").update(conceptString).digest("hex");
  }

  /**
   * Generate structure hash based on question format
   */
  private generateStructureHash(question: {
    question: string;
    type: string;
    options?: string[];
  }): string {
    const structure = {
      type: question.type,
      hasOptions: Boolean(question.options && question.options.length > 0),
      optionCount: question.options ? question.options.length : 0,
      questionLength: this.categorizeLength(question.question.length),
      questionPattern: this.extractQuestionPattern(question.question),
    };

    return createHash("md5").update(JSON.stringify(structure)).digest("hex");
  }

  /**
   * Generate semantic hash for meaning-based comparison
   */
  private generateSemanticHash(question: string): string {
    // Simplified semantic analysis - in a real app, you might use NLP libraries
    const semanticFeatures = {
      questionWords: this.extractQuestionWords(question),
      actionWords: this.extractActionWords(question),
      subjectMatter: this.extractSubjectMatter(question),
      complexity: this.assessComplexity(question),
    };

    return createHash("md5")
      .update(JSON.stringify(semanticFeatures))
      .digest("hex");
  }

  /**
   * Compare two question fingerprints
   */
  private compareFingerprints(
    fp1: QuestionFingerprint,
    fp2: QuestionFingerprint
  ): { similarity: number; type: DuplicateCheckResult["duplicateType"] } {
    // Exact content match
    if (fp1.contentHash === fp2.contentHash) {
      return { similarity: 100, type: "exact" };
    }

    // Calculate similarity scores
    const contentSimilarity = this.calculateHashSimilarity(
      fp1.contentHash,
      fp2.contentHash
    );
    const conceptSimilarity = this.calculateHashSimilarity(
      fp1.conceptHash,
      fp2.conceptHash
    );
    const structureSimilarity = this.calculateHashSimilarity(
      fp1.structureHash,
      fp2.structureHash
    );
    const semanticSimilarity = this.calculateHashSimilarity(
      fp1.semanticHash,
      fp2.semanticHash
    );

    // Weighted average with higher weight on concept and semantic similarity
    const overallSimilarity =
      contentSimilarity * 0.2 +
      conceptSimilarity * 0.3 +
      structureSimilarity * 0.2 +
      semanticSimilarity * 0.3;

    // Determine duplicate type based on highest similarity score
    if (conceptSimilarity >= 80)
      return { similarity: overallSimilarity, type: "conceptual" };
    if (semanticSimilarity >= 80)
      return { similarity: overallSimilarity, type: "semantic" };
    if (structureSimilarity >= 80)
      return { similarity: overallSimilarity, type: "structural" };

    return { similarity: overallSimilarity, type: "none" };
  }

  /**
   * Generate suggestions to make question unique
   */
  private generateVariationSuggestions(
    question: { question: string; type: string },
    duplicateType: DuplicateCheckResult["duplicateType"]
  ): string[] {
    const suggestions: string[] = [];

    switch (duplicateType) {
      case "exact":
        suggestions.push("Rephrase the question using different wording");
        suggestions.push("Change the question format or structure");
        suggestions.push("Focus on a different aspect of the same concept");
        break;
      case "conceptual":
        suggestions.push("Ask about a related but different concept");
        suggestions.push("Change the difficulty level or complexity");
        suggestions.push("Use a different context or example");
        break;
      case "semantic":
        suggestions.push("Use synonyms or alternative phrasing");
        suggestions.push("Change the perspective or viewpoint");
        suggestions.push("Add specific details or context");
        break;
      case "structural":
        suggestions.push(
          "Change the question type (e.g., multiple choice to short answer)"
        );
        suggestions.push("Modify the number of options (for multiple choice)");
        suggestions.push("Restructure the question format");
        break;
    }

    return suggestions;
  }

  /**
   * Generate multiple choice variations
   */
  private generateMultipleChoiceVariations(
    original: {
      question: string;
      answer?: string;
      options?: string[];
      type: string;
    },
    count: number
  ): Array<typeof original> {
    const variations: Array<typeof original> = [];

    for (let i = 0; i < count; i++) {
      const variation = {
        ...original,
        question: this.rephraseQuestion(original.question),
        type: original.type,
      };

      // Shuffle options if available
      if (original.options && original.options.length > 0) {
        const shuffledOptions = [...original.options];
        for (let j = shuffledOptions.length - 1; j > 0; j--) {
          const k = Math.floor(Math.random() * (j + 1));
          [shuffledOptions[j], shuffledOptions[k]] = [
            shuffledOptions[k],
            shuffledOptions[j],
          ];
        }
        variation.options = shuffledOptions;
      }

      variations.push(variation);
    }

    return variations;
  }

  /**
   * Generate short answer variations
   */
  private generateShortAnswerVariations(
    original: { question: string; answer?: string; type: string },
    count: number
  ): Array<typeof original> {
    const variations: Array<typeof original> = [];

    for (let i = 0; i < count; i++) {
      variations.push({
        ...original,
        question: this.changeQuestionAngle(original.question),
        type: original.type,
      });
    }

    return variations;
  }

  /**
   * Generate flashcard variations
   */
  private generateFlashcardVariations(
    original: { question: string; answer?: string; type: string },
    count: number
  ): Array<typeof original> {
    const variations: Array<typeof original> = [];

    for (let i = 0; i < count; i++) {
      // For flashcards, we can reverse the question-answer relationship
      if (i % 2 === 0 && original.answer) {
        variations.push({
          question: `What is the definition of: ${original.answer}?`,
          answer: original.question.replace(
            /^What is |What are |Define |Explain /,
            ""
          ),
          type: "flashcard",
        });
      } else {
        variations.push({
          ...original,
          question: this.addContextToQuestion(original.question),
          type: "flashcard",
        });
      }
    }

    return variations;
  }

  /**
   * Generate essay variations
   */
  private generateEssayVariations(
    original: { question: string; answer?: string; type: string },
    count: number
  ): Array<typeof original> {
    const variations: Array<typeof original> = [];

    for (let i = 0; i < count; i++) {
      variations.push({
        ...original,
        question: this.reformatQuestion(original.question),
        type: original.type,
      });
    }

    return variations;
  }

  // Helper methods for text analysis and manipulation
  private extractKeyTerms(text: string): string[] {
    // Simplified key term extraction
    return text
      .split(/\s+/)
      .filter(word => word.length > 3)
      .filter(
        word =>
          !/^(the|and|but|for|are|was|were|been|have|has|had|will|would|could|should)$/.test(
            word
          )
      );
  }

  private categorizeLength(length: number): string {
    if (length < 50) return "short";
    if (length < 150) return "medium";
    return "long";
  }

  private extractQuestionPattern(question: string): string {
    const patterns = [
      /^what/i,
      /^when/i,
      /^where/i,
      /^why/i,
      /^how/i,
      /^which/i,
      /^who/i,
    ];

    for (const pattern of patterns) {
      if (pattern.test(question)) {
        return pattern.source.replace(/[^a-z]/gi, "");
      }
    }

    return "statement";
  }

  private extractQuestionWords(question: string): string[] {
    const questionWords =
      question.match(/\b(what|when|where|why|how|which|who)\b/gi) || [];
    return questionWords.map(word => word.toLowerCase());
  }

  private extractActionWords(question: string): string[] {
    const actionWords =
      question.match(
        /\b(define|explain|describe|analyze|compare|evaluate|discuss|identify)\b/gi
      ) || [];
    return actionWords.map(word => word.toLowerCase());
  }

  private extractSubjectMatter(question: string): string[] {
    // Simplified subject matter extraction
    // In a real implementation, you might use NLP libraries or domain-specific dictionaries
    const commonSubjects = [
      "science",
      "history",
      "math",
      "literature",
      "technology",
      "business",
      "art",
    ];
    return commonSubjects.filter(subject =>
      question.toLowerCase().includes(subject)
    );
  }

  private assessComplexity(question: string): number {
    // Simple complexity assessment based on sentence length and vocabulary
    const words = question.split(/\s+/);
    const avgWordLength =
      words.reduce((sum, word) => sum + word.length, 0) / words.length;
    const sentenceLength = words.length;

    return Math.min(10, Math.round((avgWordLength + sentenceLength / 10) / 2));
  }

  private calculateHashSimilarity(hash1: string, hash2: string): number {
    if (hash1 === hash2) return 1;

    // Simple character-based similarity for demonstration
    // In a real implementation, you might use more sophisticated algorithms
    let matches = 0;
    const minLength = Math.min(hash1.length, hash2.length);

    for (let i = 0; i < minLength; i++) {
      if (hash1[i] === hash2[i]) matches++;
    }

    return matches / Math.max(hash1.length, hash2.length);
  }

  private rephraseQuestion(question: string): string {
    // Simple rephrasing logic - in a real app, you might use AI or NLP libraries
    const rephrasings = [
      { from: /^What is/, to: "Define" },
      { from: /^What are/, to: "List" },
      { from: /^How does/, to: "Explain how" },
      { from: /^Why is/, to: "What makes" },
      { from: /^When did/, to: "At what time did" },
    ];

    let rephrased = question;
    for (const { from, to } of rephrasings) {
      if (from.test(question)) {
        rephrased = question.replace(from, to);
        break;
      }
    }

    return rephrased;
  }

  private reformatQuestion(question: string): string {
    if (question.startsWith("What")) {
      return `Which of the following best describes ${question.substring(5)}`;
    }
    return question;
  }

  private changeQuestionAngle(question: string): string {
    // Change the perspective or focus of the question
    if (question.includes("advantages")) {
      return question.replace("advantages", "benefits");
    }
    if (question.includes("process")) {
      return question.replace("process", "steps involved in");
    }
    return question;
  }

  private addContextToQuestion(question: string): string {
    return `In the context of the source material, ${question.toLowerCase()}`;
  }

  private extractMainTopic(question: string): string {
    // Extract the main topic from a question
    const words = question.split(/\s+/);
    return words.slice(-3).join(" "); // Simple approach - take last 3 words
  }
}

/**
 * Public API functions
 */
export async function checkQuestionDuplicate(
  pageId: string,
  question: {
    question: string;
    answer?: string;
    options?: string[];
    type: string;
  }
): Promise<DuplicateCheckResult> {
  const service = DuplicatePreventionService.getInstance();
  return await service.checkForDuplicates(pageId, question);
}

export async function generateUniqueQuestions(
  pageId: string,
  baseQuestions: Array<{
    question: string;
    answer?: string;
    options?: string[];
    type: string;
  }>
): Promise<
  Array<{
    question: string;
    answer?: string;
    options?: string[];
    type: string;
    isUnique: boolean;
    duplicateInfo?: DuplicateCheckResult;
  }>
> {
  const service = DuplicatePreventionService.getInstance();
  const uniqueQuestions: Array<{
    question: string;
    answer?: string;
    options?: string[];
    type: string;
    isUnique: boolean;
    duplicateInfo?: DuplicateCheckResult;
  }> = [];

  for (const question of baseQuestions) {
    const duplicateCheck = await service.checkForDuplicates(pageId, question);

    if (!duplicateCheck.isDuplicate) {
      uniqueQuestions.push({
        ...question,
        isUnique: true,
      });
    } else {
      // Generate variations if duplicate
      const variations = await service.generateQuestionVariations(question, 1);

      if (variations.length > 0) {
        const variation = variations[0];
        const variationCheck = await service.checkForDuplicates(
          pageId,
          variation
        );

        uniqueQuestions.push({
          ...variation,
          isUnique: !variationCheck.isDuplicate,
          duplicateInfo: duplicateCheck,
        });
      }
    }
  }

  return uniqueQuestions;
}
