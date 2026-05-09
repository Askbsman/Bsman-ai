import type { AnalyzeMode } from "../schemas/analyze-request.js";
import type { DetectedPattern } from "../schemas/analyze-response.js";
import scamCards from "../data/scam-cards.json" with { type: "json" };
import manipulationCards from "../data/manipulation-cards.json" with { type: "json" };
import { normalizeText } from "../utils/normalize.js";

type PatternCard = {
  id: string;
  name: string;
  category: string;
  description: string;
  common_phrases: string[];
  risk_weight: number;
  red_flags?: string[];
  signals?: string[];
};

type CardSource = "scam" | "manipulation";

type ScoreResult = {
  score: number;
  detectedPatterns: DetectedPattern[];
  redFlags: string[];
};

type ScorableCard = PatternCard & {
  source: CardSource;
};

const urgencyBoosters = [
  "today",
  "now",
  "immediately",
  "before midnight",
  "expires",
  "one hour",
  "limited time"
];

const unsafePaymentBoosters = [
  "gift card",
  "prepaid card",
  "wire money",
  "wire transfer",
  "crypto",
  "bitcoin",
  "seed phrase",
  "private key",
  "one time code",
  "otp",
  "gift cards",
  "prepaid cards",
  "wire transfer",
  "card details"
];

const impersonationBoosters = [
  "this is the ceo",
  "tax authority",
  "discord admin",
  "telegram admin",
  "new number",
  "support agent",
  "this is support"
];

const verificationAvoidanceBoosters = [
  "do not ask anyone else",
  "do not tell anyone",
  "cannot talk right now",
  "do not call",
  "no need to verify",
  "keep this between us"
];

const offerDetailSignals = [
  "company portal",
  "official website",
  "written terms",
  "contract",
  "interview",
  "view the apartment",
  "marketplace checkout",
  "account settings"
];

