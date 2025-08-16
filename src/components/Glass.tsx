type Props = React.PropsWithChildren<{
  className?: string;
}>;

export default function Glass({ className = '', children }: Props) {
  return (
    <div
      className={[
        // glass core
        "backdrop-blur-md bg-white/50",
        // subtle border & inner highlight
        "border border-white/30 shadow-[0_8px_30px_rgba(0,0,0,0.08)]",
        // rounded & padding defaults
        "rounded-xl",
        className
      ].join(' ')}
    >
      {children}
    </div>
  );
}
