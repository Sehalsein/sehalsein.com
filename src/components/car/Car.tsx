"use client";
import { useEffect, useState, useCallback, useRef } from "react";

function getRandomX() {
  if (typeof window === "undefined") return 0;
  const padding = 100;
  return padding + Math.random() * (window.innerWidth - 2 * padding);
}

function getRandomY() {
  if (typeof window === "undefined") return 0;
  const padding = 100;
  return padding + Math.random() * (window.innerHeight - 2 * padding);
}

function getRandomRotation() {
  return Math.random() * 360;
}

export default function Car() {
  // TODO: Animate car
  const [position] = useState({
    x: getRandomX(),
    y: getRandomY(),
  });
  const [rotation] = useState(getRandomRotation());
  const animationRef = useRef(null);

  // Cleanup animation frame on unmount
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  return (
    <button
      className="absolute transform-gpu transition-transform will-change-transform cursor-pointer"
      style={{
        transform: `translate(${position.x}px, ${position.y}px) rotate(${rotation}deg)`,
        transformOrigin: "center",
      }}
    >
      <img
        src="/car/f1.png"
        alt="Car"
        className="h-20 w-20"
        style={{
          transform: "translate(-50%, -50%)",
        }}
      />
      <img
        src="/car/smoke.gif"
        alt="Smoke"
        className="absolute bottom-0 h-5 w-5"
        style={{
          transform: "translate(-50%, -150%)",
        }}
      />
    </button>
  );
}
