import { useState, type FormEvent } from "react";
import { ClipboardList, PackageCheck, Plus, Truck, Users, X } from "lucide-react";
import type { GoodsReceipt, InventoryItem, PurchaseOrder, PurchaseOrderLine, Supplier } from "../domain/types";
import { purchaseOrderTotal } from "../domain/purchasing";
import "./PurchasingManagement.css";

type SupplierInput = Pick<Supplier, "name"> & Partial<Pick<Supplier, "contactName" | "phone" | "email" | "address">>;
type OrderLineInput = Pick<PurchaseOrderLine, "inventoryItemId" | "quantity" | "unitCost">;
type ReceiptLineInput = { purchaseOrderLineId: string; quantity: number };
type Props = {
  suppliers: Supplier[];
  orders: PurchaseOrder[];
  inventory: InventoryItem[];
  receipts: GoodsReceipt[];
  onAddSupplier: (supplier: SupplierInput) => boolean;
  onCreateOrder: (supplierId: string, lines: OrderLineInput[], expectedAtISO?: string, notes?: string) => boolean;
  onReceiveOrder: (orderId: string, lines: ReceiptLineInput[]) => boolean;
};

const money = (amount: number) => new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(amount) + " FCFA";
const statusLabels = { ordered: "Commandée", partially_received: "Partiellement reçue", received: "Réceptionnée", cancelled: "Annulée" };
const dateLabel = (value?: string) => value ? new Date(value).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric", timeZone: "Africa/Abidjan" }) : "Non définie";

