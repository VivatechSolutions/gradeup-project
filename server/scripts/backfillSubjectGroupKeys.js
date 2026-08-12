require("dotenv").config();

const mongoose = require("mongoose");
const SubjectUnit = require("../model/SubjectUnit");
const SubjectUpload = require("../model/SubjectUpload");
const { getSubjectIdentityKey } = require("../utils/subjectIdentity");

async function main() {
  const apply = process.argv.includes("--apply");
  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    throw new Error("MONGODB_URI is required");
  }

  await mongoose.connect(mongoUri);

  const units = await SubjectUnit.find({}).select(
    "_id uploadId board standard subject part term subjectGroupKey",
  );

  let unitUpdates = 0;
  let uploadUpdates = 0;

  for (const unit of units) {
    const nextKey = getSubjectIdentityKey(unit);
    if (unit.subjectGroupKey !== nextKey) {
      unitUpdates += 1;
      console.log(
        `[unit] ${unit._id}: ${unit.subjectGroupKey || "(empty)"} -> ${nextKey}`,
      );
      if (apply) {
        await SubjectUnit.updateOne({ _id: unit._id }, { $set: { subjectGroupKey: nextKey } });
      }
    }

    if (unit.uploadId) {
      const upload = await SubjectUpload.findById(unit.uploadId).select(
        "_id board standard subject part term subjectGroupKey",
      );
      if (upload) {
        const uploadKey = getSubjectIdentityKey(upload);
        if (upload.subjectGroupKey !== uploadKey) {
          uploadUpdates += 1;
          console.log(
            `[upload] ${upload._id}: ${upload.subjectGroupKey || "(empty)"} -> ${uploadKey}`,
          );
          if (apply) {
            await SubjectUpload.updateOne(
              { _id: upload._id },
              { $set: { subjectGroupKey: uploadKey } },
            );
          }
        }
      }
    }
  }

  console.log(
    `${apply ? "Applied" : "Dry run"} complete. unitUpdates=${unitUpdates}, uploadUpdates=${uploadUpdates}`,
  );
  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect().catch(() => null);
  process.exit(1);
});
