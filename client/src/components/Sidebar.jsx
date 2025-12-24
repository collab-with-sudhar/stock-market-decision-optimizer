import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

const Sidebar = ({ isCollapsed, setIsCollapsed }) => {
  const location = useLocation();
  const currentPath = location.pathname;
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        className="md:hidden fixed top-7 left-7 z-50 h-12 w-12 bg-gradient-to-r from-landing-primary to-landing-primary-dark text-white rounded-xl flex items-center justify-center shadow-lg hover:scale-110 transition-transform focus:outline-none focus:ring-0 focus-visible:ring-2 focus-visible:ring-landing-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-[#211A1A]"
      >
        <span className="material-symbols-outlined text-[24px]">
          {mobileMenuOpen ? 'close' : 'menu'}
        </span>
      </button>

      {mobileMenuOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setMobileMenuOpen(false)}
        ></div>
      )}

      <nav
        className={`flex flex-col h-full border-r border-landing-primary/10 bg-white dark:bg-[#211A1A] shrink-0 z-40 transition-all duration-300 shadow-xl relative ${
          isCollapsed ? 'w-24' : 'w-72'
        } ${mobileMenuOpen ? 'fixed top-0 left-0 md:relative' : 'hidden md:flex'}`}
      >
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="hidden md:flex absolute -right-4 top-20 h-8 w-8 bg-gradient-to-r from-landing-primary to-landing-primary-dark text-white rounded-full items-center justify-center shadow-lg hover:scale-110 transition-transform z-40 focus:outline-none focus:ring-0 focus-visible:ring-2 focus-visible:ring-landing-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-[#211A1A]"
          title={isCollapsed ? 'Expand' : 'Collapse'}
        >
          <span className="material-symbols-outlined text-[20px]">
            {isCollapsed ? 'navigate_next' : 'navigate_before'}
          </span>
        </button>

        <div className="h-24"></div>

        <div className="flex flex-col gap-3 flex-1 px-3">
          <Link
            to="/dashboard"
            onClick={() => setMobileMenuOpen(false)}
            className={`flex items-center gap-4 px-5 py-3.5 rounded-2xl group transition-all focus:outline-none focus:ring-0 focus-visible:ring-2 focus-visible:ring-landing-primary/30 ${
              currentPath === '/dashboard'
                ? 'bg-gradient-to-r from-landing-primary to-landing-primary-dark text-white shadow-lg shadow-landing-primary/20'
                : 'text-landing-muted hover:bg-gradient-to-r hover:from-landing-primary hover:to-landing-primary-dark hover:text-white hover:shadow-lg hover:shadow-landing-primary/20'
            } ${isCollapsed ? 'justify-center' : ''}`}
            title={isCollapsed ? 'Dashboard' : ''}
          >
            <span className="material-symbols-outlined icon-filled text-[24px] shrink-0 group-hover:text-white">dashboard</span>
            <p className={`text-base font-semibold tracking-wide transition-all ${isCollapsed ? 'hidden' : 'block'}`}>Dashboard</p>
          </Link>

          <Link
            to="/portfolio"
            onClick={() => setMobileMenuOpen(false)}
            className={`flex items-center gap-4 px-5 py-3.5 rounded-2xl group transition-all focus:outline-none focus:ring-0 focus-visible:ring-2 focus-visible:ring-landing-primary/30 ${
              currentPath === '/portfolio'
                ? 'bg-gradient-to-r from-landing-primary to-landing-primary-dark text-white shadow-lg shadow-landing-primary/20'
                : 'text-landing-muted hover:bg-gradient-to-r hover:from-landing-primary hover:to-landing-primary-dark hover:text-white hover:shadow-lg hover:shadow-landing-primary/20'
            } ${isCollapsed ? 'justify-center' : ''}`}
            title={isCollapsed ? 'Portfolio' : ''}
          >
            <span className="material-symbols-outlined text-[24px] shrink-0 group-hover:text-white">pie_chart</span>
            <p className={`text-base font-semibold transition-all ${isCollapsed ? 'hidden' : 'block'}`}>Portfolio</p>
          </Link>

          

          <Link
            to="/orders"
            onClick={() => setMobileMenuOpen(false)}
            className={`flex items-center gap-4 px-5 py-3.5 rounded-2xl group transition-all focus:outline-none focus:ring-0 focus-visible:ring-2 focus-visible:ring-landing-primary/30 ${
              currentPath === '/orders'
                ? 'bg-gradient-to-r from-landing-primary to-landing-primary-dark text-white shadow-lg shadow-landing-primary/20'
                : 'text-landing-muted hover:bg-gradient-to-r hover:from-landing-primary hover:to-landing-primary-dark hover:text-white hover:shadow-lg hover:shadow-landing-primary/20'
            } ${isCollapsed ? 'justify-center' : ''}`}
            title={isCollapsed ? 'Orders' : ''}
          >
            <span className="material-symbols-outlined text-[24px] shrink-0 group-hover:text-white">description</span>
            <p className={`text-base font-semibold transition-all ${isCollapsed ? 'hidden' : 'block'}`}>Orders</p>
          </Link>
        </div>

        <div className="mt-auto"></div>
      </nav>
    </>
  );
};

export default Sidebar;