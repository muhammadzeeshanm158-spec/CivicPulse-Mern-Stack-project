import React from "react";

const Footer: React.FC = () => {
  return (
    // Yeh main footer tag hai - semantic HTML for accessibility
    <footer
      role="contentinfo"
      className="bg-white border-t border-slate-200 py-4 px-6 text-center text-xs text-slate-600 mt-auto"
    >
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
        <p className="text-slate-700">
          {/* Dynamic year - har saal auto update hoga */}
          CivicPulse &copy; {new Date().getFullYear()} Community Issue Tracker. All rights reserved.
        </p>
        {/* Footer navigation - Privacy, Terms etc */}
        <nav aria-label="Footer Navigation" className="flex gap-4 text-slate-500">
          <a href="#" className="hover:text-indigo-600 transition focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-1 rounded-sm px-1">
            Privacy Policy
          </a>
          <span aria-hidden="true">•</span>
          <a href="#" className="hover:text-indigo-600 transition focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-1 rounded-sm px-1">
            Terms of Service
          </a>
          <span aria-hidden="true">•</span>
          <a href="#" className="hover:text-indigo-600 transition focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-1 rounded-sm px-1">
            Helpline
          </a>
        </nav>
      </div>
    </footer>
  );
};

export default Footer;