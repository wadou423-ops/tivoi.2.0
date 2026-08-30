export default function SkeletonGrille({ nombre = 10, vertical = true }) {
  return (
    <div
      className={
        vertical
          ? "grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-x-6 gap-y-8"
          : "flex gap-6 overflow-hidden"
      }
    >
      {Array.from({ length: nombre }).map((_, i) => (
        <div key={i} className={vertical ? "" : "flex-none w-[200px]"}>
          <div className="aspect-[2/3] skeleton mb-3" />
          <div className="h-4 skeleton mb-2 w-3/4" />
          <div className="h-3 skeleton w-1/2" />
        </div>
      ))}
    </div>
  );
}
