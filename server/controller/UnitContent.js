const Unit = require("../model/Unit");
const UnitContent = require("../model/UnitContent");
const { extractUnitMetadata, getSectionCount } = require("../config/UnitHelpers");

const allowedContentTypes = ["structured", "enriched"];

const resolveContentType = (forcedType, bodyType) => forcedType || bodyType;

const resolveContentBody = (body) =>
  body.content || body.payload || body.data || body.rawPayload || null;

const ensureUnit = async (body, content) => {
  const unitPayload = extractUnitMetadata(body, content);

  if (!unitPayload.unitKey) {
    return { error: "unitKey or board, grade, subject, and unitNumber are required" };
  }

  let unit = await Unit.findOne({ unitKey: unitPayload.unitKey });

  if (unit) {
    return { unit };
  }

  if (
    !unitPayload.board ||
    !unitPayload.grade ||
    !unitPayload.subject ||
    !unitPayload.unitNumber ||
    !unitPayload.title
  ) {
    return { error: "Unit does not exist. Register the unit first or send full unit metadata" };
  }

  unit = await Unit.create(unitPayload);
  return { unit };
};

const upsertContent = async (req, res, forcedType) => {
  try {
    const contentType = resolveContentType(forcedType, req.body.contentType);
    const version = Number(req.body.version || 1);
    const content = resolveContentBody(req.body);

    if (!allowedContentTypes.includes(contentType)) {
      return res.status(400).json({
        status: false,
        message: "contentType must be either structured or enriched",
      });
    }

    if (!content || typeof content !== "object" || Array.isArray(content)) {
      return res.status(400).json({
        status: false,
        message: "content must be a JSON object",
      });
    }

    if (Number.isNaN(version) || version < 1) {
      return res.status(400).json({
        status: false,
        message: "version must be a positive number",
      });
    }

    const { unit, error } = await ensureUnit(req.body, content);

    if (error) {
      return res.status(400).json({ status: false, message: error });
    }

    const shouldBeActive = req.body.isActive === false ? false : true;

    if (shouldBeActive) {
      await UnitContent.updateMany(
        {
          unitKey: unit.unitKey,
          contentType,
          version: { $ne: version },
        },
        { $set: { isActive: false } },
      );
    }

    const documentPayload = {
      unitKey: unit.unitKey,
      contentType,
      version,
      isActive: shouldBeActive,
      language: req.body.language || unit.language || "en",
      title: req.body.title || unit.title,
      source: req.body.source || "python_pipeline",
      documentId: req.body.documentId || content.document_id || null,
      content,
      rawPayload: req.body.rawPayload || content,
      metadata: req.body.metadata || {
        enrichedAt: content.enriched_at || null,
        enrichmentModel: content.enrichment_model || null,
        enrichmentStyle: content.enrichment_style || null,
      },
      stats: {
        unitCount: Array.isArray(content.units) ? content.units.length : 0,
        sectionCount: getSectionCount(content),
      },
    };

    const unitContent = await UnitContent.findOneAndUpdate(
      { unitKey: unit.unitKey, contentType, version },
      { $set: documentPayload },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );

    return res.status(200).json({
      status: true,
      message: `${contentType} content stored successfully`,
      data: unitContent,
    });
  } catch (error) {
    console.log("Error storing unit content", error);
    return res.status(500).json({
      status: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

const controller = {
  async upsertUnitContent(req, res) {
    return upsertContent(req, res, null);
  },

  async upsertStructuredContent(req, res) {
    return upsertContent(req, res, "structured");
  },

  async upsertEnrichedContent(req, res) {
    return upsertContent(req, res, "enriched");
  },

  async getUnitContent(req, res) {
    try {
      const { unitKey } = req.params;
      const { type, version, includeRaw } = req.query;

      if (!allowedContentTypes.includes(type)) {
        return res.status(400).json({
          status: false,
          message: "type query must be structured or enriched",
        });
      }

      const filter = {
        unitKey,
        contentType: type,
      };

      if (version) {
        filter.version = Number(version);
      } else {
        filter.isActive = true;
      }

      let query = UnitContent.findOne(filter).sort({ version: -1 });

      if (includeRaw !== "true") {
        query = query.select("-rawPayload");
      }

      const unitContent = await query;

      if (!unitContent) {
        return res.status(404).json({
          status: false,
          message: "Unit content not found",
        });
      }

      return res.status(200).json({ status: true, data: unitContent });
    } catch (error) {
      console.log("Error fetching unit content", error);
      return res.status(500).json({
        status: false,
        message: "Internal Server Error",
        error: error.message,
      });
    }
  },

  async listUnitContentVersions(req, res) {
    try {
      const { unitKey } = req.params;
      const { type } = req.query;

      if (!allowedContentTypes.includes(type)) {
        return res.status(400).json({
          status: false,
          message: "type query must be structured or enriched",
        });
      }

      const versions = await UnitContent.find({
        unitKey,
        contentType: type,
      })
        .select("-content -rawPayload")
        .sort({ version: -1, updatedAt: -1 });

      return res.status(200).json({ status: true, data: versions });
    } catch (error) {
      console.log("Error listing unit content versions", error);
      return res.status(500).json({
        status: false,
        message: "Internal Server Error",
        error: error.message,
      });
    }
  },
};

module.exports = controller;
