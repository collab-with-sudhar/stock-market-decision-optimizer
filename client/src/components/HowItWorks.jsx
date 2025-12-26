import React, { forwardRef } from 'react';

const HowItWorks = forwardRef((props, ref) => {
    const steps = [
        {
            id: 1,
            icon: "lightbulb",
            title: "Project Insight",
            description: "NIX is a next-gen paper trading platform designed to bridge the gap between theory and practice. We provide a risk-free environment where you can master the Nifty 50 index using virtual capital, guided by advanced AI Agent.",
            color: "from-blue-400 to-blue-600"
        },
        {
            id: 2,
            icon: "smart_toy",
            title: "The Mechanism",
            description: "At our core is a sophisticated Reinforcement Learning (RL) agent. It continuously analyzes market data, identifies patterns, and provides real-time buy/sell/hold signals, effectively acting as your personalized trading mentor.",
            color: "from-purple-400 to-purple-600"
        },
        {
            id: 3,
            icon: "rocket_launch",
            title: "Start Using",
            description: "Getting started is effortless: 1. Sign up for a free account. 2. Access your Dashboard to see live market data. 3. Follow the AI's signals or test your own strategies to grow your virtual portfolio.",
            color: "from-landing-primary to-landing-primary-dark"
        }
    ];

    return (
        <section ref={ref} className="py-20 relative px-4">
            {}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-landing-primary/5 to-transparent pointer-events-none"></div>

            <div className="max-w-7xl mx-auto relative z-10">
                <div className="text-center mb-16">
                    <h2 className="text-3xl md:text-5xl font-display font-bold text-landing-text dark:text-white mb-6">
                        How Our Agent Works
                    </h2>
                    <p className="text-lg text-landing-muted max-w-2xl mx-auto">
                        Experience the future of trading education in three simple dimensions.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {steps.map((step) => (
                        <div
                            key={step.id}
                            className="group relative bg-white dark:bg-[#211A1A] rounded-[2.5rem] p-8 border border-landing-primary/10 shadow-lg hover:shadow-2xl hover:shadow-landing-primary/10 transition-all duration-500 hover:-translate-y-2 overflow-hidden"
                        >
                            {}
                            <div className={`absolute inset-0 bg-gradient-to-br ${step.color} opacity-0 group-hover:opacity-5 transition-opacity duration-500`}></div>

                            {}
                            <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${step.color} flex items-center justify-center mb-6 text-white shadow-lg transform group-hover:scale-110 transition-transform duration-500`}>
                                <span className="material-symbols-outlined text-3xl">{step.icon}</span>
                            </div>

                            {}
                            <h3 className="text-2xl font-display font-bold text-landing-text dark:text-white mb-4 group-hover:text-landing-primary transition-colors">
                                {step.title}
                            </h3>
                            <p className="text-landing-muted dark:text-gray-400 leading-relaxed">
                                {step.description}
                            </p>

                            {}
                            <div className="absolute top-6 right-8 text-6xl font-display font-bold text-gray-100 dark:text-white/5 pointer-events-none">
                                0{step.id}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
});

export default HowItWorks;
