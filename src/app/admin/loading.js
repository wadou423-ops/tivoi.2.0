export default function AdminLoading() {
  return (
    <main className="px-6 md:px-12 py-12">
      <div className="h-10 w-72 skeleton mb-3" />
      <div className="h-4 w-96 skeleton mb-10" />
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 mb-12">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="h-40 skeleton" />
        ))}
      </div>
    </main>
  );
}
