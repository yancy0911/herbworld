export default function sitemap() {
  return ['/', '/handoff', '/partners', '/privacy', '/terms', '/safety'].map((path, index) => (
    {
      url: `https://herbworld.app${path === '/' ? '' : path}`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: index === 0 ? 1 : 0.7,
    }
  ))
}
