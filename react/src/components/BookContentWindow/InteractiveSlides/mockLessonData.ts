import { LessonData } from "./types";
import inertiaBackendResponseRaw from "./mockInertiaBackendResponse.json?raw";

export const NEWTONS_LAWS_LESSON: LessonData = {
  id: "newton-first-law",
  subject: "Science - Physics",
  unitNumber: 1,
  lessonTitle: "Newton's Laws of Motion",
  totalSlides: 10,
  slides: [
    // Slide 1: Hook (1/10)
    {
      id: "slide-1-hook",
      slideNumber: 1,
      type: "hook",
      badge: { label: "Hook", icon: "sparkles" },
      title: "Wait... Why does your body move forward when a bus suddenly stops?",
      highlightWords: ["move forward"],
      subtitle: "You've probably experienced this. But do you know the real reason? Let's find out!",
      description: "You've probably experienced this. But do you know the real reason? Let's find out!",
      task: {
        type: "button-click",
        buttonLabel: "Let's Go",
        completedButtonLabel: "Ready! Let's Go",
      },
      avatarMessage: {
        initial: "Have you ever wondered why you lean forward when brakes are pressed?",
        completed: "Awesome! Let's dive into why this happens!",
      },
    },

    // Slide 2: Think (2/10)
    {
      id: "slide-2-think",
      slideNumber: 2,
      type: "think",
      badge: { label: "Think", icon: "lightbulb" },
      title: "What do you think happens when a bus stops suddenly?",
      question: "What do you think happens when a bus stops suddenly?",
      options: [
        { id: "opt-a", label: "A", title: "I move backward" },
        { id: "opt-b", label: "B", title: "I keep moving forward", isCorrect: true },
        { id: "opt-c", label: "C", title: "I stop immediately" },
        { id: "opt-d", label: "D", title: "Not sure" },
      ],
      task: {
        type: "select-option",
      },
      avatarMessage: {
        initial: "Think about it... No right or wrong answer yet! Pick what you feel.",
        completed: "Great choice! Notice how your body prefers to keep moving!",
      },
    },

    // Slide 3: Learn (3/10)
    {
      id: "slide-3-learn",
      slideNumber: 3,
      type: "learn",
      badge: { label: "Learn", icon: "book-open" },
      title: "What is Inertia?",
      description: "Inertia is the tendency of an object to resist changes in its state of motion.",
      content: "Your body keeps moving forward because it wants to maintain its current motion.",
      images: {
        comparison: {
          beforeTitle: "Bus moving",
          afterTitle: "Bus stops",
        },
      },
      takeaway: {
        label: "In short...",
        text: "Objects don't like to change their motion unless an external force acts on them.",
      },
      task: {
        type: "button-click",
        buttonLabel: "Got It! I Understand",
        completedButtonLabel: "Understood!",
      },
      avatarMessage: {
        initial: "Objects love to keep doing whatever they are already doing!",
        completed: "You got the definition down! Now let's try a quick experiment.",
      },
    },

    // Slide 4: Try It Yourself (4/10)
    {
      id: "slide-4-try-it",
      slideNumber: 4,
      type: "try-it",
      badge: { label: "Try It Yourself", icon: "flask" },
      title: "Try It Yourself",
      subtitle: "Use simple objects from your home to see inertia in action!",
      images: {
        items: [
          { id: "1", name: "Torch", subtext: "(or phone light)" },
          { id: "2", name: "Paper", subtext: "(sheet)" },
          { id: "3", name: "Coin", subtext: "(or small object)" },
          { id: "4", name: "Book", subtext: "(flat surface)" },
        ],
      },
      instructions: [
        "Place the card or sheet of paper on a smooth surface with the coin on top.",
        "Give the paper a quick, sharp horizontal flick.",
        "Observe: The paper slides away, while the coin stays in place due to inertia!",
      ],
      task: {
        type: "confirm-activity",
        buttonLabel: "Try It Now",
        completedButtonLabel: "Activity Complete!",
      },
      avatarMessage: {
        initial: "Hands-on tests are the best way to understand physics!",
        completed: "Brilliant! You saw inertia with your own eyes!",
      },
    },

    // Slide 5: Real World (5/10)
    {
      id: "slide-5-real-world",
      slideNumber: 5,
      type: "real-world",
      badge: { label: "You've Seen This Before!", icon: "globe" },
      title: "Why do astronauts float inside a spacecraft?",
      description: "There's no gravity pulling them down in the same way, so they keep moving in the same state of motion alongside their spacecraft.",
      takeaway: {
        text: "In the same way, when the bus stops, your body keeps moving forward because no force stopped your upper torso yet!",
      },
      task: {
        type: "button-click",
        buttonLabel: "Understand Connection",
        completedButtonLabel: "Connection Made!",
      },
      avatarMessage: {
        initial: "Physics laws hold true here on Earth and high up in orbit!",
        completed: "Spot on! Inertia is universal across galaxies.",
      },
    },

    // Slide 6: Apply / Your Turn (6/10)
    {
      id: "slide-6-apply",
      slideNumber: 6,
      type: "apply",
      badge: { label: "Your Turn", icon: "target" },
      title: "You are designing a toy car. You want it to move faster. What will you do?",
      options: [
        { id: "opt-car-1", title: "Increase the mass of the car", isCorrect: false },
        { id: "opt-car-2", title: "Increase the force (push)", isCorrect: true },
        { id: "opt-car-3", title: "Decrease friction (using smoother wheels)", isCorrect: true },
        { id: "opt-car-4", title: "Remove the wheels", isCorrect: false },
      ],
      task: {
        type: "submit-answer",
        buttonLabel: "Submit Answer",
        completedButtonLabel: "Answer Submitted!",
      },
      avatarMessage: {
        initial: "Think about what makes an object accelerate or slow down!",
        completed: "Correct! Increasing force or reducing friction makes it zoom!",
      },
    },

    // Slide 7: Mystery Case (7/10)
    {
      id: "slide-7-mystery",
      slideNumber: 7,
      type: "mystery",
      badge: { label: "Mystery Case", icon: "search" },
      title: "Why did the ball move?",
      clues: [
        { id: "c1", number: 1, text: "The bat hit the ball." },
        { id: "c2", number: 2, text: "The ball changed direction." },
        { id: "c3", number: 3, text: "A contact force was applied." },
        { id: "c4", number: 4, text: "The ball kept moving until another force acted." },
      ],
      task: {
        type: "button-click",
        buttonLabel: "What's Your Theory?",
        completedButtonLabel: "Mystery Solved!",
      },
      avatarMessage: {
        initial: "Check the clues carefully... What caused the state of motion to change?",
        completed: "Mystery solved! An external force changed its momentum.",
      },
    },

    // Slide 8: Teach It Back (8/10)
    {
      id: "slide-8-teach-back",
      slideNumber: 8,
      type: "teach-back",
      badge: { label: "Teach It Back", icon: "mic" },
      title: "Explain Newton's First Law to me in your own words.",
      description: "When you teach a concept back, your brain solidifies the intuition forever.",
      task: {
        type: "record-or-type",
      },
      avatarMessage: {
        initial: "You can also give real-life examples. I'm listening!",
        completed: "Fantastic explanation! You've got this down thoroughly!",
      },
    },

    // Slide 9: Mastery & Next Concept (10/10)
    // Slide 9: Mastery (9/10)
    {
      id: "slide-9-mastery",
      slideNumber: 9,
      type: "mastery",
      badge: { label: "Mastery", icon: "award" },
      title: "Mission Complete!",
      description: "You've mastered Newton's First Law: objects keep their state of motion unless an external force acts.",
      task: {
        type: "button-click",
        buttonLabel: "View Next Concept",
      },
      avatarMessage: {
        initial: "That was strong work. You can now explain inertia with examples.",
        completed: "Mastery unlocked! One final step shows what comes next.",
      },
    },

    // Slide 10: Next Concept (10/10)
    {
      id: "slide-10-next-concept",
      slideNumber: 10,
      type: "next-concept",
      badge: { label: "Next Up", icon: "rocket" },
      title: "Newton's Second Law",
      description: "Now that you understand inertia and how objects resist change, let's explore how force, mass and acceleration connect in F = m * a.",
      task: {
        type: "button-click",
        buttonLabel: "Start Next Lesson",
      },
      avatarMessage: {
        initial: "You've completely mastered Newton's First Law! Ready for the next leap?",
        completed: "Let's keep the momentum going!",
      },
    },
  ],
};

