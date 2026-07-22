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
        className={`relative transition-all duration-150 ease-out ${
          isMouseDown ? 'scale-90' : isHovered ? 'scale-125 -translate-x-2 -translate-y-2' : 'scale-100'
        }`}
      >
        {isHovered ? (
          /* Vector Hand Clicking Pointer SVG */
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="filter drop-shadow-[0_8px_16px_rgba(200,75,49,0.45)] transition-all duration-150"
          >
            <path
              d="M9 11V4.5C9 3.67157 9.67157 3 10.5 3C11.3284 3 12 3.67157 12 4.5V10.5M12 10.5V5.5C12 4.67157 12.6716 4 13.5 4C14.3284 4 15 4.67157 15 5.5V10.5M15 10.5V7C15 6.17157 15.6716 5.5 16.5 5.5C17.3284 5.5 18 6.17157 18 7V13.5C18 17.6421 14.6421 21 10.5 21C7.15082 21 4.31688 18.7915 3.37688 15.5862L2.24264 11.7196C2.00166 10.897 2.65152 10.1066 3.50428 10.1558L6.44474 10.3256C7.23438 10.3711 7.94065 10.8529 8.24355 11.5833L9 13.4"
              fill="#C84B31"
              stroke="#FFFFFF"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ) : (
          /* Default Figma SVG Arrow Pointer */
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="filter drop-shadow-md transition-all duration-150"
          >
            <path
              d="M5.65376 12.3673H5.46026L5.31717 12.4976L0.500001 16.8829V0.500001L18.4237 12.3673H5.65376Z"
              fill="#C84B31"
              stroke="#FFFFFF"
              strokeWidth="1.5"
            />
          </svg>
        )}
      </div>
    </div>
  );
};
