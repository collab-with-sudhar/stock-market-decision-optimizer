import React from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import Navbar from '../components/Navbar';

const Landing = () => {
  const { user } = useSelector((state) => state.auth);
  const isAuthenticated = !!user;

  const startTradingLink = isAuthenticated ? '/dashboard' : '/signup';

  return (
    <div className="bg-[#FDF9F9] dark:bg-[#161212] text-[#453030] dark:text-[#E8E0E0] font-body antialiased overflow-x-hidden transition-colors duration-300 min-h-screen flex flex-col">

      {}
      <div className="fixed top-0 left-0 right-0 z-50 pt-6 px-4 flex justify-center">
        <Navbar />
      </div>

      {}
      <div className="relative flex flex-col pt-32 pb-10 px-6 md:px-12 lg:px-24 max-w-[1600px] mx-auto w-full flex-grow">

        {}
        <main className="relative flex flex-col justify-center items-center min-h-[70vh] mb-20 z-10 text-center">

          {}
          <div className="absolute top-[10%] left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-landing-primary/10 rounded-full blur-[120px] animate-pulse pointer-events-none"></div>
          <div className="absolute bottom-[0%] left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-landing-primary/5 rounded-full blur-[100px] animate-pulse delay-1000 pointer-events-none"></div>

          {}
          <div className="max-w-4xl flex flex-col gap-8 animate-fade-in-up items-center mx-auto">

            {}
            {}

            {}
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-display font-bold leading-[1.1] tracking-tight text-landing-text dark:text-white drop-shadow-sm delay-100 animate-fade-in-up">
              Learn Stock Market with <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-landing-primary to-landing-primary-dark italic relative pb-2 inline-block">
                AI-Powered Guidance
                <svg className="absolute w-full h-3 bottom-0 left-0 text-landing-primary/30" viewBox="0 0 100 10" preserveAspectRatio="none">
                  <path d="M0 5 Q 50 10 100 5" fill="none" stroke="currentColor" strokeWidth="3"></path>
                </svg>
              </span>
            </h1>

            {}
            <p className="text-lg md:text-xl text-landing-muted dark:text-gray-400 font-normal leading-relaxed max-w-2xl delay-200 animate-fade-in-up">
              Master the <strong>Nifty 50</strong> index without losing a single rupee. Our advanced Reinforcement Learning agent analyzes market trends to give you accurate buy & sell signals, acting as your personal trading mentor while you practice with virtual capital.
            </p>

            {}
            <div className="flex flex-col sm:flex-row gap-5 items-center justify-center pt-4 delay-300 animate-fade-in-up w-full">
              <Link
                to={startTradingLink}
                className="h-14 px-10 rounded-full bg-gradient-to-r from-landing-primary to-landing-primary-dark text-white text-base font-bold shadow-lg shadow-landing-primary/20 hover:shadow-xl hover:shadow-landing-primary/30 hover:-translate-y-1 hover:from-white hover:to-white hover:text-landing-primary transition-all duration-300 flex items-center gap-2 group justify-center w-full sm:w-auto"
              >
                {isAuthenticated ? 'Go to Dashboard' : 'Start Paper Trading'}
                <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">arrow_forward</span>
              </Link>
              <Link
                to="/how-it-works"
                className="h-14 px-10 rounded-full bg-white dark:bg-[#211A1A] border-2 border-landing-primary/20 text-landing-text dark:text-white text-base font-medium hover:bg-landing-primary hover:border-landing-primary hover:text-white transition-all duration-300 shadow-sm hover:shadow-md w-full sm:w-auto flex items-center justify-center cursor-pointer"
              >
                How it Works
              </Link>
            </div>

            {}


          </div>
        </main>

        {}
        <section className="mb-32 animate-fade-in-up delay-300">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">

            {}
            <div className="bg-white dark:bg-[#211A1A] rounded-[2.5rem] p-10 border border-landing-primary/10 flex flex-col items-start gap-6 hover:shadow-xl hover:shadow-landing-primary/5 transition-all duration-500 hover:-translate-y-2 group relative overflow-hidden">
              <div className="w-16 h-16 rounded-2xl bg-landing-primary/10 flex items-center justify-center mb-2 group-hover:bg-landing-primary group-hover:text-white transition-all duration-300">
                <span className="material-symbols-outlined text-3xl text-landing-primary group-hover:text-white transition-colors">school</span>
              </div>
              <div>
                <h3 className="text-2xl font-display font-bold mb-3 text-landing-text dark:text-white">Learn by Doing</h3>
                <p className="text-landing-muted leading-relaxed">
                  Practice trading strategies on the Nifty 50 using virtual money. Experience real market volatility without the financial stress.
                </p>
              </div>
            </div>

            {}
            <div className="bg-white dark:bg-[#211A1A] rounded-[2.5rem] p-10 border border-landing-primary/10 flex flex-col items-start gap-6 hover:shadow-xl hover:shadow-landing-primary/5 transition-all duration-500 hover:-translate-y-2 group relative overflow-hidden">
              <div className="w-16 h-16 rounded-2xl bg-landing-primary/10 flex items-center justify-center mb-2 group-hover:bg-landing-primary group-hover:text-white transition-all duration-300">
                <span className="material-symbols-outlined text-3xl text-landing-primary group-hover:text-white transition-colors">psychology</span>
              </div>
              <div>
                <h3 className="text-2xl font-display font-bold mb-3 text-landing-text dark:text-white">AI Decision Optimizer</h3>
                <p className="text-landing-muted leading-relaxed">
                  Our Reinforcement Learning agent acts as your mentor, analyzing past trends to suggest optimal entry and exit points.
                </p>
              </div>
            </div>

            {}
            <div className="bg-white dark:bg-[#211A1A] rounded-[2.5rem] p-10 border border-landing-primary/10 flex flex-col items-start gap-6 hover:shadow-xl hover:shadow-landing-primary/5 transition-all duration-500 hover:-translate-y-2 group relative overflow-hidden">
              <div className="w-16 h-16 rounded-2xl bg-landing-primary/10 flex items-center justify-center mb-2 group-hover:bg-landing-primary group-hover:text-white transition-all duration-300">
                <span className="material-symbols-outlined text-3xl text-landing-primary group-hover:text-white transition-colors">trending_up</span>
              </div>
              <div>
                <h3 className="text-2xl font-display font-bold mb-3 text-landing-text dark:text-white">Track Your Growth</h3>
                <p className="text-landing-muted leading-relaxed">
                  Monitor your paper trading performance. Compare your manual decisions vs the AI's suggestions to refine your instincts.
                </p>
              </div>
            </div>

          </div>
        </section>

        {}
        <footer className="flex flex-col md:flex-row justify-between items-center py-8 border-t border-black/5 dark:border-white/5 gap-6 mt-auto">
          <div className="flex items-center gap-3">
            <img
              src="/logo.png"
              alt="Logo"
              className="size-8 rounded-full object-cover shadow-md"
            />
            <span className="text-base font-bold font-display text-landing-text dark:text-white">NIX.ai</span>
          </div>
          <div className="flex gap-8">
            <a href="#" className="text-sm font-medium text-landing-muted hover:text-landing-primary transition-colors">Privacy</a>
            <a href="#" className="text-sm font-medium text-landing-muted hover:text-landing-primary transition-colors">Terms</a>
            <a href="#" className="text-sm font-medium text-landing-muted hover:text-landing-primary transition-colors">Contact</a>
          </div>
          <p className="text-sm text-landing-muted">NIX.ai</p>
        </footer>

      </div>
    </div>
  );
};

export default Landing;