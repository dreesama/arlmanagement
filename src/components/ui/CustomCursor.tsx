import React, { useEffect, useState } from 'react';

export const CustomCursor: React.FC = () => {
  const [position, setPosition] = useState({ x: -100, y: -100 });
  const [isHovered, setIsHovered] = useState(false);
  const [isMouseDown, setIsMouseDown] = useState(false);

  useEffect(() => {
    let animationFrameId: number;

    const handleMouseMove = (e: MouseEvent) => {
      animationFrameId = requestAnimationFrame(() => {
        setPosition({ x: e.clientX, y: e.clientY });

        const target = e.target as HTMLElement | null;
        if (target) {
          const isClickable =
            target.tagName === 'BUTTON' ||
            target.tagName === 'A' ||
            target.tagName === 'INPUT' ||
            target.tagName === 'SELECT' ||
            target.tagName === 'TEXTAREA' ||
            target.getAttribute('role') === 'button' ||
            target.classList.contains('cursor-pointer') ||
            target.closest('button') !== null ||
            target.closest('a') !== null ||
            target.closest('.cursor-pointer') !== null;

          setIsHovered(isClickable);
        }
      });
    };

    const handleMouseDown = () => setIsMouseDown(true);
    const handleMouseUp = () => setIsMouseDown(false);

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  return (
    <div
      className="fixed top-0 left-0 pointer-events-none z-[9999] transition-transform duration-75 ease-out"
      style={{
        transform: `translate3d(${position.x}px, ${position.y}px, 0)`,
      }}
    >
      <div
        className={`relative transition-transform duration-150 ease-out ${
          isMouseDown ? 'scale-90' : 'scale-100'
        }`}
        style={{
          transformOrigin: isHovered ? '6px 2px' : '0px 0px',
        }}
      >
        {isHovered ? (
          /* Authentic Pixel-Perfect Figma / macOS Index Hand Pointer */
          <svg
            width="22"
            height="26"
            viewBox="0 0 22 26"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="filter drop-shadow-[0_4px_12px_rgba(0,0,0,0.3)] transition-all duration-150"
          >
            <path
              d="M7 1V13.5M7 1C6.17157 1 5.5 1.67157 5.5 2.5V11.5M7 1C7.82843 1 8.5 1.67157 8.5 2.5V12M11.5 6C10.6716 6 10 6.67157 10 7.5V12.5M11.5 6C12.3284 6 13 6.67157 13 7.5V13.5M16 8.5C15.1716 8.5 14.5 9.17157 14.5 10V14.5M16 8.5C16.8284 8.5 17.5 9.17157 17.5 10V16.5C17.5 20.6421 14.1421 24 10 24C6.65082 24 3.81688 21.7915 2.87688 18.5862L1.74264 14.7196C1.50166 13.897 2.15152 13.1066 3.00428 13.1558L5.94474 13.3256C6.73438 13.3711 7.44065 13.8529 7.74355 14.5833L8.5 16.4"
              fill="#FFFFFF"
              stroke="#1C1B18"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Elegant Crimson Accent Cuff Ring */}
            <circle cx="10" cy="20.5" r="1.5" fill="#C84B31" />
          </svg>
        ) : (
          /* Sleek Figma Vector Arrow Pointer */
          <svg
            width="20"
            height="24"
            viewBox="0 0 20 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="filter drop-shadow-[0_2px_8px_rgba(0,0,0,0.25)] transition-all duration-150"
          >
            <path
              d="M1 1L18 11.5L9.5 13.5L14 22.5L10.5 24L6 15L1 19.5V1Z"
              fill="#FFFFFF"
              stroke="#1C1B18"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
            <path
              d="M4 5.5L13.5 11.5L8.5 12.8L11.8 19.5L9.8 20.5L6.5 13.8L4 16V5.5Z"
              fill="#1C1B18"
            />
          </svg>
        )}
      </div>
    </div>
  );
};
