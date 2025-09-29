import { useState } from "react";

export const DropDown = ({ children, title }: { children: React.ReactNode, title: string }) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="cursor-pointer w-full rounded-2xl border">
            <div onClick={() => setIsOpen(!isOpen)} className="cursor-pointer flex gap-2 border p-4 py-2 w-full rounded-2xl">
                <p className="text-lg flex-1 font-bold flex items-center">{title}</p> <div className={`transform text-3xl transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}>↓</div>
            </div>
            <div
                className={`${isOpen ? 'h-auto p-4 overflow-x-auto' : 'h-0 p-0'} overflow-hidden transition-all duration-300`}
            >
                {children}
            </div>
        </div>
    )
}