function cardsForMode(mode: AnalyzeMode): ScorableCard[] {
  const scamMode = mode !== "manipulation_check";
  const manipulationMode =
    mode === "dialogue_check" ||
    mode === "manipulation_check" ||
    mode === "safe_reply";

  return [
    ...(scamMode
      ? (scamCards as PatternCard[]).map((card) => ({
          ...card,
          source: "scam" as const
        }))
      : []),
    ...(manipulationMode
      ? (manipulationCards as PatternCard[]).map((card) => ({
          ...card,
          source: "manipulation" as const
        }))
      : [])
  ];
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function exactIndex(input: string, phrase: string): number {
  return input.toLowerCase().indexOf(phrase.toLowerCase());
}

function evidenceSnippet(input: string, matchedPhrases: string[]): string {
  const firstExactPhrase = matchedPhrases.find((phrase) => exactIndex(input, phrase) >= 0);
  const index = firstExactPhrase ? exactIndex(input, firstExactPhrase) : 0;
  let start = Math.max(0, index - 45);
  if (start > 0) {
    const nextSpace = input.indexOf(" ", start);
    if (nextSpace > start && nextSpace < index) {
      start = nextSpace + 1;
    }
  }
  const raw = input.slice(start, start + 160).replace(/\s+/g, " ").trim();
  if (raw.length <= 160) return raw;
  return raw.slice(0, 157).trimEnd() + "...";
}

function confidenceFor(card: PatternCard, matchedPhrases: string[], snippet: string): number {
  const phraseCoverage = clamp(matchedPhrases.length / 4, 0, 0.3);
  const riskStrength = clamp(card.risk_weight / 100, 0, 1) * 0.25;
  const evidenceQuality = matchedPhrases.some((phrase) =>
    snippet.toLowerCase().includes(phrase.toLowerCase())
  )
    ? 0.2
    : 0.08;
  const redFlagStrength = clamp((card.red_flags ?? card.signals ?? []).length / 4, 0, 1) * 0.15;
  return Number(clamp(0.1 + phraseCoverage + riskStrength + evidenceQuality + redFlagStrength, 0, 1).toFixed(2));
}

function modeAdjustedWeight(mode: AnalyzeMode, card: ScorableCard, phraseCount: number): number {
  let weight = card.risk_weight + Math.min((phraseCount - 1) * 6, 18);

  if (mode === "manipulation_check" && card.source === "scam") {
    weight *= 0.25;
  }
  if (mode === "offer_check" && card.source === "manipulation") {
    weight *= 0.35;
  }
  if (mode === "dialogue_check" && card.source === "scam") {
    weight *= 0.85;
  }
  if (mode === "scam_check" && card.source === "manipulation") {
    weight *= 0.2;
  }

  return Math.round(clamp(weight, 0, 100));
}

function normalizedPatternScore(patterns: DetectedPattern[]): number {
  if (patterns.length === 0) return 0;

  const sorted = [...patterns].sort((a, b) => b.weight - a.weight);
  return sorted.reduce((total, pattern, index) => {
    if (index === 0) return total + pattern.weight;
    if (index === 1) return total + pattern.weight * 0.35;
    return total + pattern.weight * 0.16;
  }, 0);
}

function boosterScore(mode: AnalyzeMode, input: string, redFlags: string[]): number {
  const normalizedInput = normalizeText(input);
  let score = 0;

  const urgencyMatches = urgencyBoosters.filter((phrase) =>
    normalizedInput.includes(normalizeText(phrase))
  );
  if (urgencyMatches.length > 0) {
    score += Math.min(urgencyMatches.length * (mode === "dialogue_check" ? 5 : 4), 14);
    redFlags.push("Uses urgency or deadline pressure.");
  }

  const paymentMatches = unsafePaymentBoosters.filter((phrase) =>
    normalizedInput.includes(normalizeText(phrase))
  );
  if (paymentMatches.length > 0 && mode !== "manipulation_check") {
    score += Math.min(paymentMatches.length * 6, 22);
    redFlags.push("Requests a risky payment method, credential, or verification code.");
  }

  const impersonationMatches = impersonationBoosters.filter((phrase) =>
    normalizedInput.includes(normalizeText(phrase))
  );
  if (impersonationMatches.length > 0 && mode !== "manipulation_check") {
    score += Math.min(impersonationMatches.length * 7, 18);
    redFlags.push("Uses impersonation or unverifiable identity claims.");
  }

  const avoidanceMatches = verificationAvoidanceBoosters.filter((phrase) =>
    normalizedInput.includes(normalizeText(phrase))
  );
  if (avoidanceMatches.length > 0 && mode !== "offer_check") {
    score += Math.min(avoidanceMatches.length * 5, 16);
    redFlags.push("Avoids independent verification or outside advice.");
  }

  if (mode === "offer_check") {
    const offerLike =
      normalizedInput.includes("offer") ||
      normalizedInput.includes("job") ||
      normalizedInput.includes("investment") ||
      normalizedInput.includes("loan") ||
      normalizedInput.includes("rental") ||
      normalizedInput.includes("deposit");
    const hasVerifiableDetails = offerDetailSignals.some((phrase) =>
      normalizedInput.includes(normalizeText(phrase))
    );
    if (offerLike && !hasVerifiableDetails) {
      score += 8;
      redFlags.push("Offer lacks clear independently verifiable details.");
    }
  }

  return score;
}

export function scoreInput(mode: AnalyzeMode, input: string): ScoreResult {
  const normalizedInput = normalizeText(input);
  const detectedPatterns: DetectedPattern[] = [];
  const redFlags: string[] = [];

  for (const card of cardsForMode(mode)) {
    const matchedPhrases = card.common_phrases.filter((phrase) =>
      normalizedInput.includes(normalizeText(phrase))
    );

    if (matchedPhrases.length === 0) continue;

    const weight = modeAdjustedWeight(mode, card, matchedPhrases.length);
    const snippet = evidenceSnippet(input, matchedPhrases);
    redFlags.push(...(card.red_flags ?? card.signals ?? []));
    detectedPatterns.push({
      id: card.id,
      name: card.name,
      category: card.category,
      weight,
      matched_phrases: matchedPhrases,
      confidence: confidenceFor(card, matchedPhrases, snippet),
      evidence_snippet: snippet
    });
  }

  const score = normalizedPatternScore(detectedPatterns) + boosterScore(mode, input, redFlags);

  return {
    score: Math.round(Math.min(score, 100)),
    detectedPatterns: detectedPatterns.sort((a, b) => b.weight - a.weight),
    redFlags: unique(redFlags)
  };
}
