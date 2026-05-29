const Unit = require("../model/Unit");
const UnitContent = require("../model/UnitContent");
const { extractUnitMetadata } = require("../config/UnitHelpers");

const requiredFieldsMissing = (unitPayload) =>
  !unitPayload.unitKey ||
  !unitPayload.board ||
  !unitPayload.grade ||
  !unitPayload.subject ||
  !unitPayload.unitNumber ||
  !unitPayload.title;

const controller = {
  async registerUnit(req, res) {
    try {
      const unitPayload = extractUnitMetadata(req.body);

      if (requiredFieldsMissing(unitPayload)) {
        return res.status(400).json({
          status: false,
          message:
            "unitKey or board, grade, subject, unitNumber, and title are required",
        });
      }

      const unit = await Unit.findOneAndUpdate(
        { unitKey: unitPayload.unitKey },
        { $set: unitPayload },
        { new: true, upsert: true, setDefaultsOnInsert: true },
      );

      return res.status(200).json({
        status: true,
        message: "Unit registered successfully",
        data: unit,
      });
    } catch (error) {
      console.log("Error registering unit", error);
      return res.status(500).json({
        status: false,
        message: "Internal Server Error",
        error: error.message,
      });
    }
  },

  async listUnits(req, res) {
    try {
      const { board, grade, subject, part, search, status } = req.query;
      const filter = {};

      if (board) {
        filter.board = board;
      }
      if (grade) {
        filter.grade = grade;
      }
      if (subject) {
        filter.subject = subject;
      }
      if (part) {
        filter.part = part;
      }
      if (status) {
        filter.status = status;
      }
      if (search) {
        filter.title = { $regex: search, $options: "i" };
      }

      const units = await Unit.find(filter).sort({
        board: 1,
        grade: 1,
        subject: 1,
        unitNumber: 1,
      });

      return res.status(200).json({ status: true, data: units });
    } catch (error) {
      console.log("Error listing units", error);
      return res.status(500).json({
        status: false,
        message: "Internal Server Error",
        error: error.message,
      });
    }
  },

  async getUnit(req, res) {
    try {
      const { unitKey } = req.params;
      const unit = await Unit.findOne({ unitKey });

      if (!unit) {
        return res
          .status(404)
          .json({ status: false, message: "Unit not found" });
      }

      return res.status(200).json({ status: true, data: unit });
    } catch (error) {
      console.log("Error fetching unit", error);
      return res.status(500).json({
        status: false,
        message: "Internal Server Error",
        error: error.message,
      });
    }
  },

  async getUnitContentTypes(req, res) {
    try {
      const { unitKey } = req.params;
      const unit = await Unit.findOne({ unitKey }).select("unitKey title");

      if (!unit) {
        return res
          .status(404)
          .json({ status: false, message: "Unit not found" });
      }

      const contentTypes = await UnitContent.find({ unitKey, isActive: true })
        .select("contentType version updatedAt metadata stats")
        .sort({ contentType: 1, version: -1 });

      return res.status(200).json({
        status: true,
        data: {
          unit,
          contentTypes,
        },
      });
    } catch (error) {
      console.log("Error fetching unit content types", error);
      return res.status(500).json({
        status: false,
        message: "Internal Server Error",
        error: error.message,
      });
    }
  },
};

module.exports = controller;
