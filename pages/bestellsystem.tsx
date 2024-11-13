import "@/app/globals.css"
import React, { useState, useEffect } from 'react'
import { Plus, Minus, ShoppingCart, X } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { toast } from "@/hooks/use-toast"
import { useSearchParams } from 'next/navigation'
import PocketBase from 'pocketbase';

const pb = new PocketBase('http://127.0.0.1:8090'); // Passe die URL deines Pocketbase-Servers an

type MenuItem = {
  id: number
  name: string
  price: number
  description: string
}

type CartItem = MenuItem & {
  quantity: number
  note: string
  customerName: string
}

type Order = {
  id: string
  tableNumber: string
  customerName: string
  items: {
    name: string
    quantity: number
    note: string
    price: number
  }[]
  status: 'pending' | 'preparing' | 'delivered' | 'paid'
  timestamp: Date | string
}

const menuItems: MenuItem[] = [
  { id: 1, name: "Margherita Pizza", price: 8.99, description: "Klassische Pizza mit Tomaten und Mozzarella" },
  { id: 2, name: "Spaghetti Carbonara", price: 10.99, description: "Cremige Pasta mit Speck und Ei" },
  { id: 3, name: "Caesar Salad", price: 7.99, description: "Frischer Salat mit Croutons und Caesar-Dressing" },
]

