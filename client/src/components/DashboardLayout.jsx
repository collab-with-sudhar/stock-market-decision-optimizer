import React, { useState } from 'react';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

const DashboardLayout = ({ children }) => {
  const [isCollapsed, setIsCollapsed] = useState(true);

  return (
    <div className="bg-[#FDF9F9] dark:bg-[#161212] text-[#453030] dark:text-[#E8E0E0] font-body overflow-hidden h-screen w-full flex transition-all duration-300">
      
      {/* Sidebar Wrapper */}
      <div className="z-50 h-full transition-all duration-300 shrink-0">
        <Sidebar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />
      </div>

      <main className="flex-1 flex flex-col h-full overflow-hidden relative transition-all duration-300">
        
        {/* Decorative Background Blobs */}
        <div className="absolute top-[-10%] left-[20%] w-[500px] h-[500px] bg-landing-primary/5 rounded-full blur-[120px] pointer-events-none"></div>
        <div className="absolute bottom-[-10%] right-[10%] w-[400px] h-[400px] bg-landing-primary/5 rounded-full blur-[100px] pointer-events-none"></div>

        {/* Top Header */}
        <div className="px-4 pt-4 pb-2 z-30">
            <Topbar />
        </div>

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-6 custom-scrollbar relative z-10">
          {children}
        </div>
      </main>
    </div>
  );
};

export default DashboardLayout;
