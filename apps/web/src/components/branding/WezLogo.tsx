import React from "react";

type Props = {
	readonly className?: string;
	readonly variant?: "full" | "mark";
};

export const WezLogo = React.memo(
	({ className = "", variant = "full" }: Props) => {
		if (variant === "mark") {
			return (
				<svg viewBox="0 0 32 32" className={className} aria-hidden="true">
					<title>Wez</title>
					<path
						d="M5 10 L9 22 L13 14 L17 22 L21 14 L25 22 L29 10"
						stroke="currentColor"
						strokeWidth="3"
						fill="none"
						strokeLinecap="round"
						strokeLinejoin="round"
					/>
					<path d="M3 26 Q16 22 30 26" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
				</svg>
			);
		}
		return (
			<svg viewBox="0 0 120 48" className={className} aria-hidden="true">
				<title>Wez</title>
				<text
					x="60"
					y="32"
					textAnchor="middle"
					fontFamily="DM Sans Variable, ui-sans-serif"
					fontWeight="800"
					fontSize="32"
					fill="currentColor"
					letterSpacing="-0.02em"
				>
					Wez
				</text>
				<path
					d="M14 40 Q60 34 106 40"
					stroke="currentColor"
					strokeWidth="3"
					fill="none"
					strokeLinecap="round"
					opacity="0.85"
				/>
				<path d="M14 42 Q40 38 70 42" stroke="black" strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.6" />
			</svg>
		);
	},
	(p, n) => p.className === n.className && p.variant === n.variant,
);
WezLogo.displayName = "WezLogo";