export default function Component() {
  const [cart, setCart] = useState<CartItem[]>([])
  const [customerName, setCustomerName] = useState("")
  const [tableNumber, setTableNumber] = useState("")
  const [error, setError] = useState("") // Zustand für Fehlermeldung
  const [latestOrders, setLatestOrders] = useState<Order[]>([]) // Zustand für die Liste der letzten Bestellungen
  const searchParams = useSearchParams()

  useEffect(() => {
    const table = searchParams.get('table')
    if (table) {
      setTableNumber(table)
    }
  }, [searchParams])

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const table = searchParams.get('table');
        
        if (!table) {
          console.error("Keine Tischnummer in der URL angegeben.");
          return;
        }
  
        const orders = await pb.collection('orders').getFullList<Order>({
          sort: '-timestamp',
          filter: `tableNumber="${table}"`, // Filter für den aktuellen Tisch
        });
  
        setLatestOrders(orders);
  
        // WebSocket-Abonnements für Echtzeit-Updates
        orders.forEach(order => {
          pb.collection('orders').subscribe(order.id, (e) => {
            if (e.action === 'update') {
              setLatestOrders((prevOrders) =>
                prevOrders.map((prevOrder) =>
                  prevOrder.id === e.record.id ? (e.record as Order) : prevOrder
                )
              );
            } else if (e.action === 'delete') {
              setLatestOrders((prevOrders) =>
                prevOrders.filter((prevOrder) => prevOrder.id !== e.record.id)
              );
            }
          });
        });
      } catch (error) {
        console.error("Fehler beim Abrufen der Bestellungen:", error);
      }
    };
  
    fetchOrders();
  
    return () => {
      // Entferne Abonnements beim Entladen der Komponente
      latestOrders.forEach(order => {
        pb.collection('orders').unsubscribe(order.id);
      });
    };
  }, [searchParams]);
  
  // Funktion zum Rufen des Kellners
  const callWaiter = async () => {
    if (!tableNumber) {
      toast({
        title: "Fehler",
        description: "Die Tischnummer fehlt. Bitte laden Sie die Seite neu.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      await pb.collection('waiter_calls').create({ tableNumber });
      toast({
        title: "Kellner gerufen",
        description: `Ein Kellner wurde für Tisch ${tableNumber} gerufen.`,
      });
    } catch (error) {
      toast({
        title: "Fehler",
        description: "Es gab ein Problem beim Rufen des Kellners. Bitte versuchen Sie es erneut.",
        variant: "destructive",
      });
      console.error("Kellner-Ruf Fehler:", error);
    }
  };

  const addToCart = (item: MenuItem) => {
    // Konvertiere den Kundennamen zu Kleinbuchstaben, um unabhängig von Groß-/Kleinschreibung zu vergleichen
    const normalizedCustomerName = customerName.toLowerCase();
    
    const existingItem = cart.find(
      (cartItem) => cartItem.name === item.name && cartItem.customerName.toLowerCase() === normalizedCustomerName
    );
  
    if (existingItem) {
      // Wenn der Artikel bereits existiert, aktualisieren wir nur die Menge
      setCart(
        cart.map((cartItem) =>
          cartItem.name === item.name && cartItem.customerName.toLowerCase() === normalizedCustomerName
            ? { ...cartItem, quantity: cartItem.quantity + 1 }
            : cartItem
        )
      );
    } else {
      // Wenn der Artikel noch nicht existiert, fügen wir ihn hinzu
      setCart([
        ...cart,
        { ...item, quantity: 1, note: "", customerName: customerName },
      ]);
    }
  };
  
  

  const removeFromCart = (item: CartItem) => {
    const newCart = cart.filter(cartItem => !(cartItem.id === item.id && cartItem.customerName === item.customerName))
    setCart(newCart)
  }

  const updateQuantity = (item: CartItem, newQuantity: number) => {
    if (newQuantity === 0) {
      removeFromCart(item)
    } else {
      setCart(cart.map(cartItem => 
        cartItem.id === item.id && cartItem.customerName === item.customerName
          ? { ...cartItem, quantity: newQuantity }
          : cartItem
      ))
    }
  }

  const updateNote = (item: CartItem, note: string) => {
    setCart(cart.map(cartItem => 
      cartItem.id === item.id && cartItem.customerName === item.customerName
        ? { ...cartItem, note }
        : cartItem
    ))
  }

  const totalPrice = cart.reduce((sum, item) => sum + item.price * item.quantity, 0)

  const placeOrder = async () => {
    if (cart.length === 0) {
      setError("Ihr Warenkorb ist leer. Bitte fügen Sie Artikel hinzu, bevor Sie bestellen.");
      return;
    }
    if (!customerName) {
      setError("Bitte geben Sie einen Namen ein, um eine Bestellung aufzugeben.");
      return;
    }
  
    try {
      // Konvertiere den Kundennamen zu Kleinbuchstaben
      const normalizedCustomerName = customerName.toLowerCase();
  
      // Prüfen, ob es bereits eine bestehende Bestellung mit "pending" Status für den Kunden gibt (unabhängig von Groß-/Kleinschreibung)
      const existingOrder = latestOrders.find(
        (order) => order.customerName.toLowerCase() === normalizedCustomerName && order.status === 'pending'
      );
  
      if (existingOrder) {
        // Wenn es eine bestehende Bestellung gibt, fügen wir die neuen Artikel zur bestehenden Bestellung hinzu
        const updatedItems = [...existingOrder.items, ...cart.map(item => ({
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          note: item.note,
        }))];
  
        await pb.collection('orders').update(existingOrder.id, { items: updatedItems });
  
        // Update die Bestellung lokal
        setLatestOrders((prevOrders) =>
          prevOrders.map((order) =>
            order.id === existingOrder.id ? { ...order, items: updatedItems } : order
          )
        );
  
        toast({
          title: "Bestellung aktualisiert",
          description: `Ihre Bestellung wurde erfolgreich aktualisiert, ${customerName}.`,
        });
      } else {
        // Wenn keine bestehende Bestellung existiert, erstellen wir eine neue
        const orderData = {
          customerName,
          tableNumber,
          items: cart.map(item => ({
            name: item.name,
            price: item.price,
            quantity: item.quantity,
            note: item.note,
          })),
          status: 'pending',
          timestamp: new Date().toISOString(),
        };
  
        const newOrder = await pb.collection('orders').create(orderData);
        setLatestOrders(prevOrders => [newOrder, ...prevOrders]);
  
        toast({
          title: "Bestellung erfolgreich",
          description: `Vielen Dank für Ihre Bestellung, ${customerName}!`,
        });
      }
  
      setCart([]);
      setCustomerName("");
      setError("");
    } catch (error) {
      toast({
        title: "Fehler",
        description: "Es gab ein Problem bei der Bestellungsübermittlung. Bitte versuchen Sie es erneut.",
        variant: "destructive",
      });
      console.error("Bestellfehler:", error);
    }
  };
  
  

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Digitales Bestellsystem - Tisch {tableNumber}</h1>
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Menü</CardTitle>
            <CardDescription>Wählen Sie Ihre Gerichte aus</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {menuItems.map(item => (
                <div key={item.id} className="flex justify-between items-center">
                  <div>
                    <h3 className="font-semibold">{item.name}</h3>
                    <p className="text-sm text-gray-500">{item.description}</p>
                    <p className="text-sm font-medium">{item.price.toFixed(2)} €</p>
                  </div>
                  <Button onClick={() => addToCart(item)}>
                    <Plus className="mr-2 h-4 w-4" /> Hinzufügen
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Warenkorb</CardTitle>
            <CardDescription>Ihre aktuelle Bestellung</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label htmlFor="customerName">Ihr Name</Label>
                <Input
                  id="customerName"
                  value={customerName}
                  onChange={(e) => {
                    setCustomerName(e.target.value)
                    setError("") // Fehlernachricht zurücksetzen, wenn der Benutzer zu tippen beginnt
                  }}
                  placeholder="Geben Sie Ihren Namen ein"
                />
                {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
              </div>
              {cart.map(item => (
                <div key={`${item.id}-${item.customerName}`} className="border-b pb-4">
                  <div className="flex justify-between items-center">
                    <h3 className="font-semibold">{item.name}</h3>
                    <Button variant="outline" size="icon" onClick={() => removeFromCart(item)}>
                      <X className="h-4 w-4" />
                      <span className="sr-only">Entfernen</span>
                    </Button>
                  </div>
                  <p className="text-sm text-gray-500">Für: {item.customerName}</p>
                  <div className="flex items-center mt-2">
                    <Button variant="outline" size="icon" onClick={() => updateQuantity(item, item.quantity - 1)}>
                      <Minus className="h-4 w-4" />
                      <span className="sr-only">Menge verringern</span>
                    </Button>
                    <span className="mx-2">{item.quantity}</span>
                    <Button variant="outline" size="icon" onClick={() => updateQuantity(item, item.quantity + 1)}>
                      <Plus className="h-4 w-4" />
                      <span className="sr-only">Menge erhöhen</span>
                    </Button>
                    <span className="ml-auto">{(item.price * item.quantity).toFixed(2)} €</span>
                  </div>
                  <Textarea
                    placeholder="Spezielle Wünsche oder Notizen"
                    value={item.note}
                    onChange={(e) => updateNote(item, e.target.value)}
                    className="mt-2"
                  />
                </div>
              ))}
            </div>
          </CardContent>
          <CardFooter className="flex flex-col items-stretch">
            <div className="flex justify-between items-center w-full mb-4">
              <span className="font-semibold">Gesamtpreis:</span>
              <span className="font-bold text-lg">{totalPrice.toFixed(2)} €</span>
            </div>
            <Button onClick={placeOrder} className="w-full">
              <ShoppingCart className="mr-2 h-4 w-4" /> Bestellung aufgeben
            </Button>
            <Button onClick={callWaiter} className="w-full mt-2 bg-yellow-500 text-white">
              🛎️ Kellner Rufen
            </Button>
          </CardFooter>
        </Card>
      </div>

      {/* Box für die Liste der letzten Bestellungen */}
      {latestOrders.length > 0 && (
        <div className="mt-6">
          <h3 className="text-lg font-bold mb-2">Ihre letzten Bestellungen</h3>
          {latestOrders.map((order) => {
            const calculatedTotalPrice = order.items.reduce(
              (sum, item) => sum + item.price * item.quantity,
              0
            ); // Berechnung des Gesamtpreises
            
            return (
              <div key={order.id} className="mb-4 border p-4 rounded">
                <div className="flex items-center space-x-2">
                  <p className="text-gray-600">Bestellstatus:</p>
                  <Badge variant={
                    order.status === 'pending' ? 'default' :
                    order.status === 'preparing' ? 'secondary' :
                    order.status === 'delivered' ? 'primary' : 'accent'
                  }>
                    {order.status}
                  </Badge>
                </div>
                <p className="text-gray-600">Kundenname: {order.customerName}</p>
                <table className="w-full mt-2 border border-gray-200">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="px-4 py-2 border-b">Gericht</th>
                      <th className="px-4 py-2 border-b">Preis</th>
                      <th className="px-4 py-2 border-b">Menge</th>
                      <th className="px-4 py-2 border-b">Notiz</th>
                    </tr>
                  </thead>
                  <tbody>
                    {order.items.map((item, index) => (
                      <tr key={index} className="border-t">
                        <td className="px-4 py-2">{item.name}</td>
                        <td className="px-4 py-2 text-center">{item.price.toFixed(2)} €</td>
                        <td className="px-4 py-2 text-center">{item.quantity}</td>
                        <td className="px-4 py-2">{item.note || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="mt-2 font-semibold">Gesamtpreis: {calculatedTotalPrice.toFixed(2)} €</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  )
}
