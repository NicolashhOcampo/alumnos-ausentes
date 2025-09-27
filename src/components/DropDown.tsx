import { useState } from "react";

export const DropDown = ({ children, title }: { children: React.ReactNode, title?: string }) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="cursor-pointer w-full rounded-2xl border">
            <div onClick={() => setIsOpen(!isOpen)} className="cursor-pointer relative border p-4 w-full rounded-2xl">
                {title && <p className="text-lg font-bold"> {title}</p>} <div className={`absolute right-4 top-2 transform text-3xl transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}>↓</div>
            </div>
            <div
                className={`${isOpen ? 'h-auto p-4 overflow-x-auto' : 'h-0 p-0'} overflow-hidden transition-all duration-300`}
            >
                {children}
            </div>
        </div>
    )
}
