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
  }[]
  status: 'pending' | 'preparing' | 'delivered' | 'paid'
  timestamp: Date | string
}

export default function KuechenSeite() {
  const [orders, setOrders] = useState<Order[]>([])

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
        console.error("Details:", error)
      }
    }

    fetchOrders()
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

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Küchenseite - Bestellübersicht</h1>
      <div className="space-y-4">
        {orders.map(order => (
          <Card key={order.id}>
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
                    <TableHead>Menge</TableHead>
                    <TableHead>Notiz</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {order.items.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell>{item.name}</TableCell>
                      <TableCell>{item.quantity}</TableCell>
                      <TableCell>{item.note || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
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
                <Button 
                  variant={order.status === 'pending' ? "primary" : "outline"} 
                  onClick={() => updateOrderStatus(order.id, 'pending')}
                  disabled={order.status === 'pending'}
                >
                  Zubereitung starten
                </Button>
                <Button 
                  variant={order.status === 'preparing' ? "primary" : "outline"} 
                  onClick={() => updateOrderStatus(order.id, 'preparing')}
                  disabled={order.status === 'preparing'}
                >
                  An Tisch gebracht
                </Button>
                <Button 
                  variant={order.status === 'delivered' ? "primary" : "outline"} 
                  onClick={() => updateOrderStatus(order.id, 'delivered')}
                  disabled={order.status === 'delivered'}
                >
                  Als bezahlt markieren
                </Button>
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
