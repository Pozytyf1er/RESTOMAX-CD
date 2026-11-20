import { useMemo, useState, type FormEvent } from "react";
import { Check, ChevronDown, Coffee, Edit3, PackagePlus, Plus, Search, Tag, Trash2, Utensils, X } from "lucide-react";
import type { MenuCategory, MenuItem, MenuItemType, MenuOption, MenuOptionType } from "../domain/types";

type Tab = "articles" | "categories" | "options";
type Props = {
  categories: MenuCategory[];
  items: MenuItem[];
  options: MenuOption[];
  onCategoriesChange: (next: MenuCategory[]) => void;
  onItemsChange: (next: MenuItem[]) => void;
  onOptionsChange: (next: MenuOption[]) => void;
};

const money = (amount: number) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "XOF", maximumFractionDigits: 0 }).format(amount);
const makeId = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

export default function MenuManagement({ categories, items, options, onCategoriesChange, onItemsChange, onOptionsChange }: Props) {
  const [tab, setTab] = useState<Tab>("articles");
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState<"all" | MenuItemType>("all");
  const [itemEditor, setItemEditor] = useState<MenuItem | null | "new">(null);
  const [categoryEditor, setCategoryEditor] = useState<MenuCategory | null | "new">(null);
  const [optionEditor, setOptionEditor] = useState<MenuOption | null | "new">(null);
  const [notice, setNotice] = useState("");

  const filteredItems = useMemo(() => items.filter((item) => {
    const term = query.trim().toLocaleLowerCase("fr");
    const matchesText = !term || `${item.name} ${item.description}`.toLocaleLowerCase("fr").includes(term);
    return matchesText && (categoryFilter === "all" || item.categoryId === categoryFilter) && (typeFilter === "all" || item.type === typeFilter);
  }), [items, query, categoryFilter, typeFilter]);

  function saveItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    const categoryId = String(form.get("categoryId") ?? "");
    const price = Number(form.get("price"));
    const type = String(form.get("type")) as MenuItemType;
    const description = String(form.get("description") ?? "").trim();
    const optionIds = form.getAll("optionIds").map(String);
    if (!name || !categoryId || !Number.isFinite(price) || price < 0 || !categories.some((c) => c.id === categoryId)) return;
    if (itemEditor === "new") {
      onItemsChange([...items, { id: makeId("item"), name, categoryId, price, type, description, optionIds, available: true }]);
      setNotice("Article créé.");
    } else if (itemEditor) {
      onItemsChange(items.map((item) => item.id === itemEditor.id ? { ...item, name, categoryId, price, type, description, optionIds } : item));
      setNotice("Article modifié.");
    }
    setItemEditor(null);
  }

  function saveCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    const description = String(form.get("description") ?? "").trim();
    if (!name) return;
    if (categoryEditor === "new") {
      onCategoriesChange([...categories, { id: makeId("category"), name, description }]);
      setNotice("Catégorie créée.");
    } else if (categoryEditor) {
      onCategoriesChange(categories.map((category) => category.id === categoryEditor.id ? { ...category, name, description } : category));
      setNotice("Catégorie modifiée.");
    }
    setCategoryEditor(null);
  }

  function saveOption(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    const price = Number(form.get("price"));
    const type = String(form.get("type")) as MenuOptionType;
    const groupName = String(form.get("groupName") ?? "").trim();
    if (!name || !Number.isFinite(price) || price < 0) return;
    if (optionEditor === "new") {
      onOptionsChange([...options, { id: makeId("option"), name, price, type, groupName: type === "choice" ? (groupName || "Choix") : undefined, active: true }]);
      setNotice(type === "extra" ? "Supplément créé." : "Option créée.");
    } else if (optionEditor) {
      onOptionsChange(options.map((option) => option.id === optionEditor.id ? { ...option, name, price, type, groupName: type === "choice" ? (groupName || "Choix") : undefined } : option));
      setNotice("Option modifiée.");
    }
    setOptionEditor(null);
  }

  function removeCategory(category: MenuCategory) {
    if (items.some((item) => item.categoryId === category.id)) {
      setNotice("Impossible de supprimer cette catégorie : déplacez ou supprimez d’abord ses articles.");
      return;
    }
    if (window.confirm(`Supprimer la catégorie « ${category.name} » ?`)) {
      onCategoriesChange(categories.filter((entry) => entry.id !== category.id));
      setNotice("Catégorie supprimée.");
    }
  }

  function removeItem(item: MenuItem) {
    if (window.confirm(`Supprimer « ${item.name} » de la carte ?`)) {
      onItemsChange(items.filter((entry) => entry.id !== item.id));
      setNotice("Article supprimé.");
    }
  }

  function removeOption(option: MenuOption) {
    if (window.confirm(`Supprimer « ${option.name} » ?`)) {
      onOptionsChange(options.filter((entry) => entry.id !== option.id));
      onItemsChange(items.map((item) => ({ ...item, optionIds: item.optionIds.filter((id) => id !== option.id) })));
      setNotice("Option supprimée et retirée des articles associés.");
    }
  }

  function toggleAvailability(item: MenuItem) {
    onItemsChange(items.map((entry) => entry.id === item.id ? { ...entry, available: !entry.available } : entry));
  }

  function toggleOption(option: MenuOption) {
    onOptionsChange(options.map((entry) => entry.id === option.id ? { ...entry, active: !entry.active } : entry));
  }

  return <section className="catalogue-module">
    <div className="catalogue-intro">
      <div><span className="catalogue-kicker">GESTION DU CATALOGUE</span><h2>Votre carte, vos règles.</h2><p>Organisez vos catégories, vos plats, vos boissons et les personnalisations proposées aux clients.</p></div>
      <div className="catalogue-stats"><span><strong>{categories.length}</strong> catégories</span><span><strong>{items.length}</strong> articles</span><span><strong>{options.length}</strong> options & suppléments</span></div>
    </div>
    <div className="catalogue-tabs" role="tablist" aria-label="Sections du catalogue">
      <button className={tab === "articles" ? "selected" : ""} role="tab" aria-selected={tab === "articles"} onClick={() => setTab("articles")}><Utensils size={16}/> Plats & boissons <span>{items.length}</span></button>
      <button className={tab === "categories" ? "selected" : ""} role="tab" aria-selected={tab === "categories"} onClick={() => setTab("categories")}><Tag size={16}/> Catégories <span>{categories.length}</span></button>
      <button className={tab === "options" ? "selected" : ""} role="tab" aria-selected={tab === "options"} onClick={() => setTab("options")}><PackagePlus size={16}/> Options & suppléments <span>{options.length}</span></button>
    </div>

    {notice && <div className="catalogue-notice" role="status"><Check size={15}/>{notice}<button aria-label="Fermer le message" onClick={() => setNotice("")}><X size={14}/></button></div>}

    {tab === "articles" && <>
      <div className="catalogue-toolbar">
        <label className="search-box"><Search size={16}/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Rechercher un plat ou une boisson..."/></label>
        <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} aria-label="Filtrer par catégorie"><option value="all">Toutes les catégories</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select>
        <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value as "all" | MenuItemType)} aria-label="Filtrer par type"><option value="all">Plats et boissons</option><option value="dish">Plats</option><option value="drink">Boissons</option></select>
        <button className="button button-primary" onClick={() => setItemEditor("new")}><Plus size={16}/> Nouvel article</button>
      </div>
      <div className="catalogue-item-list">
        {filteredItems.map((item) => {
          const category = categories.find((entry) => entry.id === item.categoryId);
          const linkedOptions = options.filter((option) => item.optionIds.includes(option.id));
          return <article className="catalogue-item" key={item.id}>
            <div className={`catalogue-item-icon ${item.type === "drink" ? "drink" : ""}`}>{item.type === "drink" ? <Coffee size={19}/> : <Utensils size={19}/>}</div>
            <div className="catalogue-item-main"><div className="catalogue-item-title"><strong>{item.name}</strong><span className={`catalogue-type ${item.type}`}>{item.type === "drink" ? "Boisson" : "Plat"}</span></div><p>{category?.name ?? "Catégorie inconnue"} · {item.description || "Aucune description"}</p><div className="catalogue-item-options">{linkedOptions.length ? linkedOptions.map((option) => <span key={option.id}>{option.name}</span>) : <span className="no-options">Sans option associée</span>}</div></div>
            <strong className="catalogue-price">{money(item.price)}</strong>
            <button className={`catalogue-availability ${item.available ? "enabled" : ""}`} onClick={() => toggleAvailability(item)} aria-pressed={item.available}>{item.available ? "Disponible" : "Indisponible"}</button>
            <div className="catalogue-row-actions"><button aria-label={`Modifier ${item.name}`} onClick={() => setItemEditor(item)}><Edit3 size={16}/></button><button aria-label={`Supprimer ${item.name}`} onClick={() => removeItem(item)}><Trash2 size={16}/></button></div>
          </article>;
        })}
        {filteredItems.length === 0 && <div className="empty-state">Aucun article trouvé. Modifiez les filtres ou créez un nouvel article.</div>}
      </div>
    </>}

    {tab === "categories" && <>
      <div className="catalogue-toolbar"><div className="toolbar-copy"><strong>Classer les produits par famille</strong><span>Une catégorie utilisée ne peut pas être supprimée avant le déplacement de ses articles.</span></div><button className="button button-primary" onClick={() => setCategoryEditor("new")}><Plus size={16}/> Nouvelle catégorie</button></div>
      <div className="category-grid">{categories.map((category) => {
        const count = items.filter((item) => item.categoryId === category.id).length;
        return <article className="category-card" key={category.id}><div className="category-card-top"><div className="category-icon"><Tag size={18}/></div><span>{count} article{count > 1 ? "s" : ""}</span></div><h3>{category.name}</h3><p>{category.description || "Aucune description"}</p><div className="category-card-actions"><button onClick={() => setCategoryEditor(category)}><Edit3 size={14}/> Modifier</button><button onClick={() => removeCategory(category)} disabled={count > 0} title={count > 0 ? "Déplacez d’abord les articles de cette catégorie" : "Supprimer la catégorie"}><Trash2 size={14}/> Supprimer</button></div></article>;
      })}{categories.length === 0 && <div className="empty-state">Aucune catégorie. Créez-en une pour organiser votre carte.</div>}</div>
    </>}

    {tab === "options" && <>
      <div className="catalogue-toolbar"><div className="toolbar-copy"><strong>Personnalisez les commandes</strong><span>Associez les options et suppléments à un ou plusieurs articles.</span></div><button className="button button-primary" onClick={() => setOptionEditor("new")}><Plus size={16}/> Nouvelle option</button></div>
      <div className="option-list">{options.map((option) => {
        const usage = items.filter((item) => item.optionIds.includes(option.id)).length;
        return <article className="option-row" key={option.id}><div className="option-kind-icon">{option.type === "extra" ? <PackagePlus size={18}/> : <ChevronDown size={18}/>}</div><div className="option-main"><strong>{option.name}</strong><span>{option.type === "extra" ? "Supplément" : "Option / choix"} · Utilisée sur {usage} article{usage > 1 ? "s" : ""}</span></div><strong className="catalogue-price">{money(option.price)}</strong><button className={`catalogue-availability ${option.active ? "enabled" : ""}`} onClick={() => toggleOption(option)} aria-pressed={option.active}>{option.active ? "Active" : "Inactive"}</button><div className="catalogue-row-actions"><button aria-label={`Modifier ${option.name}`} onClick={() => setOptionEditor(option)}><Edit3 size={16}/></button><button aria-label={`Supprimer ${option.name}`} onClick={() => removeOption(option)}><Trash2 size={16}/></button></div></article>;
      })}{options.length === 0 && <div className="empty-state">Aucune option ou supplément. Vous pouvez en créer un.</div>}</div>
    </>}

    {itemEditor !== null && <div className="catalogue-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setItemEditor(null); }}><form className="catalogue-modal" onSubmit={saveItem} aria-label="Formulaire article"><div className="catalogue-modal-head"><div><span>CARTE DU RESTAURANT</span><h2>{itemEditor === "new" ? "Ajouter un article" : "Modifier l’article"}</h2></div><button type="button" aria-label="Fermer" onClick={() => setItemEditor(null)}><X size={18}/></button></div>
      <div className="catalogue-form-grid"><label>Nom de l’article<input name="name" required maxLength={80} defaultValue={itemEditor === "new" ? "" : itemEditor.name} placeholder="Ex. Poulet braisé"/></label><label>Type<select name="type" defaultValue={itemEditor === "new" ? "dish" : itemEditor.type}><option value="dish">Plat</option><option value="drink">Boisson</option></select></label><label>Catégorie<select name="categoryId" required defaultValue={itemEditor === "new" ? categories[0]?.id ?? "" : itemEditor.categoryId}>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label><label>Prix de base (FCFA)<input name="price" type="number" min="0" step="50" required defaultValue={itemEditor === "new" ? "" : itemEditor.price} placeholder="3500"/></label><label className="form-wide">Description<textarea name="description" rows={3} maxLength={240} defaultValue={itemEditor === "new" ? "" : itemEditor.description} placeholder="Décrivez brièvement l’article..."/></label><fieldset className="form-wide option-checks"><legend>Options et suppléments associés</legend>{options.filter((option) => option.active || (itemEditor !== "new" && itemEditor.optionIds.includes(option.id))).map((option) => <label key={option.id}><input type="checkbox" name="optionIds" value={option.id} defaultChecked={itemEditor !== "new" && itemEditor.optionIds.includes(option.id)}/><span>{option.name}</span><small>{option.type === "extra" ? "Supplément" : "Option"} · {money(option.price)}</small></label>)}{options.length === 0 && <p>Créez d’abord des options et suppléments dans l’onglet dédié.</p>}</fieldset></div>
      <div className="catalogue-modal-actions"><button type="button" className="button button-quiet" onClick={() => setItemEditor(null)}>Annuler</button><button type="submit" className="button button-primary"><Check size={16}/> Enregistrer</button></div>
    </form></div>}

    {categoryEditor !== null && <div className="catalogue-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setCategoryEditor(null); }}><form className="catalogue-modal compact" onSubmit={saveCategory}><div className="catalogue-modal-head"><div><span>ORGANISATION DE LA CARTE</span><h2>{categoryEditor === "new" ? "Nouvelle catégorie" : "Modifier la catégorie"}</h2></div><button type="button" aria-label="Fermer" onClick={() => setCategoryEditor(null)}><X size={18}/></button></div><div className="catalogue-form-grid"><label className="form-wide">Nom<input name="name" required maxLength={50} defaultValue={categoryEditor === "new" ? "" : categoryEditor.name} placeholder="Ex. Entrées"/></label><label className="form-wide">Description<textarea name="description" rows={3} maxLength={140} defaultValue={categoryEditor === "new" ? "" : categoryEditor.description ?? ""} placeholder="Description facultative"/></label></div><div className="catalogue-modal-actions"><button type="button" className="button button-quiet" onClick={() => setCategoryEditor(null)}>Annuler</button><button type="submit" className="button button-primary"><Check size={16}/> Enregistrer</button></div></form></div>}

    {optionEditor !== null && <div className="catalogue-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setOptionEditor(null); }}><form className="catalogue-modal compact" onSubmit={saveOption}><div className="catalogue-modal-head"><div><span>PERSONNALISATION DES ARTICLES</span><h2>{optionEditor === "new" ? "Nouvelle option ou supplément" : "Modifier l’option"}</h2></div><button type="button" aria-label="Fermer" onClick={() => setOptionEditor(null)}><X size={18}/></button></div><div className="catalogue-form-grid"><label className="form-wide">Nom<input name="name" required maxLength={60} defaultValue={optionEditor === "new" ? "" : optionEditor.name} placeholder="Ex. Supplément fromage"/></label><label>Type<select name="type" defaultValue={optionEditor === "new" ? "extra" : optionEditor.type}><option value="choice">Option / choix</option><option value="extra">Supplément payant</option></select></label><label>Groupe de choix<input name="groupName" maxLength={40} defaultValue={optionEditor === "new" ? "Accompagnement" : optionEditor.groupName ?? "Choix"} placeholder="Ex. Accompagnement"/></label><label>Prix additionnel (FCFA)<input name="price" type="number" min="0" step="50" required defaultValue={optionEditor === "new" ? "0" : optionEditor.price}/></label></div><div className="catalogue-modal-actions"><button type="button" className="button button-quiet" onClick={() => setOptionEditor(null)}>Annuler</button><button type="submit" className="button button-primary"><Check size={16}/> Enregistrer</button></div></form></div>}
  </section>;
}
