import { useEffect } from "react";
import logoCircle from "@/assets/logo/Logo NISKALA Circle.svg";
import logoTypo from "@/assets/logo/Logo NISKALA Typografi.svg";
import { TikTokIcon } from "@/components/icons/TikTok";

export default function ComingSoonPage() {
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;1,400&family=Jost:wght@300;400;500&display=swap');

        .cs-page {
          position: fixed;
          inset: 0;
          width: 100vw;
          height: 100vh;
          height: 100dvh;
          max-height: 100dvh;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          background: #F6F1E7;
          color: #21170F;
          font-family: 'Jost', sans-serif;
          overflow: hidden;
          -webkit-font-smoothing: antialiased;
          z-index: 50;
        }

        /* Decorative rings */
        .cs-ring {
          position: absolute;
          border: 1px solid #D9BE8E;
          border-radius: 50%;
          pointer-events: none;
        }
        .cs-ring--one {
          width: 62vw;
          height: 62vw;
          max-width: 780px;
          max-height: 780px;
          top: -18vw;
          right: -20vw;
          opacity: 0.55;
        }
        .cs-ring--two {
          width: 34vw;
          height: 34vw;
          max-width: 420px;
          max-height: 420px;
          bottom: -10vw;
          left: -8vw;
          border-color: #C98089;
          opacity: 0.35;
        }

        /* Scattered dots */
        .cs-dot {
          position: absolute;
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #21170F;
          opacity: 0.08;
          pointer-events: none;
        }

        .cs-header {
          position: relative;
          z-index: 2;
          display: flex;
          justify-content: center;
          padding: clamp(20px, 3.5vh, 40px) 24px 0;
          flex-shrink: 0;
        }

        .cs-logo {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .cs-logo-circle {
          width: clamp(28px, 3.5vw, 36px);
          height: clamp(28px, 3.5vw, 36px);
          flex-shrink: 0;
        }
        .cs-logo-typo {
          height: clamp(15px, 2vw, 19px);
          width: auto;
        }

        .cs-main {
          position: relative;
          z-index: 2;
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 0 24px;
          min-height: 0;
        }

        .cs-content {
          max-width: 600px;
          width: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          opacity: 0;
          animation: cs-rise 1s ease-out 0.15s forwards;
        }

        @keyframes cs-rise {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        @media (prefers-reduced-motion: reduce) {
          .cs-content { animation: none; opacity: 1; }
        }

        .cs-tag {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-size: clamp(10px, 1.1vw, 12px);
          letter-spacing: 0.22em;
          color: #DB7F3B;
          background: rgba(219, 127, 59, 0.1);
          border: 1px solid rgba(219, 127, 59, 0.35);
          padding: 5px 14px;
          border-radius: 999px;
          margin-bottom: clamp(14px, 2.2vh, 24px);
        }
        .cs-tag::before {
          content: "";
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: #DB7F3B;
          display: block;
        }

        .cs-headline {
          font-family: 'Cormorant Garamond', serif;
          font-weight: 500;
          font-size: clamp(34px, 5.2vw, 68px);
          line-height: 1.08;
          color: #21170F;
          margin-bottom: clamp(12px, 1.8vh, 20px);
        }
        .cs-headline em {
          font-style: italic;
          color: #BB8F4E;
        }

        .cs-lede {
          font-size: clamp(13.5px, 1.3vw, 16.5px);
          line-height: 1.65;
          color: rgba(33, 23, 15, 0.72);
          max-width: 480px;
          margin-bottom: clamp(16px, 2.8vh, 32px);
          font-weight: 300;
        }

        .cs-divider {
          width: 1px;
          height: clamp(22px, 3vh, 36px);
          background: linear-gradient(to bottom, transparent, #BB8F4E, transparent);
          margin-bottom: clamp(14px, 2.2vh, 26px);
        }

        .cs-socials {
          display: flex;
          gap: 16px;
        }
        .cs-socials a {
          width: clamp(38px, 4.2vw, 44px);
          height: clamp(38px, 4.2vw, 44px);
          border-radius: 50%;
          border: 1px solid rgba(33, 23, 15, 0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #21170F;
          text-decoration: none;
          transition: border-color 0.25s ease, color 0.25s ease, background 0.25s ease;
        }
        .cs-socials a:hover {
          border-color: #BB8F4E;
          color: #BB8F4E;
          background: rgba(187, 143, 78, 0.08);
        }
        .cs-socials svg {
          width: 18px;
          height: 18px;
        }

        .cs-footer {
          position: relative;
          z-index: 2;
          text-align: center;
          padding: clamp(12px, 2vh, 22px) 24px;
          font-size: 11px;
          letter-spacing: 0.14em;
          color: rgba(33, 23, 15, 0.45);
          flex-shrink: 0;
        }
      `}</style>

      <div className="cs-page">
        {/* Decorative rings */}
        <div className="cs-ring cs-ring--one" />
        <div className="cs-ring cs-ring--two" />

        {/* Scattered dots */}
        <div className="cs-dot" style={{ top: "18%", left: "12%" }} />
        <div className="cs-dot" style={{ top: "32%", left: "22%" }} />
        <div className="cs-dot" style={{ top: "70%", right: "16%" }} />
        <div className="cs-dot" style={{ top: "60%", right: "26%" }} />
        <div className="cs-dot" style={{ top: "12%", right: "34%" }} />

        {/* Header / Logo */}
        <header className="cs-header">
          <div className="cs-logo">
            <img
              src={logoCircle}
              alt="Niskala logo mark"
              className="cs-logo-circle"
            />
            <img
              src={logoTypo}
              alt="NISKALA"
              className="cs-logo-typo"
            />
          </div>
        </header>

        {/* Main content */}
        <main className="cs-main">
          <div className="cs-content">
            <span className="cs-tag">Coming Soon</span>

            <h1 className="cs-headline">
              Keanggunan Rumah,<br />
              <em>segera</em> hadir.
            </h1>

            <p className="cs-lede">
              Sambut hari-harimu dengan ketenangan total. Niskala hadir membawa sentuhan homewear premium yang siap menemani momen santaimu — tetap anggun dan rapi, dari waktu rebahan hingga saat menyambut tamu di depan pintu.
            </p>

            <div className="cs-divider" />

            <div className="cs-socials">
              {/* Instagram */}
              <a
                href="https://instagram.com/niskala.wear"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram Niskala"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                  <rect x="3" y="3" width="18" height="18" rx="5" />
                  <circle cx="12" cy="12" r="4" />
                  <circle cx="17.2" cy="6.8" r="1" fill="currentColor" stroke="none" />
                </svg>
              </a>

              {/* TikTok */}
              <a
                href="https://tiktok.com/@niskala.wear.official"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="TikTok Niskala"
              >
                <TikTokIcon />
              </a>
            </div>
          </div>
        </main>

        <footer className="cs-footer">
          © 2026 NISKALA — PREMIUM HOMEWEAR
        </footer>
      </div>
    </>
  );
}
