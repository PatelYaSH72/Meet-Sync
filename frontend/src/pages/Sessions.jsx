import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeftIcon } from "lucide-react";
import EmptySessions from "../components/sessions/EmptySessions";
import SessionsCard from "../components/sessions/SessionsCard";
import SessionDetailModel from "../components/sessions/SessionDetailModel";
import { useAuth } from "@clerk/react";
import api from "../config/api.js";
import Loader from "../components/Loader";

const Sessions = () => {
  const [sessions, setSessions] = useState([]);
  const [selectSession, setSelectSession] = useState(null);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  const { isLoaded, isSignedIn, getToken } = useAuth();

  useEffect(() => {
    const fetchSessions = async (params) => {
      if (!isLoaded || !isSignedIn) return;

      try {
        const token = await getToken();
        if (!token) return;
        const res = await api("/api/meetings/sessions", {
          headers: {
            Authorization: `Bearer
{token}`,
          },
        });
        setSessions(res.data.meetings || []);
      } catch (_error) {
        toast.error("Failed to load meeting sessions");
      } finally {
        setLoading(false);
      }
    };

    fetchSessions();
  }, [isLoaded, isSignedIn, getToken]);

  const openSessionDetails = async (sessionId) => {
    try {
      const token = await getToken();
      const res = await api.get(`/api/meetings/sessions/${sessionId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSelectSession(res.data.meeting);
    } catch (_error) {
      toast.error("Could not fetch session details");
    }
  };

  if (loading) {
    return <Loader text="Loading meeting history..." />;
  }

  return (
    <main className="flex-1 max-w-7xl w-full mx-auto p-6 md:p-12">
      <Link
        to="/dashboard"
        className="flex items-center text-sm gap-1 mb-4 text-slate-500
    hover:text-slate-900 transition-colors"
      >
        <ArrowLeftIcon size={14} /> Go to Dashboard
      </Link>

      <div className="mb-8">
        <h1 className="text-3xl font-medium tracking-tight text-slate-900">
          Meeting sessions
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Review your past and active meeting history, participant logs, and
          chat transcripts .
        </p>
      </div>

      {sessions.length === 0 ? (
        <EmptySessions />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sessions.map((session) => (
            <SessionsCard
              key={session.id}
              session={session}
              onOpenDetails={openSessionDetails}
              onRejoin={(meetingId) => navigate(`/meeting/${meetingId}`)}
            />
          ))}
        </div>
      )}

      <SessionDetailModel
        session={selectSession}
        onClose={() => setSelectSession(null)}
      />
    </main>
  );
};

export default Sessions;
