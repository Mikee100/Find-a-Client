'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ChevronRight, Menu, X, Cloud, Code2, ShieldCheck, Boxes, Cpu, Rocket } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AnimatedGroup } from '@/components/ui/animated-group';
import BrandLogo from '@/components/ui/brand-logo';
import { cn } from '@/lib/utils';
import { useScroll } from 'motion/react';

const transitionVariants = {
  item: {
    hidden: {
      opacity: 0,
      filter: 'blur(12px)',
      y: 12,
    },
    visible: {
      opacity: 1,
      filter: 'blur(0px)',
      y: 0,
      transition: {
        type: 'spring',
        bounce: 0.3,
        duration: 1.5,
      },
    },
  },
} as const;

const logoItems = [
  { label: 'Nvidia', Icon: Cpu },
  { label: 'Column', Icon: Boxes },
  { label: 'GitHub', Icon: Code2 },
  { label: 'Nike', Icon: Rocket },
  { label: 'Lemon Squeezy', Icon: Cloud },
  { label: 'Laravel', Icon: ShieldCheck },
  { label: 'Lilly', Icon: Boxes },
  { label: 'OpenAI', Icon: Cpu },
];

export function HeroSection() {
  return (
    <>
      <HeroHeader />
      <main className="overflow-hidden bg-[#0a0a0a] text-white">
        <section>
          <div className="relative pt-24">
            <div className="absolute inset-0 -z-10 size-full [background:radial-gradient(125%_125%_at_50%_100%,transparent_0%,#0a0a0a_75%)]" />
            <div className="mx-auto max-w-5xl px-6">
              <div className="sm:mx-auto lg:mr-auto">
                <AnimatedGroup
                  variants={{
                    container: {
                      visible: {
                        transition: {
                          staggerChildren: 0.05,
                          delayChildren: 0.75,
                        },
                      },
                    },
                    ...transitionVariants,
                  }}
                >
                  <h1 className="mt-8 max-w-2xl text-balance text-5xl font-medium md:text-6xl lg:mt-16">
                    Build and Ship 10x faster with Find a Client
                  </h1>
                  <p className="mt-8 max-w-2xl text-pretty text-lg text-white/70">
                    Discover trusted developers through real demos and shipped products. Hire directly and move from idea to delivery faster.
                  </p>
                  <div className="mt-12 flex items-center gap-2">
                    <div className="rounded-[14px] border border-white/20 bg-white/10 p-0.5">
                      <Button asChild size="lg" className="rounded-xl px-5 text-base bg-white text-black hover:bg-white/90">
                        <Link href="/client/feed">
                          <span className="text-nowrap">Start Building</span>
                        </Link>
                      </Button>
                    </div>
                    <Button asChild size="lg" variant="ghost" className="h-10.5 rounded-xl px-5 text-base text-white hover:bg-white/10">
                      <Link href="/register">
                        <span className="text-nowrap">Request a demo</span>
                      </Link>
                    </Button>
                  </div>
                </AnimatedGroup>
              </div>
            </div>

            <AnimatedGroup
              variants={{
                container: {
                  visible: {
                    transition: {
                      staggerChildren: 0.05,
                      delayChildren: 0.75,
                    },
                  },
                },
                ...transitionVariants,
              }}
            >
              <div className="relative -mr-56 mt-8 overflow-hidden px-2 sm:mr-0 sm:mt-12 md:mt-20">
                <div aria-hidden className="absolute inset-0 z-10 bg-linear-to-b from-transparent from-35% to-[#0a0a0a]" />
                <div className="relative mx-auto max-w-5xl overflow-hidden rounded-2xl border border-white/15 bg-black p-4 shadow-lg shadow-black/40 ring-1 ring-white/15">
                  <Image
                    className="relative hidden aspect-15/8 rounded-2xl object-cover dark:block"
                    src="https://images.unsplash.com/photo-1518773553398-650c184e0bb3?auto=format&fit=crop&w=2400&q=80"
                    alt="app screen dark"
                    width={2700}
                    height={1440}
                  />
                  <Image
                    className="relative aspect-15/8 rounded-2xl border border-white/15 object-cover dark:hidden"
                    src="https://images.unsplash.com/photo-1516116216624-53e697fedbea?auto=format&fit=crop&w=2400&q=80"
                    alt="app screen light"
                    width={2700}
                    height={1440}
                  />
                </div>
              </div>
            </AnimatedGroup>
          </div>
        </section>

        <section className="pb-16 pt-16 md:pb-32">
          <div className="group relative m-auto max-w-5xl px-6">
            <div className="absolute inset-0 z-10 flex scale-95 items-center justify-center opacity-0 duration-500 group-hover:scale-100 group-hover:opacity-100">
              <Link href="/client/feed" className="block text-sm duration-150 hover:opacity-75">
                <span>Meet Our Customers</span>
                <ChevronRight className="ml-1 inline-block size-3" />
              </Link>
            </div>
            <div className="mx-auto mt-12 grid max-w-2xl grid-cols-2 gap-x-8 gap-y-6 transition-all duration-500 group-hover:opacity-50 sm:grid-cols-4 sm:gap-x-16 sm:gap-y-10">
              {logoItems.map(({ label, Icon }) => (
                <div key={label} className="flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                  <Icon className="size-4 text-white/70" />
                  <span className="text-xs text-white/80">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </>
  );
}

const menuItems = [
  { name: 'Features', href: '/client/feed' },
  { name: 'Solution', href: '/developer/dashboard' },
  { name: 'Pricing', href: '/register' },
  { name: 'About', href: '/login' },
];

export const HeroHeader = () => {
  const [menuState, setMenuState] = React.useState(false);
  const [scrolled, setScrolled] = React.useState(false);

  const { scrollYProgress } = useScroll();

  React.useEffect(() => {
    const unsubscribe = scrollYProgress.on('change', (latest) => {
      setScrolled(latest > 0.05);
    });
    return () => unsubscribe();
  }, [scrollYProgress]);

  return (
    <header>
      <nav
        data-state={menuState && 'active'}
        className={cn(
          'group fixed z-20 w-full border-b border-white/10 transition-colors duration-150',
          scrolled && 'bg-[#0a0a0a]/80 backdrop-blur-3xl',
        )}
      >
        <div className="mx-auto max-w-5xl px-6 transition-all duration-300">
          <div className="relative flex flex-wrap items-center justify-between gap-6 py-3 lg:gap-0 lg:py-4">
            <div className="flex w-full items-center justify-between gap-12 lg:w-auto">
              <Link href="/" aria-label="home" className="flex items-center space-x-2">
                <BrandLogo showText={false} imageClassName="h-9 w-9 rounded-lg" />
              </Link>

              <button
                onClick={() => setMenuState(!menuState)}
                aria-label={menuState ? 'Close Menu' : 'Open Menu'}
                className="relative z-20 -m-2.5 -mr-4 block cursor-pointer p-2.5 lg:hidden"
              >
                <Menu className="m-auto size-6 duration-200 group-data-[state=active]:rotate-180 group-data-[state=active]:scale-0 group-data-[state=active]:opacity-0" />
                <X className="absolute inset-0 m-auto size-6 -rotate-180 scale-0 opacity-0 duration-200 group-data-[state=active]:rotate-0 group-data-[state=active]:scale-100 group-data-[state=active]:opacity-100" />
              </button>

              <div className="hidden lg:block">
                <ul className="flex gap-8 text-sm">
                  {menuItems.map((item) => (
                    <li key={item.name}>
                      <Link href={item.href} className="block text-white/70 duration-150 hover:text-white">
                        <span>{item.name}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="mb-6 hidden w-full flex-wrap items-center justify-end space-y-8 rounded-3xl border border-white/15 bg-[#0a0a0a] p-6 shadow-2xl shadow-zinc-300/20 group-data-[state=active]:block md:flex-nowrap lg:m-0 lg:flex lg:w-fit lg:gap-6 lg:space-y-0 lg:border-transparent lg:bg-transparent lg:p-0 lg:shadow-none lg:group-data-[state=active]:flex dark:shadow-none dark:lg:bg-transparent">
              <div className="lg:hidden">
                <ul className="space-y-6 text-base">
                  {menuItems.map((item) => (
                    <li key={item.name}>
                      <Link href={item.href} className="block text-white/70 duration-150 hover:text-white">
                        <span>{item.name}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex w-full flex-col space-y-3 sm:flex-row sm:gap-3 sm:space-y-0 md:w-fit">
                <Button asChild variant="outline" size="sm" className="border-white/20 text-white hover:bg-white/10">
                  <Link href="/login">
                    <span>Login</span>
                  </Link>
                </Button>
                <Button asChild size="sm" className="bg-white text-black hover:bg-white/90">
                  <Link href="/register">
                    <span>Sign Up</span>
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </nav>
    </header>
  );
};

