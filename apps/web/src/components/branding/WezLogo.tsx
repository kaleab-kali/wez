import React from "react";

export const WEZ_LOGO_SRC = "/wez-logo-transparent.png" as const;

type Props = {
	readonly className?: string;
	readonly variant?: "full" | "mark";
};

export const WezLogo = React.memo(
	({ className = "" }: Props) => {
		const imageClassName = ["block object-contain", className].filter(Boolean).join(" ");

		return <img src={WEZ_LOGO_SRC} alt="" aria-hidden="true" className={imageClassName} draggable={false} />;
	},
	(previous, next) => previous.className === next.className && previous.variant === next.variant,
);
WezLogo.displayName = "WezLogo";
