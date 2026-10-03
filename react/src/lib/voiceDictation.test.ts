import { createVoiceDictation } from "./voiceDictation";

function setup() {
  const recognition: any = { start: jest.fn(), stop: jest.fn(), abort: jest.fn() };
  const text = jest.fn(), listening = jest.fn(), error = jest.fn();
  const controller = createVoiceDictation(recognition, text, listening, error);
  const result = (...transcripts: string[]) => recognition.onresult({ results: transcripts.map((transcript) => [{ transcript }]) });
  return { recognition, text, listening, error, controller, result };
}
beforeEach(() => jest.useFakeTimers());
afterEach(() => { jest.clearAllTimers(); jest.useRealTimers(); });

test("waits five seconds after speech ends and resets when speech resumes", () => {
  const { controller, recognition } = setup();
  controller.start();
  recognition.onspeechstart();
  jest.advanceTimersByTime(6000);
  expect(recognition.stop).not.toHaveBeenCalled();
  recognition.onspeechend();
  jest.advanceTimersByTime(4000);
  expect(recognition.stop).not.toHaveBeenCalled();
  recognition.onspeechstart();
  recognition.onspeechend();
  jest.advanceTimersByTime(4999);
  expect(recognition.stop).not.toHaveBeenCalled();
  jest.advanceTimersByTime(1);
  expect(recognition.stop).toHaveBeenCalledTimes(1);
});

test("restarts early browser endings without shortening or extending the silence deadline", () => {
  const { controller, recognition } = setup();
  controller.start();
  jest.advanceTimersByTime(1800);
  recognition.onerror({ error: "no-speech" });
  recognition.onend();
  jest.advanceTimersByTime(100);
  expect(recognition.start).toHaveBeenCalledTimes(2);
  jest.advanceTimersByTime(3100);
  expect(recognition.stop).toHaveBeenCalledTimes(1);
  recognition.onend();
  jest.advanceTimersByTime(1000);
  expect(recognition.start).toHaveBeenCalledTimes(2);
});

test("preserves typed text and revised transcripts across recognition runs", () => {
  const { controller, recognition, result, text } = setup();
  controller.start("Explain");
  result("photosyn");
  result("photosynthesis");
  recognition.onend();
  jest.advanceTimersByTime(100);
  result("in plants");
  expect(text).toHaveBeenLastCalledWith("Explain photosynthesis in plants");
});

test("manual stop keeps the final transcript and never restarts", () => {
  const { controller, recognition, result, text } = setup();
  controller.start();
  result("unfinished");
  controller.stop();
  result("finished sentence");
  recognition.onend();
  jest.advanceTimersByTime(6000);
  expect(text).toHaveBeenLastCalledWith("finished sentence");
  expect(recognition.start).toHaveBeenCalledTimes(1);
});

test("permission errors and cancellation do not restart or overwrite another chat", () => {
  const { controller, recognition, result, text, error } = setup();
  controller.start();
  recognition.onerror({ error: "not-allowed" });
  recognition.onend();
  jest.advanceTimersByTime(6000);
  expect(error).toHaveBeenCalledTimes(1);
  expect(recognition.start).toHaveBeenCalledTimes(1);
  controller.start();
  controller.cancel();
  result("late result from old chat");
  expect(text).not.toHaveBeenCalled();
  controller.dispose();
  expect(recognition.onresult).toBeNull();
});
