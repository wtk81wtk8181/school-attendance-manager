import type { McFigure } from "@/data/pe-body-mc";
import { ForearmJointsFigure } from "@/components/pe/forearm-figure";

export function McFigureView({ figure }: { figure: McFigure }) {
  if (figure.kind === "forearm") {
    return <ForearmJointsFigure />;
  }

  if (figure.kind === "note") {
    return (
      <aside className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-950">
        {figure.text}
      </aside>
    );
  }

  return (
    <figure className="overflow-x-auto rounded-xl border border-slate-200 bg-slate-50">
      <table className="min-w-full text-left text-sm">
        {figure.headers ? (
          <thead>
            <tr className="border-b border-slate-200 bg-slate-100">
              {figure.headers.map((header, i) => (
                <th key={i} className="px-3 py-2 font-semibold text-slate-700">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
        ) : null}
        <tbody>
          {figure.rows.map((row, i) => (
            <tr key={i} className="border-b border-slate-100 last:border-0">
              {row.map((cell, j) => (
                <td key={j} className={`px-3 py-2 ${j === 0 ? "font-medium text-slate-800" : "text-slate-600"}`}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {figure.caption ? <figcaption className="px-3 py-2 text-xs text-slate-500">{figure.caption}</figcaption> : null}
    </figure>
  );
}
