"use client";
import Car from "@/src/components/car/Car";

export default function EasterEgg() {
  return (
    <div className="h-screen w-screen absolute top-0 left-0 hidden md:flex">
      <Car />
    </div>
  );
}
