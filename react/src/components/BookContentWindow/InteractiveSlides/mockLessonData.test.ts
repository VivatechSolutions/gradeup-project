jest.mock("./mockInertiaBackendResponse.json?raw", () => "{}", { virtual: true });

import { generateLessonFromBackendResponse } from "./mockLessonData";

describe("generateLessonFromBackendResponse", () => {
  it("preserves phases, inline media, suggestions, and MCQ resolutions", () => {
    const imageUrl = "https://gradeup-books-images.s3.us-east-1.amazonaws.com/test/example.jpg";
    const lesson = generateLessonFromBackendResponse({
      success: true,
      section_title: "Resources",
      suggested_questions_by_segment: {
        seg_001: ["Can you explain the first idea?"],
        seg_1: ["Why is this useful?"],
      },
      enrichment: {
        avatar_lesson: {
          phase_order: ["explanation", "challenge_lab"],
          phases: [
            {
              phase: "explanation",
              segments: [
                {
                  segment_id: "seg_1",
                  type: "teaching",
                  text: `Look at [${imageUrl}] and explain the pattern.`,
                  audio: { male: "lesson-male.mp3", female: "lesson-female.mp3" },
                },
                {
                  segment_id: "seg_mcq",
                  type: "flashcard",
                  flashcard_type: "mcq",
                  question: "Which answer is correct?",
                  options: {
                    A: { text: "First", image_url: "option-a.jpg" },
                    B: "Second",
                  },
                  answer: "B",
                  resolutions: [
                    { option_id: "A", text: "Review this answer.", audio: { male: "a.mp3" } },
                    { option_id: "B", text: "Correct answer.", audio: { male: "b.mp3" } },
                  ],
                },
              ],
            },
            {
              phase: "challenge_lab",
              title: "Challenge Lab",
              intro: { segment_id: "lab_1", text: "Try the challenge." },
            },
          ],
        },
      },
    });

    expect(lesson).not.toBeNull();
    const explanationSlide = lesson!.slides.find((slide) => slide.phase === "explanation");
    const explanationSegments = explanationSlide?.segments || [];
    expect(explanationSegments.map((slide) => slide.segmentId)).toEqual(["seg_1", "seg_mcq"]);
    const teachingSlide = explanationSegments.find((slide) => slide.segmentId === "seg_1");
    expect(teachingSlide?.description).not.toContain(imageUrl);
    expect(teachingSlide?.images?.main).toBe(imageUrl);
    expect(teachingSlide?.suggestedQuestions).toEqual(["Why is this useful?"]);

    const mcqSlide = explanationSegments.find((slide) => slide.segmentId === "seg_mcq");
    expect(mcqSlide?.options?.[0].imageUrl).toBe("option-a.jpg");
    expect(mcqSlide?.resolutions?.B.text).toBe("Correct answer.");
    expect(mcqSlide?.resolutions?.B.audio?.male).toBe("b.mp3");
    expect(mcqSlide?.suggestedQuestions).toEqual(["Can you explain the first idea?"]);
    expect(lesson!.slides.filter((slide) => slide.phase === "explanation")).toHaveLength(1);
    expect(lesson!.slides.some((slide) => slide.id === "backend-concept-overview")).toBe(false);

    expect(lesson!.slides.some((slide) => slide.phase === "challenge_lab")).toBe(true);
  });
});
