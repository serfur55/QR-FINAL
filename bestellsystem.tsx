import "@/app/globals.css"
import React, { useState, useEffect } from 'react'
import { Plus, Minus, ShoppingCart, X } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
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

const menuItems: MenuItem[] = [
  { id: 1, name: "Margherita Pizza", price: 8.99, description: "Klassische Pizza mit Tomaten und Mozzarella" },
  { id: 2, name: "Spaghetti Carbonara", price: 10.99, description: "Cremige Pasta mit Speck und Ei" },
  { id: 3, name: "Caesar Salad", price: 7.99, description: "Frischer Salat mit Croutons und Caesar-Dressing" },
]

export default function Component() {
  const [cart, setCart] = useState<CartItem[]>([])
  const [customerName, setCustomerName] = useState("")
  const [tableNumber, setTableNumber] = useState("")
  const searchParams = useSearchParams()

  useEffect(() => {
    const table = searchParams.get('table')
    if (table) {
      setTableNumber(table)
    }
  }, [searchParams])

  const addToCart = (item: MenuItem) => {
    const existingItem = cart.find(cartItem => cartItem.id === item.id && cartItem.customerName === customerName)
    if (existingItem) {
      setCart(cart.map(cartItem => 
        cartItem.id === item.id && cartItem.customerName === customerName
          ? { ...cartItem, quantity: cartItem.quantity + 1 }
          : cartItem
      ))
    } else {
      setCart([...cart, { ...item, quantity: 1, note: "", customerName }])
    }
  }

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

  const placeOrder = () => {
    if (cart.length === 0) {
      toast({
        title: "Fehler",
        description: "Ihr Warenkorb ist leer. Bitte fügen Sie Artikel hinzu, bevor Sie bestellen.",
        variant: "destructive",
      })
      return
    }
    if (!customerName || !tableNumber) {
      toast({
        title: "Fehler",
        description: "Bitte geben Sie Ihren Namen ein.",
        variant: "destructive",
      })
      return
    }
    // Hier würde normalerweise die Bestellung an den Server gesendet werden
    console.log("Bestellung aufgegeben:", { customerName, tableNumber, cart, totalPrice })
    toast({
      title: "Bestellung erfolgreich",
      description: `Vielen Dank für Ihre Bestellung, ${customerName}! Ihre Bestellung wird an Tisch ${tableNumber} geliefert.`,
    })
    // Warenkorb leeren nach erfolgreicher Bestellung
    setCart([])
  }

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
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Geben Sie Ihren Namen ein"
                />
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
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}