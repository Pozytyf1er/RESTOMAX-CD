import { useMemo, useState, type FormEvent } from "react";
import { AlertTriangle, ArrowDownToLine, ArrowUpFromLine, Boxes, ClipboardList, PackagePlus, Plus, Search, Settings2 } from "lucide-react";
import type { InventoryItem, MenuItem, StockMovement, StockMovementType } from "../domain/types";

type Props = {
  inventory: InventoryItem[];
  items: MenuItem[];
  movements: StockMovement[];
  onMovement: (itemId: string, type: StockMovementType, quantity: number, reason: string) => void;
  onAddIngredient: (ingredient: Omit<InventoryItem, "id" | "recipes">) => boolean;
  onUpdateThreshold: (itemId: string, threshold: number) => void;
  onUpdateRecipe: (itemId: string, menuItemId: string, quantity: number) => void;
};

const number = (value: number, unit: string) => `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 3 }).format(value)} ${unit}`;
const dateLabel = (value: string) => value;

export default function InventoryManagement({ inventory, items, movements, onMovement, onAddIngredient, onUpdateThreshold, onUpdateRecipe }: Props) {
  const [tab, setTab] = useState<"stock" | "movements" | "recipes">("stock");
  const [query, setQuery] = useState("");
  const [movementItem, setMovementItem] = useState(inventory[0]?.id ?? "");
  const [movementType, setMovementType] = useState<StockMovementType>("in");
  const [movementQuantity, setMovementQuantity] = useState("");
  const [movementReason, setMovementReason] = useState("");
  const [thresholdItem, setThresholdItem] = useState<string | null>(null);
  const [thresholdValue, setThresholdValue] = useState("");
  const [recipeItem, setRecipeItem] = useState(inventory[0]?.id ?? "");
  const [recipeMenuItem, setRecipeMenuItem] = useState(items[0]?.id ?? "");
  const [recipeQuantity, setRecipeQuantity] = useState("");
  const [newName, setNewName] = useState("");
  const [newUnit, setNewUnit] = useState("kg");
  const [newQuantity, setNewQuantity] = useState("0");
  const [newThreshold, setNewThreshold] = useState("1");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const filtered = useMemo(() => inventory.filter((item) => item.name.toLowerCase().includes(query.toLowerCase())), [inventory, query]);
  const lowStock = inventory.filter((item) => item.quantity <= item.minimumQuantity);
  const totalValue = inventory.length;
  const selectedMovementItem = inventory.find((item) => item.id === movementItem);

  function submitMovement(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const quantity = Number(movementQuantity);
    if (!movementItem || !Number.isFinite(quantity) || quantity <= 0 || !movementReason.trim()) {
      setError("Choisissez un article, une quantité valide et indiquez un motif.");
      return;
    }
    if (movementType === "out" && selectedMovementItem && quantity > selectedMovementItem.quantity) {
      setError("La sortie dépasse le stock disponible.");
      return;
    }
    onMovement(movementItem, movementType, quantity, movementReason.trim());
    setMovementQuantity("");
    setMovementReason("");
    setError("");
    setNotice(movementType === "in" ? "Approvisionnement enregistré." : "Sortie de stock enregistrée.");
  }

  function submitIngredient(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const quantity = Number(newQuantity);
    const threshold = Number(newThreshold);
    if (!newName.trim() || !newUnit.trim() || !Number.isFinite(quantity) || quantity < 0 || !Number.isFinite(threshold) || threshold < 0) {
      setError("Vérifiez le nom, l’unité et les quantités.");
      return;
    }
    if (!onAddIngredient({ name: newName.trim(), unit: newUnit.trim(), quantity, minimumQuantity: threshold })) {
      setError("Un ingrédient portant déjà ce nom et cette unité existe, ou les quantités sont invalides.");
      return;
    }
    setNewName(""); setNewQuantity("0"); setNewThreshold("1"); setError(""); setNotice("Ingrédient ajouté au stock.");
  }

  function submitThreshold(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const threshold = Number(thresholdValue);
    if (!thresholdItem || !Number.isFinite(threshold) || threshold < 0) return;
    onUpdateThreshold(thresholdItem, threshold);
    setThresholdItem(null);
  }

  function submitRecipe(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const quantity = Number(recipeQuantity);
    if (!recipeItem || !recipeMenuItem || !Number.isFinite(quantity) || quantity < 0) {
      setError("Saisissez une consommation unitaire valide (0 pour retirer l’association).");
      return;
    }
    onUpdateRecipe(recipeItem, recipeMenuItem, quantity);
    setRecipeQuantity("");
    setError("");
    setNotice("Recette de consommation mise à jour.");
  }

  return <section className="inventory-page">
    <div className="page-heading">
      <div><div className="eyebrow">APPROVISIONNEMENTS · CONTRÔLE DES QUANTITÉS</div><h1>Stocks & Approvisionnements</h1><p>Suivez les ingrédients, enregistrez les mouvements et reliez les ventes aux consommations de stock.</p></div>
      <span className="live-indicator"><i/> Stock de démonstration</span>
    </div>
    <div className="inventory-summary">
      <div><span>Références en stock</span><strong>{totalValue}</strong></div>
      <div><span>Alertes de seuil</span><strong className={lowStock.length ? "inventory-alert-number" : ""}>{lowStock.length}</strong></div>
      <div><span>Mouvements enregistrés</span><strong>{movements.length}</strong></div>
    </div>
    {lowStock.length > 0 && <div className="inventory-alert"><AlertTriangle size={18}/><div><strong>{lowStock.length} référence(s) sous le seuil minimum</strong><p>{lowStock.map((item) => item.name).join(" · ")}. Pensez à réapprovisionner.</p></div></div>}
    <div className="inventory-tabs">
      <button className={tab === "stock" ? "active" : ""} onClick={() => setTab("stock")}><Boxes size={15}/> État du stock</button>
      <button className={tab === "movements" ? "active" : ""} onClick={() => setTab("movements")}><ClipboardList size={15}/> Entrées & sorties</button>
      <button className={tab === "recipes" ? "active" : ""} onClick={() => setTab("recipes")}><Settings2 size={15}/> Recettes & consommation</button>
    </div>

    {tab === "stock" && <div className="inventory-grid">
      <section className="panel inventory-list-panel">
        <div className="panel-heading"><div><h2>Inventaire des ingrédients</h2><p>Quantités disponibles et seuils de réapprovisionnement.</p></div><span className="demo-tag">DÉMO</span></div>
        <div className="inventory-search"><Search size={15}/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Rechercher un ingrédient…"/></div>
        <div className="inventory-table-wrap"><table className="inventory-table"><thead><tr><th>Ingrédient</th><th>Disponible</th><th>Seuil minimum</th><th>État</th><th/></tr></thead><tbody>
          {filtered.map((item) => { const low = item.quantity <= item.minimumQuantity; const ratio = item.minimumQuantity > 0 ? Math.min(100, item.quantity / (item.minimumQuantity * 2) * 100) : 100; return <tr key={item.id}><td><strong>{item.name}</strong><small>{item.recipes.length} recette(s) liée(s)</small></td><td><strong>{number(item.quantity, item.unit)}</strong><div className="inventory-progress"><i style={{ width: `${ratio}%` }}/></div></td><td>{number(item.minimumQuantity, item.unit)}</td><td><span className={low ? "inventory-state low" : "inventory-state ok"}>{low ? "À réapprovisionner" : "Disponible"}</span></td><td><button className="inventory-icon-button" title="Modifier le seuil" onClick={() => { setThresholdItem(item.id); setThresholdValue(String(item.minimumQuantity)); }}><Settings2 size={15}/></button></td></tr>; })}
        </tbody></table>{filtered.length === 0 && <div className="inventory-empty">Aucun ingrédient trouvé.</div>}</div>
      </section>
      <section className="panel inventory-add-panel"><div className="panel-heading"><div><h2>Nouvel ingrédient</h2><p>Ajoutez une référence à votre inventaire.</p></div><PackagePlus size={18}/></div>
        <form className="inventory-form" onSubmit={submitIngredient}>
          <label>Nom de l’ingrédient<input value={newName} onChange={(event) => setNewName(event.target.value)} placeholder="Ex. Huile de cuisson" required/></label>
          <div className="inventory-form-row"><label>Unité<input value={newUnit} onChange={(event) => setNewUnit(event.target.value)} placeholder="kg, L, unité…" required/></label><label>Stock initial<input type="number" min="0" step="0.001" value={newQuantity} onChange={(event) => setNewQuantity(event.target.value)} required/></label></div>
          <label>Seuil minimum<input type="number" min="0" step="0.001" value={newThreshold} onChange={(event) => setNewThreshold(event.target.value)} required/></label>
          <button className="button button-primary" type="submit"><Plus size={15}/> Ajouter l’ingrédient</button>
        </form>
      </section>
    </div>}

    {tab === "movements" && <div className="inventory-grid">
      <section className="panel inventory-add-panel"><div className="panel-heading"><div><h2>Enregistrer un mouvement</h2><p>Approvisionnement ou sortie manuelle de stock.</p></div><ArrowDownToLine size={18}/></div>
        <form className="inventory-form" onSubmit={submitMovement}>
          <label>Ingrédient<select value={movementItem} onChange={(event) => setMovementItem(event.target.value)}>{inventory.map((item) => <option key={item.id} value={item.id}>{item.name} ({item.unit})</option>)}</select></label>
          <div className="inventory-movement-types"><button type="button" className={movementType === "in" ? "active in" : ""} onClick={() => { setMovementType("in"); setError(""); }}><ArrowDownToLine size={15}/> Entrée</button><button type="button" className={movementType === "out" ? "active out" : ""} onClick={() => { setMovementType("out"); setError(""); }}><ArrowUpFromLine size={15}/> Sortie</button></div>
          <label>Quantité ({selectedMovementItem?.unit ?? "unité"})<input type="number" min="0.001" step="0.001" value={movementQuantity} onChange={(event) => setMovementQuantity(event.target.value)} required/></label>
          <label>Motif<input value={movementReason} onChange={(event) => setMovementReason(event.target.value)} placeholder={movementType === "in" ? "Ex. Achat fournisseur" : "Ex. Perte, casse, usage interne"} required/></label>
          {error && <p className="inventory-error" role="alert">{error}</p>}
          {notice && <p className="inventory-notice" role="status">{notice}</p>}
          <button className="button button-primary" type="submit">{movementType === "in" ? "Enregistrer l’approvisionnement" : "Enregistrer la sortie"}</button>
        </form>
      </section>
      <section className="panel inventory-history-panel"><div className="panel-heading"><div><h2>Historique des mouvements</h2><p>Les consommations liées aux ventes sont tracées automatiquement.</p></div></div>
        <div className="inventory-movement-list">{movements.slice(0, 30).map((movement) => { const item = inventory.find((entry) => entry.id === movement.inventoryItemId); return <div key={movement.id}><span className={movement.type === "in" ? "movement-icon in" : "movement-icon out"}>{movement.type === "in" ? <ArrowDownToLine size={14}/> : <ArrowUpFromLine size={14}/>}</span><div><strong>{item?.name ?? "Ingrédient supprimé"}</strong><small>{movement.reason} · {dateLabel(movement.createdAt)}{movement.reference ? ` · ${movement.reference}` : ""}</small></div><strong className={movement.type === "in" ? "movement-amount in" : "movement-amount out"}>{movement.type === "in" ? "+" : "−"}{number(movement.quantity, item?.unit ?? "")}</strong><span className="movement-source">{movement.source === "sale" ? "Vente" : movement.source === "purchase" ? "Achat" : "Manuel"}</span></div>; })}{movements.length === 0 && <div className="inventory-empty">Aucun mouvement enregistré.</div>}</div>
      </section>
    </div>}

    {tab === "recipes" && <div className="inventory-grid">
      <section className="panel inventory-add-panel"><div className="panel-heading"><div><h2>Associer un ingrédient à un plat</h2><p>Définissez la quantité consommée pour une unité vendue.</p></div><Settings2 size={18}/></div>
        <form className="inventory-form" onSubmit={submitRecipe}>
          <label>Ingrédient<select value={recipeItem} onChange={(event) => setRecipeItem(event.target.value)}>{inventory.map((item) => <option key={item.id} value={item.id}>{item.name} ({item.unit})</option>)}</select></label>
          <label>Article de la carte<select value={recipeMenuItem} onChange={(event) => setRecipeMenuItem(event.target.value)}>{items.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <label>Quantité consommée par article ({inventory.find((item) => item.id === recipeItem)?.unit ?? "unité"})<input type="number" min="0" step="0.001" value={recipeQuantity} onChange={(event) => setRecipeQuantity(event.target.value)} placeholder="Ex. 0,250 (0 pour retirer)" required/></label>
          <button className="button button-primary" type="submit">Enregistrer la recette</button>
        </form>
      </section>
      <section className="panel inventory-history-panel"><div className="panel-heading"><div><h2>Consommations configurées</h2><p>La consommation est appliquée au démarrage de préparation en cuisine.</p></div></div>
        <div className="inventory-recipe-list">{inventory.flatMap((ingredient) => ingredient.recipes.map((recipe) => <div key={ingredient.id + recipe.menuItemId}><span><strong>{ingredient.name}</strong><small>{items.find((item) => item.id === recipe.menuItemId)?.name ?? "Article inconnu"}</small></span><strong>{number(recipe.quantityPerItem, ingredient.unit)} / article</strong></div>))}{inventory.every((item) => item.recipes.length === 0) && <div className="inventory-empty">Aucune recette de consommation configurée.</div>}</div>
      </section>
    </div>}

    {error && tab !== "movements" && tab !== "recipes" && <p className="inventory-error">{error}</p>}
    {notice && tab !== "movements" && <p className="inventory-notice">{notice}</p>}

    {thresholdItem && <div className="inventory-modal-backdrop" role="presentation"><form className="inventory-modal" onSubmit={submitThreshold}><div className="panel-heading"><div><h2>Seuil de réapprovisionnement</h2><p>{inventory.find((item) => item.id === thresholdItem)?.name}</p></div></div><label className="inventory-form">Quantité minimum<input type="number" min="0" step="0.001" value={thresholdValue} onChange={(event) => setThresholdValue(event.target.value)} required/></label><div className="inventory-modal-actions"><button type="button" className="button button-quiet" onClick={() => setThresholdItem(null)}>Annuler</button><button className="button button-primary" type="submit">Enregistrer</button></div></form></div>}
  </section>;
}
