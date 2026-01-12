type IconProps = { size?: number; className?: string; title?: string };

export function PencilIcon({
  size = 18,
  className,
  title = "Create",
}: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={className}
      role="img"
    >
      <title>{title}</title>
      <path
        fill="currentColor"
        d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zm2.92 2.33H5v-.92l8.56-8.56.92.92-8.56 8.56zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0L15.13 5.1l3.75 3.75 1.83-1.81z"
      />
    </svg>
  );
}

export function SearchIcon({
  size = 18,
  className,
  title = "Search",
}: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={className}
      role="img"
    >
      <title>{title}</title>
      <path
        fill="currentColor"
        d="M10 18a8 8 0 1 1 5.29-14.03A8 8 0 0 1 10 18zm0-2a6 6 0 1 0-4.24-1.76A5.96 5.96 0 0 0 10 16zm9.71 5.29-4.1-4.1 1.41-1.41 4.1 4.1-1.41 1.41z"
      />
    </svg>
  );
}

export function SlidersIcon({
  size = 18,
  className,
  title = "Filters",
}: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={className}
      role="img"
    >
      <title>{title}</title>
      <path
        fill="currentColor"
        d="M4 7h6a2 2 0 0 0 4 0h6v2h-6a2 2 0 0 0-4 0H4V7zm0 8h10a2 2 0 0 0 4 0h2v2h-2a2 2 0 0 0-4 0H4v-2z"
      />
    </svg>
  );
}

export function ThemeIcon({
  size = 18,
  className,
  title = "Toggle theme",
}: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={className}
      role="img"
    >
      <title>{title}</title>
      <path
        fill="currentColor"
        d="M12 18a6 6 0 1 0 0-12v12zm0 4C6.48 22 2 17.52 2 12S6.48 2 12 2s10 4.48 10 10-4.48 10-10 10z"
      />
    </svg>
  );
}
