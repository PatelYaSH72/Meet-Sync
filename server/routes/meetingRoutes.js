import express from "express";
import { createMeeting, getMeeting, getMeetingStats, getSessionDetails, getUserSessions } from "../controllers/meetingController.js";
import { protect } from "../middlewares/auth.js";


const meetingRouter = express.Router();

meetingRouter.post("/", protect, createMeeting);
meetingRouter.get("/stats", protect, getMeetingStats);
meetingRouter.get("/sessions", protect, getUserSessions);
meetingRouter.get("/sessions/:id", protect, getSessionDetails);
meetingRouter.get("/:meetingId", protect, getMeeting);

export default meetingRouter;