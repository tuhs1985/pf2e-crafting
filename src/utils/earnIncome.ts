// PF2e Earn Income automation utility
// ------------------------------------------------------------
// This module converts the Earn Income table (CRB p.228) into
// program‑friendly data, calculates payouts for any combination
// of results, and formats a Discord‑ready summary string.

// ----- Types -------------------------------------------------
export type Proficiency = "trained" | "expert" | "master" | "legendary";
export type Result = "criticalSuccess" | "success" | "failure" | "criticalFailure";

export interface IncomeTableRow {
  level: number;               // Task level (0‑20)
  dc: number;                  // DC to achieve Success
  payouts: [number, number, number, number, number];
  //      [failure, trained, expert, master, legendary] as copper pieces
}

// ----- Data --------------------------------------------------
// 1 cp = 1, 1 sp = 10, 1 gp = 100 (Pathfinder currency ratio)
const cp = (c: number) => c;
const sp = (s: number) => s * 10;
const gp = (g: number) => g * 100;

const T: IncomeTableRow[] = [
  { level: 0,  dc: 14, payouts: [cp(1),  cp(5),     cp(5),     cp(5),     cp(5)] },
  { level: 1,  dc: 15, payouts: [cp(2),  sp(2),     sp(2),     sp(2),     sp(2)] },
  { level: 2,  dc: 16, payouts: [cp(4),  sp(3),     sp(3),     sp(3),     sp(3)] },
  { level: 3,  dc: 18, payouts: [cp(8),  sp(5),     sp(5),     sp(5),     sp(5)] },
  { level: 4,  dc: 19, payouts: [sp(1),  sp(7),     sp(8),     sp(8),     sp(8)] },
  { level: 5,  dc: 20, payouts: [sp(2),  sp(9),     gp(1),     gp(1),     gp(1)] },
  { level: 6,  dc: 22, payouts: [sp(3),  gp(1)+sp(5), gp(2),   gp(2),   gp(2)] },
  { level: 7,  dc: 23, payouts: [sp(4),  gp(2),     gp(2)+sp(5), gp(2)+sp(5), gp(2)+sp(5)] },
  { level: 8,  dc: 24, payouts: [sp(5),  gp(2)+sp(5), gp(3),   gp(3),   gp(3)] },
  { level: 9,  dc: 26, payouts: [sp(6),  gp(3),     gp(4),     gp(4),     gp(4)] },
  { level:10,  dc: 27, payouts: [sp(7),  gp(4),     gp(5),     gp(6),     gp(6)] },
  { level:11,  dc: 28, payouts: [sp(8),  gp(5),     gp(6),     gp(8),     gp(8)] },
  { level:12,  dc: 30, payouts: [sp(9),  gp(6),     gp(8),     gp(10),    gp(10)] },
  { level:13,  dc: 31, payouts: [gp(1),  gp(7),     gp(10),    gp(15),    gp(15)] },
  { level:14,  dc: 32, payouts: [gp(1)+sp(5), gp(8), gp(15),   gp(20),    gp(20)] },
  { level:15,  dc: 34, payouts: [gp(2), gp(10),     gp(20),    gp(28),    gp(28)] },
  { level:16,  dc: 35, payouts: [gp(2)+sp(5), gp(13), gp(25),  gp(36),    gp(40)] },
  { level:17,  dc: 36, payouts: [gp(3), gp(15),     gp(30),    gp(45),    gp(55)] },
  { level:18,  dc: 38, payouts: [gp(4), gp(20),     gp(45),    gp(70),    gp(90)] },
  { level:19,  dc: 39, payouts: [gp(6), gp(30),     gp(60),    gp(100),   gp(130)] },
  { level:20,  dc: 40, payouts: [gp(8), gp(40),     gp(75),    gp(150),   gp(200)] },
];

const critical20: Record<Proficiency, number> = {
  trained:   gp(50),
  expert:    gp(90),
  master:    gp(175),
  legendary: gp(300),
};

function proficiencyIndex(p: Proficiency): number {
  return ["trained", "expert", "master", "legendary"].indexOf(p) + 1;
}

export function dailyEarnings(level: number, prof: Proficiency, result: Result): number {
  if (result === "criticalFailure") return 0;
  if (level === 20 && result === "criticalSuccess") {
    return critical20[prof];
  }
  const row = T.find(r => r.level === (result === "criticalSuccess" ? level + 1 : level));
  if (!row) throw new Error(`No income row for level ${level}`);
  const col = result === "failure" ? 0 : proficiencyIndex(prof);
  return row.payouts[col];
}

export interface DayResultCounts {
  criticalSuccess: number;
  success: number;
  failure: number;
  criticalFailure: number;
}

