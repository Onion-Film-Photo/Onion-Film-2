'use client';
import { motion } from 'motion/react';

const ease: [number, number, number, number] = [0.16, 1, 0.3, 1];

const fadeUp = (delay: number) => ({
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.7, ease, delay },
});

export default function Hero() {
  return (
    <section className="hero" id="hero">
      <div className="hero__content">
        <motion.p className="hero__eyebrow" {...fadeUp(0.2)}>
          Disposable camera · Intentional coverage
        </motion.p>
        <motion.h1 className="hero__headline" {...fadeUp(0.3)}>
          Your guests captured 300 photos.
          <br />
          <em>You saw 12.</em>
        </motion.h1>
        <motion.p className="hero__sub" {...fadeUp(0.4)}>
          Onion assigns every guest a role before your event begins. No moment
          goes undocumented. No moment is left to chance.
        </motion.p>
        <motion.div className="hero__ctas" {...fadeUp(0.5)}>
          <a className="btn btn--primary" href="/host/signup">
            Create Your Event
          </a>
          <a className="btn btn--ghost" href="#how-it-works">
            See How It Works
          </a>
        </motion.div>
        <motion.p className="hero__footnote" {...fadeUp(0.6)}>
          Free to start &nbsp;·&nbsp; No app download for guests &nbsp;·&nbsp;
          Takes 3 minutes
        </motion.p>
      </div>
    </section>
  );
}
