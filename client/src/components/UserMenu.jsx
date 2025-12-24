import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { logout } from '../redux/authSlice.js';

const UserMenu = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const [open, setOpen] = React.useState(false);
  const buttonRef = React.useRef(null);

  const handleLogout = async () => {
    try {
      // Optional: call backend logout if available
      try {
        const { default: axiosInstance } = await import('../api/axiosInstance.js');
        await axiosInstance.post('/auth/logout');
      } catch (_) {}
      dispatch(logout());
      navigate('/');
    } finally {
      setOpen(false);
    }
  };

  const handleHome = () => {
    navigate('/');
    setOpen(false);
  };

  React.useEffect(() => {
    const onDocClick = (e) => {
      if (!buttonRef.current) return;
      if (!buttonRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, []);

  const initial = user?.name?.charAt(0).toUpperCase() || 'U';

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={() => setOpen((v) => !v)}
        className="h-10 w-10 rounded-full bg-gradient-to-br from-landing-primary to-landing-primary-dark text-white flex items-center justify-center font-bold shadow-lg shadow-landing-primary/20 shrink-0 focus:outline-none focus:ring-0 focus-visible:ring-2 focus-visible:ring-landing-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-[#211A1A] hover:shadow-xl hover:shadow-landing-primary/30 transition-all"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {initial}
      </button>

      <div className={`absolute right-0 mt-2 w-48 rounded-xl border border-landing-primary/10 bg-white dark:bg-[#211A1A] shadow-xl shadow-landing-primary/20 z-50 overflow-hidden transition-all duration-300 origin-top-right ${
        open 
          ? 'opacity-100 scale-100 visible' 
          : 'opacity-0 scale-95 invisible'
      }`}>
        <div className="py-1">
          <button
            onClick={handleHome}
            className="w-full text-left px-4 py-2.5 text-sm font-semibold text-landing-text dark:text-white bg-white dark:bg-[#211A1A] hover:bg-landing-primary hover:text-white rounded-none focus:outline-none focus:ring-0 transition-all"
          >
            Home
          </button>
          <button
            onClick={handleLogout}
            className="w-full text-left px-4 py-2.5 text-sm font-semibold text-landing-text dark:text-white bg-white dark:bg-[#211A1A] hover:bg-landing-primary hover:text-white rounded-none focus:outline-none focus:ring-0 transition-all"
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserMenu;
