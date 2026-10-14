// Home.tsx
import React from "react"; import { Link } from "react-router-dom";
const Home: React.FC = () => (
  <div className="min-h- flex flex-col items-center justify-center text-center p-6">
    <h1 className="text-4xl font-extrabold">CivicPulse</h1><p className="text-sm text-slate-600 mt-2 max-w-lg">Report civic issues, track resolution, ensure transparency. Your city, your voice.</p>
    <div className="flex gap-3 mt-6"><Link to="/report-issue" className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-bold">Report Issue</Link><Link to="/issues" className="px-5 py-2.5 bg-white border rounded-xl text-xs font-bold">Explore Issues</Link></div>
  </div>
);
export default Home;

