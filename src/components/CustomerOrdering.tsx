import { useMemo, useState, type FormEvent } from "react";
import { Check, ChevronRight, Coffee, Minus, Plus, ShoppingBag, ShoppingCart, Trash2, Utensils, X } from "lucide-react";
import type { Customer, DiningTable, MenuCategory, MenuItem, MenuOption, OrderLine } from "../domain/types";
import { canOrderAtTableStatus } from "../domain/sales";

type CartLine = {
  id: string;
  itemId: string;
  name: string;
  quantity: number;
  basePrice: number;
  unitPrice: number;
  selectedOptions: MenuOption[];
  comment: string;
};
type ServiceMode = "onsite" | "takeaway";
type Props = {
  categories: MenuCategory[];
  items: MenuItem[];
  options: MenuOption[];
  tables: DiningTable[];
  customers: Customer[];
  onSubmitOrder: (order: { customerId?: string; customerName: string; tableLabel: string; lines: OrderLine[] }) => boolean;
};
const money = (amount: number) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "XOF", maximumFractionDigits: 0 }).format(amount);
const id = () => `cart-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

export default function CustomerOrdering({ categories, items, options, tables, customers, onSubmitOrder }: Props) {
  const [categoryId, setCategoryId] = useState("all");
  const [search, setSearch] = useState("");
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [choiceByGroup, setChoiceByGroup] = useState<Record<string, string>>({});
  const [extraIds, setExtraIds] = useState<string[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [comment, setComment] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [serviceMode, setServiceMode] = useState<ServiceMode>("onsite");
  const [tableId, setTableId] = useState("");
  const [checkoutError, setCheckoutError] = useState("");
  const [confirmation, setConfirmation] = useState("");

  const availableTables = tables.filter((table) => canOrderAtTableStatus(table.status));
  const visibleItems = useMemo(() => items.filter((item) => {
    const matchesCategory = categoryId === "all" || item.categoryId === categoryId;
    const matchesSearch = `${item.name} ${item.description}`.toLocaleLowerCase("fr").includes(search.toLocaleLowerCase("fr"));
    return item.available && matchesCategory && matchesSearch;
  }), [items, categoryId, search]);
  const cartTotal = cart.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0);
  const cartCount = cart.reduce((sum, line) => sum + line.quantity, 0);
  const itemOptions = editingItem ? options.filter((option) => editingItem.optionIds.includes(option.id) && option.active) : [];
  const choiceGroups = Array.from(new Set(itemOptions.filter((option) => option.type === "choice").map((option) => option.groupName || "Choix")));
  const selectedOptionList = itemOptions.filter((option) => option.type === "extra" ? extraIds.includes(option.id) : choiceByGroup[option.groupName || "Choix"] === option.id);
  const configuredUnitPrice = (editingItem?.price ?? 0) + selectedOptionList.reduce((sum, option) => sum + option.price, 0);

  function openItem(item: MenuItem) {
    setEditingItem(item);
    setChoiceByGroup({});
    setExtraIds([]);
    setQuantity(1);
    setComment("");
  }

  function addToCart() {
    if (!editingItem) return;
    const selected = itemOptions.filter((option) => option.type === "extra" ? extraIds.includes(option.id) : choiceByGroup[option.groupName || "Choix"] === option.id);
    const unitPrice = editingItem.price + selected.reduce((sum, option) => sum + option.price, 0);
    setCart((current) => [...current, {
      id: id(), itemId: editingItem.id, name: editingItem.name, quantity, basePrice: editingItem.price,
      unitPrice, selectedOptions: selected, comment: comment.trim(),
    }]);
    setEditingItem(null);
  }

  function changeQuantity(lineId: string, delta: number) {
    setCart((current) => current.map((line) => line.id === lineId ? { ...line, quantity: Math.max(1, line.quantity + delta) } : line));
  }

  function submitOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCheckoutError("");
    if (!cart.length) { setCheckoutError("Ajoutez au moins un article à votre panier."); return; }
    if (!customerName.trim()) { setCheckoutError("Indiquez votre nom pour identifier la commande."); return; }
    const selectedTable = tables.find((table) => table.id === tableId && canOrderAtTableStatus(table.status));
    if (serviceMode === "onsite" && !selectedTable) { setCheckoutError("Sélectionnez une table disponible ou déjà en service."); return; }
    const lines: OrderLine[] = cart.map((line) => ({
      itemId: line.itemId,
      name: line.name + (line.selectedOptions.length ? ` (${line.selectedOptions.map((option) => option.name).join(", ")})` : ""),
      quantity: line.quantity,
      unitPrice: line.unitPrice,
      options: line.selectedOptions.map((option) => option.name),
      comment: line.comment || undefined,
    }));
    const accepted = onSubmitOrder({ ...(customerId ? { customerId } : {}), customerName: customerName.trim(), tableLabel: serviceMode === "takeaway" ? "À emporter" : selectedTable!.label, lines });
    if (!accepted) { setCheckoutError("La commande n’a pas pu être enregistrée. Vérifiez les articles et la disponibilité de la table, puis réessayez."); return; }
    setConfirmation("Votre commande a bien été enregistrée dans la démonstration.");
    setCart([]);
    setCustomerName("");
    setCustomerId("");
    setTableId("");
  }

  if (confirmation) return <section className="customer-ordering">
    <div className="order-success"><div className="order-success-icon"><Check size={30}/></div><span>COMMANDE ENREGISTRÉE</span><h1>Merci pour votre commande !</h1><p>{confirmation}</p><button className="button button-primary" onClick={() => setConfirmation("")}>Revenir à la carte</button></div>
  </section>;

  return <section className="customer-ordering">
    <header className="customer-welcome"><div><span className="customer-eyebrow">CHEZ AWA · ABIDJAN</span><h1>Qu’est-ce qui vous ferait plaisir ?</h1><p>Choisissez vos plats, personnalisez-les et vérifiez votre panier avant de commander.</p></div><div className="customer-cart-indicator"><ShoppingBag size={19}/><span>{cartCount} article{cartCount > 1 ? "s" : ""}</span><strong>{money(cartTotal)}</strong></div></header>
    <div className="customer-order-layout">
      <main className="customer-menu-column">
        <div className="customer-menu-toolbar"><label className="customer-search"><Utensils size={17}/><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Rechercher dans la carte..."/></label></div>
        <div className="customer-category-strip" aria-label="Filtrer les catégories"><button className={categoryId === "all" ? "active" : ""} onClick={() => setCategoryId("all")}>Tout</button>{categories.map((category) => <button key={category.id} className={categoryId === category.id ? "active" : ""} onClick={() => setCategoryId(category.id)}>{category.name}</button>)}</div>
        <div className="customer-product-grid">{visibleItems.map((item) => {
          const category = categories.find((entry) => entry.id === item.categoryId);
          return <article className="customer-product-card" key={item.id}><div className={`customer-product-visual ${item.type === "drink" ? "drink" : ""}`}>{item.type === "drink" ? <Coffee size={28}/> : <Utensils size={28}/>}<span>{item.type === "drink" ? "BOISSON" : "CUISINE"}</span></div><div className="customer-product-info"><span className="customer-product-category">{category?.name ?? "Carte"}</span><h3>{item.name}</h3><p>{item.description}</p><div className="customer-product-bottom"><strong>{money(item.price)}</strong><button onClick={() => openItem(item)} aria-label={`Personnaliser ${item.name}`}><Plus size={17}/> Ajouter</button></div></div></article>;
        })}{visibleItems.length === 0 && <div className="empty-state customer-empty">Aucun article disponible dans cette sélection.</div>}</div>
      </main>
      <aside className="customer-cart-panel">
        <div className="customer-cart-heading"><div><span>VOTRE SÉLECTION</span><h2>Mon panier <small>{cartCount}</small></h2></div><ShoppingCart size={20}/></div>
        {cart.length === 0 ? <div className="customer-cart-empty"><div><ShoppingBag size={25}/></div><strong>Votre panier est vide</strong><p>Ajoutez un plat ou une boisson pour commencer.</p></div> : <>
          <div className="customer-cart-lines">{cart.map((line) => <article className="customer-cart-line" key={line.id}><div className="customer-cart-line-top"><strong>{line.name}</strong><button aria-label={`Retirer ${line.name}`} onClick={() => setCart((current) => current.filter((entry) => entry.id !== line.id))}><Trash2 size={14}/></button></div>{line.selectedOptions.length > 0 && <p>{line.selectedOptions.map((option) => option.name).join(" · ")}</p>}{line.comment && <p className="customer-cart-comment">« {line.comment} »</p>}<div className="customer-cart-line-bottom"><div className="quantity-control"><button aria-label="Diminuer la quantité" onClick={() => changeQuantity(line.id, -1)}><Minus size={12}/></button><span>{line.quantity}</span><button aria-label="Augmenter la quantité" onClick={() => changeQuantity(line.id, 1)}><Plus size={12}/></button></div><strong>{money(line.unitPrice * line.quantity)}</strong></div></article>)}</div>
          <form className="customer-checkout" onSubmit={submitOrder}><div className="customer-checkout-total"><span>Total à régler</span><strong>{money(cartTotal)}</strong></div><label>Associer une fiche client (facultatif)<select value={customerId} onChange={(event) => { const nextId = event.target.value; setCustomerId(nextId); const linked = customers.find((customer) => customer.id === nextId); if (linked) setCustomerName(linked.name); }}><option value="">Client non enregistré</option>{customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name} · {customer.phone}</option>)}</select></label><label>Votre nom<input list="registered-customer-names" value={customerName} onChange={(event) => { setCustomerName(event.target.value); setCustomerId(""); }} placeholder="Saisir le nom du client" required maxLength={60}/><datalist id="registered-customer-names">{customers.map((customer) => <option key={customer.id} value={customer.name}/>)}</datalist></label><fieldset><legend>Mode de commande</legend><label className={serviceMode === "onsite" ? "selected" : ""}><input type="radio" name="serviceMode" checked={serviceMode === "onsite"} onChange={() => setServiceMode("onsite")}/> Sur place</label><label className={serviceMode === "takeaway" ? "selected" : ""}><input type="radio" name="serviceMode" checked={serviceMode === "takeaway"} onChange={() => setServiceMode("takeaway")}/> À emporter</label></fieldset>{serviceMode === "onsite" && <label>Table<select value={tableId} onChange={(event) => setTableId(event.target.value)} required><option value="">Choisir une table disponible ou déjà en service</option>{availableTables.map((table) => <option key={table.id} value={table.id}>{table.label} · {table.area} · {table.seats} places{table.status === "occupied" ? " · Déjà en service" : ""}</option>)}</select>{availableTables.length === 0 && <small>Aucune table disponible ou déjà en service pour le moment.</small>}</label>}{checkoutError && <p className="customer-checkout-error" role="alert">{checkoutError}</p>}<button className="button button-primary customer-submit" type="submit" disabled={!cart.length || (serviceMode === "onsite" && availableTables.length === 0)}>Valider ma commande <ChevronRight size={17}/></button><small className="customer-demo-note">Démonstration : aucun paiement n’est effectué.</small></form>
        </>}
      </aside>
    </div>

    {editingItem && <div className="customer-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setEditingItem(null); }}><section className="customer-item-modal" role="dialog" aria-modal="true" aria-labelledby="customer-item-title"><header><div><span>PERSONNALISER VOTRE ARTICLE</span><h2 id="customer-item-title">{editingItem.name}</h2><p>{editingItem.description}</p></div><button aria-label="Fermer" onClick={() => setEditingItem(null)}><X size={19}/></button></header><div className="customer-item-base"><span>Prix de base</span><strong>{money(editingItem.price)}</strong></div>{choiceGroups.map((group) => <fieldset className="customer-choice-group" key={group}><legend>{group} <small>Choisissez une option</small></legend>{itemOptions.filter((option) => option.type === "choice" && (option.groupName || "Choix") === group).map((option) => <label key={option.id} className={choiceByGroup[group] === option.id ? "chosen" : ""}><input type="radio" name={`choice-${group}`} checked={choiceByGroup[group] === option.id} onChange={() => setChoiceByGroup((current) => ({ ...current, [group]: option.id }))}/><span>{option.name}</span><strong>{option.price > 0 ? `+${money(option.price)}` : "Inclus"}</strong></label>)}</fieldset>)}{itemOptions.some((option) => option.type === "extra") && <fieldset className="customer-choice-group"><legend>Suppléments <small>Plusieurs choix possibles</small></legend>{itemOptions.filter((option) => option.type === "extra").map((option) => <label key={option.id} className={extraIds.includes(option.id) ? "chosen" : ""}><input type="checkbox" checked={extraIds.includes(option.id)} onChange={(event) => setExtraIds((current) => event.target.checked ? [...current, option.id] : current.filter((id) => id !== option.id))}/><span>{option.name}</span><strong>{option.price > 0 ? `+${money(option.price)}` : "Gratuit"}</strong></label>)}</fieldset>}<label className="customer-comment">Commentaire pour la cuisine<textarea rows={3} maxLength={220} value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Ex. Bien cuit, sans piment, sauce à part..."/></label><div className="customer-modal-bottom"><div className="quantity-control large"><button aria-label="Diminuer la quantité" onClick={() => setQuantity((value) => Math.max(1, value - 1))}><Minus size={14}/></button><span>{quantity}</span><button aria-label="Augmenter la quantité" onClick={() => setQuantity((value) => value + 1)}><Plus size={14}/></button></div><button className="button button-primary" onClick={addToCart}>Ajouter · {money(configuredUnitPrice * quantity)}</button></div></section></div>}
  </section>;
}
