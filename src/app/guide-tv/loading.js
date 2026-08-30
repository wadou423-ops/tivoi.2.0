export default function Loading() {
  return (
    <main className="flex-grow pt-24 pb-20 px-5 md:px-20">
      <div className="h-10 w-48 skeleton mb-8" />
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8">
          <div className="aspect-video skeleton mb-4" />
          <div className="h-24 skeleton" />
        </div>
        <div className="lg:col-span-4 h-96 skeleton" />
      </div>
    </main>
  );
}
