export default function IconSidebar({
  className,
  onClick,
}: {
  className?: string;
  onClick?: () => void;
}) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="1em"
      height="1em"
      viewBox="0 0 24 24"
      className={className}
      onClick={onClick}
    >
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M6.416 4.767a2.65 2.65 0 0 0-2.65 2.65v8.832a2.65 2.65 0 0 0 2.65 2.65h1.461V4.767h-1.46Zm0-1.767A4.416 4.416 0 0 0 2 7.416v8.833a4.416 4.416 0 0 0 4.416 4.417h11.168A4.416 4.416 0 0 0 22 16.248V7.416A4.416 4.416 0 0 0 17.584 3zm3.228 1.767v14.132h7.94a2.65 2.65 0 0 0 2.65-2.65V7.416a2.65 2.65 0 0 0-2.65-2.65h-7.94Z"
        clipRule="evenodd"
      />
    </svg>
  );
}
