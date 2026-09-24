"""
Per-subject patterns, prompts and the ordered-phase schema of an avatar lesson.

An avatar lesson is stored on a section as ``enrichment.avatar_lesson`` (maths:
``section_enrichment.avatar_lesson``) with ``phases[]`` in PLAY ORDER:

    hook -> explanation -> real_world -> explore -> mystery -> explain_back

English readings add two phases to that order (user request 2026-09-23):

    poem:  hook -> sing_along -> explanation -> ...     "Would you like to join me?
                                                        Sing with me!" - the avatar
                                                        sings a line, the student sings
                                                        it back and fills the rhyme word
    prose: hook -> explanation -> grammar -> ...        the story is taught PART BY PART
                                                        (``explanation.parts[]``) and the
                                                        grammar is the next part, with
                                                        practice the student answers

A supplementary reading is taught part by part too, with no grammar. The
player walks ``phases[]`` top to bottom; ``order`` is the position in the list. Which hook the section opens with,
what the explore activity is and how the real-world example is framed differ
by subject - a science section predicts a phenomenon and does a hands-on
activity, a history section investigates a source picture, a poem hunts for
rhyme and imagery - and those differences are the ``LessonPattern`` registry
below. Everything else (the four-option MCQ hook with stored reasons, the
picture-based explanation, the one mystery picture, explain-back) is the same
shape for every subject. Every picture is GENERATED (a 3D render from a scene
prompt the planner writes - see avatar_images), at most six a section: hook,
two inside the explanation, explore when it wants one, real world, mystery.

Every SPOKEN node in a lesson is teaching-shaped -
``{"segment_id", "type": "teaching", "text", "emotion"}`` - so
``avatar_tts.narrate_segments`` voices it unchanged and writes ``audio`` onto
it. ``iter_spoken_nodes`` yields them in play order.

Built by ``avatar_lesson_builder``; played by ``avatar_engine``.
"""

from __future__ import annotations

import os
import re
from dataclasses import dataclass
from typing import Any, Dict, Iterator, List, Optional, Tuple
from logger import get_logger
from section_types import section_content_kind

logger = get_logger(__name__)

# ── Schema constants ──────────────────────────────────────────────────────────

# sing_along (poems) and grammar (English prose) only exist in English lessons;
# every other lesson keeps the six phases in this same relative order.
PHASE_ORDER: Tuple[str, ...] = ("hook", "sing_along", "explanation", "grammar", "real_world",
                                "explore", "mystery", "explain_back")

EMOTIONS: Tuple[str, ...] = (
    "enthusiastic", "curious", "encouraging", "surprised", "thoughtful",
    "playful", "empathetic", "confident", "warm", "inspiring",
)

HOOK_STYLES: Tuple[str, ...] = ("mission_prediction", "big_question")

INTERACTION_TYPES: Tuple[str, ...] = (
    "choice", "order", "match", "numeric", "free_text", "picture_walkthrough", "fill_blank",
)
# What a grammar practice item may be: every one has a definite answer, and
# only a rewrite (free_text) needs the model to judge it.
GRAMMAR_INTERACTIONS: Tuple[str, ...] = ("choice", "fill_blank", "match", "order", "free_text")
GRAMMAR_MAX_TOPICS = max(1, int(os.getenv("AVATAR_GRAMMAR_MAX_TOPICS", "3")))
# A story or supplementary reading is taught in parts of about this many
# characters (a textbook's own comprehension-check breaks win when it prints them).
READING_PART_CHARS = max(600, int(os.getenv("AVATAR_READING_PART_CHARS", "1800")))
READING_MAX_PARTS = max(1, int(os.getenv("AVATAR_READING_MAX_PARTS", "6")))

# Pictures inside the explanation - the teaching writer marks exactly this
# many "[image: ...]" spots in its script and each becomes a generated render
# whose URL is folded into the text at that spot (user decision 2026-09-17).
EXPLANATION_IMAGES = max(0, int(os.getenv("AVATAR_LESSON_EXPLANATION_IMAGES", "2")))
# The hook is a four-option MCQ; the mystery keeps three (user decision 2026-09-17).
HOOK_OPTIONS = 4

# Correct-option explanations open with this, in the hook and in the mystery,
# exactly as the runtime MCQ checkpoints always have.
CORRECT_PREFIX = "Yeah, you got the right answer!"


# ══════════════════════════════════════════════════════════════════════════════
#  PATTERN REGISTRY
# ══════════════════════════════════════════════════════════════════════════════

@dataclass(frozen=True)
class LessonPattern:
    key: str
    hook_style: str
    hook_guidance: str
    teach_guidance: str
    explore_kind: str
    explore_interactions: Tuple[str, ...]
    explore_guidance: str
    real_world_guidance: str
    mystery_guidance: str
    explain_guidance: str
    # When a picture should be a REAL photo found on the web rather than a
    # render, in this subject - the planner and the teaching writer read it.
    picture_policy: str
    # One marker, in this subject's own terms, shown to the teaching writer.
    picture_example: str


_SCIENCE = LessonPattern(
    key="science",
    hook_style="mission_prediction",
    hook_guidance=(
        "A MISSION + PREDICTION. Describe one concrete everyday situation the section's "
        "phenomenon produces (a bus braking, a coin on a card, a shaken branch) as a 1-2 "
        "sentence scenario, then ask the student to PREDICT what happens next. The four "
        "options are four plausible outcomes; exactly one is what really happens."
    ),
    teach_guidance=(
        "Teach like a SCIENCE teacher: the phenomenon first, then cause and effect - what "
        "happens, why it happens, what would change if a condition changed. Use the section's "
        "own activities and examples as the evidence, and name the scientific term the moment "
        "the idea is clear. Predict, observe, explain is the rhythm."
    ),
    explore_kind="hands_on_activity",
    explore_interactions=("choice",),
    explore_guidance=(
        "A HANDS-ON ACTIVITY the student can do at home with household items. If the "
        "section contains its own Activity, use THAT activity exactly (its materials and "
        "steps are supplied) - never invent a different one when the textbook gives one. "
        "materials: 2-5 items. steps: 3-6 short imperative steps. interaction: a 'choice' "
        "question 'What did you observe?' with 3 options - the real outcome, and two "
        "outcomes a student might expect wrongly - each with feedback. challenge: one "
        "'free_text' apply-it question about a different everyday case of the same idea."
    ),
    real_world_guidance=(
        "One everyday device, activity or natural event where this idea is at work. "
        "PREFER an example the section itself names (its own 'examples' or 'applications'); "
        "only if it names none, choose something every student has seen."
    ),
    mystery_guidance=(
        "The mystery is a rendered SCENE of an everyday moment where the section's "
        "phenomenon is at work but is not labelled or obvious - a passenger mid-lurch, dust "
        "flying off a beaten carpet, a rider leaning into a bend. The options are three "
        "explanations of what is happening; the right one names the section's idea (and its "
        "type or case where the section distinguishes them)."
    ),
    explain_guidance=(
        "A good explanation states the definition in the student's own words, names the "
        "types or cases the section distinguishes, gives one everyday example for each, and "
        "says what makes the state change (the external unbalanced force / condition)."
    ),
    picture_policy=(
        "GENERATE everyday scenes and set-ups (a bus, a coin on a card, a kitchen). SEARCH "
        "for a real photo or standard labelled diagram only when the section is about a real "
        "structure, organism or apparatus the student must recognise as it really looks (the "
        "human heart, a plant cell, a named instrument)."
    ),
    picture_example=(
        "[image: a coin resting on a small square of cardboard balanced on the rim of a glass "
        "tumbler on a wooden table, a finger poised to flick the card, close-up from the "
        "side]"
    ),
)

_MATHS = LessonPattern(
    key="mathematics",
    hook_style="mission_prediction",
    hook_guidance=(
        "A MISSION + PREDICTION with numbers: a small real situation (a shop, a menu, a "
        "timetable, a game) that the section's idea answers. Ask the student to ESTIMATE or "
        "pick the answer. The four options are four plausible numbers or outcomes, one "
        "right; the wrong ones should be the classic mistakes (adding instead of multiplying, "
        "swapping order, counting one set only)."
    ),
    teach_guidance=(
        "Lead with intuition, then the definition, then the procedure. Walk through the "
        "section's own illustration or first example step by step, saying WHY each step is "
        "taken. Name the common mistake and show why it fails."
    ),
    explore_kind="try_it_yourself",
    explore_interactions=("numeric", "choice"),
    explore_guidance=(
        "A TRY-IT-YOURSELF mini problem of the section's kind, smaller than the textbook "
        "examples. steps: 3-5 steps the student follows one at a time (each a sentence "
        "telling them what to do next). interaction: 'numeric' when the answer is a number "
        "(give the exact answer and tolerance 0), otherwise 'choice' with 3 options. "
        "challenge: a harder twist that uses the same rule backwards or with a constraint, "
        "'numeric' where possible."
    ),
    real_world_guidance=(
        "One place the student meets this maths outside the textbook - bills, menus, maps, "
        "sport tables, timetables. PREFER the situation the section itself uses to motivate "
        "the idea. The reveal must say how the maths is applied there, in one or two sentences."
    ),
    mystery_guidance=(
        "The mystery is a rendered SCENE with a countable or structured "
        "arrangement the section's idea describes - a menu board, a rack of shirts and "
        "trousers, a grid of seats, tiles, a timetable. The question asks what the maths "
        "behind the scene is or what a count comes to; the options are three answers, "
        "the wrong ones being the classic mistakes (adding instead of multiplying, wrong "
        "order, one set only)."
    ),
    explain_guidance=(
        "A good explanation states the definition in plain words, shows the procedure on a "
        "tiny example of the student's own, names the key property (order, count, the empty "
        "case) and the common mistake to avoid."
    ),
    picture_policy=(
        "GENERATE everything - the pictures are everyday situations with countable objects, "
        "never real artefacts."
    ),
    picture_example=(
        "[image: a shop counter with three stacks of identical notebooks, five in each stack, "
        "seen from the front]"
    ),
)

_SOCIAL_HISTORY = LessonPattern(
    key="social_science.history",
    hook_style="big_question",
    hook_guidance=(
        "A BIG QUESTION about how we KNOW or WHY it happened, asked with a picture of a real "
        "source or place from the section. Four options: one is what historians actually "
        "conclude, three are tempting but wrong (a myth, a modern assumption, a source that "
        "cannot tell us that)."
    ),
    teach_guidance=(
        "Teach like a HISTORIAN telling a story, not a scientist stating facts. Set the scene "
        "first - the period, the place and the people the section names (its rulers, "
        "dynasties, towns, temples) - so the student can picture the time. Then move from "
        "SOURCE to INFERENCE: what the source or event is, where it is found or when it "
        "happened, what it tells historians, and what it cannot tell us (bias, gaps, what was "
        "left out). Use every named example the section gives (a particular inscription, "
        "grant, monument, coin, ruler) instead of generalities, and explain a period word "
        "(decree, grant, dynasty, chronicle) in the sentence where it appears. Ask 'how do we "
        "know this?' out loud and answer it from the source. Never frame the topic as an "
        "experiment, a mechanism or cause-then-effect physics: frame it as people, places, "
        "evidence and change over time. Keep the textbook's own framing and names; add no "
        "dynasty, date, place or person the section does not contain."
    ),
    explore_kind="source_investigation",
    explore_interactions=("picture_walkthrough",),
    explore_guidance=(
        "A SOURCE INVESTIGATION: the student examines one real picture of a source the "
        "section discusses (an inscription, a coin, a monument, a manuscript, a map). "
        "interaction: 'picture_walkthrough' with an 'image_prompt' describing that object as a scene to render; the picture and its three guided steps are built afterwards. challenge: a "
        "'free_text' 'be the historian' question - given a described find, what three things "
        "could be concluded."
    ),
    real_world_guidance=(
        "A present-day trace of the topic the student could actually see: a monument or "
        "museum nearby, a coin, a place name, a festival, a word still in use. PREFER one the "
        "section mentions."
    ),
    mystery_guidance=(
        "The mystery is a REAL PHOTOGRAPH (image_source \"search\") of a source or object the section discusses, shown "
        "without its caption - an inscription, a coin, a monument, a manuscript page. The "
        "question asks what it is and what a historian could learn from it; the options are "
        "three readings, one correct, two tempting (a wrong kind of source, a claim the source "
        "cannot support)."
    ),
    explain_guidance=(
        "A good explanation says what the source or event is, where it is found or when it "
        "happened, gives one named example from the section, what it tells historians, and "
        "one limitation or bias."
    ),
    picture_policy=(
        "SEARCH for a real photograph whenever the picture is a real source, place or object "
        "- an inscription, a copper-plate grant, a coin, a monument, a temple, a manuscript, "
        "a map, a named ruler's portrait or statue: a real photo teaches what a render can "
        "only imitate, and a render of an artefact is a fake. GENERATE only imagined everyday "
        "scenes of the period (a ruler granting land to a priest, an artisan at work, a "
        "student at a museum)."
    ),
    picture_example=(
        "[photo: Chola copper plate grant | a set of engraved copper plates held together by "
        "a metal ring] and [image: a medieval king seated in a pillared hall handing a rolled "
        "document to a priest, seen from the side]"
    ),
)

_SOCIAL_GEOGRAPHY = LessonPattern(
    key="social_science.geography",
    hook_style="big_question",
    hook_guidance=(
        "A BIG QUESTION about a place, pattern or process on a map or landform picture from "
        "the section ('Why do most cities sit near rivers?'). Four options, one correct."
    ),
    teach_guidance=(
        "Teach like a GEOGRAPHER reading a map: WHERE it is, what it LOOKS like, WHY it is "
        "there (the process behind it), and HOW it shapes the lives of the people who live "
        "with it. Use the section's own map and figure references and its named places, and "
        "move from the named local example to the general pattern. Frame it as places, "
        "patterns and people, not as a laboratory experiment."
    ),
    explore_kind="source_investigation",
    explore_interactions=("picture_walkthrough",),
    explore_guidance=(
        "A MAP OR LANDFORM READING: 'picture_walkthrough' with an 'image_prompt' describing the "
        "map or landform as a scene to render; the three guided steps (locate -> compare -> infer) are "
        "built afterwards. challenge: a 'choice' question about a decision the geography "
        "forces (which route, why here, what happens if)."
    ),
    real_world_guidance="A local example of the same landform, climate pattern or resource the student can relate to; PREFER one the section names.",
    mystery_guidance="The mystery is a REAL PHOTOGRAPH (image_source \"search\") of a landform, map detail or place from the section shown without a caption; the question asks what it is and why it is like that, with three options.",
    explain_guidance="A good explanation says what the feature is, where it occurs, why it forms or happens, how it affects people, and gives one named example from the section.",
    picture_policy=(
        "SEARCH for a real photograph or map of any real landform, place, river, climate "
        "feature or resource the section names - the real thing, as it looks. GENERATE only "
        "imagined scenes of people living with it (farmers in a flooded field, a family in a "
        "hill village)."
    ),
    picture_example=(
        "[photo: Kaveri river delta aerial | the delta's branching river channels between "
        "green fields] and [image: a farmer standing at the edge of a flooded paddy field in "
        "the early morning, seen from the side]"
    ),
)

