"use client";

const Starfield = () => {
  return (
    <div
      className="absolute inset-0 w-full h-full z-0 opacity-30 bg-repeat animate-[stars_200s_linear_infinite]"
      style={{
        backgroundImage: "url('https://www.transparenttextures.com/patterns/stardust.png')",
      }}
    />
  );
};

export default Starfield;
