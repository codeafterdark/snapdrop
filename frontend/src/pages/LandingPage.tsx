import { useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

export function LandingPage() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const observerRef = useRef<IntersectionObserver | null>(null);

  // If the user is already signed in (e.g. OAuth callback landed here), send them straight to the dashboard
  useEffect(() => {
    if (!loading && session) navigate("/admin/dashboard", { replace: true });
  }, [session, loading, navigate]);

  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add("reveal-visible");
          observerRef.current?.unobserve(e.target);
        }
      }),
      { threshold: 0.12 }
    );
    document.querySelectorAll(".reveal").forEach((el) => observerRef.current?.observe(el));
    return () => observerRef.current?.disconnect();
  }, []);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="bg-white text-gray-900 antialiased overflow-x-hidden">
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(-2deg); }
          50%       { transform: translateY(-12px) rotate(-2deg); }
        }
        .float { animation: float 5s ease-in-out infinite; }

        .gradient-text {
          background: linear-gradient(135deg, #7c3aed 0%, #a78bfa 60%, #38bdf8 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .reveal {
          opacity: 0;
          transform: translateY(24px);
          transition: opacity 0.6s ease, transform 0.6s ease;
        }
        .reveal-visible {
          opacity: 1;
          transform: translateY(0);
        }

        .phone {
          background: #111827;
          border-radius: 44px;
          padding: 14px;
          box-shadow:
            0 50px 100px -20px rgba(124,58,237,0.35),
            0 0 0 1px rgba(255,255,255,0.08);
          position: relative;
        }
        .phone::before {
          content: '';
          position: absolute;
          top: 18px;
          left: 50%;
          transform: translateX(-50%);
          width: 80px;
          height: 5px;
          background: #374151;
          border-radius: 3px;
        }
        .phone-screen {
          background: linear-gradient(170deg, #f5f3ff 0%, #ffffff 100%);
          border-radius: 32px;
          overflow: hidden;
          aspect-ratio: 9/19.5;
        }
      `}</style>

      {/* ── NAV ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-lg border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-brand-600 rounded-xl flex items-center justify-center shadow-md shadow-brand-200">
              <CameraIcon className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-gray-900 text-lg tracking-tight">SnapDrop</span>
          </div>

          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-500">
            <button onClick={() => scrollTo("how-it-works")} className="hover:text-gray-900 transition-colors">How it works</button>
            <button onClick={() => scrollTo("features")} className="hover:text-gray-900 transition-colors">Features</button>
            <button onClick={() => scrollTo("pricing")} className="hover:text-gray-900 transition-colors">Pricing</button>
          </div>

          <div className="flex items-center gap-3">
            <Link to="/admin/login" className="hidden sm:block text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
              Sign in
            </Link>
            <Link to="/admin/login" className="bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-all shadow-md shadow-brand-200 hover:-translate-y-px">
              Get started free
            </Link>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="pt-28 pb-24 px-5 sm:px-8 bg-gradient-to-br from-brand-50 via-white to-slate-50 overflow-hidden">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
          {/* Copy */}
          <div>
            <div className="inline-flex items-center gap-2 bg-brand-100 text-brand-700 text-xs font-bold px-3 py-1.5 rounded-full mb-7 tracking-wide uppercase">
              <span className="w-1.5 h-1.5 bg-brand-500 rounded-full animate-pulse" />
              No app download required
            </div>

            <h1 className="text-5xl sm:text-6xl font-black text-gray-900 leading-[1.08] tracking-tight mb-6">
              Every guest.<br />
              Every photo.<br />
              <span className="gradient-text">One gallery.</span>
            </h1>

            <p className="text-xl text-gray-500 mb-10 leading-relaxed max-w-lg">
              Display a QR code at your venue. Guests snap photos from any phone and they appear in your gallery instantly — no logins, no app downloads, no friction.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 mb-5">
              <Link
                to="/admin/login"
                className="bg-brand-600 hover:bg-brand-700 text-white font-bold px-7 py-4 rounded-2xl text-center transition-all shadow-lg shadow-brand-200 hover:shadow-brand-300 hover:-translate-y-0.5 text-base"
              >
                Create your first event →
              </Link>
              <button
                onClick={() => scrollTo("how-it-works")}
                className="bg-white hover:bg-gray-50 text-gray-700 font-semibold px-7 py-4 rounded-2xl text-center border border-gray-200 transition-colors text-base"
              >
                See how it works
              </button>
            </div>
            <p className="text-sm text-gray-400">Free to start · No credit card required</p>
          </div>

          {/* Phone mockup */}
          <div className="flex justify-center lg:justify-end">
            <div className="phone w-60 float">
              <div className="phone-screen px-4 pt-10 pb-4">
                <div className="flex items-center gap-2 mb-5">
                  <div className="w-7 h-7 bg-brand-600 rounded-lg flex items-center justify-center">
                    <CameraIcon className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-xs font-bold text-gray-900">SnapDrop</span>
                </div>
                <p className="text-xs font-bold text-gray-900 mb-0.5">Sarah & Jake's Wedding</p>
                <p className="text-xs text-gray-400 mb-4">Upload a photo ✨</p>
                <div className="grid grid-cols-3 gap-1 mb-4 rounded-xl overflow-hidden">
                  <div className="aspect-square bg-gradient-to-br from-pink-200 to-rose-400" />
                  <div className="aspect-square bg-gradient-to-br from-violet-300 to-brand-500" />
                  <div className="aspect-square bg-gradient-to-br from-amber-200 to-orange-400" />
                  <div className="aspect-square bg-gradient-to-br from-teal-200 to-emerald-400" />
                  <div className="aspect-square bg-gradient-to-br from-sky-200 to-blue-400" />
                  <div className="aspect-square bg-gradient-to-br from-fuchsia-200 to-purple-400" />
                </div>
                <button className="w-full bg-brand-600 text-white text-xs font-bold py-3 rounded-xl shadow-md shadow-brand-200">
                  📷  Take a photo
                </button>
                <div className="mt-3 flex items-center justify-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-green-400 rounded-full" />
                  <span className="text-xs text-gray-400">63 photos collected</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="max-w-6xl mx-auto mt-20 pt-12 border-t border-gray-100 grid grid-cols-2 sm:grid-cols-4 gap-8 text-center">
          {[
            { value: "500+", label: "Events created" },
            { value: "10k+", label: "Photos collected" },
            { value: "0",    label: "App downloads needed" },
            { value: "< 30s", label: "Setup time" },
          ].map((s) => (
            <div key={s.label}>
              <div className="text-3xl font-black text-gray-900">{s.value}</div>
              <div className="text-sm text-gray-400 mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how-it-works" className="py-28 px-5 sm:px-8 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16 reveal">
            <h2 className="text-4xl sm:text-5xl font-black text-gray-900 mb-4">Up and running in minutes</h2>
            <p className="text-xl text-gray-500 max-w-xl mx-auto">Three steps. Guests need nothing but their phone camera.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="reveal p-8 bg-gray-50 rounded-3xl">
              <div className="w-12 h-12 bg-brand-600 text-white rounded-2xl flex items-center justify-center font-black text-xl mb-6 shadow-md shadow-brand-200">1</div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Create your event</h3>
              <p className="text-gray-500 leading-relaxed">Add an event name and choose your guest limit. You get a unique link and QR code in under a minute.</p>
            </div>
            <div className="reveal p-8 bg-brand-600 rounded-3xl" style={{ transitionDelay: "0.1s" }}>
              <div className="w-12 h-12 bg-white text-brand-600 rounded-2xl flex items-center justify-center font-black text-xl mb-6 shadow-md">2</div>
              <h3 className="text-xl font-bold text-white mb-3">Guests scan & shoot</h3>
              <p className="text-brand-200 leading-relaxed">Display the QR code at your venue. Any guest scans it and starts uploading immediately — no login, no app, no friction.</p>
            </div>
            <div className="reveal p-8 bg-gray-50 rounded-3xl" style={{ transitionDelay: "0.2s" }}>
              <div className="w-12 h-12 bg-brand-600 text-white rounded-2xl flex items-center justify-center font-black text-xl mb-6 shadow-md shadow-brand-200">3</div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Download your gallery</h3>
              <p className="text-gray-500 leading-relaxed">Watch every photo roll in from every angle. Download the full collection as a ZIP whenever you're ready.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" className="py-28 px-5 sm:px-8 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16 reveal">
            <h2 className="text-4xl sm:text-5xl font-black text-gray-900 mb-4">Everything your event needs</h2>
            <p className="text-xl text-gray-500">Built for the moment — fast, reliable, beautiful on every device.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f, i) => (
              <div key={f.title} className="reveal p-7 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow" style={{ transitionDelay: `${i * 0.05}s` }}>
                <div className="w-11 h-11 bg-brand-100 rounded-xl flex items-center justify-center mb-5">
                  <f.Icon className="w-5 h-5 text-brand-600" />
                </div>
                <h3 className="font-bold text-gray-900 text-lg mb-2">{f.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section className="py-20 px-5 sm:px-8 bg-white border-t border-gray-100">
        <div className="max-w-4xl mx-auto grid md:grid-cols-3 gap-6">
          {TESTIMONIALS.map((t, i) => (
            <div key={t.name} className="reveal p-7 bg-gray-50 rounded-2xl" style={{ transitionDelay: `${i * 0.1}s` }}>
              <p className="text-gray-600 text-sm leading-relaxed mb-5">"{t.quote}"</p>
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 ${t.color} rounded-full flex items-center justify-center font-bold text-sm`}>{t.initial}</div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{t.name}</p>
                  <p className="text-xs text-gray-400">{t.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── PRICING ── */}
      <section id="pricing" className="py-28 px-5 sm:px-8 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16 reveal">
            <h2 className="text-4xl sm:text-5xl font-black text-gray-900 mb-4">Simple, event-based pricing</h2>
            <p className="text-xl text-gray-500">Pay per event. No monthly fees, no subscriptions.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 items-stretch">
            {PLANS.map((plan, i) => (
              <div
                key={plan.name}
                className={`reveal flex flex-col p-7 rounded-3xl ${plan.highlight ? "bg-brand-600" : "bg-white border border-gray-200"}`}
                style={{ transitionDelay: `${i * 0.1}s` }}
              >
                {plan.highlight && (
                  <div className="self-start mb-3 bg-white/20 text-white text-xs font-bold px-2.5 py-1 rounded-full">Most popular</div>
                )}
                <p className={`text-sm font-bold uppercase tracking-widest mb-2 ${plan.highlight ? "text-brand-300" : "text-gray-400"}`}>{plan.name}</p>
                <div className="flex items-end gap-1 mb-5">
                  <span className={`text-4xl font-black ${plan.highlight ? "text-white" : "text-gray-900"}`}>${plan.price}</span>
                  <span className={`text-sm mb-1.5 ${plan.highlight ? "text-brand-300" : "text-gray-400"}`}>/ event</span>
                </div>
                <ul className="space-y-3 text-sm mb-8 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className={`flex items-start gap-2 ${plan.highlight ? "text-brand-100" : "text-gray-600"}`}>
                      <span className={`mt-0.5 font-bold ${plan.highlight ? "text-white" : "text-brand-500"}`}>✓</span>
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  to="/admin/login"
                  className={`block w-full text-center font-semibold px-4 py-3 rounded-2xl transition-colors text-sm ${
                    plan.highlight
                      ? "bg-white text-brand-600 font-bold hover:bg-brand-50 shadow-lg"
                      : "bg-gray-100 hover:bg-gray-200 text-gray-800"
                  }`}
                >
                  Get started
                </Link>
              </div>
            ))}
          </div>
          <p className="text-center text-sm text-gray-400 mt-8">
            All plans include a free event to try · No credit card required to start
          </p>
        </div>
      </section>

      {/* ── CTA BANNER ── */}
      <section className="py-28 px-5 sm:px-8 bg-white">
        <div className="max-w-4xl mx-auto reveal">
          <div className="bg-gradient-to-br from-brand-600 via-violet-700 to-brand-800 rounded-3xl p-12 sm:p-16 text-center shadow-2xl shadow-brand-200/50">
            <h2 className="text-4xl sm:text-5xl font-black text-white mb-4 leading-tight">
              Ready to capture<br />every moment?
            </h2>
            <p className="text-xl text-brand-200 mb-10">Create your first event free. No credit card needed.</p>
            <Link
              to="/admin/login"
              className="inline-block bg-white text-brand-700 font-black px-10 py-4 rounded-2xl hover:bg-brand-50 transition-colors text-lg shadow-xl"
            >
              Start for free →
            </Link>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="bg-gray-950 text-gray-500 py-12 px-5 sm:px-8">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-brand-600 rounded-lg flex items-center justify-center">
              <CameraIcon className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-white">SnapDrop</span>
          </div>
          <nav className="flex gap-7 text-sm">
            <a href="#" className="hover:text-white transition-colors">Privacy</a>
            <a href="#" className="hover:text-white transition-colors">Terms</a>
            <a href="mailto:hello@snapdrop.app" className="hover:text-white transition-colors">Contact</a>
          </nav>
          <p className="text-sm">&copy; {new Date().getFullYear()} SnapDrop. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

// ── Icons ────────────────────────────────────────────────────────────────────

function CameraIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

// ── Data ─────────────────────────────────────────────────────────────────────

const FEATURES = [
  {
    title: "Instant QR codes",
    description: "Every event gets a unique QR code. Print it, display it on a screen, or text the link. Guests are uploading in seconds.",
    Icon: ({ className }: { className?: string }) => (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
      </svg>
    ),
  },
  {
    title: "Live photo gallery",
    description: "Watch photos pour in from every angle as your guests upload them. Every perspective of every moment, captured in real time.",
    Icon: ({ className }: { className?: string }) => (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    title: "One-click bulk download",
    description: "Download the complete collection as a ZIP with a single click, or select and share individual photos straight from your phone.",
    Icon: ({ className }: { className?: string }) => (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
      </svg>
    ),
  },
  {
    title: "No app required",
    description: "Guests upload from their mobile browser. iPhone, Android, anything. Zero downloads, zero accounts, zero friction at your event.",
    Icon: ({ className }: { className?: string }) => (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    title: "Co-admin invites",
    description: "Invite a second shooter, coordinator, or partner. Multiple admins share one gallery and manage the event together.",
    Icon: ({ className }: { className?: string }) => (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  {
    title: "Photos & videos",
    description: "Guests can share both photos and short videos. Capture the toasts, the first dance, and every candid moment between takes.",
    Icon: ({ className }: { className?: string }) => (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.36a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
      </svg>
    ),
  },
];

const TESTIMONIALS = [
  {
    quote: "We had 120 guests and ended up with over 400 photos. Didn't have to chase anyone for their camera roll — it just happened.",
    name: "Maria S.",
    role: "Wedding organizer",
    initial: "M",
    color: "bg-brand-100 text-brand-700",
  },
  {
    quote: "I use SnapDrop for every corporate event now. Setup takes two minutes and the photo collection is always complete.",
    name: "David K.",
    role: "Event coordinator",
    initial: "D",
    color: "bg-violet-100 text-violet-700",
  },
  {
    quote: "The QR code idea is genius. No one had to download anything. Even my grandparents could figure it out.",
    name: "Rachel T.",
    role: "Birthday party host",
    initial: "R",
    color: "bg-sky-100 text-sky-700",
  },
];

const PLANS = [
  {
    name: "Starter",
    price: 9,
    highlight: false,
    features: ["Up to 50 guests", "Unlimited photos", "QR code sharing", "ZIP download"],
  },
  {
    name: "Pro",
    price: 19,
    highlight: true,
    features: ["Up to 100 guests", "Unlimited photos & videos", "Co-admin invites", "QR code + print PDF", "ZIP download"],
  },
  {
    name: "Business",
    price: 39,
    highlight: false,
    features: ["Up to 150 guests", "Unlimited photos & videos", "Multiple co-admins", "Priority support"],
  },
  {
    name: "Unlimited",
    price: 59,
    highlight: false,
    features: ["Up to 200 guests", "Everything in Business", "Dedicated support", "Early feature access"],
  },
];
