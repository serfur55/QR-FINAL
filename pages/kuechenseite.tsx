import "@/app/globals.css"
import React, { useState, useEffect } from 'react'
import PocketBase from 'pocketbase'
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"

const pb = new PocketBase('http://127.0.0.1:8090') // Passe die URL des Pocketbase-Servers an

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

type WaiterCall = {
  id: string
  tableNumber: string
  timestamp: Date | string
}

export default function KuechenSeite() {
  const [orders, setOrders] = useState<Order[]>([])
  const [waiterCalls, setWaiterCalls] = useState<WaiterCall[]>([]) // Zustand für Kellner-Rufe

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const records = await pb.collection('orders').getFullList<Order>({
          sort: '-timestamp',
        })
        const formattedOrders = records.map(order => ({
          ...order,
          timestamp: order.timestamp ? new Date(order.timestamp) : null,
        }))
        setOrders(formattedOrders)
      } catch (error) {
        console.error("Fehler beim Abrufen der Bestellungen:", error.message)
      }
    }

    const fetchWaiterCalls = async () => {
      try {
        const records = await pb.collection('waiter_calls').getFullList<WaiterCall>({
          sort: '-timestamp',
        })
        setWaiterCalls(records)
      } catch (error) {
        console.error("Fehler beim Abrufen der Kellner-Rufe:", error.message)
      }
    }

    fetchOrders() // Initiales Abrufen der Bestellungen
    fetchWaiterCalls() // Initiales Abrufen der Kellner-Rufe

    // WebSocket für Echtzeit-Updates für Bestellungen
    const unsubscribeOrders = pb.collection('orders').subscribe('*', (e) => {
      fetchOrders()
    })

    // WebSocket für Echtzeit-Updates für Kellner-Rufe
    const unsubscribeWaiterCalls = pb.collection('waiter_calls').subscribe('*', (e) => {
      fetchWaiterCalls()
    })

    return () => {
      unsubscribeOrders()
      unsubscribeWaiterCalls()
    }
  }, [])

  const updateOrderStatus = async (orderId: string, newStatus: Order['status']) => {
    try {
      await pb.collection('orders').update(orderId, { status: newStatus })
      setOrders(orders.map(order => 
        order.id === orderId ? { ...order, status: newStatus } : order
      ))
    } catch (error) {
      console.error("Fehler beim Aktualisieren des Bestellstatus:", error)
    }
  }

  const deleteOrder = async (orderId: string) => {
    try {
      await pb.collection('orders').delete(orderId)
      setOrders(orders.filter(order => order.id !== orderId))
    } catch (error) {
      console.error("Fehler beim Löschen der Bestellung:", error)
    }
  }

  const handleWaiterCallClear = async (callId: string) => {
    try {
      await pb.collection('waiter_calls').delete(callId)
      setWaiterCalls(waiterCalls.filter(call => call.id !== callId))
    } catch (error) {
      console.error("Fehler beim Löschen des Kellner-Rufs:", error)
    }
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Küchenseite - Bestellübersicht</h1>

      {/* Anzeige der Kellner-Rufe */}
      <div className="mb-6 border border-gray-300 p-4 rounded bg-gray-100">
        <h2 className="text-xl font-semibold mb-2">Kellner-Rufe</h2>
        {waiterCalls.map(call => (
          <div key={call.id} className="flex justify-between items-center bg-yellow-50 p-2 rounded mb-2 border border-yellow-200">
            <p className="text-gray-700">Tisch {call.tableNumber} hat einen Kellner gerufen</p>
            <Button variant="outline" onClick={() => handleWaiterCallClear(call.id)}>
              Bestätigen
            </Button>
          </div>
        ))}
      </div>

      {/* Anzeige der Bestellungen */}
      <div className="space-y-4">
        {orders.map(order => (
          <Card key={order.id} className="border border-gray-300">
            <CardHeader>
              <CardTitle>Bestellung #{order.id} - Tisch {order.tableNumber}</CardTitle>
              <CardDescription>
                Bestellt von: {order.customerName} um {order.timestamp instanceof Date ? order.timestamp.toLocaleTimeString() : "Zeit nicht verfügbar"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Gericht</TableHead>
                    <TableHead>Preis</TableHead>
                    <TableHead>Menge</TableHead>
                    <TableHead>Notiz</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {order.items.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell>{item.name}</TableCell>
                      <TableCell>{item.price.toFixed(2)} €</TableCell>
                      <TableCell>{item.quantity}</TableCell>
                      <TableCell>{item.note || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <p className="mt-2 font-semibold">Gesamtpreis: {order.items.reduce((sum, item) => sum + item.price * item.quantity, 0).toFixed(2)} €</p>
            </CardContent>
            <CardFooter className="flex justify-between items-center">
              <Badge variant={
                order.status === 'pending' ? 'default' :
                order.status === 'preparing' ? 'secondary' :
                order.status === 'delivered' ? 'primary' : 'accent'
              }>
                {order.status}
              </Badge>
              <div className="space-x-2">
                {order.status === 'pending' && (
                  <Button onClick={() => updateOrderStatus(order.id, 'preparing')}>
                    Zubereitung starten
                  </Button>
                )}
                {order.status === 'preparing' && (
                  <Button onClick={() => updateOrderStatus(order.id, 'delivered')}>
                    Bestellung fertig
                  </Button>
                )}
                {order.status === 'delivered' && (
                  <Button onClick={() => updateOrderStatus(order.id, 'paid')}>
                    Als bezahlt markieren
                  </Button>
                )}
                <Button variant="destructive" onClick={() => deleteOrder(order.id)}>
                  Löschen
                </Button>
              </div>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  )
}
