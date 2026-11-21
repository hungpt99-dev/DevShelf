"use client";

export default function Heatmap({ heatmap }: { heatmap: [string, number][] }) {
  return (
    <div className="flex flex-wrap gap-1" role="img" aria-label="Reading activity heatmap">
      {heatmap.map(([day, minutes]) => (
        <span key={day} title={`${day}: ${minutes} min`} className={`size-3 rounded-[3px] border ${minutes === 0 ? "border-line" : minutes < 10 ? "bg-lime/30" : minutes < 30 ? "bg-lime/60" : "bg-lime"}`} />
      ))}
    </div>
  );
}
