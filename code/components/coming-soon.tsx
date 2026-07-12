export default function ComingSoon({ title, note }: { title: string; note: string }) {
  return (
    <div className="flex flex-col items-center justify-center text-center">
      <h1 className="text-xl font-bold">{title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{note}</p>
    </div>
  );
}
