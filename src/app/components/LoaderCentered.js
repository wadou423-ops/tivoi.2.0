import Spinner from "./Spinner";

export default function LoaderCentered({ label = "Chargement...", full = true }) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-4 ${
        full ? "min-h-[50vh]" : "py-16"
      }`}
    >
      <Spinner size={36} />
      <p className="caption text-on-surface-variant">{label}</p>
    </div>
  );
}