const parseMockBackendResponse = () => {
  try {
    return JSON.parse(inertiaBackendResponseRaw);
  } catch {
    return null;
  }
};

const getPhase = (lesson: any, phaseName: string) =>
  lesson?.phases?.find((phase: any) => phase?.phase === phaseName);

const visualUrl = (value: any) => value?.visual?.image_url || value?.image_url || undefined;

const optionsFromRecord = (options: Record<string, string> = {}, answer?: string, explanations: Record<string, string> = {}) =>
  Object.entries(options).map(([key, value]) => ({
    id: key,
    label: key,
    title: value,
    isCorrect: key === answer,
    explanation: explanations[key],
  }));

const getMysteryItems = (mysteryPhase: any) => {
  if (Array.isArray(mysteryPhase?.pool)) return mysteryPhase.pool;
  if (Array.isArray(mysteryPhase?.mysteries)) return mysteryPhase.mysteries;
  return [];
};

const cleanText = (value?: string | null) =>
  typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";

const visualCaption = (visual: any) =>
  [visual?.shows, visual?.avatar_line].map(cleanText).filter(Boolean).join(" ");

const labelFromPhase = (value?: string) =>
  cleanText(value)
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());

const renumberSlides = (slides: any[]) =>
  slides.map((slide, index) => ({
    ...slide,
    slideNumber: index + 1,
  }));

