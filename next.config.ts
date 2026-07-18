import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // next/image in Next 16 only serves qualities listed here. The event
    // photo reel uses 85 and the lightbox uses 90.
    qualities: [75, 85, 90],
  },
};

export default nextConfig;
