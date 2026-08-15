function injectStudentIdentity(req, _res, next) {
  if (req.authUser?.id) {
    const candidateName =
      req.authUser.user?.firstName || req.authUser.user?.email || "GradeUp Learner";
    if (req.body && typeof req.body === "object") {
      req.body.candidateId = req.authUser.id;
      req.body.candidate_id = req.authUser.id;
      req.body.userId = req.authUser.id;
      req.body.candidateName = candidateName;
      req.body.candidate_name = candidateName;
    }
    if (req.query && typeof req.query === "object") {
      req.query.candidateId = req.authUser.id;
      req.query.candidate_id = req.authUser.id;
      req.query.userId = req.authUser.id;
      req.query.candidateName = candidateName;
      req.query.candidate_name = candidateName;
    }
  }
  next();
}

module.exports = { injectStudentIdentity };
