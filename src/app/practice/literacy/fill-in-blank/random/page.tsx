import { FitbRandomRunner } from "@/components/fitb/FitbRandomRunner";

export default function FitbRandomPage() {
  return (
    <main className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-4xl flex-col px-4 py-8">
      <FitbRandomRunner />
    </main>
  );
}
