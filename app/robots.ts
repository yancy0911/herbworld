import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: ['/', '/partners', '/privacy', '/terms', '/safety'],
      disallow: ['/api/', '/operations', '/leads', '/guides/', '/success'],
    },
    sitemap: 'https://herbworld.app/sitemap.xml',
  };
}
