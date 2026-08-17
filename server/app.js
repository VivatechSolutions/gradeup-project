const express = require("express");
const app = express();
const cors = require("cors");
const mongoose = require("mongoose");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
require("dotenv").config();
const bodyParser = require('body-parser');
//Routersconst bodyParser = require('body-parser');
const AIFeaturesRouter = require("./router/TextHighlighting");
const HighlightingRouter = require("./router/HighlightingV2");
const AuthRouter = require("./router/Auth");
const UnitRouter = require("./router/Unit");
const UnitContentRouter = require("./router/UnitContent");
const LearningLibraryRouter = require("./router/LearningLibrary");
const TutorRouter = require("./router/Tutor");
const DebateRouter = require("./router/DebateV2");
const DebateSpeechRouter = require("./router/DebateSpeech");
const SeminarRouter = require("./router/SeminarV2");
const AvatarRouter = require("./router/Avatar");
const DashboardRouter = require("./router/Dashboard");
const AdminAuthRouter = require("./router/AdminAuth");
const AdminSubjectRouter = require("./router/AdminSubject");
const AdminUsersRouter = require("./router/AdminUsers");
const realtimeRouter = require("./router/realtime"); 
const StudentRouter = require("./router/Student");
const GroupChatRouter = require("./router/GroupChat");
const CommunityRouter = require("./router/Community");

// const { logRoutes } = require("./utils/routeLogger");
const  secureRequestLogger  = require("./utils/logger");
const { initializeSubjectUploadQueue } = require("./services/adminSubjectService");

// Allowing only added origins (i.e client side access)
const allowedOrigins = [process.env.FE_URL,process.env.VITE_API_BASE_URL,process.env.FE_URL_2,"http://192.168.1.35:3000","http://localhost:3000","https://main.d303utafz3zrke.amplifyapp.com"].filter(Boolean);
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));
app.use(bodyParser.json({ limit: '100mb' }));
app.use(bodyParser.urlencoded({ limit: '100mb', extended: true }));
app.use(secureRequestLogger);

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  }),
);
//App routes
app.use("/api/v1/auth", AuthRouter);
app.use("/api/v1/student", StudentRouter);
app.use("/api/v1/units", UnitRouter);
app.use("/api/v1/unit-contents", UnitContentRouter);
app.use("/api/v1/library", LearningLibraryRouter);
app.use("/api/v1/tutor", TutorRouter);
app.use("/api/v1/debate", DebateRouter);
app.use("/api/v1/debate/speech", DebateSpeechRouter);
app.use("/api/v1/seminar", SeminarRouter);
app.use("/api/v1/avatar", AvatarRouter);
app.use("/api", DashboardRouter);
app.use("/api/v1/admin/auth", AdminAuthRouter);
app.use("/api/v1/admin/users", AdminUsersRouter);
app.use("/api/v1/admin/subjects", AdminSubjectRouter);
app.use("/api/v1/group-chat", GroupChatRouter);
app.use("/api/community", CommunityRouter);
app.use('/api/realtime', realtimeRouter);
//AI Router
app.use("/api/v1/AI/higlight", AIFeaturesRouter);
app.use("/api/v1/highlight", HighlightingRouter);

//mongoDb connection
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log("DB Connected");
    initializeSubjectUploadQueue();
  })
  .catch((err) => console.log(err));


// //Server Start  
// const PORT = process.env.PORT || 8000;
// app.listen(PORT, () => {
//   console.log(`Server is Running at ${PORT}`);
// });
const http = require("http");
const PORT = process.env.PORT || 8000; 
const server = http.createServer(app);
try {
  const { setupGroupChatSocket } = require("./services/groupChatRealtime");
  setupGroupChatSocket(server, allowedOrigins);
} catch (error) {
  console.log(`Group chat realtime disabled: ${error.message}`);
}
server.listen(PORT, () => {
  console.log(`Server is Running at ${PORT}`);
});
module.exports = { app, server };