export interface DiscordSummaryInput {
  character: string;
  endDate: string;       // YYYY-MM-DD
  days: number;          // Downtime days used
  skill: string;
  description: string;
  taskLevel: number;
  proficiency: Proficiency;
  counts: DayResultCounts;
  rollsLink: string;
  hasExperiencedProfessional?: boolean;
}

export function totalEarnings(
  level: number,
  prof: Proficiency,
  counts: DayResultCounts,
  hasEP = false,
  days?: number // Optional: for 'single result uses days' logic
): number {
  // Find which result types are nonzero
  const resultKeys: Result[] = ["criticalSuccess", "success", "failure", "criticalFailure"];
  const nonzero = resultKeys.filter(key => counts[key] > 0);

  let adjustedCounts = { ...counts };

  // If exactly one result type is nonzero, and days is provided and > 0, use days for that result type
  if (nonzero.length === 1 && days && days > 0) {
    adjustedCounts = {
      criticalSuccess: 0,
      success: 0,
      failure: 0,
      criticalFailure: 0,
      [nonzero[0]]: days,
    };
  }

  let earnings = 0;
  earnings += adjustedCounts.criticalSuccess * dailyEarnings(level, prof, "criticalSuccess");
  earnings += adjustedCounts.success * dailyEarnings(level, prof, "success");

  const failureEarnings = dailyEarnings(level, prof, "failure");
  const isExpertOrHigher = (prof === "expert" || prof === "master" || prof === "legendary");

  if (hasEP) {
    // Upgraded critical failures: always single failure payout, never doubled
    earnings += adjustedCounts.criticalFailure * failureEarnings;
    // Original failures: doubled only for expert or higher
    if (isExpertOrHigher) {
      earnings += adjustedCounts.failure * failureEarnings * 2;
    } else {
      earnings += adjustedCounts.failure * failureEarnings;
    }
  } else {
    // No EP: all failures are paid as single failures, never doubled
    earnings += adjustedCounts.failure * failureEarnings;
    // Critical failures earn nothing
  }

  return earnings;
}
function copperToString(cpValue: number): string {
  const gpPart = Math.floor(cpValue / 100);
  const spPart = Math.floor((cpValue % 100) / 10);
  const cpPart = cpValue % 10;
  const parts: string[] = [];
  if (gpPart) parts.push(`${gpPart} gp`);
  if (spPart) parts.push(`${spPart} sp`);
  if (cpPart) parts.push(`${cpPart} cp`);
  return parts.join(", ");
}

function formatMMDD(date: Date): string {
  return `${date.getMonth() + 1}`.padStart(2, "0") + "/" + `${date.getDate()}`.padStart(2, "0");
}

function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function calculateStartDate(endDate: string, days: number): string {
  const end = parseLocalDate(endDate);
  if (isNaN(end.getTime()) || days <= 0) return "";
  const start = new Date(end);
  start.setDate(end.getDate() - (days - 1));
  return formatMMDD(start);
}
export function buildDiscordSummary(data: DiscordSummaryInput): string {
  const dc = T.find(r => r.level === data.taskLevel)?.dc ?? 0;
  const money = copperToString(totalEarnings(data.taskLevel, data.proficiency, data.counts, data.hasExperiencedProfessional));
  const { counts } = data;
  const startDate = calculateStartDate(data.endDate, data.days);
  const endDate = formatMMDD(parseLocalDate(data.endDate));

  const adjustedFailures = counts.failure + (data.hasExperiencedProfessional ? counts.criticalFailure : 0);
  const remainingCritFailures = data.hasExperiencedProfessional ? 0 : counts.criticalFailure;

  // Conditionally include result counts only if greater than zero
  const resultsArray = [];
  if (counts.criticalSuccess > 0) {
    resultsArray.push(`${counts.criticalSuccess} × Critical Successes`);
  }
  if (counts.success > 0) {
    resultsArray.push(`${counts.success} × Successes`);
  }
  if (adjustedFailures > 0) {
    resultsArray.push(`${adjustedFailures} × Failures`);
  }
  if (remainingCritFailures > 0) {
    resultsArray.push(`${remainingCritFailures} × Critical Failures`);
  }
  const resultsLine = resultsArray.length > 0
    ? `**Results:** ${resultsArray.join(", ")}`
    : `**Results:** None`;

  return [
    `**Character:** ${data.character}`,
    `**Days:** ${startDate} - ${endDate}`,
    `**Skill Used:** ${data.skill}`,
    `> *${data.description}*`,
    `**Task Level Attempted:** ${capitalize(data.proficiency)} Level ${data.taskLevel}; **DC** ${dc}`,
    resultsLine,
    `**Link:** ${data.rollsLink}`,
    `**Money Earned:** ${money}`,
    data.hasExperiencedProfessional ? `*Experienced Professional applied*` : undefined,
  ].filter(Boolean).join("\n");
}
function capitalize(s: string): string { return s.slice(0,1).toUpperCase() + s.slice(1); }
