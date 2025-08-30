// CREDIT
// Component inspired by @BalintFerenczy on X
// https://codepen.io/BalintFerenczy/pen/KwdoyEN

import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
} from "react";

function hexToRgba(hex, alpha = 1) {
  if (!hex) return `rgba(0,0,0,${alpha})`;
  let h = hex.replace("#", "");
  if (h.length === 3) {
    h = h
      .split("")
      .map((c) => c + c)
      .join("");
  }
  const int = parseInt(h, 16);
  const r = (int >> 16) & 255;
  const g = (int >> 8) & 255;
  const b = int & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

const ElectricBorder = ({
  children,
  color = "#5227FF",
  speed = 1,
  chaos = 1,
  thickness = 2,
  className,
  style,
}) => {
  const rawId = useId().replace(/[:]/g, "");
  const filterId = `turbulent-displace-${rawId}`;
  const svgRef = useRef(null);
  const rootRef = useRef(null);
  const strokeRef = useRef(null);

  const updateAnim = () => {
    const svg = svgRef.current;
    const host = rootRef.current;
    if (!svg || !host) return;

    if (strokeRef.current) {
      strokeRef.current.style.filter = `url(#${filterId})`;
    }

    const width = Math.max(
      1,
      Math.round(host.clientWidth || host.getBoundingClientRect().width || 0)
    );
    const height = Math.max(
      1,
      Math.round(host.clientHeight || host.getBoundingClientRect().height || 0)
    );

    const dyAnims = Array.from(
      svg.querySelectorAll(
        'feOffset > animate[attributeName="dy"]'
      )
    );
    if (dyAnims.length >= 2) {
      dyAnims[0].setAttribute("values", `${height}; 0`);
      dyAnims[1].setAttribute("values", `0; -${height}`);
      // Handle diagonal animations
      if (dyAnims.length >= 4) {
        dyAnims[2].setAttribute("values", `${Math.max(width, height)}; -${Math.max(width, height)}`);
        dyAnims[3].setAttribute("values", `-${Math.max(width, height)}; ${Math.max(width, height)}`);
      }
    }

    const dxAnims = Array.from(
      svg.querySelectorAll(
        'feOffset > animate[attributeName="dx"]'
      )
    );
    if (dxAnims.length >= 2) {
      dxAnims[0].setAttribute("values", `${width}; 0`);
      dxAnims[1].setAttribute("values", `0; -${width}`);
      // Handle diagonal animations
      if (dxAnims.length >= 4) {
        dxAnims[2].setAttribute("values", `${Math.max(width, height)}; -${Math.max(width, height)}`);
        dxAnims[3].setAttribute("values", `-${Math.max(width, height)}; ${Math.max(width, height)}`);
      }
    }

    const baseDur = 6;
    const dur = Math.max(0.001, baseDur / (speed || 1));
    [...dyAnims, ...dxAnims].forEach((a) => a.setAttribute("dur", `${dur}s`));

    const disp = svg.querySelector("feDisplacementMap");
    if (disp) disp.setAttribute("scale", String(30 * (chaos || 1)));

    const filterEl = svg.querySelector(
      `#${CSS.escape(filterId)}`
    );
    if (filterEl) {
      filterEl.setAttribute("x", "-200%");
      filterEl.setAttribute("y", "-200%");
      filterEl.setAttribute("width", "500%");
      filterEl.setAttribute("height", "500%");
    }

    requestAnimationFrame(() => {
      [...dyAnims, ...dxAnims].forEach((a) => {
        if (typeof a.beginElement === "function") {
          try {
            a.beginElement();
          } catch {
            console.warn(
              "ElectricBorder: beginElement failed"
            );
          }
        }
      });
    });
  };

  useEffect(() => {
    updateAnim();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [speed, chaos]);

  useLayoutEffect(() => {
    if (!rootRef.current) return;
    const ro = new ResizeObserver(() => updateAnim());
    ro.observe(rootRef.current);
    updateAnim();
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const inheritRadius = {
    borderRadius: style?.borderRadius ?? "inherit",
  };

  const strokeStyle = {
    ...inheritRadius,
    borderWidth: thickness,
    borderStyle: "solid",
    borderColor: color,
    margin: `-${thickness}px`,
  };

  const glow1Style = {
    ...inheritRadius,
    borderWidth: thickness,
    borderStyle: "solid",
    borderColor: hexToRgba(color, 0.6),
    filter: `blur(${0.5 + thickness * 0.25}px)`,
    opacity: 0.6,
    margin: `-${thickness}px`,
  };

  const glow2Style = {
    ...inheritRadius,
    borderWidth: thickness,
    borderStyle: "solid",
    borderColor: color,
    filter: `blur(${2 + thickness * 0.5}px)`,
    opacity: 0.4,
    margin: `-${thickness}px`,
  };

  const glow3Style = {
    ...inheritRadius,
    borderWidth: thickness * 1.5,
    borderStyle: "solid",
    borderColor: hexToRgba(color, 0.3),
    filter: `blur(${4 + thickness}px)`,
    opacity: 0.3,
    margin: `-${thickness * 1.5}px`,
  };

  const bgGlowStyle = {
    ...inheritRadius,
    transform: "scale(1.04)",
    filter: "blur(24px)",
    opacity: 0.2,
    zIndex: -1,
    background: `linear-gradient(-30deg, ${hexToRgba(color, 0.6)}, transparent, ${hexToRgba(color, 0.4)})`,
  };

  return (
    <div
      ref={rootRef}
      className={"relative isolate " + (className ?? "")}
      style={style}
    >
      <svg
        ref={svgRef}
        className="fixed -left-[10000px] -top-[10000px] w-[10px] h-[10px] opacity-[0.001] pointer-events-none"
        aria-hidden
        focusable="false"
      >
        <defs>
          <filter
            id={filterId}
            colorInterpolationFilters="sRGB"
            x="-20%"
            y="-20%"
            width="140%"
            height="140%"
          >
            {/* Top and Bottom animations */}
            <feTurbulence
              type="turbulence"
              baseFrequency="0.025"
              numOctaves="8"
              result="noiseTop"
              seed="1"
            />
            <feOffset in="noiseTop" dx="0" dy="0" result="offsetNoiseTop">
              <animate
                attributeName="dy"
                values="700; 0"
                dur="6s"
                repeatCount="indefinite"
                calcMode="linear"
              />
            </feOffset>

            <feTurbulence
              type="turbulence"
              baseFrequency="0.025"
              numOctaves="8"
              result="noiseBottom"
              seed="2"
            />
            <feOffset in="noiseBottom" dx="0" dy="0" result="offsetNoiseBottom">
              <animate
                attributeName="dy"
                values="0; -700"
                dur="6s"
                repeatCount="indefinite"
                calcMode="linear"
              />
            </feOffset>

            {/* Left and Right animations */}
            <feTurbulence
              type="turbulence"
              baseFrequency="0.025"
              numOctaves="8"
              result="noiseLeft"
              seed="3"
            />
            <feOffset in="noiseLeft" dx="0" dy="0" result="offsetNoiseLeft">
              <animate
                attributeName="dx"
                values="490; 0"
                dur="6s"
                repeatCount="indefinite"
                calcMode="linear"
              />
            </feOffset>

            <feTurbulence
              type="turbulence"
              baseFrequency="0.025"
              numOctaves="8"
              result="noiseRight"
              seed="4"
            />
            <feOffset in="noiseRight" dx="0" dy="0" result="offsetNoiseRight">
              <animate
                attributeName="dx"
                values="0; -490"
                dur="6s"
                repeatCount="indefinite"
                calcMode="linear"
              />
            </feOffset>

            {/* Diagonal animations for corners */}
            <feTurbulence
              type="turbulence"
              baseFrequency="0.03"
              numOctaves="6"
              result="noiseDiag1"
              seed="5"
            />
            <feOffset in="noiseDiag1" dx="0" dy="0" result="offsetNoiseDiag1">
              <animate
                attributeName="dx"
                values="350; -350"
                dur="8s"
                repeatCount="indefinite"
                calcMode="linear"
              />
              <animate
                attributeName="dy"
                values="350; -350"
                dur="8s"
                repeatCount="indefinite"
                calcMode="linear"
              />
            </feOffset>

            <feTurbulence
              type="turbulence"
              baseFrequency="0.03"
              numOctaves="6"
              result="noiseDiag2"
              seed="6"
            />
            <feOffset in="noiseDiag2" dx="0" dy="0" result="offsetNoiseDiag2">
              <animate
                attributeName="dx"
                values="-350; 350"
                dur="8s"
                repeatCount="indefinite"
                calcMode="linear"
              />
              <animate
                attributeName="dy"
                values="-350; 350"
                dur="8s"
                repeatCount="indefinite"
                calcMode="linear"
              />
            </feOffset>

            {/* Combine all animations */}
            <feComposite in="offsetNoiseTop" in2="offsetNoiseBottom" result="verticalNoise" />
            <feComposite in="offsetNoiseLeft" in2="offsetNoiseRight" result="horizontalNoise" />
            <feComposite in="offsetNoiseDiag1" in2="offsetNoiseDiag2" result="diagonalNoise" />
            <feBlend
              in="verticalNoise"
              in2="horizontalNoise"
              mode="color-dodge"
              result="combinedLinear"
            />
            <feBlend
              in="combinedLinear"
              in2="diagonalNoise"
              mode="screen"
              result="combinedNoise"
            />
            <feDisplacementMap
              in="SourceGraphic"
              in2="combinedNoise"
              scale="30"
              xChannelSelector="R"
              yChannelSelector="B"
            />
          </filter>
        </defs>
      </svg>

      <div
        className="absolute inset-0 pointer-events-none"
        style={inheritRadius}
      >
        <div
          ref={strokeRef}
          className="absolute inset-0 box-border"
          style={strokeStyle}
        />
        <div className="absolute inset-0 box-border" style={glow1Style} />
        <div className="absolute inset-0 box-border" style={glow2Style} />
        <div className="absolute inset-0 box-border" style={glow3Style} />
        <div className="absolute inset-0" style={bgGlowStyle} />
      </div>

      <div className="relative" style={inheritRadius}>
        {children}
      </div>
    </div>
  );
};

export default ElectricBorder;