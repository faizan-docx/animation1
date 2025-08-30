import React, {
  Children,
  cloneElement,
  forwardRef,
  isValidElement,
  useEffect,
  useMemo,
  useRef,
} from "react";
import gsap from "gsap";
import "./CardSwap.css";

export const Card = forwardRef(
  ({ customClass, ...rest }, ref) => (
    <div
      ref={ref}
      {...rest}
      className={`card ${customClass ?? ""} ${rest.className ?? ""}`.trim()}
    />
  )
);
Card.displayName = "Card";

const makeSlot = (
  i,
  distX,
  distY,
  total
) => {
  // Calculate height scale - front card is 100%, each card behind gets smaller
  const heightScale = 1 - (i * 0.12); // Reduce height by 12% for each card behind
  const minScale = 0.5; // Minimum height scale (50%)
  const finalScale = Math.max(heightScale, minScale);
  
  return {
    x: 0, // Keep all cards centered horizontally
    y: -i * distY, // Only stack vertically
    z: 0, // No 3D depth
    zIndex: total - i,
    scaleY: finalScale, // Add height scaling
  };
};
const placeNow = (el, slot) =>
  gsap.set(el, {
    x: slot.x,
    y: slot.y,
    z: slot.z,
    xPercent: -50,
    yPercent: -50,
    rotation: 0, // No rotation
    skewY: 0, // No skew
    scaleY: slot.scaleY, // Apply height scaling
    transformOrigin: "center center",
    zIndex: slot.zIndex,
    force3D: false, // Disable 3D transforms
  });

const CardSwap = ({
  width = 500,
  height = 400,
  cardDistance = 60,
  verticalDistance = 70,
  delay = 5000,
  pauseOnHover = false,
  onCardClick,
  easing = "elastic",
  children,
}) => {
  const config =
    easing === "elastic"
      ? {
        ease: "elastic.out(0.6,0.9)",
        durDrop: 2,
        durMove: 2,
        durReturn: 2,
        promoteOverlap: 0.9,
        returnDelay: 0.05,
      }
      : {
        ease: "power1.inOut",
        durDrop: 0.8,
        durMove: 0.8,
        durReturn: 0.8,
        promoteOverlap: 0.45,
        returnDelay: 0.2,
      };

  const childArr = useMemo(
    () => Children.toArray(children),
    [children]
  );
  const refs = useMemo(
    () => childArr.map(() => React.createRef()),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [childArr.length]
  );

  const order = useRef(
    Array.from({ length: childArr.length }, (_, i) => i)
  );

  const tlRef = useRef(null);
  const intervalRef = useRef();
  const container = useRef(null);

  useEffect(() => {
    const total = refs.length;
    
    // Wait for next tick to ensure refs are ready
    const initializeCards = () => {
      const allRefsReady = refs.every(ref => ref.current);
      if (!allRefsReady) {
        console.log('Refs not ready, retrying...');
        setTimeout(initializeCards, 50);
        return;
      }
      
      console.log('All refs ready, initializing cards...');
      refs.forEach((r, i) =>
        placeNow(
          r.current,
          makeSlot(i, cardDistance, verticalDistance, total)
        )
      );
      
      // Start animation after cards are positioned
      startSwapAnimation();
    };

    const swap = () => {
      if (order.current.length < 2) {
        console.log('Not enough cards to swap');
        return;
      }

      const [front, ...rest] = order.current;
      const elFront = refs[front].current;
      
      if (!elFront) {
        console.log('Front element not found');
        return;
      }
      
      const tl = gsap.timeline();
      tlRef.current = tl;
      
      console.log('Starting card swap animation...');

      tl.to(elFront, {
        y: "+=500",
        duration: config.durDrop,
        ease: config.ease,
      });

      tl.addLabel("promote", `-=${config.durDrop * config.promoteOverlap}`);
      rest.forEach((idx, i) => {
        const el = refs[idx].current;
        const slot = makeSlot(i, cardDistance, verticalDistance, refs.length);
        tl.set(el, { zIndex: slot.zIndex }, "promote");
        tl.to(
          el,
          {
            x: slot.x,
            y: slot.y,
            z: slot.z,
            rotation: 0,
            skewY: 0,
            scaleY: slot.scaleY,
            duration: config.durMove,
            ease: config.ease,
          },
          `promote+=${i * 0.15}`
        );
      });

      const backSlot = makeSlot(
        refs.length - 1,
        cardDistance,
        verticalDistance,
        refs.length
      );
      tl.addLabel("return", `promote+=${config.durMove * config.returnDelay}`);
      tl.call(
        () => {
          gsap.set(elFront, { zIndex: backSlot.zIndex });
        },
        undefined,
        "return"
      );
      tl.to(
        elFront,
        {
          x: backSlot.x,
          y: backSlot.y,
          z: backSlot.z,
          rotation: 0,
          skewY: 0,
          scaleY: backSlot.scaleY,
          duration: config.durReturn,
          ease: config.ease,
        },
        "return"
      );

      tl.call(() => {
        order.current = [...rest, front];
      });
    };

    const startSwapAnimation = () => {
      console.log('Starting swap animation...');
      // Start first swap immediately
      setTimeout(() => {
        swap();
        // Then set up interval for subsequent swaps
        intervalRef.current = setInterval(swap, delay);
        console.log(`Interval set for ${delay}ms`);
      }, 1000); // Wait 1 second before first swap
    };
    
    // Initialize cards
    initializeCards();

    if (pauseOnHover) {
      const node = container.current;
      const pause = () => {
        tlRef.current?.pause();
        clearInterval(intervalRef.current);
      };
      const resume = () => {
        tlRef.current?.play();
        intervalRef.current = window.setInterval(swap, delay);
      };
      node.addEventListener("mouseenter", pause);
      node.addEventListener("mouseleave", resume);
      return () => {
        node.removeEventListener("mouseenter", pause);
        node.removeEventListener("mouseleave", resume);
        clearInterval(intervalRef.current);
      };
    }
    return () => {
      clearInterval(intervalRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    refs,
    cardDistance,
    verticalDistance,
    delay,
    pauseOnHover,
    easing,
  ]);

  const rendered = childArr.map((child, i) =>
    isValidElement(child)
      ? cloneElement(child, {
        key: i,
        ref: refs[i],
        style: { width, height, ...(child.props.style ?? {}) },
        onClick: (e) => {
          child.props.onClick?.(e);
          onCardClick?.(i);
        },
      }) : child
  );

  return (
    <div
      ref={container}
      className="card-swap-container"
      style={{ width, height }}
    >
      {rendered}
    </div>
  );
};

export default CardSwap;