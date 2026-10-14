// NotFound.tsx
import React from "react";
import { Link } from "react-router-dom";
const NotFound: React.FC = () => (
  <div className="min-h- flex flex-col items-center justify-center text-center">
    <h1 className="text-6xl font-extrabold">404</h1>
    <p className="text-sm text-slate-600 mt-2">Page not found</p>
    <Link
      to="/"
      className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold"
    >
      Go Home
    </Link>
  </div>
);
export default NotFound;
