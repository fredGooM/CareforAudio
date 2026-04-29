export default function Logo({ size = 60 }: { size?: number }) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 100 100"
            xmlns="http://www.w3.org/2000/svg"
            style={{ borderRadius: '12px', display: 'block', flexShrink: 0 }}
        >
            <rect width="100" height="100" fill="#f5b7b1" />
            <path d="M 72 28 A 32 32 0 1 0 72 72" fill="none" stroke="#FFFFFF" strokeWidth={18} strokeLinecap="butt" />
            <circle cx="50" cy="50" r="10" fill="#ef4444" />
        </svg>
    );
}
