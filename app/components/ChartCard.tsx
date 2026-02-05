export default function ChartCard({
  title,
  children,
  loading,
  error,
}: {
  title: string;
  children: React.ReactNode;
  loading?: boolean;
  error?: Error | null;
}) {
  return (
    <div className="bg-[#D9D9D9] p-4 rounded-lg">
      <h2 className="text-2xl font-bold text-black mb-4 font-[family-name:var(--font-geist-sans)]">
        {title}
      </h2>
      <div className="bg-white rounded min-h-[400px] flex items-center justify-center">
        {loading ? (
          <div className="text-gray-500">Loading data...</div>
        ) : error ? (
          <div className="text-center">
            <div className="text-red-500 font-medium">Failed to load data</div>
            <div className="text-red-400 text-sm mt-1">Please refresh the page to try again</div>
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
}
