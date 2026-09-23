import React from "react";
import { SlideData, TaskState } from "./types";
import { HookSlide } from "./slides/HookSlide";
import { ThinkSlide } from "./slides/ThinkSlide";
import { LearnSlide } from "./slides/LearnSlide";
import { TryItSlide } from "./slides/TryItSlide";
import { RealWorldSlide } from "./slides/RealWorldSlide";
import { ApplySlide } from "./slides/ApplySlide";
import { MysterySlide } from "./slides/MysterySlide";
import { TeachBackSlide } from "./slides/TeachBackSlide";
import { MasterySlide } from "./slides/MasterySlide";

interface SlideRendererProps {
  slide: SlideData;
  taskState: TaskState;
  onCompleteTask: () => void;
  onSelectOption: (optionId: string) => void;
  onToggleOption: (optionId: string) => void;
  onSubmitAnswer: () => void;
  onSubmitText: (text: string) => void;
  onRecordVoice: () => void;
  onFinishLesson: () => void;
}

export const SlideRenderer: React.FC<SlideRendererProps> = ({
  slide,
  taskState,
  onCompleteTask,
  onSelectOption,
  onToggleOption,
  onSubmitAnswer,
  onSubmitText,
  onRecordVoice,
  onFinishLesson,
}) => {
  switch (slide.type) {
    case "hook":
      return (
        <HookSlide
          slide={slide}
          taskState={taskState}
          onCompleteTask={() => onCompleteTask()}
        />
      );

    case "think":
      return (
        <ThinkSlide
          slide={slide}
          taskState={taskState}
          onSelectOption={onSelectOption}
        />
      );

    case "learn":
      return (
        <LearnSlide
          slide={slide}
          taskState={taskState}
          onCompleteTask={() => onCompleteTask()}
        />
      );

    case "try-it":
      return (
        <TryItSlide
          slide={slide}
          taskState={taskState}
          onCompleteTask={() => onCompleteTask()}
        />
      );

    case "real-world":
      return (
        <RealWorldSlide
          slide={slide}
          taskState={taskState}
          onCompleteTask={() => onCompleteTask()}
        />
      );

    case "apply":
      return (
        <ApplySlide
          slide={slide}
          taskState={taskState}
          onToggleOption={onToggleOption}
          onSubmitAnswer={onSubmitAnswer}
        />
      );

    case "mystery":
      return (
        <MysterySlide
          slide={slide}
          taskState={taskState}
          onCompleteTask={() => onCompleteTask()}
        />
      );

    case "teach-back":
      return (
        <TeachBackSlide
          slide={slide}
          taskState={taskState}
          onSubmitText={onSubmitText}
          onRecordVoice={onRecordVoice}
        />
      );

    case "mastery":
      return (
        <MasterySlide
          slide={slide}
          taskState={taskState}
          onCompleteTask={onCompleteTask}
        />
      );

    case "next-concept":
      return (
        <MasterySlide
          slide={slide}
          taskState={taskState}
          onFinishLesson={() => onFinishLesson()}
        />
      );

    default:
      return (
        <div className="p-8 text-center text-slate-500">
          <p>Slide type not recognized: {slide.type}</p>
        </div>
      );
  }
};
