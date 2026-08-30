export default function Loading() {
  return (
    <main className="flex-grow pt-28 pb-20 px-5 md:px-20 max-w-7xl mx-auto">
      <div className="h-8 w-64 skeleton mb-10" />
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4 flex flex-col gap-6">
          <div className="h-64 skeleton" />
          <div className="h-24 skeleton" />
        </div>
        <div className="lg:col-span-8 h-96 skeleton" />
      </div>
    </main>
  );
}
