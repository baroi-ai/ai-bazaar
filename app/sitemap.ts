import PocketBase from 'pocketbase';
import type { MetadataRoute } from 'next';


export const revalidate = 21600;
// Initialize PocketBase for the server-side fetch
const POCKETBASE_URL = process.env.NEXT_PUBLIC_POCKETBASE_URL || "https://api.aibazaars.store";
const pb = new PocketBase(POCKETBASE_URL);

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: 'https://aibazaars.store',
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 1.0, // Highest priority
    },
    {
      url: 'https://aibazaars.store/apps',
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.9,
    },
    {
      url: 'https://aibazaars.store/download',
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    },
    {
      url: 'https://aibazaars.store/pricing',
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    },
    {
      url: 'https://aibazaars.store/about',
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    },
    {
      url: 'https://aibazaars.store/support',
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    },
    {
      url: 'https://aibazaars.store/terms',
      lastModified: new Date(),
      changeFrequency: 'yearly' as const,
      priority: 0.3, // Legal pages get lower priority
    },
    {
      url: 'https://aibazaars.store/refund',
      lastModified: new Date(),
      changeFrequency: 'yearly' as const,
      priority: 0.3,
    },
    {
      url: 'https://aibazaars.store/privacy',
      lastModified: new Date(),
      changeFrequency: 'yearly' as const,
      priority: 0.3,
    },
  ];

  try {
    // 1. Fetch all your AI apps from PocketBase
    const apps = await pb.collection('apps').getFullList({
      sort: '-updated',
      requestKey: null,
    });

    // 2. Map dynamic app pages into the URL format Google requires
    const appUrls = apps.map((app) => ({
      url: `https://aibazaars.store/apps/${app.slug || app.id}`,
      lastModified: new Date(app.updated),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    }));

    // 3. Combine static pages and dynamic apps together
    return [...staticPages, ...appUrls];

  } catch (error) {
    console.error("Error generating sitemap:", error);
    
    // Fallback basic list of static pages if database fails so the sitemap file doesn't crash entirely
    return staticPages;
  }
}