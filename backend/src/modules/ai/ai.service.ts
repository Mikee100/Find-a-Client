import { Injectable } from "@nestjs/common";
import { CurrentUserPayload } from "src/common/decorators/current-user.decorator";
import { UsersService } from "src/modules/users/users.service";
import { AiClientMatchDto } from "src/modules/ai/dto/ai-client-match.dto";
import { AiProposalTemplateDto } from "src/modules/ai/dto/ai-proposal-template.dto";

interface DeveloperMatch {
  id: string;
  username: string;
  fullName: string;
  title: string | null;
  skills: string[];
  primaryStack: string | null;
  score: number;
  scoreBreakdown: {
    completeness: number;
    skillMatches: number;
    requestedSkills: number;
    freshness: number;
    responseRate: number;
    reviewQuality: number;
    activity: number;
    relevance: number;
    weightedSignals: number;
  };
}

interface GeminiContentPart {
  text?: string;
}

interface GeminiCandidate {
  content?: {
    parts?: GeminiContentPart[];
  };
}

interface GeminiResponse {
  candidates?: GeminiCandidate[];
}

type GeminiCallFailureReason = "provider-disabled" | "missing-api-key" | "http-error" | "empty-response" | "parse-error" | "network-error";

interface GeminiCallResult<T> {
  data: T | null;
  failureReason: GeminiCallFailureReason | null;
}

@Injectable()
export class AiService {
  constructor(private readonly usersService: UsersService) {}

  private readonly knownSkills = [
    "typescript",
    "javascript",
    "node",
    "nestjs",
    "react",
    "nextjs",
    "vue",
    "angular",
    "python",
    "django",
    "flask",
    "fastapi",
    "java",
    "spring",
    "c#",
    ".net",
    "postgres",
    "mysql",
    "mongodb",
    "redis",
    "docker",
    "kubernetes",
    "aws",
    "azure",
    "gcp",
    "tailwind",
    "graphql",
    "rest api",
    "supabase",
    "prisma"
  ];

  private detectSkillsFromBrief(brief: string): string[] {
    const normalized = brief.toLowerCase();

    return this.knownSkills
      .filter((skill) => normalized.includes(skill))
      .map((skill) => (skill === "nextjs" ? "next" : skill === "rest api" ? "rest" : skill));
  }

  private inferProjectType(brief: string): string {
    const normalized = brief.toLowerCase();

    if (normalized.includes("mobile")) {
      return "mobile app";
    }

    if (normalized.includes("saas") || normalized.includes("dashboard")) {
      return "saas platform";
    }

    if (normalized.includes("ecommerce") || normalized.includes("shop")) {
      return "e-commerce";
    }

    if (normalized.includes("api")) {
      return "api/backend";
    }

    return "web application";
  }

  private getProvider() {
    const raw = (process.env.AI_PROVIDER ?? "heuristic").toLowerCase().trim();

    if (["gemini", "google", "google-gemini", "google_ai"].includes(raw)) {
      return "gemini";
    }

    return raw;
  }

  private getGeminiKey() {
    return process.env.GEMINI_API_KEY?.trim() ?? "";
  }

  private getGeminiModel() {
    return process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash";
  }

  private shouldUseGemini() {
    return this.getProvider() === "gemini" && Boolean(this.getGeminiKey());
  }

  private getGeminiUnavailableReason(): GeminiCallFailureReason {
    if (this.getProvider() !== "gemini") {
      return "provider-disabled";
    }

    if (!this.getGeminiKey()) {
      return "missing-api-key";
    }

    return "provider-disabled";
  }

  private extractJsonPayload(text: string): string {
    const fenced = text.match(/```json\s*([\s\S]*?)\s*```/i);
    if (fenced?.[1]) {
      return fenced[1].trim();
    }

    const firstBrace = text.indexOf("{");
    const lastBrace = text.lastIndexOf("}");
    if (firstBrace >= 0 && lastBrace > firstBrace) {
      return text.slice(firstBrace, lastBrace + 1).trim();
    }

    return text.trim();
  }

