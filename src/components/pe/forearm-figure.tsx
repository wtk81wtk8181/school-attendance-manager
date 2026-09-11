export function ForearmJointsFigure() {
  return (
    <figure className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <svg viewBox="0 0 360 220" className="mx-auto h-auto w-full max-w-md" role="img" aria-labelledby="forearm-title">
        <title id="forearm-title">前臂及手部關節示意：X 靠近肘部，Y 靠近腕部</title>
        <rect x="1" y="1" width="358" height="218" rx="12" fill="#fff" stroke="#e2e8f0" />
        <text x="180" y="28" textAnchor="middle" fontSize="13" fill="#64748b">
          前臂及手部示意（原卷為 X 光影像）
        </text>
        <ellipse cx="86" cy="118" rx="28" ry="22" fill="#e2e8f0" stroke="#64748b" />
        <rect x="108" y="104" width="110" height="16" rx="6" fill="#cbd5e1" stroke="#64748b" />
        <rect x="108" y="122" width="110" height="12" rx="6" fill="#dbeafe" stroke="#64748b" />
        <rect x="218" y="98" width="52" height="42" rx="10" fill="#e2e8f0" stroke="#64748b" />
        <rect x="268" y="88" width="18" height="58" rx="6" fill="#cbd5e1" stroke="#64748b" />
        <rect x="288" y="84" width="16" height="66" rx="6" fill="#cbd5e1" stroke="#64748b" />
        <rect x="306" y="90" width="16" height="58" rx="6" fill="#cbd5e1" stroke="#64748b" />
        <circle cx="118" cy="116" r="11" fill="none" stroke="#7c3aed" strokeWidth="3" />
        <circle cx="244" cy="118" r="11" fill="none" stroke="#0f766e" strokeWidth="3" />
        <text x="118" y="72" textAnchor="middle" fontSize="18" fontWeight="700" fill="#6d28d9">
          X
        </text>
        <line x1="118" y1="78" x2="118" y2="104" stroke="#6d28d9" strokeWidth="2" />
        <text x="244" y="72" textAnchor="middle" fontSize="18" fontWeight="700" fill="#0f766e">
          Y
        </text>
        <line x1="244" y1="78" x2="244" y2="106" stroke="#0f766e" strokeWidth="2" />
        <text x="86" y="168" textAnchor="middle" fontSize="12" fill="#475569">
          肘部
        </text>
        <text x="244" y="178" textAnchor="middle" fontSize="12" fill="#475569">
          腕部
        </text>
      </svg>
      <figcaption className="mt-2 text-center text-xs text-slate-500">
        圓圈 X 靠近肘部；圓圈 Y 靠近腕部。
      </figcaption>
    </figure>
  );
}
