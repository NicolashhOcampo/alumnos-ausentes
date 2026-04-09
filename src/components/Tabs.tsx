import React, { useState } from "react"

export const Tabs = ({ tabsName, content }: { tabsName: string[], content: React.ReactNode[] }) => {
    const [activeTab, setActiveTab] = useState(0)

    return (
        <div className="w-full rounded-xl border p-4 h-full flex flex-col">
            <div className="flex flex-row overflow-x-auto ">
                {tabsName.map((tab, index) => (
                    <div key={index} className={`w-50 p-2 text-center cursor-pointer ${index === activeTab ? 'text-blue-600 border-b-2 border-blue-600' : ''}`}
                        onClick={() => setActiveTab(index)}>
                        {tab}
                    </div>
                ))}
            </div>

            <div className="w-full flex-1 border-t border-gray-300 p-2 overflow-auto">
                {content[activeTab]}
            </div>
        </div>
    )
}