  private async callGeminiJson<T>(systemPrompt: string, userPrompt: string): Promise<GeminiCallResult<T>> {
    if (!this.shouldUseGemini()) {
      return {
        data: null,
        failureReason: this.getGeminiUnavailableReason()
      };
    }

    const model = this.getGeminiModel();
    const apiKey = this.getGeminiKey();
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: systemPrompt }]
          },
          contents: [
            {
              role: "user",
              parts: [{ text: userPrompt }]
            }
          ],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 900
          }
        })
      });

      if (!response.ok) {
        return {
          data: null,
          failureReason: "http-error"
        };
      }

      const payload = (await response.json()) as GeminiResponse;
      const rawText = payload.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("\n") ?? "";

      if (!rawText.trim()) {
        return {
          data: null,
          failureReason: "empty-response"
        };
      }

      const parsed = this.extractJsonPayload(rawText);
      try {
        return {
          data: JSON.parse(parsed) as T,
          failureReason: null
        };
      } catch {
        return {
          data: null,
          failureReason: "parse-error"
        };
      }
    } catch {
      return {
        data: null,
        failureReason: "network-error"
      };
    }
  }

  private buildReason(match: DeveloperMatch, requestedSkills: string[], projectType: string): string {
    const skillPool = [...(match.skills ?? []), match.primaryStack ?? ""]
      .map((item) => item.toLowerCase())
      .filter(Boolean);
    const topSkillHits = requestedSkills.filter((skill) => skillPool.some((candidate) => candidate.includes(skill))).slice(0, 3);

    const skillText =
      topSkillHits.length > 0
        ? `Strong overlap on ${topSkillHits.join(", ")}`
        : "Strong overall profile quality even with broad requirements";

    return `${skillText}, with a ${match.scoreBreakdown.responseRate}% response reliability signal and active portfolio relevance for ${projectType}.`;
  }

  async matchClientToDevelopers(user: CurrentUserPayload, dto: AiClientMatchDto) {
    const brief = dto.brief.trim();
    const autoSkills = this.detectSkillsFromBrief(brief);
    const mergedSkills = [...new Set([...(dto.requiredSkills ?? []), ...autoSkills].map((skill) => skill.toLowerCase().trim()))]
      .filter(Boolean)
      .slice(0, 8);
    const projectType = dto.projectType?.trim() || this.inferProjectType(brief);
    const limit = dto.limit ?? 3;

    const ranked = (await this.usersService.searchDevelopers({
      q: brief,
      skills: mergedSkills,
      limit
    })) as DeveloperMatch[];

    const matches = ranked.slice(0, limit).map((candidate, index) => {
      const reason = this.buildReason(candidate, mergedSkills, projectType);

      return {
        rank: index + 1,
        fitScore: candidate.score,
        reason,
        developer: {
          id: candidate.id,
          username: candidate.username,
          fullName: candidate.fullName,
          title: candidate.title,
          primaryStack: candidate.primaryStack,
          skills: candidate.skills
        },
        scoreBreakdown: candidate.scoreBreakdown,
        nextMessageSuggestion: `Hi ${candidate.fullName}, we are planning a ${projectType} and your work on ${candidate.primaryStack ?? "similar stacks"} looks like a strong fit. Can we discuss delivery approach and timeline?`
      };
    });

    const geminiRewriteResult = await this.callGeminiJson<{
      matches: Array<{ rank: number; reason: string; nextMessageSuggestion: string }>;
    }>(
      "You are an assistant that rewrites candidate-fit explanations for a hiring marketplace. Return valid JSON only.",
      `Client brief: ${brief}\nProject type: ${projectType}\nSkills: ${mergedSkills.join(", ")}\nCandidates: ${JSON.stringify(
        matches.map((item) => ({
          rank: item.rank,
          fitScore: item.fitScore,
          name: item.developer.fullName,
          primaryStack: item.developer.primaryStack,
          skills: item.developer.skills,
          scoreBreakdown: item.scoreBreakdown
        }))
      )}\n\nReturn JSON in shape: {"matches":[{"rank":1,"reason":"...","nextMessageSuggestion":"..."}]}`
    );

    const geminiRewrites = geminiRewriteResult.data;

    const rewrittenMap = new Map<number, { reason: string; nextMessageSuggestion: string }>(
      (geminiRewrites?.matches ?? [])
        .filter((item) => Number.isInteger(item.rank) && item.rank >= 1 && Boolean(item.reason?.trim()))
        .map((item) => [item.rank, { reason: item.reason.trim(), nextMessageSuggestion: item.nextMessageSuggestion?.trim() ?? "" }])
    );

    const finalMatches = matches.map((item) => {
      const rewritten = rewrittenMap.get(item.rank);
      if (!rewritten) {
        return item;
      }

      return {
        ...item,
        reason: rewritten.reason,
        nextMessageSuggestion: rewritten.nextMessageSuggestion || item.nextMessageSuggestion
      };
    });

    return {
      brief,
      requestedBy: {
        userId: user.sub,
        role: user.role
      },
      briefAnalysis: {
        projectType,
        detectedSkills: mergedSkills,
        confidence: finalMatches.length > 0 ? 0.72 : 0.45
      },
      matches: finalMatches,
      meta: {
        model: this.shouldUseGemini() ? this.getGeminiModel() : "heuristic-ranking-v1",
        provider: this.shouldUseGemini() ? "gemini" : "heuristic",
        fallbackUsed: this.shouldUseGemini() && geminiRewriteResult.failureReason !== null,
        fallbackReason: geminiRewriteResult.failureReason,
        generatedAt: new Date().toISOString(),
        includeReasoning: dto.includeReasoning ?? true
      }
    };
  }

  async getProfileImprovements(userId: string) {
    const [me, completeness, myProjects] = await Promise.all([
      this.usersService.getMe(userId),
      this.usersService.getProfileCompleteness(userId),
      this.usersService.getMyProjects(userId)
    ]);

    const suggestions: Array<{ priority: "high" | "medium" | "low"; action: string; impact: string }> = [];

    for (const missing of completeness.missingFields.slice(0, 6)) {
      suggestions.push({
        priority: "high",
        action: missing,
        impact: "Improves discovery rank and increases trust for inbound clients."
      });
    }

    const hasFewProjects = myProjects.length < 3;
    if (hasFewProjects) {
      suggestions.push({
        priority: "medium",
        action: "Publish at least 3 portfolio projects with media and measurable outcomes.",
        impact: "Raises profile conversion and gives AI matching more evidence."
      });
    }

    const hasShortBio = (me.bio?.trim().length ?? 0) < 120;
    if (hasShortBio) {
      suggestions.push({
        priority: "medium",
        action: "Expand your bio with your niche, strongest outcomes, and target client types.",
        impact: "Improves search relevance and message response quality."
      });
    }

    const hasNoPrimaryStack = !(me.primaryStack?.trim()?.length ?? 0);
    if (hasNoPrimaryStack) {
      suggestions.push({
        priority: "high",
        action: "Set a clear primary stack to improve matching confidence.",
        impact: "Boosts fit scoring in client-to-developer ranking."
      });
    }

    const geminiSummaryResult = await this.callGeminiJson<{
      strongestSignal?: string;
      biggestGap?: string;
      estimatedDiscoveryLift?: string;
    }>(
      "You are a marketplace growth coach for developer profiles. Return valid JSON only.",
      `Profile completeness: ${JSON.stringify(completeness)}\nDraft suggestions: ${JSON.stringify(suggestions)}\nReturn JSON {"strongestSignal":"...","biggestGap":"...","estimatedDiscoveryLift":"..."}`
    );

    const geminiSummary = geminiSummaryResult.data;

    return {
      profileCompleteness: completeness,
      suggestions: suggestions.slice(0, 8),
      summary: {
        strongestSignal:
          geminiSummary?.strongestSignal?.trim() ||
          (me.skills?.length ? `Skill coverage across ${me.skills.length} listed skills` : "Portfolio base"),
        biggestGap: geminiSummary?.biggestGap?.trim() || completeness.nextAction,
        estimatedDiscoveryLift: geminiSummary?.estimatedDiscoveryLift?.trim() || (suggestions.length > 0 ? "12-25%" : "Stable")
      },
      meta: {
        model: this.shouldUseGemini() ? this.getGeminiModel() : "profile-coach-v1",
        provider: this.shouldUseGemini() ? "gemini" : "heuristic",
        fallbackUsed: this.shouldUseGemini() && geminiSummaryResult.failureReason !== null,
        fallbackReason: geminiSummaryResult.failureReason,
        generatedAt: new Date().toISOString()
      }
    };
  }

  async generateProposalTemplate(userId: string, dto: AiProposalTemplateDto) {
    const me = await this.usersService.getMe(userId);
    const skillSet = [...new Set([...(dto.skills ?? []), ...(me.skills ?? []), me.primaryStack ?? ""])].filter(Boolean);
    const brief = dto.brief.trim();
    const inferredType = dto.projectType?.trim() || this.inferProjectType(brief);

    const opening = `Thanks for sharing the project brief. I can help you deliver this ${inferredType} with a focus on reliable execution, clean architecture, and transparent communication.`;

    const approach = [
      "Discovery and scope confirmation (requirements, success metrics, constraints)",
      "Delivery in milestone sprints with weekly demos",
      "Quality pass (testing, performance checks, handover docs)"
    ];

    const timeline = dto.timelinePreference?.trim() || "4-6 weeks";
    const budget = dto.budgetRange?.trim() || "To be finalized after scope alignment";

    const clarifyingQuestion =
      "Do you already have final UI designs and prioritized must-have features for the first release?";

    const geminiProposalResult = await this.callGeminiJson<{
      opening?: string;
      approach?: string[];
      timeline?: string;
      budget?: string;
      clarifyingQuestion?: string;
      closing?: string;
    }>(
      "You are a senior freelance software proposal writer. Return valid JSON only.",
      `Developer profile: ${JSON.stringify({
        fullName: me.fullName,
        title: me.title,
        primaryStack: me.primaryStack,
        skills: me.skills
      })}\nClient brief: ${brief}\nProject type: ${inferredType}\nTimeline preference: ${timeline}\nBudget range: ${budget}\nReturn JSON {"opening":"...","approach":["..."],"timeline":"...","budget":"...","clarifyingQuestion":"...","closing":"..."}`
    );

    const geminiProposal = geminiProposalResult.data;

    const resolvedApproach = geminiProposal?.approach?.filter((step) => Boolean(step?.trim())) ?? [];

    return {
      proposal: {
        opening: geminiProposal?.opening?.trim() || opening,
        skillsHighlight: skillSet.slice(0, 8),
        approach: resolvedApproach.length > 0 ? resolvedApproach : approach,
        timeline: geminiProposal?.timeline?.trim() || timeline,
        budget: geminiProposal?.budget?.trim() || budget,
        clarifyingQuestion: geminiProposal?.clarifyingQuestion?.trim() || clarifyingQuestion,
        closing:
          geminiProposal?.closing?.trim() ||
          "If this direction aligns with your goals, I can provide a milestone-by-milestone delivery plan next."
      },
      meta: {
        model: this.shouldUseGemini() ? this.getGeminiModel() : "proposal-writer-v1",
        provider: this.shouldUseGemini() ? "gemini" : "heuristic",
        fallbackUsed: this.shouldUseGemini() && geminiProposalResult.failureReason !== null,
        fallbackReason: geminiProposalResult.failureReason,
        generatedAt: new Date().toISOString()
      }
    };
  }
}
