import React from "react";

interface CustomButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
	children: React.ReactNode;
}

export const CustomButton: React.FC<CustomButtonProps> = ({
	children,
	className,
	...props
}) => {
	return (
		<button
			{...props}
			className={`w-12 h-12 rounded-full 
                backdrop-blur-md
                border border-white/20 
                flex items-center justify-center 
                transition-all shadow-lg hover:scale-110 
                ${className}`}
		>
			{children}
		</button>
	);
};
