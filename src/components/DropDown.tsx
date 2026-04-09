import { useState } from "react";

export const DropDown = ({ children, title }: { children: React.ReactNode, title: string }) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="w-full border border-gray-400 relative">
            <div onClick={() => setIsOpen(!isOpen)} className="cursor-pointer flex gap-2 border border-gray-400 p-4 py-2 w-full">
                <p className="text-lg flex-1 font-semibold flex items-center">{title}</p> <div className={`transform text-lg transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}>↓</div>
            </div>
            <div
                className={`${isOpen ? 'h-auto border p-2 overflow-x-auto' : 'h-0 p-0'} absolute right-0 left-0 border-gray-400  bg-white max-h-50 overflow-hidden transition-all duration-300`}
            >
                {children}
            </div>
        </div>
    )
}
