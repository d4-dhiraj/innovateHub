'use client'

import Link from "next/link";
import { useEffect, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useLanguage } from "@/lib/language";
import LanguageToggle from "@/components/LanguageToggle";

interface SolvedProblem {
  id: string;
  title: string;
  location: string;
  photo_url: string | null;
}

export default function Home() {
  const { t } = useLanguage();
  const [solvedProblems, setSolvedProblems] = useState<SolvedProblem[]>([]);

  useEffect(() => {
    const fetchSolvedProblems = async () => {
      try {
        const supabase = createBrowserClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );

        const { data, error } = await supabase
          .from('problems')
          .select('id, title, location, photo_url')
          .eq('status', 'resolved')
          .order('created_at', { ascending: false })
          .limit(6);

        if (error) throw error;
        setSolvedProblems(data || []);
      } catch (error) {
        console.error('Error fetching recently solved problems:', error);
      }
    };

    fetchSolvedProblems();
  }, []);

  return (
    <div className="home-page flex min-h-screen flex-col items-center bg-[#f5f1e3] font-sans">
      <nav className="home-navbar w-full">
        <div className="home-navbar-inner">
          <Link href="/" className="home-logo" aria-label="InnovateHub home">
            InnovateHub
          </Link>
          <div className="home-navbar-actions">
            <LanguageToggle />
            <Link href="/login" className="home-navbar-login">
              {t('home.login')}
            </Link>
            <Link href="/signup" className="home-navbar-signup">
              {t('home.signup')}
            </Link>
          </div>
        </div>
      </nav>
      <main className="flex flex-1 w-full max-w-5xl flex-col items-center justify-center py-32 px-16 bg-white dark:bg-black">
        <div className="flex flex-col items-center gap-6 text-center">
          <div className="home-hero-badge">DEPT. OF HIGHER &amp; TECHNICAL EDUCATION, JHARKHAND</div>
          <h1 className="home-welcome-title">
            {t('home.title')}
          </h1>
          <p className="home-welcome-subtitle">
            {t('home.subtitle')}
          </p>
          <div className="flex flex-col gap-4 text-base font-medium sm:flex-row">
            <Link
              href="/login"
              className="home-action home-action-primary"
            >
              {t('home.login')}
            </Link>
            <Link
              href="/signup"
              className="home-action home-action-secondary"
            >
              {t('home.signup')}
            </Link>
            <Link
              href="/success-stories"
              className="home-action home-action-tertiary"
            >
              {t('home.successStories')}
            </Link>
          </div>
          <div className="home-stat-row" aria-label="InnovateHub platform highlights">
            <div className="home-stat-item">
              <strong>4</strong>
              <span>Connected roles</span>
            </div>
            <div className="home-stat-item">
              <strong>1</strong>
              <span>Shared platform</span>
            </div>
            <div className="home-stat-item">
              <strong>24/7</strong>
              <span>Community visibility</span>
            </div>
          </div>
          <div className="home-role-section">
            <div className="home-role-heading">
              <p className="home-role-kicker">How InnovateHub works</p>
              <p className="home-role-intro">Four roles, one connected loop</p>
            </div>
            <div className="home-role-grid">
              <Link href="/signup?role=citizen" className="home-role-card">
                <span className="home-role-icon" aria-hidden="true">⌖</span>
                <span className="home-role-name">Citizen</span>
                <span className="home-role-action">Report an issue</span>
                <span className="home-role-description">Report local issues with geo-tagging and track resolution progress.</span>
                <span className="home-role-enter">Enter portal <span aria-hidden="true">→</span></span>
              </Link>
              <Link href="/signup?role=university" className="home-role-card">
                <span className="home-role-icon" aria-hidden="true">◇</span>
                <span className="home-role-name">University</span>
                <span className="home-role-action">Solve challenges</span>
                <span className="home-role-description">Faculty and student teams build practical, real-world solutions.</span>
                <span className="home-role-enter">Enter portal <span aria-hidden="true">→</span></span>
              </Link>
              <Link href="/signup?role=industry" className="home-role-card">
                <span className="home-role-icon" aria-hidden="true">↗</span>
                <span className="home-role-name">Industry</span>
                <span className="home-role-action">Fund and mentor</span>
                <span className="home-role-description">Sponsor student innovations and provide industry mentorship.</span>
                <span className="home-role-enter">Enter portal <span aria-hidden="true">→</span></span>
              </Link>
              <Link href="/signup?role=admin" className="home-role-card">
                <span className="home-role-icon" aria-hidden="true">▦</span>
                <span className="home-role-name">Admin</span>
                <span className="home-role-action">Monitor impact</span>
                <span className="home-role-description">Coordinate governance, verify solutions, and analyze statewide impact.</span>
                <span className="home-role-enter">Enter portal <span aria-hidden="true">→</span></span>
              </Link>
            </div>
          </div>
          <section className="home-solved-section">
            <div className="home-solved-heading">
              <div>
                <p className="home-role-kicker">Community progress</p>
                <h2>Recently Solved</h2>
              </div>
              <Link href="/success-stories" className="home-solved-link">View all</Link>
            </div>
            <div className="home-solved-grid">
              {solvedProblems.map((problem) => (
                <article key={problem.id} className="home-solved-card">
                  <div className="home-solved-media">
                    {problem.photo_url ? (
                      <img src={problem.photo_url} alt="" className="home-solved-photo" />
                    ) : (
                      <div className="home-solved-photo home-solved-placeholder" aria-hidden="true">+</div>
                    )}
                    <span className="home-solved-badge">Resolved</span>
                  </div>
                  <div className="home-solved-content">
                    <h3>{problem.title}</h3>
                    <p className="home-solved-location"><span aria-hidden="true">⌖</span>{problem.location || 'Community location'}</p>
                  </div>
                </article>
              ))}
            </div>
            {solvedProblems.length === 0 && (
              <p className="home-solved-empty">Resolved community stories will appear here.</p>
            )}
            <p className="home-solved-login">
              <Link href="/login">Log in</Link> to see full details and track your own reports
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
