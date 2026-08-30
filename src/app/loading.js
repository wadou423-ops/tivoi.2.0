import SkeletonGrille from "./components/SkeletonGrille";

export default function Loading() {
  return (
    <main className="pt-20">
      <div className="h-[819px] min-h-[600px] skeleton !rounded-none" />
      <div className="px-5 md:px-20 py-12">
        <SkeletonGrille nombre={6} />
      </div>
    </main>
  );
}