_SOCIAL_CIVICS = LessonPattern(
    key="social_science.civics",
    hook_style="big_question",
    hook_guidance=(
        "A BIG QUESTION framed as a DILEMMA the student could face ('Your class wants a new "
        "rule - who decides, and how?'). Four options: what the section says actually "
        "happens, plus three tempting wrong answers."
    ),
    teach_guidance=(
        "Teach like a CIVICS teacher using real situations: start from an everyday situation "
        "the student knows (a class rule, a queue, a complaint, a vote), name the "
        "institution, right or rule the section describes, say who does what and why it "
        "exists, and what would go wrong without it. Frame it as people, rules and fairness, "
        "never as a mechanism. Keep the section's own terms."
    ),
    explore_kind="role_play",
    explore_interactions=("choice",),
    explore_guidance=(
        "A ROLE-PLAY: put the student in the role the section describes (citizen, member, "
        "official). interaction: one 'choice' decision with 3 options and feedback that "
        "explains the consequence of each. challenge: a 'free_text' 'what would you do and "
        "why' question on a second situation."
    ),
    real_world_guidance="A local institution, election, council or right the student has seen or will meet; PREFER one the section names.",
    mystery_guidance="The mystery is a rendered SCENE of a civic scene from the section's world - a polling booth, a council meeting, a court, a notice board - shown without a caption; the question asks what is happening and which institution or right is at work, with three options.",
    explain_guidance="A good explanation names the institution or right, who does what, why it exists, one named example, and what would go wrong without it.",
    picture_policy=(
        "GENERATE everyday scenes (a classroom vote, a queue at an office, a village council "
        "meeting). SEARCH only for a real named institution or building the section names "
        "(the Parliament House, a High Court)."
    ),
    picture_example=(
        "[image: a village council meeting under a large tree, elders seated in a circle and "
        "villagers standing around them, seen from the front]"
    ),
)

_SOCIAL_ECONOMICS = LessonPattern(
    key="social_science.economics",
    hook_style="mission_prediction",
    hook_guidance=(
        "A MISSION + PREDICTION with numbers from daily life ('Prices double - what does a "
        "family buy less of?'). Four plausible outcomes, one correct."
    ),
    teach_guidance=(
        "Teach from a household or market situation the student has seen to the concept, then "
        "to what it does to prices, choices or incomes. Work any figure the section gives in "
        "plain words, one step at a time. Frame it as people making choices with limited "
        "money, not as a formula. Keep the section's own terms and figures."
    ),
    explore_kind="try_it_yourself",
    explore_interactions=("numeric", "choice"),
    explore_guidance=(
        "A TRY-IT-YOURSELF mini budget or calculation the section's idea explains: 3-5 steps, "
        "then a 'numeric' answer (exact, tolerance 0) or a 'choice'. challenge: a second "
        "situation with a twist."
    ),
    real_world_guidance="A market, shop, ration shop, bank or bill the student has seen; PREFER one the section names.",
    mystery_guidance="The mystery is a rendered SCENE of a market, shop, bill or queue where the section's idea is at work; the question asks what economic idea explains the scene, with three options.",
    explain_guidance="A good explanation names the term, its cause and effect, works one small calculation and gives one named example.",
    picture_policy=(
        "GENERATE everyday scenes (a market stall, a shop bill, a family at a kitchen table "
        "with a budget). SEARCH only for a real named institution the section names (a bank "
        "building, a stock exchange)."
    ),
    picture_example=(
        "[image: a vegetable market stall piled with tomatoes and onions, a customer holding "
        "out coins to the seller, seen from the front]"
    ),
)

_ENGLISH_PROSE = LessonPattern(
    key="english.prose",
    hook_style="big_question",
    hook_guidance=(
        "A BIG QUESTION on the story's central DILEMMA, asked as if the student were in the "
        "character's place ('If a bird dropped a gold jewel in your yard, would you keep it?'). "
        "Four options: what people might do; the correct one is the choice the story shows "
        "to be right, and its explanation says what the story shows. Do NOT reveal the ending."
    ),
    teach_guidance=(
        "Teach like an English teacher reading a story aloud with the class, PART BY PART. "
        "Part 1 opens the story: who wrote it (briefly, if an author note is given), where and "
        "when it happens, who the characters are. Every part then retells ITS OWN events in "
        "order, in the textbook's own names, and says why they matter - what the character "
        "feels, wants or fears at that moment. Quote a short striking phrase of the author's "
        "own words now and then so the student hears the text, and explain a hard word "
        "(especially a glossary word) in the sentence where it occurs. The story arc - "
        "setting, problem, turn, ending - builds across the parts, and the theme or message "
        "is drawn out in the last part."
    ),
    explore_kind="story_sequencing",
    explore_interactions=("order", "choice"),
    explore_guidance=(
        "STORY SEQUENCING: interaction 'order' with 5-6 key events of the story listed in "
        "SHUFFLED order as items (id e1..e6, one short sentence each) and 'answer' giving the "
        "ids in the correct order. challenge: a 'free_text' question - either 'what would you "
        "have done at this moment' or 'give the story a different ending in two lines'."
    ),
    real_world_guidance=(
        "Where the story's THEME (honesty, greed, courage, kindness, trust...) shows up in the "
        "student's own life - school, home, street. The reveal connects one everyday moment to "
        "what the story showed."
    ),
    mystery_guidance=(
        "The mystery is a rendered SCENE of a moment that echoes a scene or the theme of "
        "the story - a bird's nest under a roof, a found object, a crowded railway platform - "
        "shown without a caption. The question asks which moment of the story this recalls, "
        "or what the character felt or did at such a moment; the options are three readings, "
        "one that fits the story, two plausible for a careless reader."
    ),
    explain_guidance=(
        "A good retelling names the main characters, gives the events in order, says what "
        "the turning point was and how it ended, and states the theme or moral in the "
        "student's own words."
    ),
    picture_policy=(
        "GENERATE scenes from the story with its characters and setting. SEARCH only for a "
        "real place, person or event the text names that exists outside the story - rarely "
        "needed."
    ),
    picture_example=(
        "[image: a small boy standing at the gate of a village house at dusk, holding a "
        "lantern, looking down the empty road, seen from the side]"
    ),
)

_ENGLISH_SUPPLEMENTARY = LessonPattern(
    key="english.supplementary",
    hook_style=_ENGLISH_PROSE.hook_style,
    hook_guidance=_ENGLISH_PROSE.hook_guidance,
    teach_guidance=_ENGLISH_PROSE.teach_guidance + (
        " A supplementary reading is for reading and enjoying: tell it as a story, part by "
        "part, with no grammar and no language exercises. When it is an extract or a retold "
        "play, say whose work it comes from in part 1 and keep the characters' names and "
        "relationships clear, part after part."
    ),
    explore_kind=_ENGLISH_PROSE.explore_kind,
    explore_interactions=_ENGLISH_PROSE.explore_interactions,
    explore_guidance=_ENGLISH_PROSE.explore_guidance.replace("5-6 key events", "6 key events"),
    real_world_guidance=_ENGLISH_PROSE.real_world_guidance,
    mystery_guidance=_ENGLISH_PROSE.mystery_guidance,
    explain_guidance=_ENGLISH_PROSE.explain_guidance,
    picture_policy=_ENGLISH_PROSE.picture_policy,
    picture_example=_ENGLISH_PROSE.picture_example,
)

_ENGLISH_POEM = LessonPattern(
    key="english.poem",
    hook_style="big_question",
    hook_guidance=(
        "A BIG QUESTION on the poem's central IMAGE or idea, asked with a picture of that "
        "image ('Does a hero need a cape?'). Four options: four views a student might hold; "
        "the correct one is the view the poem takes, and its explanation says what the poem "
        "says. The poem is SUNG together right after the hook, so the 'bridge' leads into "
        "that ('Let's hear what the poet says - and sing it together!')."
    ),
    teach_guidance=(
        "The student has just SUNG the poem with you (the sing-along comes before this "
        "explanation), so open by recalling that ('We just sang it together - now let's find "
        "out what it really says'). Then teach stanza by stanza: quote the stanza's key line, "
        "give its sense in plain words, point to one image or sound device in it (rhyme, "
        "repetition, metaphor, personification), explain a hard word where it occurs, then "
        "move on. End with the rhyme scheme (work it out from the end words: aabb, abab...) "
        "and the central idea - what the poet feels and wants the reader to feel. Mention "
        "the poet briefly if an author note is given."
    ),
    explore_kind="rhyme_imagery_hunt",
    explore_interactions=("match", "choice"),
    explore_guidance=(
        "A RHYME AND IMAGERY HUNT: interaction 'match' pairing 3-4 rhyming words taken from "
        "the poem (left: one word of each pair, right: the other word, both lists shuffled; "
        "'answer' lists the correct [left_id, right_id] pairs). challenge: a 'choice' question "
        "'Which line is a metaphor / simile / personification?' with 3 lines from the poem as "
        "options, or a 'free_text' 'write two rhyming lines about your own hero'."
    ),
    real_world_guidance=(
        "Where the poem's feeling or idea appears in the student's daily life. The reveal "
        "connects one everyday moment to the poem's lines."
    ),
    mystery_guidance=(
        "The mystery is a rendered SCENE of the poem's central image or of a moment its "
        "lines describe - shown without a caption. The question asks which line or feeling "
        "of the poem the picture captures, or what device the poet uses for it; three "
        "options, one right."
    ),
    explain_guidance=(
        "A good explanation gives the poem's central idea in plain words, walks through what "
        "each stanza says, names one poetic device and the line it is in, and says what the "
        "poet feels."
    ),
    picture_policy=(
        "GENERATE the poem's images as scenes. SEARCH only for a real place or thing the poem "
        "names that exists - rarely needed."
    ),
    picture_example=(
        "[image: a lone tree on a windswept hill at sunset, its branches bent by the wind, "
        "seen from a distance]"
    ),
)

PATTERNS: Dict[str, LessonPattern] = {p.key: p for p in (
    _SCIENCE, _MATHS, _SOCIAL_HISTORY, _SOCIAL_GEOGRAPHY, _SOCIAL_CIVICS,
    _SOCIAL_ECONOMICS, _ENGLISH_PROSE, _ENGLISH_SUPPLEMENTARY, _ENGLISH_POEM,
)}

ENGLISH_LESSON_KINDS: Tuple[str, ...] = ("prose", "poem", "supplementary")

_SUBJECT_ALIASES = {
    "science": "science", "physics": "science", "chemistry": "science", "biology": "science",
    "mathematics": "mathematics", "maths": "mathematics", "math": "mathematics",
    "social_science": "social_science", "social": "social_science",
    "socialscience": "social_science", "social_studies": "social_science",
    "history": "social_science", "geography": "social_science",
    "civics": "social_science", "economics": "social_science",
    "english": "english",
}


def normalize_subject(subject: Any) -> str:
    """'Social Science' / 'maths' / 'SCIENCE' -> the registry's subject key ('' if unknown)."""
    key = re.sub(r"[\s\-]+", "_", str(subject or "").strip().lower())
    return _SUBJECT_ALIASES.get(key, "")


def resolve_pattern(subject: Any, section_kind: str = "", part: str = "") -> Optional[LessonPattern]:
    """The pattern for a section, or None when the subject/kind gets no avatar lesson.

    ``section_kind`` matters only for English (prose / poem / supplementary);
    ``part`` only for Social Science (History / Geography / Civics / Economics -
    History when unknown, since it is the only part extracted so far).
    """
    subj = normalize_subject(subject)
    if subj == "science":
        return PATTERNS["science"]
    if subj == "mathematics":
        return PATTERNS["mathematics"]
    if subj == "social_science":
        part_key = str(part or "").strip().lower()
        return PATTERNS.get(f"social_science.{part_key}", PATTERNS["social_science.history"])
    if subj == "english":
        kind = str(section_kind or "").strip().lower()
        if kind in ENGLISH_LESSON_KINDS:
            return PATTERNS[f"english.{kind}"]
        return None
    return None


# ══════════════════════════════════════════════════════════════════════════════
#  SECTION ENUMERATION (what the build endpoint walks)
# ══════════════════════════════════════════════════════════════════════════════

# Titles the classroom/avatar enrichers already skip as textbook furniture.
_AUX_TITLE_WORDS = ("summary", "glossary", "reference", "student activity",
                    "life skill", "learning objective")
_GENERAL_TYPES = ("section", "introduction")
_MATH_TYPES = ("section",)


def _title_of(section: Dict[str, Any]) -> str:
    return str(section.get("section_title") or section.get("title")
               or section.get("id") or "").strip()


def _flatten_items(items: Any) -> str:
    """``sub_items`` as plain text: numbered lines, options indented, an exercise
    heading kept as its own line, a poem's "stanza_N" as a paragraph."""
    lines: List[str] = []
    for it in items or []:
        if not isinstance(it, dict):
            if str(it or "").strip():
                lines.append(str(it).strip())
            continue
        num = str(it.get("number") or "").strip()
        title = str(it.get("title") or "").strip()
        body = str(it.get("content") or "").strip()
        nested = _flatten_items(it.get("sub_items"))
        opts = [str(o).strip() for o in it.get("options") or [] if str(o or "").strip()]
        if re.fullmatch(r"stanza[_\s-]?\d+", num, re.IGNORECASE):
            if body:
                lines.append(body)
            continue
        if len(num) > 8:                       # "A. Complete these sentences ..." - a heading
            head, num = num, ""
        else:
            head = title
        block = []
        if head:
            block.append(head)
        if body:
            block.append(f"{num} {body}" if num[-1:] in (".", ")") else f"{num}. {body}" if num else body)
        if opts:
            block.extend(f"  {o}" for o in opts)
        if nested:
            block.append(nested)
        if block:
            lines.append("\n".join(block))
    return "\n\n".join(lines)


def _english_reading_body(section: Dict[str, Any]) -> Tuple[str, str]:
    """(the reading's own text, its metadata as "key: value" lines).

    The text is what gets divided into parts or sung; the metadata (author,
    genre, about_author) is context for the plan and the writer.
    """
    body = str(section.get("content") or "").strip()
    if not body and section.get("sub_items"):
        body = _flatten_items(section.get("sub_items"))
    meta = section.get("metadata", {})
    extra = []
    if isinstance(meta, dict):
        extra = [f"{mk}: {mv}" for mk, mv in meta.items()
                 if isinstance(mv, str) and mv.strip()
                 and mk not in ("section_context", "order_in_chapter", "content_kind")]
    return body, "\n".join(extra)


def _english_reading_content(section: Dict[str, Any]) -> str:
    """Flatten a reading the way EnrichmentOrchestrator._build_english_sections does."""
    body, extra = _english_reading_body(section)
    return (body + "\n\n" + extra) if body and extra else (body or extra)


# ── English readings: what a unit's readings really are ───────────────────────

