'use client';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

type Phase = 'start' | 'keep' | 'gone';

export default function ScrollPill() {
  const [phase, setPhase] = useState<Phase>('start');

  useEffect(() => {
    const reveal = document.getElementById('hr-reveal');
    if (!reveal) return;

    let revealTop = 0;
    let revealBottom = 0;

    const measure = () => {
      revealTop = window.scrollY + reveal.getBoundingClientRect().top;
      revealBottom = revealTop + reveal.offsetHeight;
    };

    const update = () => {
      const s = window.scrollY;
      const vh = window.innerHeight;
      if (s < revealTop - vh * 0.05) {
        setPhase('start');
      } else if (s < revealBottom - vh * 0.85) {
        setPhase('keep');
      } else {
        setPhase('gone');
      }
    };

    const onResize = () => { measure(); update(); };
    measure();
    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  return (
    <div className="scroll-pill-wrap" aria-hidden="true">
      <AnimatePresence>
        {phase !== 'gone' && (
          <motion.div
            className="scroll-pill"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
          >
            <AnimatePresence mode="wait">
              <motion.span
                key={phase}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ duration: 0.22 }}
              >
                {phase === 'start' ? 'Start scrolling' : 'Keep scrolling'}
              </motion.span>
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
