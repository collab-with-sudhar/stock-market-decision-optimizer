import React, { useEffect, useState } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import {
  PositionsTable,
  AISignals,
  AIDecisionFeed,
  QuickTradeForm
} from '../components/DashboardWidgets';

const Dashboard = () => {
  const [positions, setPositions] = useState([]);
  const [orders, setOrders] = useState([]);
  const [portfolio, setPortfolio] = useState(null);
  const [loading, setLoading] = useState(true);
  const [marketOpen, setMarketOpen] = useState(false);

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

  const fetchUserData = async () => {
    try {
      setLoading(true);

      
      const { default: axiosInstance } = await import('../api/axiosInstance.js');

      
      const positionsRes = await axiosInstance.get('/trading/positions');
      if (positionsRes.data.success) {
        setPositions(positionsRes.data.positions);
      }

      
      const ordersRes = await axiosInstance.get('/trading/orders?limit=20');
      if (ordersRes.data.success) {
        setOrders(ordersRes.data.orders);
      }

      
      const portfolioRes = await axiosInstance.get('/trading/portfolio');
      if (portfolioRes.data.success) {
        setPortfolio(portfolioRes.data.portfolio);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const onSubmitTrade = async (data) => {
    try {
      const { default: axiosInstance } = await import('../api/axiosInstance.js');
      const response = await axiosInstance.post('/trading/orders', data);

      if (response.data.success) {
        
        fetchUserData();
      }
    } catch (error) {
      console.error('Error submitting trade:', error);
      
    }
  };

  useEffect(() => {
    fetchUserData();
    fetchMarketStatus();

    
    const statusInterval = setInterval(fetchMarketStatus, 5000);

    return () => clearInterval(statusInterval);
  }, []);

  return (
    <DashboardLayout>
      {loading ? (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-landing-primary mx-auto mb-4"></div>
            <p className="text-landing-muted">Loading your portfolio...</p>
          </div>
        </div>
      ) : (
        <>
          {}
          <div className="lg:hidden mb-6">
            <div className="animate-fade-in-up">
              <AISignals />
            </div>
          </div>

          {}
          <div className="lg:hidden mb-6">
            <div className="animate-fade-in-up">
              <AIDecisionFeed />
            </div>
          </div>

          {}
          {portfolio && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 animate-fade-in-up">
              <div className="bg-white dark:bg-[#211A1A] rounded-2xl p-5 border border-landing-primary/10 shadow-sm">
                <p className="text-xs font-bold uppercase tracking-wide text-landing-muted mb-1">Portfolio Value</p>
                <p className="text-2xl font-display font-bold text-landing-text dark:text-white">
                  ₹{portfolio.portfolioValue?.toLocaleString('en-IN') || '0'}
                </p>
              </div>
              <div className="bg-white dark:bg-[#211A1A] rounded-2xl p-5 border border-landing-primary/10 shadow-sm">
                <p className="text-xs font-bold uppercase tracking-wide text-landing-muted mb-1">Cash Balance</p>
                <p className="text-2xl font-display font-bold text-landing-text dark:text-white">
                  ₹{portfolio.cash?.toLocaleString('en-IN') || '0'}
                </p>
              </div>
              <div className="bg-white dark:bg-[#211A1A] rounded-2xl p-5 border border-landing-primary/10 shadow-sm">
                <p className="text-xs font-bold uppercase tracking-wide text-landing-muted mb-1">Total P&L</p>
                <p className={`text-2xl font-display font-bold ${portfolio.totalPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {portfolio.totalPnL >= 0 ? '+' : ''}₹{portfolio.totalPnL?.toLocaleString('en-IN') || '0'}
                </p>
              </div>
              <div className="bg-white dark:bg-[#211A1A] rounded-2xl p-5 border border-landing-primary/10 shadow-sm">
                <p className="text-xs font-bold uppercase tracking-wide text-landing-muted mb-1">Returns</p>
                <p className={`text-2xl font-display font-bold ${portfolio.totalPnLPercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {portfolio.totalPnLPercent >= 0 ? '+' : ''}{portfolio.totalPnLPercent?.toFixed(2) || '0'}%
                </p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 max-w-[1920px] mx-auto">

            {}
            <div className="col-span-1 lg:col-span-8 flex flex-col gap-6">
              <div className="hidden lg:block animate-fade-in-up delay-100">
                <AISignals />
              </div>
              <div className="animate-fade-in-up delay-200">
                <PositionsTable positions={positions} orders={orders} />
              </div>
            </div>

            {}
            <div className="col-span-1 lg:col-span-4 flex flex-col gap-6">
              <div className="animate-fade-in-up delay-300">
                <QuickTradeForm onSubmit={onSubmitTrade} portfolio={portfolio} marketOpen={marketOpen} />
              </div>
              <div className="hidden lg:block animate-fade-in-up delay-400">
                <AIDecisionFeed />
              </div>
            </div>

          </div>
        </>
      )}
    </DashboardLayout>
  );
};

export default Dashboard;