# NCERT prints teacher notes after the exercises ("In This Lesson / What we
# have done / What you can do"); extraction sometimes files them as a prose
# reading. They are for the teacher, never a lesson.
_TEACHER_NOTE_RE = re.compile(
    r"^\s*(?:in\s+this\s+lesson|what\s+we\s+have\s+done|what\s+you\s+can\s+do|"
    r"notes?\s+(?:to|for)\s+the\s+teachers?|teachers?'?s?\s+notes?)\s*$", re.IGNORECASE)
_POEM_GENRE_RE = re.compile(r"\bpoe(?:m|try|ms)\b|\bverse\b|\bsonnet\b|\bballad\b|\blyric\b", re.IGNORECASE)
_PICTURE_REF_RE = re.compile(r"!\[[^\]]*\]\([^)]*\)|\[\s*image\s*:\s*[^\]]*\]", re.IGNORECASE)
# A glossary line printed under a poem ("**perish:** die").
_GLOSS_LINE_RE = re.compile(r"^\*\*[^*]{1,40}\*\*\s*[:\-–]?\s*\S.*$|^\*\*[^*]{1,40}:\*\*.*$")
_BULLET_RE = re.compile(r"^\s*(?:[-*•❖]|\d+[.)])\s+")


def strip_picture_refs(text: str) -> str:
    """The reading without its "![img](url)" / "[Image: x]" picture references."""
    return re.sub(r"[ \t]+\n", "\n", _PICTURE_REF_RE.sub("", text or "")).strip()


