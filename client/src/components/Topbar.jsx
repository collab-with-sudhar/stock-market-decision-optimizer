import React from 'react';
import { useSelector } from 'react-redux';
import UserMenu from './UserMenu.jsx';
import { Link } from 'react-router-dom';

const Topbar = () => {
  const { user } = useSelector((state) => state.auth);
  const [marketOpen, setMarketOpen] = React.useState(false);

  React.useEffect(() => {
    const fetchMarketStatus = async () => {
      try {
        const { default: axiosInstance } = await import('../api/axiosInstance.js');
        const response = await axiosInstance.get('/market/status');
        if (response.data?.success) {
          setMarketOpen(response.data.marketOpen);
        }
      } catch (error) {
        console.error('Error fetching market status:', error);
      }
    };

    fetchMarketStatus();
    const interval = setInterval(fetchMarketStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="w-full flex flex-col md:flex-row justify-between items-center gap-4 bg-white/80 dark:bg-[#1C1313]/80 backdrop-blur-xl rounded-2xl p-4 shadow-sm border border-landing-primary/5 transition-all duration-300 hover:shadow-md hover:shadow-landing-primary/5">

      {}
      <Link to={'/'} className="hidden md:flex items-center gap-3">
        
        <div className="flex flex-col">
          <h1 className="text-xl font-display font-bold text-landing-text dark:text-white tracking-tight leading-none">
            NIX<span className="text-landing-primary">.ai</span>
          </h1>
          {}
        </div>
      </Link>

      {}
      <div className="flex items-center gap-3 md:gap-4 self-end md:self-auto ml-auto md:ml-0">
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white dark:bg-[#211A1A] border border-landing-primary/10 shadow-sm">
          <span className="relative flex h-2 w-2">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${marketOpen ? 'bg-green-500' : 'bg-red-500'} opacity-75`}></span>
            <span className={`relative inline-flex rounded-full h-2 w-2 ${marketOpen ? 'bg-green-500' : 'bg-red-500'}`}></span>
          </span>
          <span className="text-xs font-bold text-landing-text dark:text-white whitespace-nowrap">
            {marketOpen ? 'Market Open' : 'Market Closed'}
          </span>
        </div>

        <UserMenu />
      </div>
    </header>
  );
};

export default Topbar;
