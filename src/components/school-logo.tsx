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
