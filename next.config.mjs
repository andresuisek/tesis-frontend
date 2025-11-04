/** @type {import('next').NextConfig} */
const nextConfig = {
  async generateBuildId() {
    // Fall back to Next.js default nanoid behavior
    return null;
  },
};

export default nextConfig;


