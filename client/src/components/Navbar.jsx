import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { logout } from '../redux/authSlice';
import UserMenu from './UserMenu';

const Navbar = () => {
  const { isAuthenticated, user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      const { authApi } = await import('../api/authApi.js');
      await authApi.logout();
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      dispatch(logout());
      navigate('/');
    }
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-50 flex justify-center px-4 pt-6">
      <nav className="w-full max-w-7xl bg-white/80 dark:bg-[#1C1313]/80 backdrop-blur-xl rounded-2xl p-4 shadow-sm border border-landing-primary/5 flex items-center justify-between transition-all duration-300 hover:shadow-md hover:shadow-landing-primary/5">
        
        {/* Branding */}
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-gradient-to-br from-landing-primary to-landing-primary-dark text-white font-bold text-lg shadow-lg shadow-landing-primary/20">
            N
          </div>
          <div className="flex flex-col">
            <h1 className="text-xl font-display font-bold text-landing-text dark:text-white tracking-tight leading-none">
              Nifty 50 <span className="text-landing-primary">Trader</span>
            </h1>
            <p className="text-[10px] font-bold uppercase tracking-widest text-landing-muted mt-1">AI Powered</p>
          </div>
        </div>

        {/* Links (Hidden on mobile) */}
        <div className="hidden md:flex items-center gap-10">
          <a href="#" className="text-sm font-medium text-landing-muted hover:text-landing-primary transition-colors">Features</a>
          <a href="#" className="text-sm font-medium text-landing-muted hover:text-landing-primary transition-colors">Performance</a>
          <a href="#" className="text-sm font-medium text-landing-muted hover:text-landing-primary transition-colors">Pricing</a>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-4">
          {isAuthenticated ? (
            <UserMenu />
          ) : (
            <>
              <Link to="/login" className="hidden sm:block text-sm font-semibold text-landing-text dark:text-white px-5 py-2 hover:text-landing-primary transition-colors">
                Login
              </Link>
              <Link to="/signup" className="flex cursor-pointer items-center justify-center overflow-hidden rounded-full h-11 px-7 bg-landing-text dark:bg-landing-surface text-white dark:text-landing-text text-sm font-bold shadow-lg hover:shadow-xl hover:scale-105 hover:bg-white hover:text-landing-text dark:hover:bg-landing-text dark:hover:text-white border-2 border-transparent hover:border-landing-text dark:hover:border-landing-surface transition-all duration-300">
                <span>Get Started</span>
              </Link>
            </>
          )}
        </div>
      </nav>
    </div>
  );
};

export default Navbar;