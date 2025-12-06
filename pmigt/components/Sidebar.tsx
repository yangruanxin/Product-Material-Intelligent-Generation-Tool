import Link from 'next/link';
import { Lightbulb, Folder, Bell, Settings, Aperture } from 'lucide-react';
import AI_avatar from './chat/AI_avatar';

// 导航链接数据
const navItems = [
    { name: '灵感', href: '/home', icon: Lightbulb },
    { name: '生成', href: '/generate', icon: Aperture }, 
    { name: '资产库', href: '/assets', icon: Folder },
];

export function Sidebar() {
    return (
        <div className="fixed top-0 left-0 h-screen w-20 bg-white flex flex-col items-center py-4 z-50">
            {/* 顶部 Logo */}
            <div className="mb-8">
                <AI_avatar/>
            </div>

            {/* 主要导航 */}
            <nav className="flex flex-col space-y-4">
                {navItems.map((item) => (
                    <Link href={item.href} key={item.name} className="flex flex-col items-center justify-center p-2 rounded-lg text-gray-600 hover:bg-blue-50 hover:text-blue-600 transition-colors group">
                        <item.icon className="w-6 h-6" />
                        <span className="text-xs mt-1">{item.name}</span>
                    </Link>
                ))}
            </nav>

            {/* 底部工具 */}
            <div className="mt-auto flex flex-col space-y-4 pt-4">
                <Settings className="w-6 h-6 text-gray-500 hover:text-gray-700 cursor-pointer" />
            </div>
        </div>
    );
}