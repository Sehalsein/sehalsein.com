"use client";

import BatteryIcon from "@/src/components/icons/BatteryIcon";

// Get system battery percentage
export default function BatteryStatusView() {
	return <BatteryIcon percentage={100} />;
}
