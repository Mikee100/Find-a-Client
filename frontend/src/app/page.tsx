import Link from 'next/link';
import { HeroSection } from '@/components/ui/hero-section-2';
import { FileTree } from '@/components/ui/file-tree';

const featuredDevelopers = [
  {
    id: 'alex-k',
    initials: 'AK',
    name: 'Alex Kim',
    role: 'Senior Full-stack',
    rate: '$95/hr',
    stack: ['Next.js', 'Prisma', 'Postgres', 'Redis'],
    rating: '4.9',
    reviews: 12,
  },
  {
    id: 'sara-m',
    initials: 'SM',
    name: 'Sara Mitchell',
    role: 'Product Engineer',
    rate: '$88/hr',
    stack: ['React', 'TypeScript', 'Supabase', 'Tailwind'],
    rating: '5.0',
    reviews: 9,
  },
  {
    id: 'james-o',
    initials: 'JO',
    name: 'James Okafor',
    role: 'Backend Architect',
    rate: '$110/hr',
    stack: ['Go', 'Kafka', 'Redis', 'AWS'],
    rating: '4.8',
    reviews: 21,
  },
  {
    id: 'rita-l',
    initials: 'RL',
    name: 'Rita Liu',
    role: 'Frontend Lead',
    rate: '$92/hr',
    stack: ['Vue', 'Nuxt', 'Storybook', 'Motion'],
    rating: '4.9',
    reviews: 17,
  },
];

const fileStructure = [
  {
    name: 'src',
    type: 'folder' as const,
    children: [
      {
        name: 'components',
        type: 'folder' as const,
        children: [
          { name: 'hero-section-2.tsx', type: 'file' as const, extension: 'tsx' },
          { name: 'file-tree.tsx', type: 'file' as const, extension: 'tsx' },
          { name: 'button.tsx', type: 'file' as const, extension: 'tsx' },
        ],
      },
      {
        name: 'app',
        type: 'folder' as const,
        children: [
          { name: 'page.tsx', type: 'file' as const, extension: 'tsx' },
          { name: 'layout.tsx', type: 'file' as const, extension: 'tsx' },
        ],
      },
      { name: 'lib', type: 'folder' as const, children: [{ name: 'utils.ts', type: 'file' as const, extension: 'ts' }] },
    ],
  },
  {
    name: 'public',
    type: 'folder' as const,
    children: [
      { name: 'hero-poster.jpg', type: 'file' as const, extension: 'png' },
      { name: 'favicon.png', type: 'file' as const, extension: 'png' },
    ],
  },
  { name: 'package.json', type: 'file' as const, extension: 'json' },
  { name: 'README.md', type: 'file' as const, extension: 'md' },
  { name: 'globals.css', type: 'file' as const, extension: 'css' },
];