export default function PurchasingManagement({ suppliers, orders, inventory, receipts, onAddSupplier, onCreateOrder, onReceiveOrder }: Props) {
  const [tab, setTab] = useState<"orders" | "suppliers" | "receipts">("orders");
  const [showSupplier, setShowSupplier] = useState(false);
  const [showOrder, setShowOrder] = useState(false);
  const [receivingOrder, setReceivingOrder] = useState<PurchaseOrder | null>(null);
  const [supplierName, setSupplierName] = useState("");
  const [contactName, setContactName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [selectedSupplierId, setSelectedSupplierId] = useState("");
  const [expectedDate, setExpectedDate] = useState("");
  const [notes, setNotes] = useState("");
  const [orderLines, setOrderLines] = useState<OrderLineInput[]>([{ inventoryItemId: inventory[0]?.id ?? "", quantity: 1, unitCost: 0 }]);
  const [receiptQuantities, setReceiptQuantities] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const activeSuppliers = suppliers.filter((supplier) => supplier.active).length;
  const openOrders = orders.filter((order) => ["ordered", "partially_received"].includes(order.status));
  const pendingValue = openOrders.reduce((sum, order) => sum + order.lines.reduce((subtotal, line) => subtotal + (line.quantity - line.receivedQuantity) * line.unitCost, 0), 0);

  function submitSupplier(event: FormEvent) {
    event.preventDefault(); setError("");
    if (!onAddSupplier({ name: supplierName.trim(), contactName: contactName.trim(), phone: phone.trim(), email: email.trim(), address: address.trim() })) { setError("Vérifiez le nom et les coordonnées du fournisseur."); return; }
    setSupplierName(""); setContactName(""); setPhone(""); setEmail(""); setAddress(""); setShowSupplier(false);
  }
  function updateLine(index: number, patch: Partial<OrderLineInput>) {
    setOrderLines((current) => current.map((line, lineIndex) => lineIndex === index ? { ...line, ...patch } : line));
  }
  function submitOrder(event: FormEvent) {
    event.preventDefault(); setError("");
    if (!onCreateOrder(selectedSupplierId, orderLines, expectedDate || undefined, notes.trim() || undefined)) { setError("La commande est invalide : vérifiez le fournisseur, les articles, les quantités et les coûts."); return; }
    setOrderLines([{ inventoryItemId: inventory[0]?.id ?? "", quantity: 1, unitCost: 0 }]); setExpectedDate(""); setNotes(""); setShowOrder(false);
  }
  function openReceipt(order: PurchaseOrder) {
    setReceivingOrder(order);
    setReceiptQuantities(Object.fromEntries(order.lines.filter((line) => line.quantity > line.receivedQuantity).map((line) => [line.id, ""])));
    setError("");
  }
  function submitReceipt(event: FormEvent) {
    event.preventDefault(); setError("");
    if (!receivingOrder) return;
    const lines = Object.entries(receiptQuantities).filter(([, value]) => value.trim() !== "").map(([purchaseOrderLineId, value]) => ({ purchaseOrderLineId, quantity: Number(value) }));
    if (!onReceiveOrder(receivingOrder.id, lines)) { setError("Réception invalide : les quantités doivent être positives et ne pas dépasser le reliquat."); return; }
    setReceivingOrder(null); setReceiptQuantities({});
  }

  return <section className="purchasing-page">
    <header className="page-heading"><div><div className="eyebrow">STOCKS · APPROVISIONNEMENTS</div><h1>Approvisionnements</h1><p>Suivez les fournisseurs, les commandes et les réceptions de marchandises.</p></div><span className="demo-tag">DÉMONSTRATION</span></header>
    <div className="purchasing-kpis"><article><Users size={17}/><span>Fournisseurs actifs</span><strong>{activeSuppliers}</strong></article><article><ClipboardList size={17}/><span>Commandes en cours</span><strong>{openOrders.length}</strong></article><article><Truck size={17}/><span>Valeur à réceptionner</span><strong>{money(pendingValue)}</strong></article><article><PackageCheck size={17}/><span>Réceptions enregistrées</span><strong>{receipts.length}</strong></article></div>
    <div className="purchasing-tabs"><button className={tab === "orders" ? "active" : ""} onClick={() => setTab("orders")}>Commandes d’achat</button><button className={tab === "suppliers" ? "active" : ""} onClick={() => setTab("suppliers")}>Fournisseurs</button><button className={tab === "receipts" ? "active" : ""} onClick={() => setTab("receipts")}>Réceptions</button></div>

    {tab === "orders" && <section className="panel purchasing-panel"><header><div><h2>Commandes d’approvisionnement</h2><p>{orders.length} commande(s) enregistrée(s)</p></div><button className="button button-primary" onClick={() => { setSelectedSupplierId(suppliers.find((supplier) => supplier.active)?.id ?? ""); setShowOrder(true); }}><Plus size={15}/> Nouvelle commande</button></header><div className="purchasing-order-list">{orders.map((order) => {
      const total = purchaseOrderTotal(order.lines);
      const receivedValue = order.lines.reduce((sum, line) => sum + line.receivedQuantity * line.unitCost, 0);
      return <article className="purchasing-order-card" key={order.id}><div className="purchasing-order-main"><span className="purchasing-order-id">{order.id}</span><strong>{order.supplierName}</strong><small>Créée le {dateLabel(order.createdAtISO)} · Livraison prévue : {dateLabel(order.expectedAtISO)}</small></div><div className="purchasing-order-progress"><div><span>{order.lines.reduce((sum,line)=>sum+line.receivedQuantity,0).toFixed(3)} / {order.lines.reduce((sum,line)=>sum+line.quantity,0).toFixed(3)} unités reçues</span><strong>{money(receivedValue)} / {money(total)}</strong></div><div className="purchasing-progress-track"><i style={{width:(total ? receivedValue/total*100 : 0)+"%"}}/></div></div><span className={`purchasing-status status-${order.status}`}>{statusLabels[order.status]}</span>{["ordered","partially_received"].includes(order.status) && <button className="purchasing-receive-button" onClick={() => openReceipt(order)}>Réceptionner</button>}</article>;
    })}{!orders.length && <div className="purchasing-empty">Aucune commande d’achat enregistrée.</div>}</div></section>}

    {tab === "suppliers" && <section className="panel purchasing-panel"><header><div><h2>Fournisseurs</h2><p>Répertoire des partenaires d’approvisionnement.</p></div><button className="button button-primary" onClick={() => setShowSupplier(true)}><Plus size={15}/> Ajouter un fournisseur</button></header><div className="purchasing-supplier-grid">{suppliers.map((supplier) => <article key={supplier.id}><div className="purchasing-supplier-avatar">{supplier.name.slice(0,1).toUpperCase()}</div><div><strong>{supplier.name}</strong><small>{supplier.contactName || "Contact non renseigné"}</small>{supplier.phone && <small>{supplier.phone}</small>}{supplier.email && <small>{supplier.email}</small>}{supplier.address && <small>{supplier.address}</small>}</div><span className={supplier.active ? "supplier-active" : "supplier-inactive"}>{supplier.active ? "Actif" : "Inactif"}</span></article>)}{!suppliers.length && <div className="purchasing-empty">Aucun fournisseur enregistré.</div>}</div></section>}

    {tab === "receipts" && <section className="panel purchasing-panel"><header><div><h2>Historique des réceptions</h2><p>Quantités réellement entrées en stock.</p></div></header><div className="purchasing-receipt-list">{receipts.map((receipt) => <article key={receipt.id}><PackageCheck size={17}/><div><strong>{receipt.id} · {receipt.purchaseOrderId}</strong><small>{dateLabel(receipt.receivedAtISO)} · {receipt.lines.length} ligne(s)</small></div><strong>{receipt.lines.reduce((sum,line)=>sum+line.quantity,0).toFixed(3)} unités</strong></article>)}{!receipts.length && <div className="purchasing-empty">Aucune réception enregistrée.</div>}</div></section>}

    {showSupplier && <div className="purchasing-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowSupplier(false); }}><section className="purchasing-modal" role="dialog" aria-modal="true" aria-labelledby="supplier-title"><header><div><h2 id="supplier-title">Ajouter un fournisseur</h2><p>Enregistrez les coordonnées du partenaire.</p></div><button className="icon-button" onClick={() => setShowSupplier(false)} aria-label="Fermer"><X size={18}/></button></header><form onSubmit={submitSupplier}><label>Nom du fournisseur<input required maxLength={100} value={supplierName} onChange={(event)=>setSupplierName(event.target.value)} placeholder="Nom de l’entreprise"/></label><label>Nom du contact<input value={contactName} onChange={(event)=>setContactName(event.target.value)} placeholder="Contact principal"/></label><label>Téléphone<input value={phone} onChange={(event)=>setPhone(event.target.value)} placeholder="+225 ..."/></label><label>E-mail<input type="email" value={email} onChange={(event)=>setEmail(event.target.value)} placeholder="contact@fournisseur.ci"/></label><label>Adresse<input value={address} onChange={(event)=>setAddress(event.target.value)} placeholder="Adresse ou zone"/></label>{error && <p className="purchasing-error" role="alert">{error}</p>}<footer><button type="button" className="button button-secondary" onClick={()=>setShowSupplier(false)}>Annuler</button><button type="submit" className="button button-primary">Enregistrer</button></footer></form></section></div>}

    {showOrder && <div className="purchasing-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowOrder(false); }}><section className="purchasing-modal purchasing-order-modal" role="dialog" aria-modal="true" aria-labelledby="purchase-title"><header><div><h2 id="purchase-title">Nouvelle commande d’achat</h2><p>Définissez le fournisseur, les articles et les quantités attendues.</p></div><button className="icon-button" onClick={()=>setShowOrder(false)} aria-label="Fermer"><X size={18}/></button></header><form onSubmit={submitOrder}><label>Fournisseur<select required value={selectedSupplierId} onChange={(event)=>setSelectedSupplierId(event.target.value)}><option value="">Sélectionner</option>{suppliers.filter((supplier)=>supplier.active).map((supplier)=><option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}</select></label><label>Date de livraison prévue<input type="date" min={new Date().toISOString().slice(0,10)} value={expectedDate} onChange={(event)=>setExpectedDate(event.target.value)}/></label><div className="purchasing-lines-heading"><strong>Articles commandés</strong><button type="button" onClick={()=>setOrderLines((current)=>[...current,{inventoryItemId:inventory[0]?.id??"",quantity:1,unitCost:0}])}><Plus size={13}/> Ajouter une ligne</button></div>{orderLines.map((line,index)=><div className="purchasing-line-form" key={index}><select aria-label="Article" value={line.inventoryItemId} onChange={(event)=>updateLine(index,{inventoryItemId:event.target.value})}>{inventory.map((item)=><option key={item.id} value={item.id}>{item.name} ({item.unit})</option>)}</select><input aria-label="Quantité commandée" type="number" min={0.001} step={0.001} value={line.quantity} onChange={(event)=>updateLine(index,{quantity:Number(event.target.value)})}/><input aria-label="Coût unitaire FCFA" type="number" min={0} step={1} value={line.unitCost} onChange={(event)=>updateLine(index,{unitCost:Number(event.target.value)})}/><button type="button" className="purchasing-remove-line" onClick={()=>setOrderLines((current)=>current.filter((_,lineIndex)=>lineIndex!==index))} disabled={orderLines.length===1} aria-label="Supprimer la ligne"><X size={15}/></button></div>)}<label>Notes<input value={notes} onChange={(event)=>setNotes(event.target.value)} placeholder="Instructions de livraison"/></label><div className="purchasing-total"><span>Total estimé</span><strong>{money(purchaseOrderTotal(orderLines.map((line)=>({...line,id:"",itemName:"",unit:"",receivedQuantity:0}))))}</strong></div>{error && <p className="purchasing-error" role="alert">{error}</p>}<footer><button type="button" className="button button-secondary" onClick={()=>setShowOrder(false)}>Annuler</button><button type="submit" className="button button-primary">Créer la commande</button></footer></form></section></div>}

    {receivingOrder && <div className="purchasing-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setReceivingOrder(null); }}><section className="purchasing-modal" role="dialog" aria-modal="true" aria-labelledby="receipt-title"><header><div><h2 id="receipt-title">Réception · {receivingOrder.id}</h2><p>Indiquez les quantités réellement livrées aujourd’hui.</p></div><button className="icon-button" onClick={()=>setReceivingOrder(null)} aria-label="Fermer"><X size={18}/></button></header><form onSubmit={submitReceipt}>{receivingOrder.lines.filter((line)=>line.quantity>line.receivedQuantity).map((line)=><label key={line.id}>{line.itemName} · reste {(line.quantity-line.receivedQuantity).toFixed(3)} {line.unit}<input type="number" min={0} max={line.quantity-line.receivedQuantity} step={0.001} value={receiptQuantities[line.id]??""} onChange={(event)=>setReceiptQuantities((current)=>({...current,[line.id]:event.target.value}))} placeholder="Quantité reçue"/></label>)}{error && <p className="purchasing-error" role="alert">{error}</p>}<footer><button type="button" className="button button-secondary" onClick={()=>setReceivingOrder(null)}>Annuler</button><button type="submit" className="button button-primary">Valider la réception</button></footer></form></section></div>}
  </section>;
}