export function generateLessonFromBackendResponse(response: any): LessonData | null {
  const avatarLesson = response?.enrichment?.avatar_lesson;
  if (!response?.success || !avatarLesson) return null;

  const hook = getPhase(avatarLesson, "hook");
  const explanation = getPhase(avatarLesson, "explanation");
  const explore = getPhase(avatarLesson, "explore");
  const mysteryPhase = getPhase(avatarLesson, "mystery");
  const realWorld = getPhase(avatarLesson, "real_world");
  const explainBack = getPhase(avatarLesson, "explain_back");
  const reflect = getPhase(avatarLesson, "reflect");
  const mysteries = getMysteryItems(mysteryPhase);
  const overview = response.enrichment?.concept_overview;
  const faqs = response.enrichment?.faqs || [];
  const practiceQuestions = response.enrichment?.practice_questions || [];
  const coinSegment = explanation?.segments?.find((segment: any) =>
    `${segment?.text || ""} ${segment?.visual?.query || ""}`.toLowerCase().includes("coin"),
  );
  const sectionTitle = response.section_title || avatarLesson.section_title || "Interactive Lesson";
  const subject = response.pattern ? `${response.pattern[0].toUpperCase()}${response.pattern.slice(1)}` : "GradeUp Learning";
  const doubtContext = response.enrichment?.doubt_context;
  const report = response.report;

  const slides: any[] = [
    {
      id: "backend-hook",
      type: "hook" as const,
      badge: { label: hook?.title || "Hook", icon: "sparkles" },
      title: hook?.scenario || `Let's explore ${sectionTitle}`,
      highlightWords: ["bus", "brakes", "inertia"],
      description: hook?.intro?.text || overview,
      images: {
        main: visualUrl(hook),
        caption: visualCaption(hook?.visual),
      },
      callout: hook?.visual?.look_prompt
        ? {
            title: "Look closely",
            text: hook.visual.look_prompt,
            type: "info" as const,
          }
        : undefined,
      task: { type: "button-click" as const, buttonLabel: "Start Prediction", completedButtonLabel: "Ready!" },
      avatarMessage: {
        initial: hook?.intro?.text || `Let's start ${sectionTitle}.`,
        completed: hook?.bridge?.text || "Great, now make your prediction.",
      },
    },
    {
      id: "backend-think",
      type: "think" as const,
      badge: { label: "Predict", icon: "lightbulb" },
      title: hook?.question || "What do you predict will happen?",
      question: hook?.question || "What do you predict will happen?",
      options: optionsFromRecord(hook?.options, hook?.answer, hook?.option_explanations),
      task: { type: "select-option" as const },
      avatarMessage: {
        initial: "Choose the option that matches your intuition.",
        completed: hook?.resolutions?.[hook?.answer]?.text || "Nice prediction. Let's connect it to the science.",
        error: "Good try. Watch what your body was already doing before the bus changed motion.",
      },
    },
  ];

  if (overview) {
    slides.push({
      id: "backend-concept-overview",
      type: "learn" as const,
      badge: { label: "Concept Overview", icon: "book-open" },
      title: `What is ${sectionTitle}?`,
      description: overview,
      content: hook?.bridge?.text,
      images: { main: visualUrl(hook), caption: visualCaption(hook?.visual) },
      takeaway: {
        label: "Main idea",
        text: faqs[0]?.answer || "Inertia is an object's resistance to a change in rest, motion, or direction.",
      },
      task: { type: "button-click" as const, buttonLabel: "Start Learning", completedButtonLabel: "Concept Clear" },
      avatarMessage: {
        initial: overview,
        completed: "Good. Now let's walk through every part of the lesson.",
      },
    });
  }

  explanation?.segments?.forEach((segment: any, index: number) => {
    if (segment.type === "flashcard") {
      (segment.cards || []).forEach((card: any, cardIndex: number) => {
        slides.push({
          id: `${segment.segment_id || `flashcard-${index}`}-${card.card_id || cardIndex}`,
          type: "learn" as const,
          badge: { label: "Flashcard", icon: "book-open" },
          title: card.card_title || "Quick Example",
          description: card.front,
          content: card.avatar_line,
          takeaway: {
            label: "Example insight",
            text: card.avatar_line || card.front,
          },
          task: {
            type: "button-click" as const,
            buttonLabel: "Flip Through",
            completedButtonLabel: "Flashcard Done",
          },
          avatarMessage: {
            initial: card.avatar_line || card.front,
            completed: "Nice. Keep that example in mind.",
          },
        });
      });
      return;
    }

    const visual = segment.visual;
    slides.push({
      id: segment.segment_id || `explanation-${index + 1}`,
      type: "learn" as const,
      badge: { label: `${labelFromPhase(segment.type) || "Explanation"} ${index + 1}`, icon: "book-open" },
      title: visual?.query ? labelFromPhase(visual.query) : `${sectionTitle}: idea ${index + 1}`,
      description: segment.text,
      content: visual?.avatar_line,
      images: {
        main: visual?.image_url,
        caption: visualCaption(visual),
      },
      callout: visual?.look_prompt
        ? {
            title: "Look and answer",
            text: `${visual.look_prompt}${visual.look_answer ? ` Answer: ${visual.look_answer}` : ""}`,
            type: "info" as const,
          }
        : undefined,
      takeaway: visual?.avatar_line
        ? {
            label: "Visual explanation",
            text: visual.avatar_line,
          }
        : undefined,
      task: {
        type: "button-click" as const,
        buttonLabel: "Got It",
        completedButtonLabel: "Understood",
      },
      avatarMessage: {
        initial: segment.text || visual?.avatar_line || `Let's continue with ${sectionTitle}.`,
        completed: visual?.look_answer || "Good. Let's move to the next part.",
      },
    });
  });

  if (explore) {
    slides.push({
      id: "backend-activity",
      type: "try-it" as const,
      badge: { label: explore?.title || "Try It Yourself", icon: "flask" },
      title: explore?.title || "Coin and cardboard activity",
      subtitle: explore?.intro?.text || "Use simple objects to see inertia of rest.",
      images: {
        diagram: visualUrl(coinSegment),
        items: (explore?.materials || ["Glass", "Cardboard", "Coin"]).map((name: string, index: number) => ({
          id: `material-${index + 1}`,
          name,
        })),
      },
      instructions: explore?.steps || [
        "Place a card over a glass.",
        "Put a coin on the card.",
        "Flick the card quickly and observe the coin.",
      ],
      callout: explore?.interaction?.prompt
        ? {
            title: "Observation question",
            text: `${explore.interaction.prompt} ${
              explore.interaction.options
                ?.map((option: any) => `${option.id}. ${option.text}`)
                .join(" ")
            }`,
            type: "info" as const,
          }
        : undefined,
      task: { type: "confirm-activity" as const, buttonLabel: "Try It Now", completedButtonLabel: "Activity Complete!" },
      avatarMessage: {
        initial: explore?.intro?.text || "This activity demonstrates inertia of rest.",
        completed: explore?.wrap_up?.text || "Nice. The coin resisted the sudden change and dropped down.",
      },
    });

    if (explore.challenge) {
      slides.push({
        id: "backend-explore-challenge",
        type: "teach-back" as const,
        badge: { label: "Activity Challenge", icon: "mic" },
        title: explore.challenge.prompt,
        description: explore.challenge.interaction?.model_answer,
        task: { type: "record-or-type" as const },
        avatarMessage: {
          initial: explore.challenge.interaction?.prompt || explore.challenge.prompt,
          completed: explore.challenge.interaction?.model_answer || "Good connection.",
        },
      });
    }
  }

  mysteries.forEach((mystery: any, index: number) => {
    slides.push({
      id: mystery.mystery_id || `backend-mystery-${index + 1}`,
      type: "mystery" as const,
      badge: { label: `Mystery ${index + 1}`, icon: "search" },
      title: mystery.question || mystery.title || "Solve the inertia mystery",
      description: mystery.ask?.text,
      images: {
        main: visualUrl(mystery),
        caption: visualCaption(mystery.visual),
      },
      options: optionsFromRecord(mystery.options, mystery.answer, mystery.option_explanations),
      clues: [
        { id: `${mystery.mystery_id || index}-clue-1`, number: 1, text: mystery.visual?.avatar_line || mystery.ask?.text || "Observe the situation carefully." },
        { id: `${mystery.mystery_id || index}-clue-2`, number: 2, text: mystery.visual?.look_prompt || "Which object resists the change?" },
        { id: `${mystery.mystery_id || index}-clue-3`, number: 3, text: mystery.visual?.look_answer || mystery.reveal?.text || "Inertia explains the motion." },
      ],
      takeaway: {
        label: "Reveal",
        text: mystery.reveal?.text || mystery.option_explanations?.[mystery.answer],
      },
      task: { type: "button-click" as const, buttonLabel: "What's Your Theory?", completedButtonLabel: "Mystery Solved!" },
      avatarMessage: {
        initial: mystery.ask?.text || mysteryPhase?.intro?.text || "Use the clues to solve this mystery.",
        completed: mystery.reveal?.text || mysteryPhase?.outro?.text || "Mystery solved.",
      },
    });
  });

  if (realWorld) {
    slides.push({
      id: "backend-real-world",
      type: "real-world" as const,
      badge: { label: "Real World", icon: "globe" },
      title: realWorld?.question || "Where do you experience inertia?",
      description: realWorld?.reveal?.text,
      images: {
        main: visualUrl(realWorld),
        caption: visualCaption(realWorld?.visual),
      },
      takeaway: {
        label: "Why it matters",
        text: realWorld?.why_it_matters || realWorld?.visual?.look_answer,
      },
      callout: realWorld?.visual?.look_prompt
        ? {
            title: "Look closely",
            text: `${realWorld.visual.look_prompt} ${realWorld.visual.look_answer || ""}`,
            type: "tip" as const,
          }
        : undefined,
      task: { type: "button-click" as const, buttonLabel: "Understand Connection", completedButtonLabel: "Connection Made!" },
      avatarMessage: {
        initial: realWorld?.ask?.text || "Let's connect this to everyday life.",
        completed: realWorld?.reveal?.text || "Seatbelts are a practical response to inertia.",
      },
    });
  }

  practiceQuestions.forEach((practice: any, index: number) => {
    slides.push({
      id: `backend-practice-${index + 1}`,
      type: "apply" as const,
      badge: { label: `Practice ${index + 1}`, icon: "target" },
      title: practice.question || "Which statements correctly explain inertia?",
      images: { main: realWorld?.visual?.image_url, caption: realWorld?.visual?.avatar_line },
      options: [
        { id: `practice-${index + 1}-a`, title: "Use inertia to explain what resists the change.", isCorrect: true },
        { id: `practice-${index + 1}-b`, title: "Ignore external forces and motion state.", isCorrect: false },
        { id: `practice-${index + 1}-c`, title: "Connect the example to rest, motion, or direction.", isCorrect: true },
        { id: `practice-${index + 1}-d`, title: "Say inertia applies only to laboratory objects.", isCorrect: false },
      ],
      task: { type: "submit-answer" as const, buttonLabel: "Submit Answer", completedButtonLabel: "Answer Submitted!" },
      avatarMessage: {
        initial: practice.question || "Select every reasoning move that fits this question.",
        completed: "Correct. You connected force, rest, motion, and mass.",
        error: "Review the definition: inertia applies to rest and motion.",
      },
    });
  });

  faqs.forEach((faq: any, index: number) => {
    slides.push({
      id: `backend-faq-${index + 1}`,
      type: "learn" as const,
      badge: { label: `FAQ ${index + 1}`, icon: "book-open" },
      title: faq.question,
      description: faq.answer,
      images: { main: visualUrl(realWorld) || visualUrl(hook), caption: visualCaption(realWorld?.visual || hook?.visual) },
      takeaway: {
        label: "Answer",
        text: faq.answer,
      },
      task: { type: "button-click" as const, buttonLabel: "Save Answer", completedButtonLabel: "Saved" },
      avatarMessage: {
        initial: faq.answer,
        completed: "Good question. That answer is now in your review stack.",
      },
    });
  });

  if (explainBack) {
    slides.push({
      id: "backend-teach-back",
      type: "teach-back" as const,
      badge: { label: "Explain Back", icon: "mic" },
      title: explainBack?.prompt || `Explain ${sectionTitle} in your own words.`,
      description: explainBack?.guidance || explainBack?.ask?.text,
      takeaway: { label: "Model answer", text: explainBack?.model_explanation },
      task: { type: "record-or-type" as const },
      avatarMessage: {
        initial: explainBack?.ask?.text || "Explain the idea in your own words.",
        completed: explainBack?.closing?.text || "Great explanation.",
      },
    });
  }

  if (reflect) {
    slides.push({
      id: "backend-reflect",
      type: "mastery" as const,
      badge: { label: "Reflect", icon: "award" },
      title: "Inertia mastered",
      description: `${reflect?.before_prompt || "Before the lesson I predicted..."} ${reflect?.after_prompt || "After the lesson I think..."} ${reflect?.ask?.text || ""}`,
      images: { main: hook?.visual?.image_url },
      task: { type: "button-click" as const, buttonLabel: "Complete Lesson", completedButtonLabel: "Lesson Complete!" },
      avatarMessage: {
        initial: reflect?.ask?.text || "Take a moment to reflect on your first prediction.",
        completed: reflect?.closing?.text || "You've completed the lesson.",
      },
    });
  }

  if (doubtContext || report) {
    slides.push({
      id: "backend-lesson-report",
      type: "learn" as const,
      badge: { label: "Lesson Map", icon: "book-open" },
      title: "Everything this backend payload included",
      description: [
        report
          ? `${report.segments} teaching segments, ${report.cards} flashcards, ${report.mysteries} mysteries, ${report.pictures} pictures.`
          : "",
        doubtContext?.related_sections?.length
          ? `Related sections: ${doubtContext.related_sections.join(", ")}.`
          : "",
      ]
        .filter(Boolean)
        .join(" "),
      content: report?.phases?.length ? `Phase order: ${report.phases.join(" -> ")}` : avatarLesson.phase_order?.join(" -> "),
      takeaway: {
        label: "Doubt context",
        text: doubtContext
          ? `${doubtContext.board || ""} Class ${doubtContext.class_number || ""} ${doubtContext.subject || ""}. RAG chunks: ${doubtContext.max_rag_chunks}. Broader fallback: ${doubtContext.fallback_to_broader_context ? "yes" : "no"}.`
          : "Report metadata included.",
      },
      task: { type: "button-click" as const, buttonLabel: "Complete Map", completedButtonLabel: "Map Complete" },
      avatarMessage: {
        initial: "This final map shows the support data that came with the lesson.",
        completed: "All backend JSON fields have been represented in the slide flow.",
      },
    });
  }

  const numberedSlides = renumberSlides(slides);

  return {
    id: `backend-${response.section_id || sectionTitle}`.toLowerCase().replace(/\s+/g, "-"),
    subject,
    unitNumber: response.enrichment?.doubt_context?.unit_number || 1,
    lessonTitle: sectionTitle,
    totalSlides: numberedSlides.length,
    slides: numberedSlides,
  };
}

