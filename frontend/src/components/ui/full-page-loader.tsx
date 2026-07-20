import LoaderOne from "@/components/ui/loader-one";

interface FullPageLoaderProps {
  label?: string;
  fullScreen?: boolean;
}

export default function FullPageLoader({ label = "Loading", fullScreen = true }: FullPageLoaderProps) {
  return (
    <div className={`flex w-full flex-col items-center justify-center gap-3 ${fullScreen ? "min-h-screen" : "min-h-[60vh]"}`}>
      <LoaderOne />
      <p className="text-xs font-medium tracking-wide text-neutral-500">{label}</p>
    </div>
  );
}
