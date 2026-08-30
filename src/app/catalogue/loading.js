import SkeletonGrille from "../components/SkeletonGrille";

export default function Loading() {
  return (
    <main className="flex-grow pt-28 pb-20 px-5 md:px-20">
      <div className="h-10 w-72 skeleton mb-10" />
      <SkeletonGrille nombre={12} />
    </main>
  );
}
