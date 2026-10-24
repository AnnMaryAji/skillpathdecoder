import { describe, expect, it } from "vitest";

import { fingerprintEventSkill, fingerprintQuizSkill, fingerprintSkill, gradeQuiz, parseGeneratedQuiz, parseStoredQuiz } from "./quiz";
import { generateCareerRoadmap } from "./roadmap";

const quizData = {
  questions: Array.from({ length: 5 }, (_, index) => ({
    prompt: `What is the best next step for skill question ${index + 1}?`,
    options: ["Review the evidence", "Ignore the result", "Guess without context", "Delete the work"],
    correctAnswerIndex: 0,
    explanation: "Reviewing the evidence helps you make a reliable, informed decision.",
  })),
};

describe("generated skill quizzes", () => {
  it("grades completed answers as a percentage", () => {
    expect(gradeQuiz(parseGeneratedQuiz(quizData), [0, 0, 1, 0, 1])).toEqual({
      correct: 3,
      total: 5,
      percentage: 60,
    });
  });

  it("rejects an incomplete or malformed generated quiz", () => {
    expect(() => parseGeneratedQuiz({ questions: [] })).toThrow();
  });

  it("grades legacy quiz attempts stored as a question array", () => {
    expect(gradeQuiz(parseStoredQuiz(quizData.questions), [0, 0, 0, 0, 0])).toEqual({
      correct: 5,
      total: 5,
      percentage: 100,
    });
  });

  it("accepts newly stored quiz attempts in the current object format", () => {
    expect(parseStoredQuiz(quizData).questions).toHaveLength(5);
  });

  it("binds saved quiz scores to the exact roadmap skill definition", () => {
    const skill = generateCareerRoadmap("Data Analyst").skills[0];
    const editedSkill = { ...skill, description: "A different skill definition." };
    expect(fingerprintSkill(skill)).not.toBe(fingerprintSkill(editedSkill));
  });

  it("uses the roadmap fingerprint for event quizzes that match a roadmap skill", () => {
    const skill = generateCareerRoadmap("Data Analyst").skills[0];
    expect(fingerprintQuizSkill(skill.skill_id, { skills: [skill] }, "evt-01"))
      .toBe(fingerprintSkill(skill));
  });

  it("fingerprints event-only quiz skills independently", () => {
    expect(fingerprintQuizSkill("sql_foundations", null, "evt-03"))
      .toBe(fingerprintEventSkill("evt-03", "sql_foundations"));
    expect(fingerprintQuizSkill("sql_foundations", null)).toBeNull();
  });
});
