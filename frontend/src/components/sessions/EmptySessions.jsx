import { ArrowRightIcon } from "lucide-react";
import React from "react";
import { Link } from "react-router-dom";

const EmptySessions = () => {
  return (
    <div
      className="w-full bg-white/50 backdrop-blur rounded-3x1 p-12 x1:py-24 text-center
border border-slate-100 shadow-sm flex flex-col items-center justify-center space-y-4"
    >
      <h3 className="text-x1 1g:text-2x1 font-medium text-slate-700">
        No meeting history yet
      </h3>
      <p className="text-sm text-slate-400 max-w-md">
        once you create or join meeting calls, your meeting sessions,
        participants, and chat logs will appear here .
      </p>

      <Link to="/dashboard" className="bg-primary hover:bg-primary-hover text-white
font-medium px-6 py-3 rounded-full text-sm transition-all inline-flex items-center
gap-2 mt-2">
      Start a Meeting
      <ArrowRightIcon className="w-4 h-4"/>
      </Link>
    </div>
  );
};

export default EmptySessions;
