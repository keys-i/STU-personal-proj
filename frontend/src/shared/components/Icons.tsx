import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & {
  size?: number;
  title?: string;
};

function SvgIcon({
  size = 18,
  title,
  children,
  ...rest
}: IconProps & { children: React.ReactNode }) {
  const ariaHidden = title ? undefined : true;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      role="img"
      aria-hidden={ariaHidden}
      {...(title ? { "aria-label": title } : {})}
      {...rest}
    >
      {title ? <title>{title}</title> : null}
      {children}
    </svg>
  );
}

export function PencilIcon(props: IconProps) {
  return (
    <SvgIcon title="Create" {...props}>
      <path
        fill="currentColor"
        d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zm2.92 2.33H5v-.92l8.56-8.56.92.92-8.56 8.56zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0L15.13 5.1l3.75 3.75 1.83-1.81z"
      />
    </SvgIcon>
  );
}

export function SearchIcon(props: IconProps) {
  return (
    <SvgIcon title="Search" {...props}>
      <path
        fill="currentColor"
        d="M10 18a8 8 0 1 1 5.29-14.03A8 8 0 0 1 10 18zm0-2a6 6 0 1 0-4.24-1.76A5.96 5.96 0 0 0 10 16zm9.71 5.29-4.1-4.1 1.41-1.41 4.1 4.1-1.41 1.41z"
      />
    </SvgIcon>
  );
}

export function SlidersIcon(props: IconProps) {
  return (
    <SvgIcon title="Filters" {...props}>
      <path
        fill="currentColor"
        d="M4 7h6a2 2 0 0 0 4 0h6v2h-6a2 2 0 0 0-4 0H4V7zm0 8h10a2 2 0 0 0 4 0h2v2h-2a2 2 0 0 0-4 0H4v-2z"
      />
    </SvgIcon>
  );
}

export function ThemeIcon(props: IconProps) {
  return (
    <SvgIcon title="Toggle theme" {...props}>
      <path
        fill="currentColor"
        d="M12 18a6 6 0 1 0 0-12v12zm0 4C6.48 22 2 17.52 2 12S6.48 2 12 2s10 4.48 10 10-4.48 10-10 10z"
      />
    </SvgIcon>
  );
}

export function RefreshIcon(props: IconProps) {
  return (
    <SvgIcon title="Refresh" {...props}>
      <path
        fill="currentColor"
        d="M12 6V3L8 7l4 4V8c2.76 0 5 2.24 5 5a5 5 0 0 1-9.58 2H5.26A7 7 0 0 0 19 13c0-3.87-3.13-7-7-7Z"
      />
    </SvgIcon>
  );
}

export function XIcon(props: IconProps) {
  return (
    <SvgIcon title="Close" {...props}>
      <path
        fill="currentColor"
        d="M18.3 5.71L12 12l6.3 6.29-1.41 1.42L10.59 13.4 4.29 19.71 2.88 18.29 9.17 12 2.88 5.71 4.29 4.29l6.3 6.3 6.29-6.3 1.42 1.42Z"
      />
    </SvgIcon>
  );
}
