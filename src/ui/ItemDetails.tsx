import { setByNameOf, tierOf } from "../data/items.ts";
import type { EffectBlock, ItemDef, Quality } from "../engine/model.ts";
import type { StatRegistry } from "../engine/stats.ts";
import { effectSummary, statLabel, UNMODELLED_LABELS } from "./format.ts";

function Block({ block, stats }: { block: EffectBlock; stats?: StatRegistry }) {
  const empty = block.effects.length + block.bonusEnchant.length + block.unmodelled.length === 0;
  return (
    <ul className="effects">
      {block.effects.map((e, i) => (
        <li key={`e${i}`}>
          <span className="clause">{e.text}</span> → <span className="parsed">{effectSummary(e, stats)}</span>
          {!e.source.verified && (
            <span className="flag" title={e.source.note}>
              {" "}
              unverified{e.source.note ? `: ${e.source.note}` : ""}
            </span>
          )}
        </li>
      ))}
      {block.bonusEnchant.map((b, i) => (
        <li key={`b${i}`}>
          <span className="clause">{b.text}</span> → <span className="parsed">+{b.levels} enchant levels ({b.scope === "all" ? "all enchanted items" : b.scope === "self" ? "this item" : `${b.scope} items`})</span>
        </li>
      ))}
      {block.unmodelled.map((u, i) => (
        <li key={`u${i}`} className="unmodelled">
          <span className="clause">{u.text}</span> — <em>{UNMODELLED_LABELS[u.reason]}</em>
          {u.note ? `: ${u.note}` : ""}
        </li>
      ))}
      {empty && <li className="muted">No effects.</li>}
    </ul>
  );
}

export function ItemDetails({ item, quality, stats }: { item: ItemDef; quality: Quality | null; stats?: StatRegistry }) {
  const tier = tierOf(item, quality ?? item.maxQuality);
  const set = item.set ? setByNameOf(item.set) : undefined;
  const reqs = Object.entries(item.requirements);
  return (
    <div className="item-details">
      <p>
        <a href={item.source.url} target="_blank" rel="noreferrer">
          Wiki page
        </a>
        {reqs.length > 0 && <> · Requires {reqs.map(([a, v]) => `${v} ${a}`).join(", ")}</>}
        {item.acquisition && <> · {item.acquisition}</>}
      </p>
      <h4>{tier.quality} effects</h4>
      <Block block={tier} stats={stats} />
      {item.enchant && (
        <>
          <h4>Enchant (per level, multiplies)</h4>
          <ul className="effects">
            <li>
              <span className="clause">{item.enchant.desc}</span>
              {item.enchant.stat ? (
                <>
                  {" "}
                  → <span className="parsed">{statLabel(stats, item.enchant.stat)} ×{(1 + item.enchant.perLevel).toPrecision(4)} per level</span>
                </>
              ) : (
                <em> — {item.enchant.unmodelled ? UNMODELLED_LABELS[item.enchant.unmodelled.reason] : "not modelled"}</em>
              )}
            </li>
          </ul>
        </>
      )}
      {set && (
        <>
          <h4>
            {set.name} set bonuses{" "}
            {!set.source.verified && (
              <span className="flag" title={set.source.note}>
                (unverified: {set.source.note})
              </span>
            )}
          </h4>
          {set.tiers.map((t) => (
            <div key={t.pieces}>
              <strong>{t.pieces} pieces</strong>
              <Block block={t} stats={stats} />
            </div>
          ))}
        </>
      )}
    </div>
  );
}
