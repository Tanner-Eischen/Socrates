import React from 'react';

interface ChalkboardProps {
  children: React.ReactNode;
}

export default function Chalkboard({ children }: ChalkboardProps) {
  return (
    <div className="relative h-screen w-screen overflow-hidden bg-[#8B6914]">
      {/* Wooden Frame - Top */}
      <div className="absolute top-0 left-0 right-0 h-8 bg-gradient-to-b from-[#8B6914] to-[#6B5010] z-10 border-b-2 border-[#5A4110] shadow-lg"></div>
      
      {/* Wooden Frame - Bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-[#8B6914] to-[#6B5010] z-10 border-t-2 border-[#5A4110] shadow-lg"></div>
      
      {/* Wooden Frame - Left */}
      <div className="absolute top-0 bottom-0 left-0 w-8 bg-gradient-to-r from-[#8B6914] to-[#6B5010] z-10 border-r-2 border-[#5A4110] shadow-lg"></div>
      
      {/* Wooden Frame - Right */}
      <div className="absolute top-0 bottom-0 right-0 w-8 bg-gradient-to-l from-[#8B6914] to-[#6B5010] z-10 border-l-2 border-[#5A4110] shadow-lg"></div>
      
      {/* Chalkboard Surface */}
      <div 
        className="relative h-full w-full"
        style={{
          background: `
            linear-gradient(180deg, rgba(27, 40, 20, 0.95) 0%, rgba(20, 30, 15, 0.98) 100%),
            repeating-linear-gradient(
              0deg,
              transparent,
              transparent 2px,
              rgba(255, 255, 255, 0.03) 2px,
              rgba(255, 255, 255, 0.03) 4px
            ),
            radial-gradient(circle at 20% 30%, rgba(255, 255, 255, 0.05) 0%, transparent 50%),
            radial-gradient(circle at 80% 70%, rgba(255, 255, 255, 0.03) 0%, transparent 50%)
          `,
          margin: '32px',
          borderRadius: '8px',
          boxShadow: 'inset 0 0 100px rgba(0, 0, 0, 0.5), 0 0 20px rgba(0, 0, 0, 0.3)',
        }}
      >
        {/* Chalkboard texture overlay */}
        <div 
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `
              repeating-linear-gradient(
                45deg,
                transparent,
                transparent 10px,
                rgba(255, 255, 255, 0.02) 10px,
                rgba(255, 255, 255, 0.02) 20px
              )
            `,
            opacity: 0.3
          }}
        ></div>
        
        {/* Content Area */}
        <div className="relative h-full w-full overflow-hidden">
          {children}
        </div>
      </div>
    </div>
  );
}