export default function Home() {
  return (
    <>
      <HeroSection />

      <section className="bg-[#0a0a0a] py-20 text-white">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-10 px-4 sm:px-6 lg:grid-cols-2 lg:items-center lg:px-8">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-white/35">Inside the platform</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
              Built like a product, not a template
            </h2>
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-white/65">
              This gives clients confidence in your engineering process and helps developers present work with structure.
            </p>
            <div className="mt-6">
              <Link
                href="/developer/dashboard"
                className="inline-flex rounded-full border border-white/20 px-5 py-2.5 text-sm font-medium text-white transition hover:scale-[1.02] hover:bg-white/10"
              >
                Explore developer tools
              </Link>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <FileTree data={fileStructure} />
          </div>
        </div>
      </section>

      <section className="border-y border-white/10 bg-[#0a0a0a] py-20 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-7">
            <p className="text-xs uppercase tracking-[0.22em] text-white/35">Featured developers</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
              Profiles clients keep shortlisting
            </h2>
          </div>

          <div className="scrollbar-none flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 [&::-webkit-scrollbar]:hidden">
            {featuredDevelopers.map((dev) => (
              <article
                key={dev.id}
                className="min-w-[86%] snap-start rounded-2xl border border-white/10 bg-white/5 p-5 sm:min-w-107.5"
              >
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="grid h-11 w-11 place-items-center rounded-full border border-white/20 bg-white/5 text-sm font-semibold text-white/85">
                      {dev.initials}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{dev.name}</p>
                      <p className="text-xs text-white/55">{dev.role}</p>
                    </div>
                  </div>
                  <p className="text-xs text-white/55">{dev.rate}</p>
                </div>

                <div className="aspect-video rounded-xl border border-white/10 bg-white/5" />

                <div className="mt-4 flex flex-wrap gap-1.5">
                  {dev.stack.map((stack) => (
                    <span
                      key={stack}
                      className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-white/65"
                    >
                      {stack}
                    </span>
                  ))}
                </div>

                <div className="mt-4 flex items-center justify-between">
                  <p className="text-xs text-white/70">
                    ★ {dev.rating} · {dev.reviews} reviews
                  </p>
                  <Link
                    href={`/developer/${dev.id}`}
                    className="rounded-full border border-white/20 px-4 py-2 text-xs font-medium text-white transition hover:scale-[1.02] hover:bg-white/10"
                  >
                    View profile
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-white/10 bg-[#0a0a0a] py-20 text-white">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-4 sm:px-6 lg:grid-cols-[1fr_auto_1fr] lg:px-8">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <p className="text-xs uppercase tracking-[0.22em] text-white/35">For developers</p>
            <h3 className="mt-3 text-2xl font-semibold tracking-tight">Get discovered. Get hired.</h3>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-white/60">
              Showcase your best work, prove delivery quality, and connect with serious clients looking to ship.
            </p>
            <div className="mt-5 aspect-video rounded-xl border border-white/10 bg-white/5" />
            <div className="mt-5">
              <Link
                href="/developer/dashboard"
                className="inline-flex rounded-full border border-white/20 px-5 py-2.5 text-sm font-medium text-white transition hover:scale-[1.02] hover:bg-white/10"
              >
                Open developer dashboard
              </Link>
            </div>
          </div>

          <div className="hidden w-px bg-white/15 lg:block" />

          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <p className="text-xs uppercase tracking-[0.22em] text-white/35">For clients</p>
            <h3 className="mt-3 text-2xl font-semibold tracking-tight">Find builders, not resumes.</h3>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-white/60">
              Search by outcomes and stack, review live demos, and hire directly without agency overhead.
            </p>
            <div className="mt-5 aspect-video rounded-xl border border-white/10 bg-white/5" />
            <div className="mt-5">
              <Link
                href="/client/dashboard"
                className="inline-flex rounded-full bg-white px-5 py-2.5 text-sm font-medium text-[#0a0a0a] transition hover:scale-[1.02] hover:bg-white/90"
              >
                Start hiring
              </Link>
            </div>
          </div>
        </div>
      </section>

      <footer className="bg-[#0a0a0a] px-4 py-14 text-white sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-10 border-b border-white/10 pb-10 md:grid-cols-4">
            <div>
              <span className="text-sm font-semibold tracking-tight text-white">
                find<span className="text-white/30">.</span>a<span className="text-white/30">.</span>client
              </span>
              <p className="mt-3 text-sm text-white/55">The fastest way to find developers who can actually ship.</p>
            </div>

            <div>
              <h4 className="mb-3 text-sm font-medium text-white">Product</h4>
              <div className="space-y-2 text-sm text-white/55">
                <Link href="/client/dashboard" className="block transition hover:text-white">Browse developers</Link>
                <Link href="/client/dashboard" className="block transition hover:text-white">Post a project</Link>
                <Link href="/client/dashboard" className="block transition hover:text-white">How it works</Link>
                <Link href="/register" className="block transition hover:text-white">Pricing</Link>
              </div>
            </div>

            <div>
              <h4 className="mb-3 text-sm font-medium text-white">Company</h4>
              <div className="space-y-2 text-sm text-white/55">
                <Link href="/login" className="block transition hover:text-white">About</Link>
                <Link href="/login" className="block transition hover:text-white">Blog</Link>
                <Link href="/login" className="block transition hover:text-white">Careers</Link>
                <Link href="/login" className="block transition hover:text-white">Contact</Link>
              </div>
            </div>

            <div>
              <h4 className="mb-3 text-sm font-medium text-white">Legal</h4>
              <div className="space-y-2 text-sm text-white/55">
                <Link href="/login" className="block transition hover:text-white">Privacy policy</Link>
                <Link href="/login" className="block transition hover:text-white">Terms of service</Link>
                <Link href="/login" className="block transition hover:text-white">Cookie policy</Link>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2 pt-5 text-xs text-white/45 sm:flex-row sm:items-center sm:justify-between">
            <p>© 2026 Find a Client. All rights reserved.</p>
            <p>Made with care for developers everywhere</p>
          </div>
        </div>
      </footer>
    </>
  );
}
