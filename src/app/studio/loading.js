export default function Loading() {
  return (
    <main className="flex-grow pt-28 pb-20 px-5 md:px-20">
      <div className="h-10 w-80 skeleton mb-10" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-32 skeleton" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="h-56 skeleton" />
        <div className="h-56 skeleton" />
      </div>
    </main>
  );
}
