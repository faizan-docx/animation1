import { useLayoutEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import "./CardStack.css";

// Register GSAP plugins
gsap.registerPlugin(ScrollTrigger);

export const CardStackItem = ({ children, itemClassName = "" }) => (
  <div className={`card-stack-item ${itemClassName}`.trim()}>{children}</div>
);

const CardStack = ({
  children,
  className = "",
  onStackComplete,
}) => {
  const containerRef = useRef(null);
  const cardsRef = useRef([]);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const cards = Array.from(container.querySelectorAll(".card-stack-item"));
    cardsRef.current = cards;

    // Set up initial card styles
    cards.forEach((card, i) => {
      card.style.transform = `translateY(${i * 50}px) scale(${1 - i * 0.1})`;
      card.style.opacity = 1 - i * 0.2;
      card.style.filter = `blur(${i * 2}px)`;
      card.style.zIndex = cards.length - i;
    });

    // Create GSAP animations for the stack effect
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: container,
        start: "top center",
        end: "bottom center",
        scrub: 1,
        onUpdate: (self) => {
          if (self.progress >= 0.9) {
            onStackComplete?.();
          }
        }
      }
    });

    // Animate each card
    cards.forEach((card, i) => {
      const targetScale = 1 - i * 0.05;
      const targetY = i * 20;
      const targetOpacity = 1 - i * 0.1;
      const targetBlur = i * 1;

      tl.to(card, {
        scale: targetScale,
        y: targetY,
        opacity: targetOpacity,
        filter: `blur(${targetBlur}px)`,
        duration: 1,
        ease: "none"
      }, 0);
    });

    return () => {
      // Clean up ScrollTrigger instances
      ScrollTrigger.getAll().forEach(trigger => {
        if (trigger.vars.trigger === container) {
          trigger.kill();
        }
      });
    };
  }, [onStackComplete]);

  return (
    <div
      className={`card-stack-container ${className}`.trim()}
      ref={containerRef}
    >
      {children}
    </div>
  );
};

export default CardStack;
