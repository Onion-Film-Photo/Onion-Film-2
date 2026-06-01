'use client';
import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'motion/react';
import Image from 'next/image';

export default function HeroReveal() {
  const outerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: outerRef,
    offset: ['start start', 'end end'],
  });

  const f1Opacity = useTransform(scrollYProgress, [0, 0.40, 0.56], [1, 1, 0]);
  const f2Opacity = useTransform(scrollYProgress, [0.44, 0.62, 1.0], [0, 1, 1]);

  return (
    <div ref={outerRef} className="hr-outer" id="hr-reveal">
      <div className="hr-sticky">

        {/* ── Frame 1: Cinematic Quote ──────────────── */}
        <motion.div
          className="hr-screen hr-screen--cinematic"
          style={{ opacity: f1Opacity }}
        >
          <p className="cinematic__quote">
            Remember when every shot
            <br />
            was a moment to cherish?
          </p>
        </motion.div>

        {/* ── Frame 2: Film Strip ───────────────────── */}
        <motion.div
          className="hr-screen hr-screen--film"
          style={{ opacity: f2Opacity }}
        >
          <div className="hr-film-layout">
            <div className="hr-film-strip">
              <div className="hr-film-sprocket" />
              <div className="hr-film-frames">
                <div className="hr-film-frame">
                  <Image
                    src="/Potra-400.jpg"
                    alt=""
                    fill
                    sizes="180px"
                    className="hr-film-img"
                  />
                </div>
                <div className="hr-film-frame">
                  <Image
                    src="/Ilford.jpg"
                    alt=""
                    fill
                    sizes="180px"
                    className="hr-film-img"
                  />
                </div>
                <div className="hr-film-frame">
                  <Image
                    src="/Fuji-Pro-400.jpg"
                    alt=""
                    fill
                    sizes="180px"
                    className="hr-film-img"
                  />
                </div>
              </div>
              <div className="hr-film-sprocket" />
            </div>
            <p className="hr-film-text">
              Discover the joy of<br />capturing life, one<br />frame at a time.
            </p>
          </div>
        </motion.div>

      </div>
    </div>
  );
}
