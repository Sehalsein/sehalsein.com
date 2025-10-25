import { useMemo } from "react";

export default function BatteryIcon(
	props: React.SVGProps<SVGSVGElement> & { percentage: number },
) {
	const { percentage, ...rest } = props;

	return (
		<svg
			width="28"
			height="14"
			viewBox="0 0 28 14"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			{...rest}
		>
			<title>Battery</title>
			<rect
				opacity="0.35"
				x="0.700012"
				y="1.10001"
				width="24"
				height="12"
				rx="3.8"
				stroke="white"
			/>
			<path
				opacity="0.4"
				d="M26.1 5.26668V9.26668C26.9047 8.9279 27.428 8.13981 27.428 7.26668C27.428 6.39354 26.9047 5.60545 26.1 5.26668Z"
				fill="white"
			/>
			<rect
				x="2.20001"
				y="2.60001"
				width={(percentage / 100) * 21}
				height="9"
				rx="2.5"
				fill="white"
			/>
		</svg>
	);
}
