import { AiResponseBlock as Block } from '@/services/ai-service';

export function AiResponseBlock({ block }: { block: Block }) {
  return (
    <article className="card bg-surface">
      <h4 className="text-sm font-semibold text-sky-300">{block.title}</h4>
      <ul className="mt-3 space-y-2 text-sm text-slate-700">
        {block.bullets.map((item) => (
          <li key={item}>• {item}</li>
        ))}
      </ul>
      {block.actionPreview && <p className="mt-4 rounded-lg border border-sky-500/30 bg-sky-500/10 p-2 text-xs text-sky-200">{block.actionPreview}</p>}
    </article>
  );
}
