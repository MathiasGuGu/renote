import OpenAI from "openai";

export interface GeneratedQuestion {
  type: "multiple_choice" | "short_answer" | "essay" | "flashcard";
  question: string;
  answer?: string;
  options?: string[];
  difficulty: "easy" | "medium" | "hard";
  tags: string[];
  confidence: number;
}

export interface QuestionGenerationOptions {
  questionTypes?: string[];
  difficulty?: string;
  count?: number;
  focusAreas?: string[];
}

export class QuestionGenerator {
  private openai: OpenAI;

  constructor() {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY environment variable is required");
    }

    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async generateQuestions(
    content: string,
    title: string,
    options: QuestionGenerationOptions = {}
  ): Promise<GeneratedQuestion[]> {
    const {
      questionTypes = ["multiple_choice", "short_answer"],
      difficulty = "medium",
      count = 5,
      focusAreas = [],
    } = options;

    // Clean and prepare content
    const cleanContent = this.cleanContent(content);

    if (cleanContent.length < 100) {
      throw new Error("Content too short to generate meaningful questions");
    }

    const prompt = this.buildPrompt(cleanContent, title, {
      questionTypes,
      difficulty,
      count,
      focusAreas,
    });

    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content:
              "You are an expert educator who creates high-quality study questions from educational content. Always respond with valid JSON.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 2000,
      });

      const responseContent = response.choices[0]?.message?.content;
      if (!responseContent) {
        throw new Error("No response from AI service");
      }

      return this.parseQuestions(responseContent);
    } catch (error) {
      console.error("Error generating questions:", error);
      throw new Error("Failed to generate questions from AI service");
    }
  }

  private cleanContent(content: string): string {
    // Remove excessive whitespace and clean up formatting
    return content
      .replace(/\s+/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  private buildPrompt(
    content: string,
    title: string,
    options: QuestionGenerationOptions
  ): string {
    const { questionTypes, difficulty, count, focusAreas } = options;

    return `
Create ${count} study questions from the following content titled "${title}".

Content:
${content}

Requirements:
- Question types: ${questionTypes.join(", ")}
- Difficulty level: ${difficulty}
- Focus areas: ${focusAreas.length > 0 ? focusAreas.join(", ") : "general understanding"}

For each question, provide:
1. type: one of [${questionTypes.join(", ")}]
2. question: the actual question text
3. answer: correct answer (for short_answer) or correct option letter (for multiple_choice)
4. options: array of 4 options (only for multiple_choice, with correct answer included)
5. difficulty: easy, medium, or hard
6. tags: relevant topic tags (max 3)
7. confidence: your confidence in this question (1-100)

Respond with a JSON array of questions. Example format:
[
  {
    "type": "multiple_choice",
    "question": "What is the main concept discussed?",
    "answer": "A",
    "options": ["Correct answer", "Wrong answer 1", "Wrong answer 2", "Wrong answer 3"],
    "difficulty": "medium",
    "tags": ["concept", "main-idea"],
    "confidence": 85
  },
  {
    "type": "short_answer",
    "question": "Explain the key benefit of this approach.",
    "answer": "Sample answer explaining the key benefit...",
    "difficulty": "medium",
    "tags": ["benefits", "explanation"],
    "confidence": 90
  }
]

IMPORTANT: Respond ONLY with valid JSON, no additional text.`;
  }

  private parseQuestions(response: string): GeneratedQuestion[] {
    try {
      // Clean the response to extract JSON
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error("No JSON array found in response");
      }

      const questions = JSON.parse(jsonMatch[0]);

      if (!Array.isArray(questions)) {
        throw new Error("Response is not an array");
      }

      return questions.map((q: any) => ({
        type: q.type || "short_answer",
        question: q.question || "",
        answer: q.answer,
        options: q.options,
        difficulty: q.difficulty || "medium",
        tags: Array.isArray(q.tags) ? q.tags : [],
        confidence: Math.max(1, Math.min(100, q.confidence || 50)),
      }));
    } catch (error) {
      console.error("Error parsing AI response:", error);
      console.error("Raw response:", response);
      throw new Error("Failed to parse AI response");
    }
  }

  async estimateTokens(content: string): Promise<number> {
    // Rough estimation: ~4 characters per token
    return Math.ceil(content.length / 4);
  }

  async estimateCost(
    content: string,
    options: QuestionGenerationOptions = {}
  ): Promise<number> {
    const tokens = await this.estimateTokens(content);
    const inputCostPer1k = 0.0015; // GPT-3.5-turbo input cost
    const outputCostPer1k = 0.002; // GPT-3.5-turbo output cost
    const estimatedOutputTokens = (options.count || 5) * 100; // ~100 tokens per question

    const inputCost = (tokens / 1000) * inputCostPer1k;
    const outputCost = (estimatedOutputTokens / 1000) * outputCostPer1k;

    return inputCost + outputCost;
  }
}
