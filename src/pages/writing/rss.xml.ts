import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';

export async function GET(context: APIContext) {
  const posts = await getCollection('writing', ({ data }) => !data.draft);
  const sorted = posts.sort((a, b) => new Date(b.data.publishedAt).getTime() - new Date(a.data.publishedAt).getTime());

  return rss({
    title: 'Juan Manuel Ahumada Vázquez — Writing',
    description: 'Notes from the field — incidents, architecture, and what AI agents do to my workflow.',
    site: context.site!,
    items: sorted.map((post) => {
      const [lang, ...rest] = post.id.split('/');
      const slug = rest.join('/').replace(/\.md$/, '');
      return {
        title: post.data.title,
        description: post.data.summary,
        pubDate: new Date(post.data.publishedAt),
        link: `/${lang}/writing/${slug}`,
        categories: post.data.tags,
      };
    }),
    customData: '<language>en-us</language>',
  });
}