def looks_like_verse(text: str) -> bool:
    """True when a text is laid out as verse: short lines in multi-line stanzas.

    A story's paragraph is one long line in structured.json, so prose never
    passes; a poem the extractor typed as prose (CBSE "Dust of Snow") does.
    """
    text = strip_picture_refs(text)
    lines = [ln.strip() for ln in text.splitlines() if ln.strip()]
    lines = [ln for ln in lines if not _GLOSS_LINE_RE.match(ln)]
    if len(lines) < 4:
        return False
    if sum(1 for ln in lines if _BULLET_RE.match(ln)) > len(lines) // 2:
        return False                                      # a list, not verse
    if sum(1 for ln in lines if len(ln) <= 80) < 0.8 * len(lines):
        return False
    blocks = [b for b in re.split(r"\n\s*\n", text) if b.strip()]
    multi = sum(1 for b in blocks if len([ln for ln in b.splitlines() if ln.strip()]) >= 2)
    return multi >= max(1, len(blocks) // 2)


def english_reading_kind(section: Dict[str, Any], body: Optional[str] = None) -> str:
    """prose / poem / supplementary for a reading - corrected where extraction
    mislabelled it: metadata ``genre: Poem`` or a verse layout makes it a poem
    (CBSE "Dust of Snow" came out as prose; TN's "Read and Enjoy" poem as
    supplementary). Any other section: its plain kind."""
    kind = section_content_kind(section)
    if kind not in ENGLISH_LESSON_KINDS or kind == "poem":
        return kind
    meta = section.get("metadata") if isinstance(section.get("metadata"), dict) else {}
    genre = " ".join(str(meta.get(k) or "") for k in ("genre", "form", "reading_type"))
    if _POEM_GENRE_RE.search(genre):
        return "poem"
    if looks_like_verse(body if body is not None else str(section.get("content") or "")):
        return "poem"
    return kind


def _norm_label(value: Any) -> str:
    return re.sub(r"\s+", " ", str(value or "")).strip().lower()


def english_readings(raw_sections: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """The unit's readings in order: ``{index, last_index, section, title, kind,
    body, extra, merged}``.

    A reading's continuation - an untitled reading right after it that the
    extractor split off, carrying the same ``metadata.title`` (TN "The
    Tempest" came out as supplementary + prose) - is folded back in, and
    teacher notes are dropped.
    """
    out: List[Dict[str, Any]] = []
    for idx, sec in enumerate(raw_sections):
        if section_content_kind(sec) not in ENGLISH_LESSON_KINDS:
            continue
        meta = sec.get("metadata") if isinstance(sec.get("metadata"), dict) else {}
        printed = str(sec.get("title") or "").strip()
        body, extra = _english_reading_body(sec)
        if out and not printed and out[-1]["last_index"] == idx - 1 \
                and _norm_label(meta.get("title")) == _norm_label(out[-1]["title"]):
            prev = out[-1]
            prev["body"] = f"{prev['body']}\n\n{body}".strip()
            prev["last_index"] = idx
            prev["merged"].append(idx)
            logger.info(f"[lesson] '{prev['title']}': an untitled continuation of the reading "
                        f"was folded back in ({len(body):,} chars)")
            continue
        title = _title_of(sec) or str(meta.get("title") or "").strip()
        if _TEACHER_NOTE_RE.match(title):
            logger.info(f"[lesson] '{title}' is a teacher's note, not a reading - no lesson")
            continue
        raw_kind = section_content_kind(sec)
        kind = english_reading_kind(sec, body)
        if kind != raw_kind:
            logger.info(f"[lesson] '{title}' is laid out as a poem (typed {raw_kind}) - taught as a poem")
        out.append({"index": idx, "last_index": idx, "section": sec,
                    "title": title or raw_kind.replace("_", " ").title(),
                    "kind": kind, "body": body, "extra": extra, "merged": []})
    return out


def _author_note(raw_sections: List[Dict[str, Any]], start: int, stop: int) -> str:
    """The "About the author / poet" box printed after a reading (before the next one)."""
    for sib in raw_sections[start + 1:stop]:
        if str(sib.get("type") or "").strip().lower() == "about_the_author":
            note = str(sib.get("content") or "").strip()
            if note:
                return note
    return ""


def _check_questions(section: Dict[str, Any]) -> List[str]:
    """The questions of one comprehension-check exercise, numbering and emphasis removed."""
    found: List[str] = []
    for line in str(section.get("content") or "").splitlines():
        line = re.sub(r"^\s*(?:\d+|[a-z]|[ivx]+)[.)]\s*", "", line.strip()).strip("*_ ").strip()
        if line:
            found.append(line)
    if not found:
        for it in section.get("sub_items") or []:
            text = str((it or {}).get("content") or "").strip("*_ \n") if isinstance(it, dict) else ""
            if text:
                found.append(text)
    return found


def reading_check_groups(raw_sections: List[Dict[str, Any]], last_index: int) -> List[List[str]]:
    """The book's own comprehension checks re-emitted after a reading (NCERT's
    'Oral Comprehension Check', one per chunk of the story), in order.

    ``merge_split_english_readings`` puts them straight after the reading it
    rejoined; each group is the questions about one stretch of the story.
    """
    from section_types import is_mid_reading_check
    groups: List[List[str]] = []
    seen = set()
    for sib in raw_sections[last_index + 1:]:
        if not is_mid_reading_check(sib):
            break
        questions = _check_questions(sib)
        key = tuple(_norm_label(q) for q in questions)
        if questions and key not in seen:
            seen.add(key)
            groups.append(questions)
    return groups


_LANGUAGE_TITLE_RE = re.compile(
    r"thinking\s+about\s+language|language\s+(?:study|work|focus|skills?)|grammar|"
    r"vocabulary|word\s+(?:study|power|building)|parts\s+of\s+speech", re.IGNORECASE)
_PRE_READING_TITLE_RE = re.compile(r"before\s+you\s+read|warm[\s-]*up|let'?s\s+begin|pre[\s-]*reading",
                                   re.IGNORECASE)


def _render_block(section: Dict[str, Any]) -> str:
    title = _title_of(section)
    body = str(section.get("content") or "").strip()
    items = _flatten_items(section.get("sub_items"))
    return "\n".join(p for p in (f"### {title}" if title else "", body, items) if p)


def english_language_material(raw_sections: List[Dict[str, Any]],
                              max_chars: int = 9000) -> Dict[str, Any]:
    """What the unit gives the grammar part to teach from.

    ``source``: "textbook grammar" when the unit prints a Grammar section (its
    topics plus the exercises printed under them - TN), "language exercises"
    when it only has exercises such as 'Thinking about Language' (NCERT: the
    lesson decides the grammar from them), "vocabulary" when that is all
    there is, "story" when there is nothing (the grammar comes from the
    reading itself). ``sections`` names what was used; ``text`` is the material.
    """
    grammar: List[Dict[str, Any]] = []
    language: List[Dict[str, Any]] = []
    vocab: List[Dict[str, Any]] = []
    under_grammar = False
    for sec in raw_sections:
        stype = str(sec.get("type") or "").strip().lower()
        title = _title_of(sec)
        if stype == "grammar":
            grammar.append(sec)
            under_grammar = True
            continue
        if stype == "exercise" and under_grammar:
            grammar.append(sec)               # the practice printed under a grammar topic
            continue
        under_grammar = False
        if stype == "vocabulary":
            vocab.append(sec)
        elif stype in ("exercise", "activity", "other", "section") and _LANGUAGE_TITLE_RE.search(title):
            if section_content_kind(sec) not in ENGLISH_LESSON_KINDS:
                language.append(sec)
    if grammar:
        source, chosen = "textbook grammar", grammar
    elif language:
        source, chosen = "language exercises", language
    elif vocab:
        source, chosen = "vocabulary", vocab
    else:
        return {"source": "story", "sections": [], "text": ""}
    text, used = "", []
    for sec in chosen:
        block = _render_block(sec)
        if not block:
            continue
        if len(text) + len(block) > max_chars:
            text += "\n\n" + block[:max(0, max_chars - len(text))]
            used.append(_title_of(sec) or str(sec.get("type") or ""))
            break
        text = f"{text}\n\n{block}".strip()
        used.append(_title_of(sec) or str(sec.get("type") or ""))
    return {"source": source, "sections": used, "text": text}


def _pre_reading_context(raw_sections: List[Dict[str, Any]], first_index: int,
                         max_chars: int = 1500) -> Tuple[str, List[str]]:
    """The warm-up / before-you-read box printed ahead of the first reading."""
    text, labels = "", []
    for sec in raw_sections[:first_index]:
        stype = str(sec.get("type") or "").strip().lower()
        title = _title_of(sec)
        if stype in ("warm_up", "activity", "introduction") or _PRE_READING_TITLE_RE.search(title):
            body = strip_picture_refs(str(sec.get("content") or ""))
            if body:
                text = f"{text}\n\n{title or stype}: {body}".strip()
                labels.append(title or stype)
    return text[:max_chars], labels


def _english_targets(raw_sections: List[Dict[str, Any]], *, u_num: Any, u_title: str,
                     part: str, want_title: str) -> List[Dict[str, Any]]:
    """Every English reading of one unit that gets a lesson, with what it is built from.

    Beyond the shared target keys: ``reading_text`` (the text divided into
    parts or sung), ``check_groups`` (the book's comprehension checks, in
    order) and, on the unit's FIRST prose reading only, ``grammar_source``
    (``english_language_material``) - the grammar is the next part of that
    lesson (user request 2026-09-23).
    """
    readings = english_readings(raw_sections)
    first_prose = next((r for r in readings if r["kind"] == "prose"), None)
    out: List[Dict[str, Any]] = []
    for pos, r in enumerate(readings):
        title = r["title"]
        if want_title and title.lower() != want_title:
            continue
        stop = readings[pos + 1]["index"] if pos + 1 < len(readings) else len(raw_sections)
        note = _author_note(raw_sections, r["last_index"], stop)
        notes = [r["extra"]] if r["extra"] else []
        if note:
            notes.append(f"About the author: {note}")
        folded: List[str] = []
        meta = r["section"].get("metadata") if isinstance(r["section"].get("metadata"), dict) else {}
        target: Dict[str, Any] = {"reading_text": strip_picture_refs(r["body"]), "check_groups": [],
                                  "reading_breaks": [str(b) for b in meta.get("reading_breaks") or []
                                                     if str(b or "").strip()]}
        if r["kind"] in ("prose", "supplementary"):
            target["check_groups"] = reading_check_groups(raw_sections, r["last_index"])
            if target["check_groups"]:
                folded.append(f"{len(target['check_groups'])} comprehension check(s)")
        if r is first_prose:
            pre, pre_labels = _pre_reading_context(raw_sections, r["index"])
            if pre:
                notes.append(f"Before the reading, the book asks:\n{pre}")
                folded.extend(pre_labels)
            target["grammar_source"] = english_language_material(raw_sections)
            folded.extend(target["grammar_source"]["sections"])
        target["reading_notes"] = "\n\n".join(notes)
        content = r["body"] + (f"\n\n{target['reading_notes']}" if notes else "")
        if len(content.strip()) < 50 or not _has_teachable(content):
            continue
        pattern = resolve_pattern("english", r["kind"], part)
        if pattern is None:
            continue
        target.update({
            "unit_number": u_num, "unit_title": u_title, "part": part,
            "section": r["section"], "section_title": title, "section_kind": r["kind"],
            "content": content, "is_math": False, "pattern": pattern,
            "folded": list(dict.fromkeys(folded)),
        })
        out.append(target)
    return out


def _has_teachable(content: str) -> bool:
    from enrichment_pipeline import _has_teachable_prose
    return _has_teachable_prose(content)


def _math_composite(section: Dict[str, Any]) -> str:
    """Section prose + its definitions / illustrations / examples, as enrich_unit builds it."""
    parts = []
    body = section.get("content", "") or ""
    if body.strip():
        parts.append(body)
    for sub in section.get("sub_sections", section.get("subsections", [])) or []:
        if not isinstance(sub, dict):
            continue
        sub_c = sub.get("content", "") or ""
        sub_t = sub.get("title", "") or sub.get("id", "") or ""
        if sub_c.strip():
            parts.append(f"{sub_t}\n{sub_c}" if sub_t else sub_c)
        sol = (sub.get("metadata") or {}).get("solution", "")
        if sol:
            parts.append(f"Solution:\n{sol}")
    return "\n\n".join(parts)


def eligible_sections(structured: Dict[str, Any], subject: Any,
                      unit_number: Optional[int] = None,
                      section_title: Optional[str] = None) -> List[Dict[str, Any]]:
    """Every section of a document that gets an avatar lesson, with what it is built from.

    Returns dicts: ``{unit_number, unit_title, part, section, section_title,
    section_kind, content, is_math, pattern, folded}`` in document order.
    Sections the subject skips (exercises, glossaries, grammar...) are simply
    absent - the per-subject table in the plan is enforced here and nowhere
    else. ONLY a section gets a lesson: a box the extractor filed next to it
    rather than under it (a definition, a figure caption, an activity, a
    "Do you know") is taught inside that section's lesson - ``content`` carries
    it and ``folded`` names it - never enriched on its own.

    English (``_english_targets``): only readings, their kind corrected from
    the layout, teacher notes skipped; a target also carries ``reading_text``,
    ``check_groups`` and ``reading_breaks`` (for the parts) and, on the
    unit's first prose reading, ``grammar_source`` - the unit's Grammar
    section, or its language exercises, taught as the next part of that lesson.
    """
    from enrichment_pipeline import (_build_section_text, _has_teachable_prose,
                                     _lesson_text, _plan_lessons, _section_label)

    subj = normalize_subject(subject)
    is_math = subj == "mathematics"
    content_key = "chapters" if "chapters" in structured else "units"
    want_title = (section_title or "").strip().lower()
    out: List[Dict[str, Any]] = []

    for unit in structured.get(content_key, []) or []:
        u_num = unit.get("unit_number") or unit.get("chapter_number")
        if unit_number is not None and u_num != unit_number:
            continue
        u_title = unit.get("chapter_name") or unit.get("chapter_title") or unit.get("title", "")
        part = unit.get("part") or ""
        raw_sections = [sec for sec in (unit.get("sections", []) or []) if isinstance(sec, dict)]
        if subj == "english":
            out.extend(_english_targets(raw_sections, u_num=u_num, u_title=u_title, part=part,
                                        want_title=want_title))
            continue
        # Science / social science: which flat boxes each section teaches.
        boxes_of: Dict[int, List[int]] = {}
        if subj not in ("english", "mathematics"):
            boxes_of = {lesson["anchor"]: lesson["members"] for lesson in _plan_lessons(raw_sections)}

        for idx, sec in enumerate(raw_sections):
            stype = str(sec.get("type") or "section").strip().lower()
            title = _title_of(sec) or stype.replace("_", " ").title()
            if want_title and title.lower() != want_title:
                continue
            folded: List[str] = []

            if is_math:
                if stype not in _MATH_TYPES:
                    continue
                if title.lower() in ("summary", "references", "student activity", "glossary"):
                    continue
                kind = stype
                content = _math_composite(sec)
            else:
                if stype not in _GENERAL_TYPES:
                    continue
                if any(w in title.lower() for w in _AUX_TITLE_WORDS):
                    continue
                kind = stype
                members = boxes_of.get(idx, [])
                folded = [_section_label(raw_sections[i]) for i in members]
                content = _lesson_text(raw_sections, idx, members) if members else _build_section_text(sec)

            if len(content.strip()) < 50 or not _has_teachable_prose(content):
                continue
            pattern = resolve_pattern(subj, kind, part)
            if pattern is None:
                continue
            out.append({
                "unit_number": u_num, "unit_title": u_title, "part": part,
                "section": sec, "section_title": title, "section_kind": kind,
                "content": content, "is_math": is_math, "pattern": pattern,
                "folded": folded,
            })
    return out


# ── Textbook activities (science Explore uses the book's own) ─────────────────

_MATERIALS_RE = re.compile(
    r"^\s*(?:apparatus|materials?(?:\s+required)?|you will need|things needed|requirements?)\s*[:\-]\s*(.+)$",
    re.IGNORECASE | re.MULTILINE,
)
_STEP_RE = re.compile(r"^\s*(?:\d+|[ivx]+)[.)]\s+(.+?)\s*$", re.IGNORECASE | re.MULTILINE)


def textbook_activity(section: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """The section's own Activity, parsed into materials + steps, or None.

    Only the first activity is used; a section with several still gets one
    Explore phase.
    """
    for sub in section.get("sub_sections", section.get("subsections", [])) or []:
        if not isinstance(sub, dict) or str(sub.get("type") or "").lower() != "activity":
            continue
        text = (sub.get("content") or "").strip()
        if len(text) < 30:
            continue
        title = str(sub.get("title") or "Activity").strip()
        materials: List[str] = []
        m = _MATERIALS_RE.search(text)
        if m:
            materials = [x.strip(" .") for x in re.split(r",|;|\band\b", m.group(1)) if x.strip(" .")]
        steps = [s.strip() for s in _STEP_RE.findall(text)]
        if not steps:
            # Prose activities ("Take a glass tumbler and ... Now ... Then ...")
            # read as steps sentence by sentence, up to the observation.
            first_para = text.split("\n\n")[0]
            steps = [s.strip() for s in re.split(r"(?<=[.!?])\s+", first_para)
                     if len(s.strip()) > 12][:6]
        return {"title": title, "materials": materials, "steps": steps,
                "text": text, "source": f"textbook:{title}"}
    return None


# ── English readings in parts, poems in lines ─────────────────────────────────

# A block made only of numbered questions - TN prints two after each stretch
# of the story ("a. Why did the seagull fail to fly?").
_QUESTION_LINE_RE = re.compile(r"^\s*(?:\(?[a-z]\)|[a-z][.)]|\d{1,2}[.)]|[ivx]{1,4}[.)])\s+.+\?\s*[*_]*\s*$",
                               re.IGNORECASE)


def _clean_question(line: str) -> str:
    return re.sub(r"^\s*(?:\(?[a-z]\)|[a-z][.)]|\d{1,2}[.)]|[ivx]{1,4}[.)])\s+", "", line.strip(),
                  flags=re.IGNORECASE).strip("*_ ").strip()


def _balance(paras: List[str], n: int) -> List[Dict[str, Any]]:
    """``paras`` in ``n`` contiguous groups of about the same length."""
    n = max(1, min(n, len(paras)))
    total = sum(len(p) for p in paras) or 1
    groups: List[List[str]] = []
    cur: List[str] = []
    acc = 0
    for i, p in enumerate(paras):
        cur.append(p)
        acc += len(p)
        left_groups = n - len(groups) - 1
        left_paras = len(paras) - i - 1
        if left_groups > 0 and (acc >= total * (len(groups) + 1) / n or left_paras == left_groups):
            groups.append(cur)
            cur = []
    if cur:
        groups.append(cur)
    return [{"paras": g, "questions": []} for g in groups]


def _cut_at_breaks(paras: List[str], breaks: List[str]) -> Optional[List[Dict[str, Any]]]:
    """``paras`` cut where each recorded break begins, or None when any break
    cannot be found in order (the text was edited since)."""
    def norm(s: str) -> str:
        return re.sub(r"\s+", " ", s).strip().lower()[:40]

    def begins(para: str, want: str) -> bool:
        # A break is the first 80 characters of a piece, which may run on past
        # a short opening paragraph ("That night was a sorrowful one.").
        p = norm(para)
        return bool(p) and (p.startswith(want) or want.startswith(p))

    starts, at = [], 0
    for brk in breaks:
        want = norm(brk)
        if not want:
            continue
        hit = next((i for i in range(at + 1, len(paras)) if begins(paras[i], want)), None)
        if hit is None:
            return None
        starts.append(hit)
        at = hit
    if not starts:
        return None
    bounds = [0, *starts, len(paras)]
    return [{"paras": paras[a:b], "questions": []} for a, b in zip(bounds, bounds[1:]) if paras[a:b]]


def split_reading_parts(text: str, check_groups: Optional[List[List[str]]] = None,
                        target_chars: Optional[int] = None,
                        max_parts: Optional[int] = None,
                        breaks: Optional[List[str]] = None) -> List[Dict[str, Any]]:
    """A story or supplementary reading in teachable parts, in order:
    ``[{"part", "text", "questions"}]``.

    The book's own breaks win:
    - TN prints two questions after each stretch of the story, so a part ends
      at each question block and carries those questions;
    - NCERT prints its 'Oral Comprehension Check' mid-story and extraction
      lifts the checks out, recording where each piece began
      (``metadata.reading_breaks``, section_types.merge_split_english_readings):
      the reading is cut back there and check i goes with part i.
    Neighbouring stretches are merged (smallest pair first) down to about
    ``len / target_chars`` parts, at most ``max_parts``. With no breaks the
    paragraphs are balanced into that many parts - into as many parts as the
    book has checks when ``check_groups`` are given - and a part only carries
    questions when its cut is the book's own (otherwise the builder hands the
    checks to the writer for the whole reading). A short reading is one part.
    Paragraphs are never cut.
    """
    target_chars = target_chars or READING_PART_CHARS
    max_parts = max_parts or READING_MAX_PARTS
    groups = [g for g in (check_groups or []) if g]
    blocks = [b.strip() for b in re.split(r"\n\s*\n", strip_picture_refs(text)) if b.strip()]
    chunks: List[Dict[str, Any]] = []
    cur: Dict[str, Any] = {"paras": [], "questions": []}
    for block in blocks:
        lines = [ln for ln in block.splitlines() if ln.strip()]
        if lines and all(_QUESTION_LINE_RE.match(ln) for ln in lines):
            questions = [_clean_question(ln) for ln in lines]
            if cur["paras"]:
                cur["questions"].extend(questions)
                chunks.append(cur)
                cur = {"paras": [], "questions": []}
            elif chunks:
                chunks[-1]["questions"].extend(questions)
            continue
        cur["paras"].append(block)
    if cur["paras"]:
        chunks.append(cur)
    if not chunks:
        return []

    def size(chunk: Dict[str, Any]) -> int:
        return sum(len(p) for p in chunk["paras"])

    total = sum(size(c) for c in chunks)
    want = max(1, min(max_parts, round(total / target_chars)))
    if len(chunks) == 1 and breaks:
        cut = _cut_at_breaks(chunks[0]["paras"], breaks)
        if cut and len(cut) > 1:
            if len(groups) == len(cut):
                for chunk, group in zip(cut, groups):
                    chunk["questions"] = list(group)
            chunks = cut
            want = max(1, min(max_parts, len(chunks)))
    if len(chunks) > 1:
        while len(chunks) > want:
            i = min(range(len(chunks) - 1), key=lambda k: size(chunks[k]) + size(chunks[k + 1]))
            chunks[i] = {"paras": chunks[i]["paras"] + chunks[i + 1]["paras"],
                         "questions": chunks[i]["questions"] + chunks[i + 1]["questions"]}
            del chunks[i + 1]
    else:
        paras, questions = chunks[0]["paras"], chunks[0]["questions"]
        if 2 <= len(groups) <= max_parts and total >= target_chars:
            want = len(groups)
        chunks = _balance(paras, want)
        if questions:
            chunks[-1]["questions"].extend(questions)
    return [{"part": i, "text": "\n\n".join(c["paras"]), "questions": c["questions"]}
            for i, c in enumerate(chunks, 1)]


def poem_stanzas(text: str) -> Tuple[List[List[str]], bool]:
    """The poem as stanzas of lines, and whether the line breaks are real.

    A stanza is a paragraph; glossary lines printed under the poem are left
    out. ``False`` means some stanza came as one run-on line (TN "Life" lost
    its line breaks in extraction) - the sing-along writer restores them.
    """
    stanzas: List[List[str]] = []
    for block in re.split(r"\n\s*\n", strip_picture_refs(text)):
        lines = [ln.strip() for ln in block.splitlines() if ln.strip()]
        lines = [ln for ln in lines if not _GLOSS_LINE_RE.match(ln)
                 and not re.match(r"^(?:title|author|poet|genre)\s*:", ln, re.IGNORECASE)]
        if lines:
            stanzas.append(lines)
    known = bool(stanzas) and all(len(ln) <= 110 for s in stanzas for ln in s)
    return stanzas, known


def _words(text: str) -> List[str]:
    return re.findall(r"[a-z0-9]+", re.sub(r"['’]", "", str(text or "").lower()))


def restore_poem_lines(raw_stanzas: Any, stanzas: List[List[str]]) -> List[List[str]]:
    """The writer's line breaks when its words ARE the poem's words in order,
    else a punctuation-then-capital split of every run-on line."""
    if isinstance(raw_stanzas, list):
        restored = [[str(ln).strip() for ln in st if str(ln or "").strip()]
                    for st in raw_stanzas if isinstance(st, list)]
        restored = [st for st in restored if st]
        if restored and _words(" ".join(" ".join(s) for s in restored)) == \
                _words(" ".join(" ".join(s) for s in stanzas)):
            return restored
        logger.warning("[lesson] sing-along: the restored lines do not match the poem's words - "
                       "splitting at punctuation instead")
    out: List[List[str]] = []
    for st in stanzas:
        lines: List[str] = []
        for ln in st:
            if len(ln) <= 110:
                lines.append(ln)
            else:
                lines.extend(p.strip() for p in re.split(r"(?<=[,;:.!?])\s+(?=[A-Z])", ln) if p.strip())
        out.append(lines)
    return out


# ══════════════════════════════════════════════════════════════════════════════
#  PROMPTS
# ══════════════════════════════════════════════════════════════════════════════

_STAY_INSIDE = """STAY INSIDE THE SECTION. This is a textbook lesson, not a general talk on the
subject. Use the supplied content and the terms it uses:
- Do NOT introduce a place, person, event, dynasty, date or fact the content does
  not contain. The student is examined on this section and cannot tell your
  additions from the textbook's.
- Everyday situations that ILLUSTRATE the section's idea (a bus, a shop, a
  kitchen) are welcome; new FACTS are not.
- Keep the textbook's own framing for anything it explicitly states."""

_EMOTION_LINE = "EMOTIONS (use ONLY these 10 values): " + ", ".join(EMOTIONS)

LESSON_PLAN_PROMPT = """You are GradeUp AI Avatar, an expressive school teacher designing the INTERACTIVE
parts of one lesson on a textbook section. The lesson has six phases, in this order:
hook -> explanation -> real_world -> explore -> mystery -> explain_back.
The explanation script is written separately. Here you write the HOOK, REAL_WORLD,
EXPLORE, MYSTERY and EXPLAIN_BACK phases.

""" + _STAY_INSIDE + """

SUBJECT PATTERN: {pattern_key}

SPOKEN LINES: every object with "text" and "emotion" is spoken aloud by the avatar.
1-3 sentences, natural classroom voice ("we", "let's", "notice how"). """ + _EMOTION_LINE + """

PICTURES. Wherever a phase takes an "image_prompt", also say where the picture comes from:
- "image_source": "generate" - an imagined scene rendered as a 3D illustration. Then
  "image_prompt" is ONE sentence describing the scene: the subject, the setting, the exact
  moment or action, and the viewpoint - concrete and visual ("a boy standing in the aisle of
  a moving city bus, gripping an overhead strap, seen from the side"). NO text, labels,
  arrows or captions in the picture - the avatar's words carry them.
- "image_source": "search" - a REAL photograph found on the web of a real thing that exists
  and should be shown as it is. Then "image_prompt" is a noun phrase naming what the picture
  must show ("a set of engraved copper plates held together by a ring") and "search_query"
  is a TAG-STYLE search of 2-4 nouns ("Chola copper plate grant"); write "search_query": ""
  for a generated picture.
Nothing the section does not mention. Which to use in THIS subject: {picture_policy}

HOOK - asked BEFORE any teaching, so it must be answerable from everyday experience,
not from the section's terms. {hook_guidance}
- "style": "{hook_style}"
- "title": a 2-5 word headline. "scenario": 1-2 sentences setting the scene ("" for a
  plain question). "question": the question itself.
- "options": EXACTLY FOUR, keys "A", "B", "C", "D". Exactly one is right: "answer". The
  three wrong ones are outcomes a student might genuinely expect - never silly.
- "option_explanations": one for EVERY option. The correct one MUST begin with
  \"""" + CORRECT_PREFIX + """\" and then say why. Each wrong one says kindly why
  not and what is actually true - never mocking, never revealing a different option's text.
- "resolutions": one for EVERY option - what the avatar SAYS at the END of the
  explanation when it returns to this question for a student who chose that option.
  Start by acknowledging their choice ("You predicted..."), then close the loop with the
  idea just taught. 1-3 sentences, with an emotion.
- "intro": the avatar asking the question (restate scenario + question in speech).
- "bridge": one spoken line that moves from the hook into the topic, in the spirit of
  "You've just seen a real-world case of today's topic - now let's line that up with the
  science and study it properly."
- THE HOOK HAS TWO PICTURES: the QUESTION scene, and ONE image with four panels - one panel
  per option - so the student SEES the four possible outcomes side by side and picks (each
  panel is badged A-D afterwards; write no letters). So:
  "image_prompt" (+ "image_source", "search_query"): the QUESTION picture - the calm
  moment BEFORE the event, with NO outcome visible: a student must not be able to read the
  answer off it ("a teenager standing upright in the aisle of a smoothly moving city bus,
  holding an overhead strap, seen from the side" - NOT "as the driver brakes", which would
  show the lurch). A real source or place the question is about may be a "search" picture.
  "image_prompt" is also the setting shared by the four option panels (always generated);
  each panel adds its own outcome.
  "option_scenes": one short visual phrase per option, keys "A"-"D" - what a panel showing
  THAT option's outcome looks like, same character, same setting, same viewpoint ("the
  teenager's upper body tilted sharply forward", "...tilted backward", "standing perfectly
  upright", "feet lifting off the floor"). Each must look clearly different from the other
  three at a glance, and each must match its option's text.

REAL_WORLD - "Now let's connect the topic with a real-world example." {real_world_guidance}
- "question": posed as a question the student answers in their head first.
- "ask": the avatar posing it and inviting them to tap to see.
- "reveal": what the avatar says once they tap - the example, and how the idea is at work
  in it. "why_it_matters": one sentence, not spoken.
- "image_prompt" (+ "image_source", "search_query"): the real-world scene or thing the
  reveal describes.

EXPLORE - "Now we've learned it, let's do a fun activity." {explore_guidance}
- "kind": "{explore_kind}". "title": 2-6 words. "source": "textbook:<activity title>" when
  the supplied textbook activity is used, else "generated".
- "intro" and "wrap_up": spoken lines (intro invites the activity; wrap_up closes it warmly).
- "materials": list of strings (may be empty). "steps": list of short imperative strings.
- "interaction": ONE of the shapes below, type from: {explore_interactions}.
- "challenge": optional {{"prompt": "...", "interaction": <shape>}} - one harder apply-it
  question. Omit it rather than invent a weak one.
- "image_prompt" (+ "image_source", "search_query"): the activity SET-UP, ONLY when seeing
  it helps the student do the activity (a hands-on set-up with its materials in place, a
  source or map to examine). "" when the activity is a question that needs no picture.

INTERACTION SHAPES:
  choice:   {{"type":"choice","prompt":"...","options":[{{"id":"A","label":"...","feedback":"..."}}, ... 3 options],"answer":"A"}}
  order:    {{"type":"order","prompt":"...","items":[{{"id":"e1","label":"..."}}, ...] (SHUFFLED),"answer":["e3","e1",...] (ids in correct order)}}
  match:    {{"type":"match","prompt":"...","left":[{{"id":"l1","label":"..."}}],"right":[{{"id":"r1","label":"..."}}] (both shuffled),"answer":[["l1","r2"], ...]}}
  numeric:  {{"type":"numeric","prompt":"...","answer":6,"tolerance":0,"feedback_correct":"...","feedback_incorrect":"..."}}
  free_text: {{"type":"free_text","prompt":"...","model_answer":"..."}}
  picture_walkthrough: {{"type":"picture_walkthrough","prompt":"...","image_prompt":"the object, source or map to picture","image_source":"search or generate","search_query":"2-4 nouns when search"}}

MYSTERY - "Now, can you spot it in the wild?" {mystery_guidance}
- Write EXACTLY ONE mystery. "title" (2-5 words); "image_prompt" (+ "image_source",
  "search_query") - the picture the student must read: it shows the MOMENT or the object,
  never the answer (no labels, no arrows, no caption); "question"
  (what is happening in the picture and why - the student sees the picture, not your
  description of it); "options" A-C with exactly one correct ("answer");
  "option_explanations" for every option (the correct one begins with
  \"""" + CORRECT_PREFIX + """\"); "reveal": the avatar's spoken line once the
  answer is shown - what the picture really shows and how the section's idea is at work in
  it (1-3 sentences, with an emotion).
- "intro" and "outro": spoken lines that open and close the mystery.

EXPLAIN_BACK - the student now explains the topic in their OWN words and the avatar gives
feedback. This is the LAST phase. {explain_guidance}
- "prompt": the task as shown on screen ("Explain ... in your own words, as if to a
  friend who missed the class.").
- "ask": the avatar setting the task (spoken). "closing": a warm last line for the section,
  spoken after the feedback.
- "key_points": 3-5 short statements a good explanation must cover, each one checkable.
- "model_explanation": 3-5 sentences - the explanation a strong student would give.

Return STRICT JSON:
{{
  "hook": {{"style": "", "title": "", "scenario": "", "question": "",
            "options": {{"A": "", "B": "", "C": "", "D": ""}}, "answer": "A",
            "option_explanations": {{"A": "", "B": "", "C": "", "D": ""}},
            "resolutions": {{"A": {{"text": "", "emotion": ""}}, "B": {{"text": "", "emotion": ""}}, "C": {{"text": "", "emotion": ""}}, "D": {{"text": "", "emotion": ""}}}},
            "intro": {{"text": "", "emotion": ""}}, "bridge": {{"text": "", "emotion": ""}},
            "image_prompt": "", "image_source": "generate", "search_query": "",
            "option_scenes": {{"A": "", "B": "", "C": "", "D": ""}}}},
  "real_world": {{"question": "", "ask": {{"text": "", "emotion": ""}},
                  "reveal": {{"text": "", "emotion": ""}}, "why_it_matters": "",
                  "image_prompt": "", "image_source": "generate", "search_query": ""}},
  "explore": {{"kind": "", "title": "", "source": "", "intro": {{"text": "", "emotion": ""}},
               "materials": [], "steps": [], "interaction": {{}},
               "challenge": {{"prompt": "", "interaction": {{}}}},
               "wrap_up": {{"text": "", "emotion": ""}},
               "image_prompt": "", "image_source": "generate", "search_query": ""}},
  "mystery": {{"intro": {{"text": "", "emotion": ""}}, "outro": {{"text": "", "emotion": ""}},
               "item": {{"title": "", "image_prompt": "", "image_source": "generate", "search_query": "",
                         "question": "",
                         "options": {{"A": "", "B": "", "C": ""}}, "answer": "A",
                         "option_explanations": {{"A": "", "B": "", "C": ""}},
                         "reveal": {{"text": "", "emotion": ""}}}}}},
  "explain_back": {{"prompt": "", "ask": {{"text": "", "emotion": ""}}, "closing": {{"text": "", "emotion": ""}},
                    "key_points": ["", "", ""], "model_explanation": ""}}
}}
"""

AVATAR_TEACH_PROMPT = """You are an experienced, expressive school teacher preparing a lesson for an AI avatar.
The avatar will SPEAK each segment aloud to a student, with emotions.

Your job: convert the textbook content into a clear teaching script - the EXPLANATION
phase of a lesson that opened with a hook question and goes on to a real-world example,
an activity, a mystery picture and the student's own explanation afterwards.

""" + _STAY_INSIDE + """

STYLE:
- Speak naturally as if you're in a live classroom. Use "we", "let's", "notice how".
- SHORT, SIMPLE, CLEAR sentences a {student_class} student follows on first hearing.
  Everyday words; explain a term the moment you use it. One idea at a time. Easy to
  understand beats impressive.

HOW THIS SUBJECT IS TAUGHT - this decides the voice of the whole script:
{teach_guidance}

LENGTH FOLLOWS THE SECTION. Teach what the section contains and no more. A short section
(a few paragraphs) gets a short explanation - 3 to 5 segments; a full section 6 to 9. Never
pad a small topic with generalities, and never skip an idea, example or activity the section
gives. Each segment is 2-4 sentences.

PICTURES INSIDE THE SPEECH. Exactly {image_count} pictures go into this explanation and they
appear IN THE MIDDLE of what the avatar says, at the point where a teacher would say "let
me show you". Two kinds of marker:
  [image: one sentence describing an imagined scene to render as a 3D illustration -
  subject, setting, moment, viewpoint; no text or labels in it]
  [photo: 2-4 word search query | what the real picture must show] - a REAL photograph
  found on the web, for a real thing that exists and should be seen as it is.
Which to use in THIS subject: {picture_policy}
Example in this subject: {picture_example}
After the marker KEEP TALKING about what the student is now looking at, the way a teacher
points at a picture ("...Let me show you [marker]. Look at ... Notice how ..."). Rules:
exactly {image_count} markers in the whole script, on {image_count} DIFFERENT segments; never
in the first sentence of a segment; never in the hook answer; each picture shows the
concrete thing that segment is teaching; only things the section mentions. The marker is
replaced by the picture's URL at that exact spot, so the words around it must read
naturally with the picture on screen.

NO CHECKPOINTS, NO CARDS, NO QUESTIONS to the student inside the explanation - it is spoken
straight through. The student is tested by the mystery picture and their own explanation
later, not here.

THE HOOK QUESTION. The lesson has ALREADY opened with the hook question given in the user
message, and the student has already answered it. Do NOT re-ask it and do NOT answer it
in the opening segments. Your LAST segment must return to it and answer it plainly for
the student, tying the answer to what was just taught, and that segment must carry
"role": "hook_answer".

""" + _EMOTION_LINE + """

STRUCTURE - Return STRICT JSON:
{{
  "concept_overview": "One short paragraph introducing the topic",
  "avatar_explanation": {{
    "teaching_style": "storytelling or socratic or visual_analogy",
    "total_duration_estimate": "X minutes",
    "segments": [
      {{"segment_id": "seg_001", "type": "teaching", "text": "What the avatar says", "emotion": "enthusiastic"}},
      {{"segment_id": "seg_002", "type": "teaching", "text": "... Let me show you [image: ...] or [photo: ... | ...]. Look at ...", "emotion": "curious"}},
      {{"segment_id": "seg_003", "type": "teaching", "text": "...", "emotion": "warm"}},
      {{"segment_id": "seg_004", "type": "teaching", "role": "hook_answer", "text": "Back to our question...", "emotion": "confident"}}
    ]
  }},
  "faqs": [{{"question": "", "answer": ""}}],
  "practice_questions": [{{"question": ""}}],
  "doubt_context": {{"related_sections": ["list of related section titles"]}}
}}

RULES:
1. Every segment is "type": "teaching". Start with an engaging introduction (enthusiastic);
   the last segment is the hook answer (confident).
2. Use varied emotions - don't repeat the same emotion consecutively.
3. FAQs: 3-4 Q&A pairs. Practice questions: 3-4 questions.
"""


def lesson_plan_prompt(pattern: LessonPattern) -> str:
    return LESSON_PLAN_PROMPT.format(
        pattern_key=pattern.key,
        hook_style=pattern.hook_style,
        hook_guidance=pattern.hook_guidance,
        explore_kind=pattern.explore_kind,
        explore_interactions=", ".join(pattern.explore_interactions),
        explore_guidance=pattern.explore_guidance,
        real_world_guidance=pattern.real_world_guidance,
        mystery_guidance=pattern.mystery_guidance,
        explain_guidance=pattern.explain_guidance,
        picture_policy=pattern.picture_policy,
    )


def teach_prompt(pattern: LessonPattern, class_number: str = "",
                 image_count: int = EXPLANATION_IMAGES) -> str:
    prompt = AVATAR_TEACH_PROMPT
    if image_count <= 0:
        # with_visuals off: no markers wanted, so the whole picture block goes.
        a = prompt.index("PICTURES INSIDE THE SPEECH.")
        b = prompt.index("NO CHECKPOINTS,")
        prompt = prompt[:a] + "NO PICTURES: never write an [image: ...] or [photo: ...] marker.\n\n" + prompt[b:]
    return prompt.format(
        teach_guidance=pattern.teach_guidance,
        student_class=f"Class {class_number}" if class_number else "school",
        image_count=image_count,
        picture_policy=pattern.picture_policy,
        picture_example=pattern.picture_example,
    )


READING_TEACH_PROMPT = """You are an experienced, expressive English teacher preparing a lesson for an AI avatar.
The avatar will SPEAK each segment aloud to a student, with emotions.

Your job: teach the reading in the user message PART BY PART - the EXPLANATION phase of a
lesson that opened with a hook question and goes on, after the reading, to {after_parts}.

""" + _STAY_INSIDE + """

STYLE:
- Speak naturally, as if reading the story together in a live classroom: "we", "let's",
  "notice how", "imagine".
- SHORT, SIMPLE, CLEAR sentences a {student_class} student follows on first hearing. Everyday
  words; explain a hard word the moment you use it.

HOW THIS READING IS TAUGHT:
{teach_guidance}

THE PARTS. The reading is already divided into {part_count} part(s), given in the user message
as PART 1, PART 2, ... in story order. Write ONE entry per part, in the same order, each taught
from ITS OWN text:
- "title": 2-6 words naming what happens in the part, in the story's terms ("Alone on the Ledge").
- "summary": one sentence - what happens in this part.
- "segments": 3-5 teaching segments (2-3 for a short part), 2-4 sentences each. The part's FIRST
  segment announces it ("Part two - ...") and picks up where the previous part ended; the
  segments follow the part's events in order and leave none out.
- Where the textbook asks questions about a part (listed under it), that part's segments must
  make every answer clear - but never ask the questions and never mention the textbook's
  questions.
- Never jump ahead: a part does not reveal what happens in a later part.

PICTURES INSIDE THE SPEECH. Exactly {image_count} pictures go into this explanation, on
{image_count} DIFFERENT segments in DIFFERENT parts, IN THE MIDDLE of what the avatar says, at
the point where a teacher would say "let me show you". Two kinds of marker:
  [image: one sentence describing a moment of the reading to render as a 3D illustration -
  the characters, the setting, the exact moment, the viewpoint; no text or labels in it]
  [photo: 2-4 word search query | what the real picture must show] - a REAL photograph, only
  for a real place or thing the reading names that exists outside it.
Which to use: {picture_policy}
Example: {picture_example}
After the marker KEEP TALKING about what the student is now looking at ("...Let me show you
[marker]. Look at ... Notice how ..."). Never in the first sentence of a segment; never in the
hook answer.

NO CHECKPOINTS, NO CARDS, NO QUESTIONS to the student inside the explanation - it is spoken
straight through, part after part.

THE HOOK QUESTION. The lesson has ALREADY opened with the hook question given in the user
message, and the student has already answered it. Do NOT re-ask it and do NOT answer it early.
The LAST segment of the LAST part must return to it and answer it plainly, tying the answer to
the reading, and carry "role": "hook_answer".

""" + _EMOTION_LINE + """

Return STRICT JSON:
{{
  "concept_overview": "One short paragraph: what the reading is about and its theme",
  "avatar_explanation": {{
    "teaching_style": "storytelling",
    "total_duration_estimate": "X minutes",
    "parts": [
      {{"part": 1, "title": "", "summary": "",
        "segments": [
          {{"segment_id": "p1_s1", "type": "teaching", "text": "What the avatar says", "emotion": "enthusiastic"}},
          {{"segment_id": "p1_s2", "type": "teaching", "text": "...", "emotion": "curious"}}
        ]}},
      {{"part": 2, "title": "", "summary": "", "segments": [...]}}
    ]
  }},
  "faqs": [{{"question": "", "answer": ""}}],
  "practice_questions": [{{"question": ""}}],
  "doubt_context": {{"related_sections": ["list of related section titles"]}}
}}

RULES:
1. Every segment is "type": "teaching". The very first segment is an engaging opening
   (enthusiastic); the very last one is the hook answer (confident).
2. Vary the emotions - never the same emotion twice in a row.
3. FAQs: 3-4 Q&A pairs about the reading. Practice questions: 3-4 questions.
"""


def reading_teach_prompt(pattern: LessonPattern, class_number: str = "", *,
                         part_count: int = 1, image_count: int = EXPLANATION_IMAGES,
                         with_grammar: bool = False) -> str:
    """The part-by-part script prompt for a story or supplementary reading."""
    prompt = READING_TEACH_PROMPT
    if image_count <= 0:
        a = prompt.index("PICTURES INSIDE THE SPEECH.")
        b = prompt.index("NO CHECKPOINTS,")
        prompt = prompt[:a] + "NO PICTURES: never write an [image: ...] or [photo: ...] marker.\n\n" + prompt[b:]
    after = ("its GRAMMAR part (taught separately), a real-world connection, an activity, a mystery "
             "picture and the student's own retelling" if with_grammar else
             "a real-world connection, an activity, a mystery picture and the student's own retelling")
    return prompt.format(
        after_parts=after,
        teach_guidance=pattern.teach_guidance,
        student_class=f"Class {class_number}" if class_number else "school",
        part_count=part_count,
        image_count=image_count,
        picture_policy=pattern.picture_policy,
        picture_example=pattern.picture_example,
    )


GRAMMAR_PROMPT = """You are GradeUp AI Avatar, an expressive English teacher. The student has just read
"{reading_title}" with you, part by part. Now comes the NEXT PART of the lesson: GRAMMAR - you
teach it, then the student practises it, one item at a time, and you respond to each answer.

WHICH GRAMMAR. The user message gives the unit's LANGUAGE MATERIAL and says what it is:
- "textbook grammar": teach THOSE topics - the unit's own Grammar section - at most {max_topics},
  in the book's order. Sub-rules of one topic are ONE topic (the request, advice and question
  forms of the passive voice are all "The Passive Voice"). Use the book's own rules, examples
  and exercise sentences.
- "language exercises" (the unit has no Grammar section, only exercises such as 'Thinking about
  Language'): YOU decide the grammar - the {max_topics} or fewer GRAMMAR points those exercises
  teach (for example relative clauses, negatives used for emphasis, metaphors), in the book's
  order. Word-meaning items (names of storms, meanings of one word) only if nothing else is there.
- "vocabulary": the word-formation or usage point the vocabulary section teaches.
- "story": there is no language material - pick 1-2 grammar points the reading itself shows
  clearly and that suit a {student_class} student (the simple past in narration, reported and
  direct speech, describing words for feelings...), with examples quoted from the reading.
Never state a rule the material contradicts; keep the book's terms.

FOR EACH TOPIC:
- "title": 1-5 words ("Modals", "Non-defining Relative Clauses").
- "rule": the rule in one short sentence, shown on screen.
- "segments": 2-4 spoken teaching segments {{"text", "emotion"}}, 2-4 sentences each: what it is,
  how it is formed or used, then examples - FIRST a sentence from the reading ("Remember when
  ... said ..."), then the book's own examples. Short, simple and lively: "we", "let's",
  "notice how". The first topic's first segment connects back to the reading.
- "examples": 2-3 {{"sentence": "...", "note": "what to notice in it"}}, shown on screen.
- "practice": 2-3 items, easiest first, answered by the student one at a time. PREFER the book's
  own exercise sentences. Each has ONE definite right answer. Mix at least two types:
  choice:     {{"type":"choice","prompt":"...","options":[{{"id":"A","label":"...","feedback":"why right / why not"}}, ... 3 options],"answer":"A"}}
  fill_blank: {{"type":"fill_blank","prompt":"instruction","sentence":"When I was a child, I ____ climb trees easily.","answer":"could","accept":["could"],"explanation":"one sentence: why"}}
  match:      {{"type":"match","prompt":"...","left":[{{"id":"l1","label":"..."}}],"right":[{{"id":"r1","label":"..."}}] (both shuffled),"answer":[["l1","r2"], ...]}}
  order:      {{"type":"order","prompt":"Put the words in the right order.","items":[{{"id":"w1","label":"..."}}, ...] (SHUFFLED),"answer":["w3","w1", ...]}}
  free_text:  {{"type":"free_text","prompt":"Rewrite in the passive voice: ...","model_answer":"..."}} - for a rewrite or join-the-sentences task
  fill_blank: exactly one "____" in "sentence"; "answer" is what goes there; "accept" lists every
  other correct form (contractions, both spellings).
  Every item is answerable from what it shows: when a prompt names the choices ("who / which /
  whose"), the answer is one of them.

"intro": the avatar opening the grammar part ("Now for our next part - grammar! ..."), tied to the
reading. "wrap_up": a warm closing line for the grammar part.

""" + _EMOTION_LINE + """

Return STRICT JSON:
{{"title": "Grammar: ...", "source": "textbook grammar | language exercises | vocabulary | story",
  "intro": {{"text": "", "emotion": ""}},
  "topics": [{{"title": "", "rule": "", "from_section": "the book section it comes from, or ''",
              "segments": [{{"text": "", "emotion": ""}}],
              "examples": [{{"sentence": "", "note": ""}}],
              "practice": []}}],
  "wrap_up": {{"text": "", "emotion": ""}}}}
"""


def grammar_prompt(reading_title: str, class_number: str = "") -> str:
    return GRAMMAR_PROMPT.format(
        reading_title=reading_title or "the story",
        max_topics=GRAMMAR_MAX_TOPICS,
        student_class=f"Class {class_number}" if class_number else "school",
    )


SING_ALONG_PROMPT = """You are GradeUp AI Avatar, a warm, playful English teacher. Before explaining the poem
"{title}", you SING it with the student: you sing a line, the student sings it back after you,
and now and then the student sings the missing word.

Write:
- "invite": what the avatar says to start - invite the student to join in ("Would you like to join
  me? Let's sing this poem together - I'll sing a line, and you sing it right back after me!")
  and say, in a few words, how the poem should sound (its mood and beat: gentle and slow, bouncy,
  like waves, solemn...). 2-3 sentences.
- "how_to_sing": one short sentence shown on screen - the pace and mood to sing it in.
- "stanza_moods": one emotion per stanza, in order - how the avatar sings that stanza.
- "blanks": 2-4 "sing the missing word" spots {{"stanza": 1, "line": 4, "word": "...", "hint": "..."}}
  (stanza and line numbers as given in the user message). Choose RHYMING END WORDS or key words
  the student can recall from the tune; the word must appear EXACTLY in that line; at most one
  per line; spread them over the stanzas. "hint" is playful and never gives the word away
  ("It rhymes with 'year'").
- "cheer": one line the avatar says when the student sings a missing word right.
- "outro": what the avatar says after the song, handing over to the explanation ("Beautiful
  singing! Now let's find out what these lines really mean, stanza by stanza.").
{lines_task}
""" + _EMOTION_LINE + """

Return STRICT JSON:
{{"invite": {{"text": "", "emotion": ""}}, "how_to_sing": "", "stanza_moods": [""],
  {lines_key}"blanks": [{{"stanza": 1, "line": 1, "word": "", "hint": ""}}],
  "cheer": {{"text": "", "emotion": ""}}, "outro": {{"text": "", "emotion": ""}}}}
"""

_RESTORE_LINES_TASK = """- "stanzas": the poem's line breaks were lost in the text below. Return every stanza as a
  list of its lines EXACTLY as the poet wrote them - the same words in the same order, nothing
  added, dropped or changed; only the line breaks are yours. Number the blanks by these lines.
"""


def sing_along_prompt(title: str, restore_lines: bool = False) -> str:
    return SING_ALONG_PROMPT.format(
        title=title or "the poem",
        lines_task=_RESTORE_LINES_TASK if restore_lines else "",
        lines_key='"stanzas": [["", ""]], ' if restore_lines else "",
    )



# ══════════════════════════════════════════════════════════════════════════════
#  NORMALISATION - the lesson is well-formed whatever the LLM returned
# ══════════════════════════════════════════════════════════════════════════════

def _emotion(value: Any, default: str = "warm") -> str:
    v = str(value or "").strip().lower()
    return v if v in EMOTIONS else default


def spoken_node(node: Any, segment_id: str, default_emotion: str = "warm",
                fallback_text: str = "") -> Optional[Dict[str, Any]]:
    """Coerce ``{"text","emotion"}`` (or a bare string) into a teaching-shaped node."""
    text = ""
    emotion = default_emotion
    if isinstance(node, dict):
        text = str(node.get("text") or "").strip()
        emotion = _emotion(node.get("emotion"), default_emotion)
    elif isinstance(node, str):
        text = node.strip()
    if not text:
        text = fallback_text.strip()
    if not text:
        return None
    out = {"segment_id": segment_id, "type": "teaching", "emotion": emotion, "text": text}
    if isinstance(node, dict) and isinstance(node.get("audio"), dict) and node["audio"]:
        out["audio"] = node["audio"]
    return out


PICTURE_SOURCES: Tuple[str, ...] = ("generate", "search")


def image_prompt_of(raw: Any) -> str:
    """The picture a planner node wants - its ``image_prompt`` - or ""."""
    raw = raw if isinstance(raw, dict) else {}
    return str(raw.get("image_prompt") or "").strip()


def picture_spec_of(raw: Any) -> Dict[str, str]:
    """``{"image_prompt", "image_source", "search_query"}`` from a planner node.

    ``image_source`` is "generate" (a rendered scene) or "search" (a real photo
    from the web, see avatar_lesson_builder._picture); anything else, or a
    "search" with no query at all, becomes "generate". The query defaults to
    the prompt itself so a searched picture always has something to search.
    """
    raw = raw if isinstance(raw, dict) else {}
    prompt = image_prompt_of(raw)
    source = str(raw.get("image_source") or "generate").strip().lower()
    query = str(raw.get("search_query") or "").strip()
    if source not in PICTURE_SOURCES:
        source = "generate"
    if source == "search" and not (query or prompt):
        source = "generate"
    return {"image_prompt": prompt, "image_source": source,
            "search_query": (query or prompt) if source == "search" else ""}


def _option_map(raw: Any, max_options: int = 4) -> Dict[str, str]:
    """Options as an ordered {"A": text, ...} map from a dict or a list."""
    letters = "ABCD"
    out: Dict[str, str] = {}
    if isinstance(raw, dict):
        for k in letters:
            v = raw.get(k)
            if v is None:
                v = raw.get(k.lower())
            if v is not None and str(v).strip():
                out[k] = str(v).strip()
    elif isinstance(raw, list):
        for k, v in zip(letters, raw):
            if isinstance(v, dict):
                v = v.get("label") or v.get("text") or ""
            if str(v).strip():
                out[k] = str(v).strip()
    return dict(list(out.items())[:max_options])


def _explanations(raw: Any, options: Dict[str, str], answer: str) -> Dict[str, str]:
    raw = raw if isinstance(raw, dict) else {}
    out: Dict[str, str] = {}
    for k in options:
        text = str(raw.get(k) or raw.get(k.lower()) or "").strip()
        if not text:
            text = (f"{CORRECT_PREFIX} That is what the section says." if k == answer
                    else "Not this one. Look back at what the section says and try to see why.")
        elif k == answer and not text.lower().startswith(CORRECT_PREFIX.lower()):
            text = f"{CORRECT_PREFIX} {text}"
        out[k] = text
    return out


def normalize_mcq(raw: Any, question_id: str, require_four: bool = False) -> Optional[Dict[str, Any]]:
    """One MCQ in the shape the runtime checkpoints already return, or None if unusable."""
    if not isinstance(raw, dict):
        return None
    question = str(raw.get("question") or "").strip()
    options = _option_map(raw.get("options"))
    if not question or len(options) < 3 or (require_four and len(options) < 4):
        return None
    answer = str(raw.get("answer") or "").strip().upper()[:1]
    if answer not in options:
        return None
    return {
        "question_id": question_id,
        "question": question,
        "options": options,
        "answer": answer,
        "option_explanations": _explanations(raw.get("option_explanations"), options, answer),
    }


def _valid_interaction(raw: Any, allowed: Tuple[str, ...]) -> Optional[Dict[str, Any]]:
    """A cleaned interaction of an allowed type, or None."""
    if not isinstance(raw, dict):
        return None
    itype = str(raw.get("type") or "").strip().lower()
    if itype not in INTERACTION_TYPES or itype not in allowed:
        return None
    prompt = str(raw.get("prompt") or "").strip()
    if not prompt:
        return None
    out: Dict[str, Any] = {"type": itype, "prompt": prompt}

    if itype == "choice":
        options = []
        for i, opt in enumerate(raw.get("options") or []):
            if not isinstance(opt, dict):
                continue
            label = str(opt.get("label") or opt.get("text") or "").strip()
            if not label:
                continue
            default_id = "ABCD"[i] if i < 4 else str(i + 1)
            options.append({"id": str(opt.get("id") or default_id).strip().upper(),
                            "label": label,
                            "feedback": str(opt.get("feedback") or "").strip()})
        ids = [o["id"] for o in options]
        answer = str(raw.get("answer") or "").strip().upper()
        if len(options) < 2 or answer not in ids:
            return None
        out["options"] = options
        out["answer"] = answer
    elif itype == "order":
        items = [{"id": str(it.get("id") or f"e{i + 1}"), "label": str(it.get("label") or it.get("text") or "").strip()}
                 for i, it in enumerate(raw.get("items") or []) if isinstance(it, dict)]
        items = [it for it in items if it["label"]]
        answer = [str(a) for a in (raw.get("answer") or [])]
        if len(items) < 3 or sorted(answer) != sorted(it["id"] for it in items):
            return None
        out["items"] = items
        out["answer"] = answer
    elif itype == "match":
        left = [{"id": str(it.get("id") or f"l{i + 1}"), "label": str(it.get("label") or "").strip()}
                for i, it in enumerate(raw.get("left") or []) if isinstance(it, dict)]
        right = [{"id": str(it.get("id") or f"r{i + 1}"), "label": str(it.get("label") or "").strip()}
                 for i, it in enumerate(raw.get("right") or []) if isinstance(it, dict)]
        left = [it for it in left if it["label"]]
        right = [it for it in right if it["label"]]
        pairs = [[str(p[0]), str(p[1])] for p in (raw.get("answer") or [])
                 if isinstance(p, (list, tuple)) and len(p) == 2]
        lids = {it["id"] for it in left}
        rids = {it["id"] for it in right}
        pairs = [p for p in pairs if p[0] in lids and p[1] in rids]
        if len(left) < 2 or len(right) < 2 or len(pairs) < 2:
            return None
        out["left"], out["right"], out["answer"] = left, right, pairs
    elif itype == "numeric":
        try:
            out["answer"] = float(raw.get("answer"))
        except (TypeError, ValueError):
            return None
        try:
            out["tolerance"] = abs(float(raw.get("tolerance") or 0))
        except (TypeError, ValueError):
            out["tolerance"] = 0.0
        out["feedback_correct"] = str(raw.get("feedback_correct") or "").strip()
        out["feedback_incorrect"] = str(raw.get("feedback_incorrect") or "").strip()
    elif itype == "free_text":
        model = str(raw.get("model_answer") or "").strip()
        if not model:
            return None
        out["model_answer"] = model
    elif itype == "fill_blank":
        answer = str(raw.get("answer") or "").strip()
        sentence = re.sub(r"_{2,}", "____", str(raw.get("sentence") or "").strip())
        if not answer or "____" not in (sentence or re.sub(r"_{2,}", "____", prompt)):
            return None
        accept: List[str] = []
        for a in [answer, *(raw.get("accept") or [])]:
            a = str(a or "").strip()
            if a and _norm_answer(a) not in {_norm_answer(x) for x in accept}:
                accept.append(a)
        # "Fill in the relative pronoun (who / which)" with the answer "whose"
        # came back live (2026-09-23): a choice list the answer is not in goes.
        out["prompt"] = _drop_stale_choices(prompt, accept)
        out.update({"sentence": _drop_stale_choices(sentence, accept), "answer": answer, "accept": accept,
                    "explanation": str(raw.get("explanation") or "").strip()})
    elif itype == "picture_walkthrough":
        out.update(picture_spec_of(raw))
        # visual + walkthrough are attached by the builder once a picture is rendered
        if isinstance(raw.get("visual"), dict) and raw["visual"].get("image_url"):
            out["visual"] = raw["visual"]
        if isinstance(raw.get("walkthrough"), list):
            out["walkthrough"] = raw["walkthrough"]
    return out


def _normalize_hook(raw: Any, pattern: LessonPattern) -> Optional[Dict[str, Any]]:
    if not isinstance(raw, dict):
        return None
    question = str(raw.get("question") or "").strip()
    options = _option_map(raw.get("options"), max_options=HOOK_OPTIONS)
    answer = str(raw.get("answer") or "").strip().upper()[:1]
    if not question or answer not in options:
        return None
    if len(options) < HOOK_OPTIONS:
        # Four options is the contract (user decision 2026-09-17); the builder
        # re-plans on None, so a three-option hook is not quietly accepted.
        logger.warning(f"[lesson] hook has {len(options)} options, {HOOK_OPTIONS} required - rejected")
        return None
    style = str(raw.get("style") or "").strip().lower()
    if style not in HOOK_STYLES:
        style = pattern.hook_style
    explanations = _explanations(raw.get("option_explanations"), options, answer)
    raw_res = raw.get("resolutions") if isinstance(raw.get("resolutions"), dict) else {}
    resolutions: Dict[str, Dict[str, Any]] = {}
    for k in options:
        node = spoken_node(raw_res.get(k) or raw_res.get(k.lower()), f"hook_res_{k}",
                           "encouraging" if k == answer else "empathetic",
                           fallback_text=explanations[k])
        if node:
            resolutions[k] = node
    scenario = str(raw.get("scenario") or "").strip()
    intro = spoken_node(raw.get("intro"), "hook_intro", "curious",
                        fallback_text=f"{scenario} {question}".strip())
    bridge = spoken_node(raw.get("bridge"), "hook_bridge", "enthusiastic",
                         fallback_text="You've just seen a real-world case of today's topic. "
                                       "Now let's line that up with our topic and study it properly.")
    hook: Dict[str, Any] = {
        "phase": "hook", "order": 1,
        "style": style,
        "title": str(raw.get("title") or "").strip() or question[:60],
        "scenario": scenario,
        "question": question,
        "options": options,
        "answer": answer,
        "option_explanations": explanations,
        "resolutions": resolutions,
        "intro": intro,
        "bridge": bridge,
        **picture_spec_of(raw),
        # One panel per option in the hook picture; an option the planner left
        # without a scene is drawn from its own text.
        "option_scenes": {k: (str((raw.get("option_scenes") or {}).get(k) or "").strip()
                              if isinstance(raw.get("option_scenes"), dict) else "") or v
                          for k, v in options.items()},
    }
    if isinstance(raw.get("visual"), dict) and raw["visual"].get("image_url"):
        hook["visual"] = raw["visual"]
    return hook


def _normalize_explanation(explanation: Any) -> Optional[Dict[str, Any]]:
    """The explanation phase from an ``avatar_explanation``-shaped dict.

    Teaching segments only - no checkpoints, no cards (user decision
    2026-09-17). A segment that carries a picture has ``visual`` and the
    picture's URL inline in its ``text`` (see avatar_lesson_builder).
    """
    if not isinstance(explanation, dict):
        return None
    segments = [s for s in (explanation.get("segments") or [])
                if isinstance(s, dict) and s.get("type") == "teaching" and (s.get("text") or "").strip()]
    if not segments:
        return None
    closing = next((s for s in reversed(segments) if s.get("role") == "hook_answer"), segments[-1])
    out = {
        "phase": "explanation", "order": 2,
        "teaching_style": explanation.get("teaching_style", ""),
        "total_duration_estimate": explanation.get("total_duration_estimate", ""),
        "segments": segments,
        "closing_segment_id": closing.get("segment_id"),
        "pictured_segment_ids": [s["segment_id"] for s in segments
                                 if isinstance(s.get("visual"), dict) and s["visual"].get("image_url")],
    }
    # An English reading is taught part by part: each part names its segments
    # (which also carry ``part``). No questions - the explanation asks nothing.
    known = {s.get("segment_id") for s in segments}
    parts = []
    for p in explanation.get("parts") or []:
        if not isinstance(p, dict):
            continue
        ids = [sid for sid in p.get("segment_ids") or [] if sid in known]
        if ids:
            parts.append({"part": len(parts) + 1, "title": str(p.get("title") or "").strip()
                          or f"Part {len(parts) + 1}", "summary": str(p.get("summary") or "").strip(),
                          "segment_ids": ids})
    if parts:
        out["parts"] = parts
    return out


_CHOICE_LIST_RE = re.compile(r"\s*\(([^()]*?/[^()]*?)\)")


def _drop_stale_choices(text: str, accept: List[str]) -> str:
    """``text`` without any "(a / b)" choice list that leaves out every accepted answer."""
    wanted = {_norm_answer(a) for a in accept}

    def keep_or_drop(m: "re.Match[str]") -> str:
        options = {_norm_answer(o) for o in m.group(1).split("/")}
        return m.group(0) if options & wanted else ""
    return _CHOICE_LIST_RE.sub(keep_or_drop, text or "").strip()


def _norm_answer(value: Any) -> str:
    """An answer as compared: lower case, curly quotes straightened, outer
    punctuation and extra spaces gone."""
    text = str(value if value is not None else "").strip().lower()
    text = text.replace("’", "'").replace("‘", "'").replace("“", '"').replace("”", '"')
    return re.sub(r"\s+", " ", text.strip(" .,!?;:\"'")).strip()


def normalize_grammar(raw: Any) -> Optional[Dict[str, Any]]:
    """The grammar phase - the part after the story: topics taught in spoken
    segments, each with on-screen examples and practice items the student
    answers (graded from the stored keys; a rewrite is judged by the model).
    None when no topic has both a title and something to say."""
    if not isinstance(raw, dict):
        return None
    topics: List[Dict[str, Any]] = []
    for t in raw.get("topics") or []:
        if not isinstance(t, dict) or len(topics) >= GRAMMAR_MAX_TOPICS:
            continue
        tid = f"g{len(topics) + 1}"
        title = str(t.get("title") or "").strip()
        segments: List[Dict[str, Any]] = []
        for s in t.get("segments") or []:
            node = spoken_node(s, f"gram_{tid}_s{len(segments) + 1}", "warm")
            if node:
                segments.append(node)
        if not title or not segments:
            continue
        practice: List[Dict[str, Any]] = []
        for p in t.get("practice") or []:
            inter = _valid_interaction(p, GRAMMAR_INTERACTIONS)
            if inter is not None and len(practice) < 3:
                inter["item_id"] = f"{tid}_p{len(practice) + 1}"
                practice.append(inter)
        examples = [{"sentence": str(e.get("sentence") or "").strip(), "note": str(e.get("note") or "").strip()}
                    for e in t.get("examples") or [] if isinstance(e, dict) and str(e.get("sentence") or "").strip()]
        topics.append({"topic_id": tid, "title": title, "rule": str(t.get("rule") or "").strip(),
                       "from_section": str(t.get("from_section") or "").strip(),
                       "segments": segments, "examples": examples[:3], "practice": practice})
    if not topics:
        return None
    names = ", ".join(t["title"] for t in topics)
    return {
        "phase": "grammar",
        "title": str(raw.get("title") or "").strip() or f"Grammar: {names}",
        "source": str(raw.get("source") or "").strip(),
        "intro": spoken_node(raw.get("intro"), "gram_intro", "enthusiastic",
                             fallback_text=f"Now for our next part - grammar! Let's look at {names}, "
                                           f"with sentences from the story we just read."),
        "topics": topics,
        "wrap_up": spoken_node(raw.get("wrap_up"), "gram_wrap", "encouraging",
                               fallback_text="Well done! Keep an eye out for these patterns - you'll "
                                             "spot them in every story you read now."),
    }


def normalize_sing_along(raw: Any, stanzas: List[List[str]], title: str = "") -> Optional[Dict[str, Any]]:
    """The sing-along phase: the poem's own lines, each a spoken node the avatar
    sings (the student echoes it), plus "sing the missing word" blanks.

    Blanks the writer chose are kept only when the word really is in that
    line; with none left, the end word of each stanza's last line is used.
    None for a "poem" of fewer than two lines.
    """
    raw = raw if isinstance(raw, dict) else {}
    stanzas = [[str(ln).strip() for ln in st if str(ln or "").strip()] for st in stanzas or []]
    stanzas = [st for st in stanzas if st]
    if sum(len(st) for st in stanzas) < 2:
        return None
    moods = raw.get("stanza_moods") if isinstance(raw.get("stanza_moods"), list) else []
    out_stanzas: List[Dict[str, Any]] = []
    for si, lines in enumerate(stanzas, 1):
        emotion = _emotion(moods[si - 1] if si - 1 < len(moods) else "", "warm")
        out_stanzas.append({"stanza": si, "blank_ids": [], "lines": [
            {"segment_id": f"sing_s{si}_l{li}", "type": "teaching", "emotion": emotion,
             "text": line, "line_id": f"s{si}_l{li}", "stanza": si, "line": li}
            for li, line in enumerate(lines, 1)]})

    blanks: List[Dict[str, Any]] = []

    def _add(si: int, li: int, word: str, hint: str) -> None:
        if not (1 <= si <= len(out_stanzas)) or not (1 <= li <= len(out_stanzas[si - 1]["lines"])):
            return
        node = out_stanzas[si - 1]["lines"][li - 1]
        if any(b["line_id"] == node["line_id"] for b in blanks) or len(blanks) >= 4:
            return
        # The LAST occurrence: the rhyme sits at the end ("from year to year,").
        hits = list(re.finditer(rf"(?<![\w']){re.escape(word.strip())}(?![\w'])", node["text"], re.IGNORECASE))
        if not word.strip() or not hits:
            return
        m = hits[-1]
        blank_id = f"b{len(blanks) + 1}"
        blanks.append({"blank_id": blank_id, "line_id": node["line_id"], "stanza": si, "line": li,
                       "prompt": node["text"][:m.start()] + "____" + node["text"][m.end():],
                       "answer": m.group(0), "hint": hint.strip()})
        out_stanzas[si - 1]["blank_ids"].append(blank_id)

    for b in raw.get("blanks") or []:
        if isinstance(b, dict):
            try:
                _add(int(b.get("stanza") or 0), int(b.get("line") or 0),
                     str(b.get("word") or ""), str(b.get("hint") or ""))
            except (TypeError, ValueError):
                continue
    if not blanks:
        for st in out_stanzas[:3]:
            last = st["lines"][-1]
            words = re.findall(r"[A-Za-z][A-Za-z'’-]{2,}", last["text"])
            if words:
                _add(st["stanza"], last["line"], words[-1], "It's the last word of the stanza.")

    name = f"'{title}'" if title else "this poem"
    return {
        "phase": "sing_along",
        "title": "Sing with me",
        "mode": "echo",
        "invite": spoken_node(raw.get("invite"), "sing_invite", "playful",
                              fallback_text=f"Would you like to join me? Let's sing {name} together - "
                                            f"I'll sing a line, and you sing it right back after me!"),
        "join_options": [{"id": "join", "label": "Yes, let's sing together!"},
                         {"id": "listen", "label": "You sing first - I'll listen"}],
        "how_to_sing": str(raw.get("how_to_sing") or "").strip(),
        "stanzas": out_stanzas,
        "blanks": blanks,
        "cheer": spoken_node(raw.get("cheer"), "sing_cheer", "enthusiastic",
                             fallback_text="Yes! You remembered it - you're singing like a poet!"),
        "outro": spoken_node(raw.get("outro"), "sing_outro", "warm",
                             fallback_text="Beautiful singing! Now let's find out what these lines "
                                           "really mean, stanza by stanza."),
    }


def _normalize_explore(raw: Any, pattern: LessonPattern) -> Optional[Dict[str, Any]]:
    if not isinstance(raw, dict):
        return None
    interaction = _valid_interaction(raw.get("interaction"), pattern.explore_interactions)
    if interaction is None:
        return None
    intro = spoken_node(raw.get("intro"), "explore_intro", "enthusiastic",
                        fallback_text="Now we've technically learned the topic, so let's do a fun activity.")
    wrap_up = spoken_node(raw.get("wrap_up"), "explore_wrap", "encouraging",
                          fallback_text="Well done. Doing it yourself is the best way to remember it.")
    explore: Dict[str, Any] = {
        "phase": "explore", "order": 3,
        "kind": str(raw.get("kind") or "").strip() or pattern.explore_kind,
        "title": str(raw.get("title") or "").strip() or "Try it yourself",
        "source": str(raw.get("source") or "").strip() or "generated",
        "intro": intro,
        "materials": [str(m).strip() for m in (raw.get("materials") or []) if str(m).strip()],
        "steps": [str(s).strip() for s in (raw.get("steps") or []) if str(s).strip()],
        "interaction": interaction,
        "wrap_up": wrap_up,
    }
    challenge = raw.get("challenge")
    if isinstance(challenge, dict):
        c_prompt = str(challenge.get("prompt") or "").strip()
        c_raw = challenge.get("interaction")
        if isinstance(c_raw, dict) and c_prompt and not c_raw.get("prompt"):
            c_raw = {**c_raw, "prompt": c_prompt}
        c_inter = _valid_interaction(c_raw, INTERACTION_TYPES)
        if c_inter is not None and c_inter["type"] != "picture_walkthrough":
            explore["challenge"] = {"prompt": c_prompt or c_inter["prompt"], "interaction": c_inter}
    explore.update(picture_spec_of(raw))
    if isinstance(raw.get("visual"), dict) and raw["visual"].get("image_url"):
        explore["visual"] = raw["visual"]
    return explore


def _normalize_real_world(raw: Any) -> Optional[Dict[str, Any]]:
    if not isinstance(raw, dict):
        return None
    question = str(raw.get("question") or "").strip()
    reveal = spoken_node(raw.get("reveal"), "rw_reveal", "confident")
    if not question or reveal is None:
        return None
    ask = spoken_node(raw.get("ask"), "rw_ask", "curious",
                      fallback_text=f"Now let's connect the topic with a real-world example. {question} Have a think, then tap to see.")
    rw: Dict[str, Any] = {
        "phase": "real_world", "order": 4,
        "question": question,
        "ask": ask,
        "reveal": reveal,
        "why_it_matters": str(raw.get("why_it_matters") or "").strip(),
        **picture_spec_of(raw),
    }
    if isinstance(raw.get("visual"), dict) and raw["visual"].get("image_url"):
        rw["visual"] = raw["visual"]
    return rw


def normalize_mystery_item(raw: Any, mystery_id: str) -> Optional[Dict[str, Any]]:
    """One mystery: a picture question with stored reasons and a spoken reveal."""
    mcq = normalize_mcq(raw, mystery_id)
    if mcq is None:
        return None
    reveal = spoken_node(raw.get("reveal"), f"{mystery_id}_reveal", "confident",
                         fallback_text=mcq["option_explanations"][mcq["answer"]])
    item: Dict[str, Any] = {
        "mystery_id": mystery_id,
        "title": str(raw.get("title") or "").strip() or "What is going on here?",
        "question": mcq["question"],
        "ask": spoken_node(raw.get("ask"), f"{mystery_id}_ask", "curious",
                           fallback_text=f"Look closely at this picture. {mcq['question']}"),
        "options": mcq["options"],
        "answer": mcq["answer"],
        "option_explanations": mcq["option_explanations"],
        "reveal": reveal,
        **picture_spec_of(raw),
    }
    if isinstance(raw.get("visual"), dict) and raw["visual"].get("image_url"):
        item["visual"] = raw["visual"]
    return item


def _normalize_mystery(raw: Any) -> Optional[Dict[str, Any]]:
    """The mystery phase: ONE picture question (user decision 2026-09-17).

    The planner writes ``item``; an older ``items`` / ``pool`` list is read for
    its first usable entry. Stored as a one-element ``pool`` so the player's
    ``mysteries[]`` shape is unchanged. The builder renders the picture
    afterwards and drops the phase if it cannot.
    """
    raw = raw if isinstance(raw, dict) else {}
    candidates = [raw["item"]] if isinstance(raw.get("item"), dict) else []
    candidates += list(raw.get("items") or raw.get("pool") or [])
    item = next((normalize_mystery_item(c, "m01") for c in candidates
                 if normalize_mystery_item(c, "m01")), None)
    if item is None:
        return None
    return {
        "phase": "mystery", "order": 5,
        "show": 1,
        "intro": spoken_node(raw.get("intro"), "mystery_intro", "playful",
                             fallback_text="Now, can you spot it in the wild? Look at this picture and "
                                           "tell me what is going on."),
        "outro": spoken_node(raw.get("outro"), "mystery_outro", "encouraging",
                             fallback_text="Well spotted. Once you know the idea, you start seeing it everywhere."),
        "pool": [item],
    }


def _normalize_explain_back(raw: Any, pattern: LessonPattern) -> Optional[Dict[str, Any]]:
    raw = raw if isinstance(raw, dict) else {}
    key_points = [str(k).strip() for k in (raw.get("key_points") or []) if str(k).strip()]
    model = str(raw.get("model_explanation") or "").strip()
    if len(key_points) < 2 and not model:
        return None
    return {
        "phase": "explain_back", "order": 6,
        "prompt": str(raw.get("prompt") or "").strip()
                  or "Explain this topic in your own words, as if to a friend who missed the class.",
        "ask": spoken_node(raw.get("ask"), "explain_ask", "encouraging",
                           fallback_text="Your turn to be the teacher. Explain what we learned today in your "
                                         "own words, as if to a friend who missed the class. I'll listen and "
                                         "tell you what you nailed and what to add."),
        "closing": spoken_node(raw.get("closing"), "explain_close", "warm",
                               fallback_text="Explaining it yourself is the surest sign you own the idea. "
                                             "Well done today."),
        "key_points": key_points,
        "model_explanation": model,
        "guidance": pattern.explain_guidance,
    }


_OPTIONAL_PHASES = ("sing_along", "grammar")


def normalize_lesson(raw_plan: Any, pattern: LessonPattern, *,
                     explanation: Any = None,
                     meta: Optional[Dict[str, Any]] = None,
                     sing_along: Optional[Dict[str, Any]] = None,
                     grammar: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """Assemble a well-formed lesson with ``phases[]`` in the fixed play order.

    ``raw_plan`` is LLM 1's output (hook / real_world / explore / mystery /
    explain_back) and ``explanation`` the normalised teaching script;
    ``sing_along`` / ``grammar`` are the English-only phases, already
    normalised (normalize_sing_along / normalize_grammar) - absent everywhere
    else, silently. Phases are validated independently: one that is missing
    its required fields is dropped and logged, and the rest keep their order -
    the lesson never comes out with the mystery before the explanation,
    whatever order the model returned. ``order`` is the position in the list.
    """
    raw_plan = raw_plan if isinstance(raw_plan, dict) else {}
    built = {
        "hook": _normalize_hook(raw_plan.get("hook"), pattern),
        "sing_along": sing_along if isinstance(sing_along, dict) and sing_along.get("stanzas") else None,
        "explanation": _normalize_explanation(explanation),
        "grammar": grammar if isinstance(grammar, dict) and grammar.get("topics") else None,
        "real_world": _normalize_real_world(raw_plan.get("real_world")),
        "explore": _normalize_explore(raw_plan.get("explore"), pattern),
        "mystery": _normalize_mystery(raw_plan.get("mystery")),
        "explain_back": _normalize_explain_back(raw_plan.get("explain_back"), pattern),
    }
    phases: List[Dict[str, Any]] = []
    for name in PHASE_ORDER:
        ph = built.get(name)
        if ph is None:
            if name not in _OPTIONAL_PHASES:
                logger.warning(f"[lesson] phase '{name}' missing or unusable — dropped")
            continue
        ph["phase"] = name
        ph["order"] = len(phases) + 1
        phases.append(ph)

    lesson: Dict[str, Any] = {
        "version": 3,
        "pattern": pattern.key,
        "phase_order": list(PHASE_ORDER),
        "phases": phases,
    }
    for k, v in (meta or {}).items():
        lesson.setdefault(k, v)
    return lesson


# ══════════════════════════════════════════════════════════════════════════════
#  READING A LESSON
# ══════════════════════════════════════════════════════════════════════════════

def phase(lesson: Optional[Dict[str, Any]], name: str) -> Optional[Dict[str, Any]]:
    for ph in (lesson or {}).get("phases") or []:
        if isinstance(ph, dict) and ph.get("phase") == name:
            return ph
    return None


def lesson_of(enrichment: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    """The stored lesson of a section's enrichment (either shape), or None."""
    if not isinstance(enrichment, dict):
        return None
    lesson = enrichment.get("avatar_lesson")
    return lesson if isinstance(lesson, dict) and lesson.get("phases") else None


def segments_of(enrichment: Optional[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Teaching segments of a section: the explanation phase, else legacy ``avatar_explanation``."""
    if not isinstance(enrichment, dict):
        return []
    lesson = lesson_of(enrichment)
    if lesson:
        ph = phase(lesson, "explanation")
        if ph:
            return ph.get("segments") or []
    return ((enrichment.get("avatar_explanation") or {}).get("segments")) or []


def iter_spoken_nodes(lesson: Dict[str, Any]) -> Iterator[Dict[str, Any]]:
    """Every node the avatar speaks, in play order - the dicts themselves, so
    ``narrate_segments(..., attach=True)`` writes ``audio`` straight into the lesson."""
    for ph in (lesson or {}).get("phases") or []:
        name = ph.get("phase")
        if name == "hook":
            if ph.get("intro"):
                yield ph["intro"]
            for k in sorted((ph.get("resolutions") or {}).keys()):
                yield ph["resolutions"][k]
            if ph.get("bridge"):
                yield ph["bridge"]
        elif name == "sing_along":
            if isinstance(ph.get("invite"), dict):
                yield ph["invite"]
            for stanza in ph.get("stanzas") or []:
                for line in stanza.get("lines") or []:
                    yield line
            for key in ("cheer", "outro"):
                if isinstance(ph.get(key), dict):
                    yield ph[key]
        elif name == "explanation":
            for seg in ph.get("segments") or []:
                if seg.get("type") == "teaching":
                    yield seg
        elif name == "grammar":
            if isinstance(ph.get("intro"), dict):
                yield ph["intro"]
            for topic in ph.get("topics") or []:
                for seg in topic.get("segments") or []:
                    yield seg
            if isinstance(ph.get("wrap_up"), dict):
                yield ph["wrap_up"]
        elif name == "mystery":
            if isinstance(ph.get("intro"), dict):
                yield ph["intro"]
            for item in ph.get("pool") or ph.get("mysteries") or []:
                for key in ("ask", "reveal"):
                    if isinstance(item.get(key), dict):
                        yield item[key]
            if isinstance(ph.get("outro"), dict):
                yield ph["outro"]
        elif name in ("explore", "real_world", "explain_back"):
            for key in ("intro", "ask", "reveal", "wrap_up", "outro", "closing"):
                if isinstance(ph.get(key), dict):
                    yield ph[key]


# ══════════════════════════════════════════════════════════════════════════════
#  GRADING (local, no LLM)
# ══════════════════════════════════════════════════════════════════════════════

def grade_interaction(interaction: Dict[str, Any], response: Any) -> Dict[str, Any]:
    """Judge a student's response to an explore interaction without an LLM.

    Returns ``{"verdict": correct|partial|incorrect|pending, "feedback": str,
    "expected": ..., "needs_llm": bool}``. ``free_text`` and
    ``picture_walkthrough`` come back ``pending`` - the engine judges those.
    """
    itype = (interaction or {}).get("type")
    if itype == "choice":
        chosen = str(response or "").strip().upper()
        options = {o["id"]: o for o in interaction.get("options") or []}
        if chosen not in options:
            return {"verdict": "incorrect", "feedback": "Pick one of the options.",
                    "expected": interaction.get("answer"), "needs_llm": False}
        correct = chosen == interaction.get("answer")
        feedback = options[chosen].get("feedback") or ("That's right." if correct else "Not quite.")
        return {"verdict": "correct" if correct else "incorrect", "feedback": feedback,
                "expected": interaction.get("answer"), "needs_llm": False}

    if itype == "order":
        given = [str(x) for x in (response if isinstance(response, (list, tuple)) else [])]
        expected = [str(x) for x in interaction.get("answer") or []]
        if given == expected:
            return {"verdict": "correct", "feedback": "That's the right order.",
                    "expected": expected, "needs_llm": False}
        in_place = sum(1 for a, b in zip(given, expected) if a == b)
        # At least half right (rounded up) reads as "nearly there"; less is a guess.
        verdict = "partial" if in_place >= (len(expected) + 1) // 2 else "incorrect"
        return {"verdict": verdict,
                "feedback": f"{in_place} of {len(expected)} are in the right place. Think about what had to happen first.",
                "expected": expected, "needs_llm": False}

    if itype == "match":
        given = {(str(p[0]), str(p[1])) for p in (response if isinstance(response, (list, tuple)) else [])
                 if isinstance(p, (list, tuple)) and len(p) == 2}
        expected = {(str(p[0]), str(p[1])) for p in interaction.get("answer") or []}
        hits = len(given & expected)
        if expected and hits == len(expected) and given == expected:
            verdict = "correct"
        elif hits >= (len(expected) + 1) // 2:
            verdict = "partial"
        else:
            verdict = "incorrect"
        return {"verdict": verdict, "feedback": f"{hits} of {len(expected)} pairs matched.",
                "expected": sorted(expected), "needs_llm": False}

    if itype == "numeric":
        try:
            value = float(str(response).strip())
        except (TypeError, ValueError):
            return {"verdict": "incorrect", "feedback": "Enter a number.",
                    "expected": interaction.get("answer"), "needs_llm": False}
        correct = abs(value - float(interaction.get("answer", 0))) <= float(interaction.get("tolerance") or 0)
        feedback = (interaction.get("feedback_correct") if correct else interaction.get("feedback_incorrect")) \
            or ("That's right." if correct else "Not quite - check the steps again.")
        return {"verdict": "correct" if correct else "incorrect", "feedback": feedback,
                "expected": interaction.get("answer"), "needs_llm": False}

    if itype == "fill_blank":
        answer = str(interaction.get("answer") or "")
        accepted = {_norm_answer(a) for a in [answer, *(interaction.get("accept") or [])]}
        correct = _norm_answer(response) in accepted
        why = str(interaction.get("explanation") or "").strip()
        feedback = ("That's right!" if correct else f"Not quite - it's \"{answer}\".") + (f" {why}" if why else "")
        return {"verdict": "correct" if correct else "incorrect", "feedback": feedback,
                "expected": answer, "needs_llm": False}

    return {"verdict": "pending", "feedback": "", "expected": interaction.get("model_answer"),
            "needs_llm": True}


def _edit_distance(a: str, b: str) -> int:
    prev = list(range(len(b) + 1))
    for i, ca in enumerate(a, 1):
        cur = [i]
        for j, cb in enumerate(b, 1):
            cur.append(min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (ca != cb)))
        prev = cur
    return prev[-1]


def grade_sung_word(blank: Dict[str, Any], response: Any) -> Dict[str, Any]:
    """A sing-along "missing word": right when it is the word, or the word with
    one slip in a long word - the student is singing, not taking a spelling test.
    (Grammar blanks stay exact: 'could' and 'would' are one letter apart.)"""
    expected = _norm_answer(blank.get("answer"))
    given = _norm_answer(response)
    if not given:
        return {"verdict": "incorrect", "expected": blank.get("answer"), "close": False}
    close = given != expected and len(expected) >= 6 and _edit_distance(given, expected) <= 1
    correct = given == expected or close
    return {"verdict": "correct" if correct else "incorrect", "expected": blank.get("answer"), "close": close}