export const INERTIA_BACKEND_LESSON = generateLessonFromBackendResponse(parseMockBackendResponse()) || NEWTONS_LAWS_LESSON;

/**
 * Dynamically converts any chapter or unit into an engaging 9-slide interactive lesson.
 */
export function generateLessonFromChapter(chapter: any, book: any): LessonData {
  if (chapter?.enrichment?.avatar_lesson) {
    return generateLessonFromBackendResponse(chapter) || NEWTONS_LAWS_LESSON;
  }

  if (!chapter) return INERTIA_BACKEND_LESSON;

  const unitTitle = chapter.unitTitle || chapter.title || "Lesson";
  const subjectName = book?.subject || "GradeUp Learning";
  const unitNum = typeof chapter.unit === "number" ? chapter.unit : 1;

  // Check if this is the physics / newton's laws unit
  const lowerTitle = unitTitle.toLowerCase();
  if (
    lowerTitle.includes("inertia") ||
    String(chapter.section_id || chapter.sectionId || chapter.id || "") === "1.2"
  ) {
    return INERTIA_BACKEND_LESSON;
  }

  if (lowerTitle.includes("motion") || lowerTitle.includes("newton") || lowerTitle.includes("force")) {
    return {
      ...NEWTONS_LAWS_LESSON,
      lessonTitle: unitTitle,
      subject: subjectName,
      unitNumber: unitNum,
    };
  }

  // Otherwise, construct a smart structured lesson for any chapter
  return {
    id: `lesson-${chapter.id || Date.now()}`,
    subject: subjectName,
    unitNumber: unitNum,
    lessonTitle: unitTitle,
    totalSlides: 10,
    slides: [
      {
        id: "s1",
        slideNumber: 1,
        type: "hook",
        badge: { label: "Hook", icon: "sparkles" },
        title: `Ever wondered how ${unitTitle} affects our daily life?`,
        highlightWords: [unitTitle],
        description: `Explore the core intuitions, real-world applications, and problem-solving techniques of ${unitTitle}.`,
        task: { type: "button-click", buttonLabel: "Let's Go" },
        avatarMessage: {
          initial: `Welcome to ${unitTitle}! Ready to explore?`,
          completed: "Great! Let's start with a thought experiment.",
        },
      },
      {
        id: "s2",
        slideNumber: 2,
        type: "think",
        badge: { label: "Think", icon: "lightbulb" },
        title: `What is your intuition about ${unitTitle}?`,
        question: `When you think of ${unitTitle}, which statement feels most accurate?`,
        options: [
          { id: "o1", label: "A", title: "It applies in everyday situations all around us" },
          { id: "o2", label: "B", title: "It follows specific predictable principles", isCorrect: true },
          { id: "o3", label: "C", title: "It only occurs in laboratory experiments" },
          { id: "o4", label: "D", title: "I'd love to learn more before answering" },
        ],
        task: { type: "select-option" },
        avatarMessage: {
          initial: "Take your time and pick what feels right to you!",
          completed: "Great instinct! Let's break down the theory.",
        },
      },
      {
        id: "s3",
        slideNumber: 3,
        type: "learn",
        badge: { label: "Learn", icon: "book-open" },
        title: `Understanding ${unitTitle}`,
        description: chapter.content
          ? chapter.content.slice(0, 220) + "..."
          : `Every core principle in ${unitTitle} is built on fundamental rules that govern natural systems.`,
        content: "By understanding the foundational laws, complex problems become straightforward to solve.",
        takeaway: {
          label: "Core Insight",
          text: `Master the basic rules of ${unitTitle} to solve any practical scenario with confidence.`,
        },
        task: { type: "button-click", buttonLabel: "Got It! I Understand" },
        avatarMessage: {
          initial: "Notice how the principles connect together!",
          completed: "Nice! Let's see how you can test this.",
        },
      },
      {
        id: "s4",
        slideNumber: 4,
        type: "try-it",
        badge: { label: "Try It Yourself", icon: "flask" },
        title: "Hands-on Exploration",
        subtitle: `Test the principles of ${unitTitle} with practical examples`,
        instructions: [
          "Review the core premise and define the given variables.",
          "Apply the fundamental formula or principle step by step.",
          "Verify your result against real-world observations.",
        ],
        task: { type: "confirm-activity", buttonLabel: "Try It Now" },
        avatarMessage: {
          initial: "Practicing the steps hands-on makes everything click!",
          completed: "Awesome work completing the exercise!",
        },
      },
      {
        id: "s5",
        slideNumber: 5,
        type: "real-world",
        badge: { label: "You've Seen This Before!", icon: "globe" },
        title: `Where do we see ${unitTitle} in real life?`,
        description: `From modern engineering to everyday routines, ${unitTitle} shapes how we design solutions and understand our environment.`,
        takeaway: {
          text: `Next time you encounter this scenario, remember the fundamental laws of ${unitTitle}!`,
        },
        task: { type: "button-click", buttonLabel: "Understand Connection" },
        avatarMessage: {
          initial: "Science is all around us in the real world!",
          completed: "Great connection made!",
        },
      },
      {
        id: "s6",
        slideNumber: 6,
        type: "apply",
        badge: { label: "Your Turn", icon: "target" },
        title: `Applying ${unitTitle} to Solve a Challenge`,
        options: [
          { id: "ao1", title: "Analyze the input forces and variables", isCorrect: true },
          { id: "ao2", title: "Formulate a step-by-step hypothesis", isCorrect: true },
          { id: "ao3", title: "Ignore external influences", isCorrect: false },
          { id: "ao4", title: "Double-check boundary conditions", isCorrect: true },
        ],
        task: { type: "submit-answer", buttonLabel: "Submit Answer" },
        avatarMessage: {
          initial: "Select all valid methods to solve this challenge.",
          completed: "Correct! Great analytical thinking!",
        },
      },
      {
        id: "s7",
        slideNumber: 7,
        type: "mystery",
        badge: { label: "Mystery Case", icon: "search" },
        title: `The Mystery of ${unitTitle}`,
        clues: [
          { id: "mc1", number: 1, text: "Initial equilibrium was established." },
          { id: "mc2", number: 2, text: "A sudden perturbation altered the balance." },
          { id: "mc3", number: 3, text: "The system adapted according to core laws." },
          { id: "mc4", number: 4, text: "Final measurable state confirmed the theory." },
        ],
        task: { type: "button-click", buttonLabel: "What's Your Theory?" },
        avatarMessage: {
          initial: "Piece the clues together to form your hypothesis!",
          completed: "Mystery solved through scientific deduction!",
        },
      },
      {
        id: "s8",
        slideNumber: 8,
        type: "teach-back",
        badge: { label: "Teach It Back", icon: "mic" },
        title: `Explain ${unitTitle} in your own words.`,
        description: "Explain the central concept as if teaching it to a classmate.",
        task: { type: "record-or-type" },
        avatarMessage: {
          initial: "I'm eager to hear your explanation in your own words!",
          completed: "Brilliant explanation! You've mastered this topic!",
        },
      },
      {
        id: "s9",
        slideNumber: 9,
        type: "mastery",
        badge: { label: "Mastery", icon: "award" },
        title: "Mastery Complete!",
        description: `You've conquered the fundamentals of ${unitTitle}. Take one final look at what comes next.`,
        task: { type: "button-click", buttonLabel: "View Next Concept" },
        avatarMessage: {
          initial: "Outstanding dedication! You've reached mastery.",
          completed: "Mastery unlocked! Let's preview the next milestone.",
        },
      },
      {
        id: "s10",
        slideNumber: 10,
        type: "next-concept",
        badge: { label: "Next Up", icon: "rocket" },
        title: "Mastery Complete!",
        description: `You've conquered the fundamentals of ${unitTitle}. You're ready to proceed to the next milestone!`,
        task: { type: "button-click", buttonLabel: "Finish Lesson" },
        avatarMessage: {
          initial: "Ready to continue your learning path?",
          completed: "Congratulations on completing this lesson!",
        },
      },
    ],
  };
}
