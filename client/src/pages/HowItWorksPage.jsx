import React from 'react';
import Navbar from '../components/Navbar';
import HowItWorks from '../components/HowItWorks';
import { Link } from 'react-router-dom';

const HowItWorksPage = () => {
    return (
        <div className="bg-[#FDF9F9] dark:bg-[#161212] text-[#453030] dark:text-[#E8E0E0] font-body antialiased overflow-x-hidden transition-colors duration-300 min-h-screen flex flex-col">
            {}
            <div className="fixed top-0 left-0 right-0 z-50 pt-6 px-4 flex justify-center">
                <Navbar />
            </div>

            <div className="relative flex flex-col pt-32 pb-10 px-6 md:px-12 lg:px-24 max-w-[1600px] mx-auto w-full flex-grow">
                <HowItWorks />

                <div className="flex justify-center mt-10 mb-20">
                    <Link to="/signup" className="flex cursor-pointer items-center justify-center overflow-hidden rounded-full h-14 px-10 bg-landing-text dark:bg-landing-surface text-white dark:text-landing-text text-base font-bold shadow-lg hover:shadow-xl hover:scale-105 hover:bg-white hover:text-landing-text dark:hover:bg-landing-text dark:hover:text-white border-2 border-transparent hover:border-landing-text dark:hover:border-landing-surface transition-all duration-300">
                        <span>Get Started Now</span>
                    </Link>
                </div>

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

export default HowItWorksPage;
