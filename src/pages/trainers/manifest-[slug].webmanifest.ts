// Home-screen app manifest per schedule page (/trainers/manifest-<slug>.webmanifest),
// so the installed app opens on the page it was added from.
import type { APIRoute, GetStaticPaths } from 'astro';
import { getTimetable } from '../../lib/loadTimetable';
import { ALL_SLUG, RENTALS_SLUG, hallsFrom, trainersFrom } from '../../lib/trainers';

export const getStaticPaths: GetStaticPaths = async () => {
  const tt = await getTimetable();
  return [{ slug: ALL_SLUG, name: 'ETUDE' }, { slug: RENTALS_SLUG, name: 'Rentals' }, ...trainersFrom(tt), ...hallsFrom(tt)].map((t) => ({
    params: { slug: t.slug },
    props: { name: t.name },
  }));
};

export const GET: APIRoute = ({ params, props }) => {
  const start = params.slug === ALL_SLUG ? '/trainers/' : `/trainers/${params.slug}/`;
  return new Response(
    JSON.stringify({
      id: start,
      name: params.slug === ALL_SLUG ? 'ETUDE' : `ETUDE — ${props.name}`,
      short_name: 'ETUDE',
      description: 'ETUDE Dance School — schedule for trainers',
      start_url: start,
      scope: '/trainers/',
      display: 'standalone',
      background_color: '#17224a',
      theme_color: '#17224a',
      icons: [
        { src: '/images/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
        { src: '/images/logo-mark-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      ],
    }),
    { headers: { 'Content-Type': 'application/manifest+json' } }
  );
};
