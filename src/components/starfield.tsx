"use client";

import Image from 'next/image';

const Starfield = () => {
  return (
    <div className="absolute inset-0 w-full h-full z-0">
      <div className="relative w-full h-full">
        <Image
          src="https://www.transparenttextures.com/patterns/stardust.png"
          alt="Starfield"
          layout="fill"
          objectFit="repeat"
          className="animate-[stars_50s_linear_infinite] opacity-30"
        />
      </div>
    </div>
  );
};

export default Starfield;
