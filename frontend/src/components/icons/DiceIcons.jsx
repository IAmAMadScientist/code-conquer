import React from "react";

export function D6Icon({ value, className, ...props }) {
  // A clean, isometric-style cube projection
  return (
    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
      <defs>
        <linearGradient id="d6_face_top" x1="32" y1="2" x2="32" y2="34">
          <stop stopColor="#4f46e5" />
          <stop offset="1" stopColor="#4338ca" />
        </linearGradient>
        <linearGradient id="d6_face_left" x1="2" y1="18" x2="32" y2="34">
          <stop stopColor="#3730a3" />
          <stop offset="1" stopColor="#312e81" />
        </linearGradient>
        <linearGradient id="d6_face_right" x1="62" y1="18" x2="32" y2="34">
          <stop stopColor="#312e81" />
          <stop offset="1" stopColor="#1e1b4b" />
        </linearGradient>
        <filter id="d6_glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>
      
      <g filter="url(#d6_glow)">
        {/* Isometric Cube Shape */}
        <path d="M32 2L60 18V50L32 62L4 50V18L32 2Z" fill="#1e1b4b" stroke="#6366f1" strokeWidth="2" strokeLinejoin="round" />
        <path d="M32 2L32 34" stroke="#6366f1" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M32 34L60 18" stroke="#6366f1" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M32 34L4 18" stroke="#6366f1" strokeWidth="1.5" strokeLinecap="round" />
        
        {/* Faces Fills (Semi-transparent for glass effect) */}
        <path d="M4 18L32 34L32 62L4 50V18Z" fill="url(#d6_face_left)" fillOpacity="0.8" />
        <path d="M60 18L32 34L32 62L60 50V18Z" fill="url(#d6_face_right)" fillOpacity="0.8" />
        <path d="M32 2L60 18L32 34L4 18L32 2Z" fill="url(#d6_face_top)" fillOpacity="0.9" />
      </g>

      {/* Pips (Dynamic based on value) */}
      <Pips value={value} />
    </svg>
  );
}

function Pips({ value }) {
  // Simplified pip logic for the "Top" face which is most visible
  // We place pips in the center face area
  const fill = "#e0e7ff";
  const shadow = "rgba(0,0,0,0.3)";
  
  // Pip coordinates for the top isometric face
  const c = { x: 32, y: 18 };
  const tl = { x: 20, y: 12 };
  const tr = { x: 44, y: 12 };
  const bl = { x: 20, y: 24 };
  const br = { x: 44, y: 24 };
  const ml = { x: 20, y: 18 };
  const mr = { x: 44, y: 18 };

  const r = 3;

  const P = ({ x, y }) => (
    <>
      <circle cx={x} cy={y+1} r={r} fill={shadow} />
      <circle cx={x} cy={y} r={r} fill={fill} />
    </>
  );

  switch (Number(value)) {
    case 1: return <P {...c} />;
    case 2: return <><P {...tl} /><P {...br} /></>;
    case 3: return <><P {...tl} /><P {...c} /><P {...br} /></>;
    case 4: return <><P {...tl} /><P {...tr} /><P {...bl} /><P {...br} /></>;
    case 5: return <><P {...tl} /><P {...tr} /><P {...c} /><P {...bl} /><P {...br} /></>;
    case 6: return <><P {...tl} /><P {...tr} /><P {...ml} /><P {...mr} /><P {...bl} /><P {...br} /></>;
    default: return <P {...c} />; // ?
  }
}

export function D20Icon({ value, className, ...props }) {
  const isRolling = value === null || value === "…";
  
  return (
    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
      <defs>
        {/* Deep, rich gradients for a 3D feel */}
        <linearGradient id="d20_face_center" x1="32" y1="14" x2="32" y2="46">
          <stop stopColor="#4f46e5" />
          <stop offset="1" stopColor="#3730a3" />
        </linearGradient>
        <linearGradient id="d20_face_top" x1="32" y1="2" x2="32" y2="14">
          <stop stopColor="#6366f1" />
          <stop offset="1" stopColor="#4f46e5" />
        </linearGradient>
        <filter id="d20_glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>
      
      <g filter="url(#d20_glow)">
        {/* Main Hexagonal Silhouette */}
        <path d="M32 2L58 16V48L32 62L6 48V16L32 2Z" fill="#0f172a" stroke="#6366f1" strokeWidth="1.5" strokeLinejoin="round" />
        
        {/* Facet Shading */}
        {/* Top Triangle */}
        <path d="M32 2L58 16L6 16L32 2Z" fill="url(#d20_face_top)" fillOpacity="0.4" />
        {/* Center Hexagon/Triangle area */}
        <path d="M32 46L58 16L6 16L32 46Z" fill="url(#d20_face_center)" fillOpacity="0.6" />
        {/* Side Facets */}
        <path d="M6 16L32 46L6 48V16Z" fill="#1e1b4b" fillOpacity="0.5" />
        <path d="M58 16L32 46L58 48V16Z" fill="#1e1b4b" fillOpacity="0.5" />
        {/* Bottom Facets */}
        <path d="M6 48L32 46L32 62L6 48Z" fill="#312e81" fillOpacity="0.3" />
        <path d="M58 48L32 46L32 62L58 48Z" fill="#312e81" fillOpacity="0.3" />

        {/* Crisp Edge Lines */}
        <path d="M32 2L32 16M32 16L6 16M32 16L58 16M32 16L32 46M6 16L32 46M58 16L32 46M6 48L32 46M58 48L32 46M32 46L32 62" stroke="#818cf8" strokeWidth="1" strokeLinecap="round" strokeOpacity="0.4" />
      </g>

      {/* Result Value */}
      <text 
        x="32" 
        y="33" 
        fill="#ffffff" 
        fontSize={isRolling ? "10" : "16"} 
        fontWeight="900" 
        textAnchor="middle" 
        dominantBaseline="middle" 
        style={{ 
          textShadow: "0 0 10px rgba(99,102,241,0.8), 0 2px 4px rgba(0,0,0,0.5)",
          fontFamily: "'Inter', sans-serif"
        }}
      >
        {value || (isRolling ? "ROLL" : "?")}
      </text>
    </svg>
  );
}
