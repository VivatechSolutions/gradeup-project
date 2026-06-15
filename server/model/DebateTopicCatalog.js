const mongoose = require("mongoose");

const debateTopicItemSchema = new mongoose.Schema(
  {
    topic_id: { type: String, required: true, trim: true },
    topic_title: { type: String, required: true, trim: true },
    topic_description: { type: String, default: null, trim: true },
    key_concepts: { type: [String], default: [] },
    source_unit: { type: String, default: null, trim: true },
    source_section: { type: String, default: null, trim: true },
    subject: { type: String, default: null, trim: true },
    subject_key: { type: String, default: null, trim: true, index: true },
    unit_number: { type: Number, default: null },
    unit_title: { type: String, default: null, trim: true },
    section_title: { type: String, default: null, trim: true },
    topic_path: { type: [String], default: [] },
  },
  { _id: false },
);

const debateSectionSchema = new mongoose.Schema(
  {
    section_title: { type: String, required: true, trim: true },
    topics_count: { type: Number, default: 0 },
    debate_topics: { type: [debateTopicItemSchema], default: [] },
  },
  { _id: false },
);

const debateUnitSchema = new mongoose.Schema(
  {
    unit_number: { type: Number, required: true },
    unit_title: { type: String, required: true, trim: true },
    sections: { type: [debateSectionSchema], default: [] },
  },
  { _id: false },
);

const debateTopicCatalogSchema = new mongoose.Schema(
  {
    subject: { type: String, required: true, trim: true },
    subject_key: { type: String, required: true, trim: true, unique: true, index: true },
    generated_at: { type: Date, default: null },
    total_topics: { type: Number, default: 0 },
    total_sections: { type: Number, default: 0 },
    units: { type: [debateUnitSchema], default: [] },
    source_payload: { type: mongoose.Schema.Types.Mixed, default: null },
    source_file: { type: String, default: "debate_topics.json", trim: true },
    synced_at: { type: Date, default: null },
  },
  { timestamps: true },
);

debateTopicCatalogSchema.index({ subject_key: 1, "units.unit_number": 1 });
debateTopicCatalogSchema.index({ subject_key: 1, "units.sections.section_title": 1 });

module.exports = mongoose.model("DebateTopicCatalog", debateTopicCatalogSchema);
