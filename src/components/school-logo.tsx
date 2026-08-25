import Image from "next/image";

export function SchoolLogo({ className }: { className?: string }) {
  return (
    <Image
      src="/school-logo.png"
      alt="萬鈞伯裘書院 Man Kwan Pak Kau College"
      width={520}
      height={140}
      priority
      className={className ?? "h-auto w-full max-w-md"}
    />
  );
}

/** Square crop of the circular emblem, for sidebar / compact headers. */
export function SchoolLogoMark({ className }: { className?: string }) {
  return (
    <span
      className={
        className ??
        "relative flex size-10 shrink-0 overflow-hidden rounded-lg bg-white shadow-sm"
      }
    >
      <Image
        src="/school-logo.png"
        alt=""
        width={520}
        height={140}
        className="absolute left-0 top-1/2 h-full w-auto max-w-none -translate-y-1/2"
        priority
      />
    </span>
  );
}
