export default function PageWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="container mx-auto px-1 lg:px-4 py-1 overflow-hidden max-w-full">
      {children}
    </div>
  );
}
