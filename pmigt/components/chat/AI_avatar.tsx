interface AiAvatarProps {
    size?: number; // 头像大小
    loading?: boolean;//加载中
}

export default function AiAvatar({ size = 40 ,loading = false}: AiAvatarProps) {
    return (
        <div className="relative" style={{ width: size, height: size }}>
            {/* 外层渐变环 */}
            <div
                className={`rounded-full p-[2px] bg-gradient-to-br
                from-[#00ffff] via-white to-[#ff0055] shadow-lg
                ${loading ? "animate-pulse-slow" : ""}`}
            >
                <img
                    src="/AI_avatar.png"
                    alt="AI头像"
                    className="w-full h-full rounded-full object-cover ring-2 ring-white"
                />
            </div>

            {/* 微光外发光 */}
            <div
                className={`absolute inset-0 blur-md opacity-40
                bg-gradient-to-br from-[#00ffff] to-[#ff0055] rounded-full
                ${loading ? "animate-glow" : ""}`}
            />
        </div>
    );
}
