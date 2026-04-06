import { useEffect, useState } from "react";
import { getAvatarInitials, resolveAvatarUrl } from "../lib/avatarDisplay";

type Size = "sm" | "md";

const sizeClasses: Record<
  Size,
  { wrap: string; text: string }
> = {
  sm: {
    wrap: "h-7 w-7 min-h-[1.75rem] min-w-[1.75rem]",
    text: "text-[10px]",
  },
  md: {
    wrap: "h-9 w-9 min-h-[2.25rem] min-w-[2.25rem]",
    text: "text-[12px]",
  },
};

type Props = {
  name: string;
  avatarUrl?: string | null;
  size?: Size;
  className?: string;
};

/**
 * Fixed-size avatar: photo when URL loads, otherwise initials on gradient.
 * Image is layered with a short opacity transition to reduce flicker.
 */
export function ProfileAvatarCircle({
  name,
  avatarUrl,
  size = "md",
  className = "",
}: Props) {
  const resolved = resolveAvatarUrl(avatarUrl);
  const initials = getAvatarInitials(name);
  const [showPhoto, setShowPhoto] = useState(false);

  useEffect(() => {
    setShowPhoto(false);
  }, [resolved]);

  const sc = sizeClasses[size];

  return (
    <span
      className={`relative inline-flex shrink-0 overflow-hidden rounded-full bg-[linear-gradient(180deg,#7fdc5a_0%,#1997e8_100%)] shadow-[0_2px_10px_rgba(23,54,81,0.14)] ring-2 ring-white/80 ${sc.wrap} ${className}`}
      aria-hidden
    >
      <span
        className={`absolute inset-0 z-0 flex items-center justify-center font-extrabold leading-none text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.22)] transition-opacity duration-200 ease-out ${sc.text} ${
          showPhoto ? "opacity-0" : "opacity-100"
        }`}
      >
        {initials}
      </span>
      {resolved ? (
        <img
          src={resolved}
          alt=""
          loading="eager"
          decoding="async"
          className={`absolute inset-0 z-[1] h-full w-full object-cover transition-opacity duration-200 ease-out ${
            showPhoto ? "opacity-100" : "opacity-0"
          }`}
          onLoad={() => setShowPhoto(true)}
          onError={() => setShowPhoto(false)}
        />
      ) : null}
    </span>
  );
}
