import { sql } from "./config/db.js";

const rooms = new Map();

export function setupSocketIO(io) {
  io.on("connection", (socket) => {
    let currentRoomId = null;
    let currentUser = null;

    // User joins a meeting room
    socket.on(
  "join-room",
  async ({ roomId, user, audioEnabled = true, videoEnabled = true }) => {
    try {
      console.log("JOIN ROOM:", roomId);
      console.log("JOIN USER:", user);

      // 1. Meeting check
      const meetings = await sql`
        SELECT id, meeting_id, host_id, status
        FROM meetings
        WHERE meeting_id = ${roomId}
        LIMIT 1
      `;

      console.log("MEETING RESULT:", meetings);

      if (meetings.length === 0) {
        socket.emit("meeting-ended", {
          message: "Meeting not found.",
        });
        return;
      }

      const meeting = meetings[0];

      if (meeting.status === "ended") {
        socket.emit("meeting-ended", {
          message: "This meeting has already ended.",
        });
        return;
      }

      // 2. Host plan
      const hosts = await sql`
        SELECT plan
        FROM users
        WHERE id = ${meeting.host_id}
        LIMIT 1
      `;

      const hostPlan = hosts[0]?.plan || "free";
      const maxParticipants = hostPlan === "premium" ? 100 : 10;

      // 3. Room create
      if (!rooms.has(roomId)) {
        rooms.set(roomId, new Map());
      }

      const roomParticipants = rooms.get(roomId);

      if (roomParticipants.size >= maxParticipants) {
        socket.emit("meeting-ended", {
          message: `Meeting capacity limit reached. Maximum ${maxParticipants} participants allowed.`,
        });
        return;
      }

      // 4. Current user
      const currentUserData = {
        socketId: socket.id,
        userId: user?.id || null,
        userName: user?.name || "Anonymous",
        isHost:
          String(meeting.host_id) === String(user?.id),
        audioEnabled,
        videoEnabled,
      };

      currentRoomId = roomId;
      currentUser = currentUserData;

      // 5. Join socket room
      socket.join(roomId);

      // IMPORTANT:
      // existing users ko new user add karne se pehle nikalo
      const existingUsers = Array.from(roomParticipants.values());

      // 6. Add current user
      roomParticipants.set(socket.id, currentUserData);

      // 7. Save participant
      const userId = user?.id || null;

      if (userId) {
        const existingParticipants = await sql`
          SELECT id
          FROM meeting_participants
          WHERE meeting_id = ${meeting.id}
          AND user_id = ${userId}
          LIMIT 1
        `;

        if (existingParticipants.length === 0) {
          await sql`
            INSERT INTO meeting_participants
              (meeting_id, user_id, name, joined_at)
            VALUES
              (${meeting.id}, ${userId}, ${currentUserData.userName}, NOW())
          `;
        }
      }

      // 8. Send existing users to new user
      socket.emit("all-users", existingUsers);

      // 9. Notify existing users
      socket.to(roomId).emit("user-joined", currentUserData);

      console.log(
        `User ${currentUserData.userName} joined room ${roomId}`
      );

    } catch (err) {
      console.error("❌ JOIN ROOM ERROR:", err);
      console.error("❌ ERROR MESSAGE:", err.message);
      console.error("❌ ERROR STACK:", err.stack);

      socket.emit("meeting-ended", {
        message: "Failed to join room.",
      });
    }
  }
);

    socket.on("offer", ({ targetSocketId, callerSocketId, sdp }) => {
      io.to(targetSocketId).emit("offer", {
        callerSocketId,
        sdp,
        callerUser: currentUser,
      });
    });

    socket.on("answer", ({ targetSocketId, callerSocketId, sdp }) => {
      io.to(targetSocketId).emit("answer", {
        responderSocketId: socket.id,
        sdp,
      });
    });

    socket.on(
      "ice-candidate",
      ({ targetSocketId, senderSocketId, candidate }) => {
        io.to(targetSocketId).emit("ice-candidate", {
          senderSocketId,
          candidate,
        });
      },
    );

    socket.on("toggle-audio", ({ roomId, audioEnabled }) => {
      if (rooms.has(roomId) && rooms.get(roomId).has(socket.id)) {
        rooms.get(roomId).get(socket.id).audioEnabled = audioEnabled;
      }
      socket.to(roomId).emit("user-toggled-audio", {
        socketId: socket.id,
        audioEnabled,
      });
    });

    socket.on("toggle-video", ({ roomId, videoEnabled }) => {
      if (rooms.has(roomId) && rooms.get(roomId).has(socket.id)) {
        rooms.get(roomId).get(socket.id).videoEnabled = videoEnabled;
      }
      socket.to(roomId).emit("user-toggled-video", {
        socketId: socket.id,
        videoEnabled,
      });
    });

    socket.on("send-message", async ({ roomId, message }) => {
      try {
        const meetings =
          await sql`SELECT id, status FROM meetings WHERE meeting_id = ${roomId}`;

        if (meetings.length > 0 && meetings[0].status !== "ended") {
          const meetingId = meetings[0].id;
          const senderId = message.senderId || null;

          await sql`
            INSERT INTO meeting_messages (meeting_id, sender_id, sender_name, text, timestamp) VALUES (${meetingId}, ${senderId}, ${message.senderName || "Anonymous"}, ${message.text}, NOW())`;

          io.in(roomId).emit("receive-message", {
            ...message,
            senderSocketId: socket.id,
          });
        }
      } catch (err) {
        console.error("Error saving chat message to DB:", err);
      }
    });

    socket.on("end-meeting", async ({ roomId }) => {
      try {
        await sql`
            UPDATE meetings
            SET status = 'ended', ended_at = NOW()
            WHERE meeting_id = ${roomId}`;

        io.to(roomId).emit("meeting-ended", {
          message: "The meeting has been ended by the host.",
        });
        rooms.delete(roomId);
      } catch (error) {
        console.error("Error ending meeting:", error);
      }
    });

    socket.on("disconnect", async () => {
      if (currentRoomId && rooms.has(currentRoomId)) {
        const roomParticipants = rooms.get(currentRoomId);
        roomParticipants.delete(socket.id);

        if (roomParticipants.size === 0) {
          rooms.delete(currentRoomId);
        } else {
          // Notify remaining peers that a user disconnected
          socket.to(currentRoomId).emit("user-left", {
            socketId: socket.id,
            user: currentUser,
          });
        }
      }
    });
  });
}
